from langchain_groq import ChatGroq
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import os, json, uuid

load_dotenv()


embeddings = CohereEmbeddings(
    model="embed-english-v3.0",
    cohere_api_key=os.getenv("COHERE_API_KEY")
)

# ── PostgreSQL-backed Chat History ─────────────────────────
# This class replaces InMemoryChatMessageHistory
# It implements the same interface LangChain expects
# but reads and writes from your PostgreSQL database

class PostgresChatMessageHistory(BaseChatMessageHistory):

    def __init__(self, db: Session, user_id: str, document_id: str):
        from database import Conversation
        self.db          = db
        self.user_id     = user_id
        self.document_id = document_id

        # Find existing conversation for this specific document
        self.record = db.query(Conversation).filter(
            Conversation.user_id     == user_id,
            Conversation.document_id == document_id   # ← scoped to document
        ).first()

        if not self.record:
            # First time chatting about this document
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
        


def get_rag_chain(namespace: str, db: Session, user_id: str, document_id: str):
    """
    namespace   — document.id (Pinecone namespace for this document's vectors)
    db          — PostgreSQL session
    user_id     — for scoping the conversation
    document_id — for loading this document's specific conversation
    """
    vectorstore = PineconeVectorStore(
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        embedding=embeddings,
        namespace=namespace   # searches ONLY this document's vectors
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant. Answer based only on the context below:\n\n{context}"),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    chain = (
        RunnablePassthrough.assign(
            context=lambda x: retriever.invoke(x["question"])
        )
        | prompt
        | llm
        | StrOutputParser()
    )

    def get_history(session_id: str) -> PostgresChatMessageHistory:
        return PostgresChatMessageHistory(
            db=db,
            user_id=user_id,
            document_id=document_id
        )

    return RunnableWithMessageHistory(
        chain,
        get_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )