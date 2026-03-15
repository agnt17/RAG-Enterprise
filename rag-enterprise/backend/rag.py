from langchain_groq import ChatGroq
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
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
    """
    Custom LangChain history class backed by PostgreSQL.
    
    LangChain calls:
    - .messages (property) — to load history before each query
    - .add_message(msg)    — to save each new message after query
    - .clear()             — to wipe history (not used yet but required)
    """

    def __init__(self, db: Session, user_id: str):
        from database import Conversation
        self.db      = db
        self.user_id = user_id
        self.Conversation = Conversation

        # Load or create the conversation row for this user
        # Each user has ONE conversation row that grows over time
        self.record = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).first()

        if not self.record:
            # First time this user is querying — create a fresh row
            self.record = Conversation(
                id       = str(uuid.uuid4()),
                user_id  = user_id,
                messages = "[]"  # empty JSON array
            )
            db.add(self.record)
            db.commit()

    @property
    def messages(self) -> list[BaseMessage]:
        """
        Called by LangChain before every query.
        Reads the JSON string from PostgreSQL and converts back to
        LangChain message objects (HumanMessage, AIMessage).
        """
        raw = json.loads(self.record.messages)  # parse JSON string → list
        result = []
        for msg in raw:
            if msg["type"] == "human":
                result.append(HumanMessage(content=msg["content"]))
            elif msg["type"] == "ai":
                result.append(AIMessage(content=msg["content"]))
        return result

    def add_message(self, message: BaseMessage) -> None:
        """
        Called by LangChain after every query — once for the human
        message and once for the AI response.
        Converts the LangChain message object to a dict and appends
        to the JSON array in PostgreSQL.
        """
        raw = json.loads(self.record.messages)  # load existing messages

        # Convert LangChain message object to a simple dict
        if isinstance(message, HumanMessage):
            raw.append({"type": "human", "content": message.content})
        elif isinstance(message, AIMessage):
            raw.append({"type": "ai", "content": message.content})

        # Save back to PostgreSQL as JSON string
        self.record.messages = json.dumps(raw)
        self.db.commit()  # persist immediately — survives server restart

    def clear(self) -> None:
        """
        Wipes all messages for this user.
        Called when user uploads a new document — fresh conversation.
        """
        self.record.messages = "[]"
        self.db.commit()
        


def get_rag_chain(namespace: str, db: Session):
    """
    Builds and returns the full RAG chain for a specific user.
    
    namespace — user's Pinecone namespace (their isolated document space)
    db        — PostgreSQL session for loading/saving chat history
    """
    vectorstore = PineconeVectorStore(
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        embedding=embeddings,
        namespace=namespace
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

    # This function is called by RunnableWithMessageHistory
    # on every invocation to get the history for this user
    def get_history(session_id: str) -> PostgresChatMessageHistory:
        return PostgresChatMessageHistory(db=db, user_id=session_id)

    return RunnableWithMessageHistory(
        chain,
        get_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )