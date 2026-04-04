from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from dotenv import load_dotenv
import os

load_dotenv()

# Main work of this file: convert the uploaded PDF into chunks, embed them into
# Pinecone (for semantic search), and also persist chunk text to PostgreSQL
# (for BM25 keyword search in the hybrid retrieval pipeline).

embeddings = CohereEmbeddings(
    model="embed-english-v3.0",
    cohere_api_key=os.getenv("COHERE_API_KEY")
)


def ingest_pdf(
    file_path: str,
    namespace: str = "default",
    db=None,
    user_id: str = None,
    document_id: str = None,
) -> str:
    """
    Ingest a PDF into the RAG pipeline.

    Steps:
      1. Wipe the existing Pinecone namespace for this document (clean slate).
      2. Load the PDF and split into overlapping chunks.
      3. Embed chunks via Cohere and upsert into Pinecone.
      4. (Optional) Persist chunk text to PostgreSQL for BM25 hybrid search.

    Args:
        file_path:   Absolute path to the PDF file.
        namespace:   Pinecone namespace — always equals document_id for isolation.
        db:          SQLAlchemy Session. When provided, chunks are also saved to
                     the document_chunks table so the query pipeline can do hybrid
                     BM25 + semantic retrieval.
        user_id:     Owner of the document (required when db is provided).
        document_id: Document UUID (required when db is provided).

    Returns:
        A short status string, e.g. "Ingested 47 chunks successfully".
    """
    # ── 1. Clean the Pinecone namespace ─────────────────────
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
    try:
        stats = index.describe_index_stats()
        ns_stats = stats.namespaces.get(namespace, None)
        if ns_stats and ns_stats.vector_count > 0:
            index.delete(delete_all=True, namespace=namespace)
    except Exception:
        pass

    # ── 2. Load and chunk the PDF ────────────────────────────
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_documents(documents)

    # ── 3. Embed and upsert into Pinecone ────────────────────
    PineconeVectorStore.from_documents(
        chunks,
        embeddings,
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        namespace=namespace,
    )

    # ── 4. Persist chunks to PostgreSQL for BM25 ────────────
    if db is not None and user_id and document_id:
        from database import DocumentChunk

        # Remove any stale chunks for this document (re-upload scenario)
        db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).delete()
        db.commit()

        chunk_records = []
        for i, chunk in enumerate(chunks):
            chunk_records.append(
                DocumentChunk(
                    document_id = document_id,
                    user_id     = user_id,
                    content     = chunk.page_content,
                    chunk_index = i,
                    page_num    = chunk.metadata.get("page", 0) + 1,  # 1-indexed
                    source      = chunk.metadata.get("source", ""),
                )
            )
        db.bulk_save_objects(chunk_records)
        db.commit()

    return f"Ingested {len(chunks)} chunks successfully"


def delete_namespace(namespace: str) -> bool:
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))
    index.delete(delete_all=True, namespace=namespace)
    return True
