from langchain_groq import ChatGroq
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from dotenv import load_dotenv
import os

load_dotenv()

store = {} 
# A simple Python dictionary that lives in memory (RAM) while the server is running. It stores chat history — the key is a session ID string, the value is a list of messages. This is why your chat history disappears when you restart the server — it's in RAM, not a database. For Production level, we would use a real database (redis or PostgreSQL) or persistent storage solution, but for this demo, an in-memory store is sufficient and much simpler to set up.

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]
# A function that either retrieves existing chat history for a session or creates a new empty history. InMemoryChatMessageHistory is a LangChain object that stores a list of HumanMessage and AIMessage objects. LangChain calls this function automatically every time you invoke the chain — it passes in the session_id you configured.

embeddings = CohereEmbeddings(
    model="embed-english-v3.0",
    cohere_api_key=os.getenv("COHERE_API_KEY")
)

def get_rag_chain():
    vectorstore = PineconeVectorStore(
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        embedding=embeddings
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    # Converts the vector store into a "retriever" object. A retriever has one job — given a query, return relevant documents. k: 4 means return the top 4 most similar chunks. Increasing k gives more context but costs more tokens. 4 is a sweet spot for most documents.
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
    # Defines the exact structure of what gets sent to the LLM. Three parts — a system message (instructions to the AI, includes {context} which gets filled with retrieved chunks), a placeholder for chat history (previous messages get inserted here automatically), and the human message (the user's actual question). The curly brace variables get filled in at runtime.

    chain = (
        RunnablePassthrough.assign(context=lambda x: retriever.invoke(x["question"]))
        | prompt
        | llm
        | StrOutputParser()
    )
    #This is LangChain's LCEL (LangChain Expression Language) — a pipeline using the | pipe operator, same concept as Unix pipes. Read it left to right:

    # RunnablePassthrough.assign(context=...) — takes the input dict and adds a context key by running the retriever on the question: 
    # | prompt — fills in the prompt template with context, chat_history, and question
    # | llm — sends the filled prompt to Groq/LLaMA and gets a response
    # | StrOutputParser() — extracts the text string from the LLM response object

    return RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )
    
    # Wraps the chain with automatic memory management. Every time you call .invoke(), it automatically calls get_session_history() to get past messages, injects them into chat_history, runs the chain, then saves the new human + AI messages back to history. You don't have to manually manage any of this.