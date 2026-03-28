from langchain_groq import ChatGroq
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import os, json, uuid

load_dotenv()

embeddings = CohereEmbeddings(
    model="embed-english-v3.0",
    cohere_api_key=os.getenv("COHERE_API_KEY")
)

# ── PostgreSQL Chat History ─────────────────────────────────
class PostgresChatMessageHistory(BaseChatMessageHistory):

    def __init__(self, db: Session, user_id: str, document_id: str):
        from database import Conversation
        self.db          = db
        self.user_id     = user_id
        self.document_id = document_id

        self.record = db.query(Conversation).filter(
            Conversation.user_id     == user_id,
            Conversation.document_id == document_id
        ).first()

        if not self.record:
            self.record = Conversation(
                id          = str(uuid.uuid4()),
                user_id     = user_id,
                document_id = document_id,
                messages    = "[]"
            )
            db.add(self.record)
            db.commit()

    @property
    def messages(self) -> list[BaseMessage]:
        raw = json.loads(self.record.messages)
        result = []
        for msg in raw:
            if msg["type"] == "human":
                result.append(HumanMessage(content=msg["content"]))
            elif msg["type"] == "ai":
                result.append(AIMessage(content=msg["content"]))
        return result

    def add_message(self, message: BaseMessage) -> None:
        raw = json.loads(self.record.messages)
        if isinstance(message, HumanMessage):
            raw.append({"type": "human", "content": message.content})
        elif isinstance(message, AIMessage):
            raw.append({"type": "ai", "content": message.content})
        self.record.messages = json.dumps(raw)
        self.db.commit()

    def clear(self) -> None:
        self.record.messages = "[]"
        self.db.commit()


# ── Query with Sources ──────────────────────────────────────
def query_with_sources(
    question: str,
    namespace: str,
    db: Session,
    user_id: str,
    document_id: str
) -> dict:
    """
    Runs the full RAG pipeline and returns BOTH the answer AND
    the source page numbers from the retrieved chunks.

    Returns:
        {
            "answer": "The termination clause requires...",
            "sources": [
                {"page": 4, "source": "contract.pdf"},
                {"page": 7, "source": "contract.pdf"}
            ]
        }
    """

    # Step 1 — connect to this document's Pinecone namespace
    vectorstore = PineconeVectorStore(
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        embedding=embeddings,
        namespace=namespace
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    # Step 2 — retrieve relevant chunks + capture their metadata
    retrieved_docs = retriever.invoke(question)

    # Step 3 — extract unique page numbers from retrieved chunks
    # Each doc.metadata has "page" and "source" from PyPDFLoader
    seen = set()
    sources = []
    for doc in retrieved_docs:
        page   = doc.metadata.get("page", 0)
        source = doc.metadata.get("source", "")

        # page from PyPDFLoader is 0-indexed — add 1 for human-readable
        page_num = page + 1

        # Deduplicate — same page shouldn't appear twice
        if page_num not in seen:
            seen.add(page_num)
            sources.append({
                "page":   page_num,
                "source": source,
                "content": doc.page_content[:300]
            })

    # Sort by page number ascending
    sources.sort(key=lambda x: x["page"])

    # Step 4 — build context from retrieved chunks
    context = "\n\n".join([doc.page_content for doc in retrieved_docs])

    # Step 5 — load chat history for this document
    history_obj = PostgresChatMessageHistory(
        db          = db,
        user_id     = user_id,
        document_id = document_id
    )
    chat_history = history_obj.messages

    # Step 6 — build the LLM
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0
    )

    # Step 7 — build prompt with history
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a helpful assistant. Answer based ONLY on the context below.\n"
         "Be concise and precise. If the answer is not in the context, say so.\n\n"
         "Context:\n{context}"),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    # Step 8 — run the chain
    chain  = prompt | llm | StrOutputParser()
    answer = chain.invoke({
        "context":      context,
        "chat_history": chat_history,
        "question":     question
    })

    # Step 9 — save Q&A to history
    history_obj.add_message(HumanMessage(content=question))
    history_obj.add_message(AIMessage(content=answer))

    return {
        "answer":  answer,
        "sources": sources
    }