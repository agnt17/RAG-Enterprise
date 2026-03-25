from langchain_community.document_loaders import PyPDFLoader 
# converts pdf to large text
from langchain_text_splitters import RecursiveCharacterTextSplitter
# converts large text to sentences then break them to words then letters
from langchain_cohere import CohereEmbeddings
# Imports cohere embeddings, this is what converts text to numbers. Earlier hugging face was used, but they don't have a free tier upon deployment.  
from langchain_pinecone import PineconeVectorStore 
# This is the connector to pinecone, it takes the text and embeddings and sends them to pinecone.
from pinecone import Pinecone 
# This is the pinecone client, it allows us to connect to pinecone and manage our index like deleting all the data in the index before we ingest new data.
from dotenv import load_dotenv
import os

load_dotenv()



# Main work of this file is to convert the newly uploaded PDF into chunks, convert those chunks into vectors, and upload everything to Pinecone. This is the "ingest" process — taking raw data and making it ready for retrieval. The get_rag_chain() function in main.py will then connect to Pinecone and use that data to answer questions.
# Next file is rag.py. 


embeddings = CohereEmbeddings(
    model="embed-english-v3.0",
    cohere_api_key=os.getenv("COHERE_API_KEY")
)

#This line downloads and loads the AI model into memory. It takes ~3 seconds. If we put it inside the function, it would reload every single time someone uploads a PDF. By putting it at module level, it loads once when the server starts and stays in memory forever — much faster.

def ingest_pdf(file_path: str, namespace: str = "default"):
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
    try:
        stats = index.describe_index_stats()
        ns_stats = stats.namespaces.get(namespace, None)
        if ns_stats and ns_stats.vector_count > 0:
            index.delete(delete_all=True, namespace=namespace)
    except Exception:
        pass
    # Creates a direct connection to Pinecone using your API key, gets a reference to your specific index, then deletes every single vector in it. This is the clean slate operation — ensures when you upload a new PDF, you're not mixing old and new document data. delete_all=True is a Pinecone parameter that wipes the entire namespace.
    
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    # Creates a loader pointing to your PDF file, then .load() reads it and returns a Python list of Document objects. Each Document has two things — .page_content (the text) and .metadata (a dict with source filename and page number). A 10-page PDF returns a list of 10 Document objects.

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_documents(documents)
    #Creates the text splitter with two key settings. chunk_size=1000 means each chunk is at most 1000 characters. chunk_overlap=200 means consecutive chunks share 200 characters — this is crucial because if an answer spans across a chunk boundary, the overlap ensures neither chunk loses that context. .split_documents() takes your list of Document objects and returns a longer list of smaller Document objects — each chunk becomes its own Document, inheriting the original metadata (page number, source).

    PineconeVectorStore.from_documents(
        chunks, embeddings,
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        namespace=namespace   # ← each user's data is now isolated
    )
    # most expensive step, it makes 1 API call per batch of chunks. 
    # This is where the magic happens. For every chunk in your list, it calls the HuggingFace model to convert the text into a vector (384 numbers), then uploads that vector + the original text + the metadata to Pinecone. This is a batch operation — it does all chunks in one go. After this line, Pinecone has your entire document stored as searchable vectors.
    return f"Ingested {len(chunks)} chunks successfully"


def delete_namespace(namespace: str) -> bool:
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
    index.delete(delete_all=True, namespace=namespace)
    return True