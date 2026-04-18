from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document
from pinecone import Pinecone
from dotenv import load_dotenv
import os
import re

load_dotenv()

EMBEDDING_MODEL = (os.getenv("COHERE_EMBED_MODEL") or "embed-english-v3.0").strip()
_DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")
_WORD_CHAR_PATTERN = re.compile(r"[A-Za-z\u0900-\u097F]")
_SPLIT_DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]\s+[\u0900-\u097F]")
_SPLIT_MATRA_PATTERN = re.compile(r"[\u0900-\u097F]\s+[\u093c-\u094d\u0951-\u0954]")

# Main work of this file: convert the uploaded PDF into chunks, embed them into
# Pinecone (for semantic search), and also persist chunk text to PostgreSQL
# (for BM25 keyword search in the hybrid retrieval pipeline).

embeddings = CohereEmbeddings(
    model=EMBEDDING_MODEL,
    cohere_api_key=os.getenv("COHERE_API_KEY")
)


def _env_flag_enabled(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _safe_float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw.strip())
    except ValueError:
        return default


def _sample_text(documents: list[Document], max_pages: int = 5) -> str:
    return "\n".join((doc.page_content or "") for doc in documents[:max_pages])


def _hindi_corruption_score(text: str) -> float:
    """Estimate Hindi extraction corruption (higher score => poorer extraction)."""
    content = text or ""
    devanagari_count = len(_DEVANAGARI_PATTERN.findall(content))
    if devanagari_count == 0:
        return 0.0

    split_letter_hits = len(_SPLIT_DEVANAGARI_PATTERN.findall(content))
    split_matra_hits = len(_SPLIT_MATRA_PATTERN.findall(content))
    replacement_hits = content.count("\ufffd") + content.count("?")

    weighted_issues = split_letter_hits + (2 * split_matra_hits) + (5 * replacement_hits)
    return weighted_issues / max(devanagari_count, 1)


def _is_likely_hindi_text(text: str) -> bool:
    content = text or ""
    total_word_chars = len(_WORD_CHAR_PATTERN.findall(content))
    if total_word_chars == 0:
        return False

    devanagari_count = len(_DEVANAGARI_PATTERN.findall(content))
    return devanagari_count >= 40 and (devanagari_count / total_word_chars) >= 0.20


def _should_use_hindi_ocr_fallback(documents: list[Document]) -> bool:
    """Decide when Hindi OCR fallback should be attempted."""
    if not _env_flag_enabled("ENABLE_HINDI_OCR_FALLBACK", default=True):
        return False
    if not documents:
        return False

    sample = _sample_text(documents)
    if not _is_likely_hindi_text(sample):
        return False

    threshold = _safe_float_env("HINDI_OCR_CORRUPTION_THRESHOLD", default=0.035)
    return _hindi_corruption_score(sample) >= threshold


def _extract_documents_with_tesseract_ocr(file_path: str) -> list[Document] | None:
    """Extract pages via OCR (Tesseract) when native PDF text appears corrupted."""
    try:
        import pypdfium2 as pdfium
        import pytesseract
    except ImportError:
        return None

    tesseract_cmd = (os.getenv("TESSERACT_CMD") or "").strip()
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    ocr_langs = (os.getenv("OCR_LANGS") or "hin+eng").strip()
    render_scale = _safe_float_env("OCR_RENDER_SCALE", default=2.0)

    try:
        pdf = pdfium.PdfDocument(file_path)
    except Exception:
        return None

    ocr_docs: list[Document] = []
    try:
        for page_index in range(len(pdf)):
            page = pdf[page_index]
            bitmap = page.render(scale=render_scale)
            pil_image = bitmap.to_pil()
            text = (pytesseract.image_to_string(pil_image, lang=ocr_langs) or "").strip()
            ocr_docs.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": file_path,
                        "page": page_index,
                        "ocr_engine": "tesseract",
                    },
                )
            )

            if hasattr(pil_image, "close"):
                pil_image.close()
            if hasattr(bitmap, "close"):
                bitmap.close()
            if hasattr(page, "close"):
                page.close()
    except Exception:
        return None
    finally:
        if hasattr(pdf, "close"):
            pdf.close()

    if not any((doc.page_content or "").strip() for doc in ocr_docs):
        return None

    return ocr_docs


def _load_documents_with_quality_fallback(file_path: str) -> list[Document]:
    """Load PDF text normally, then switch to OCR when Hindi extraction quality is poor."""
    loader = PyPDFLoader(file_path)
    primary_docs = loader.load()

    if not _should_use_hindi_ocr_fallback(primary_docs):
        return primary_docs

    ocr_docs = _extract_documents_with_tesseract_ocr(file_path)
    if not ocr_docs:
        return primary_docs

    primary_score = _hindi_corruption_score(_sample_text(primary_docs))
    ocr_score = _hindi_corruption_score(_sample_text(ocr_docs))
    min_improvement = _safe_float_env("HINDI_OCR_MIN_IMPROVEMENT", default=0.010)

    # Use OCR only when it materially improves extraction quality.
    if (primary_score - ocr_score) >= min_improvement:
        return ocr_docs

    return primary_docs


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
    documents = _load_documents_with_quality_fallback(file_path)

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
