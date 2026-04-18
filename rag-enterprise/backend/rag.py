"""
rag.py — Query pipeline for DocMind AI

Phase 5 upgrades (hybrid search + reranking):
  • EnsembleRetriever combines BM25 (keyword) + Pinecone (semantic) results so
    that both exact-match and meaning-based chunks are surfaced.
  • Cohere Rerank API reorders the combined candidates by relevance, giving the
    LLM the highest-quality context and improving answer accuracy.

Pipeline for every user question:
  1. Load document chunks from PostgreSQL → build BM25Retriever (in-memory).
  2. Connect to the document's Pinecone namespace → build dense retriever.
  3. EnsembleRetriever merges results (BM25 weight 0.4, dense weight 0.6).
  4. Cohere reranker reorders the merged candidates, keeps top-4.
  5. Build context string from reranked chunks.
  6. Load chat history from PostgreSQL.
  7. Call LLaMA-3.3-70b via Groq with context + history + question.
  8. Persist Q&A (with source citations) back to PostgreSQL.
"""

from langchain_groq import ChatGroq
from langchain_cohere import CohereEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from datetime import datetime
import cohere
import os
import json
import uuid
import re

load_dotenv()

EMBEDDING_MODEL = (os.getenv("COHERE_EMBED_MODEL") or "embed-english-v3.0").strip()
_DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")
_HINGLISH_TOKEN_PATTERN = re.compile(r"[a-zA-Z']+")
_HINGLISH_HINT_WORDS = {
    "aap",
    "aur",
    "baare",
    "bare",
    "batao",
    "bataiye",
    "bhi",
    "cheez",
    "cheeze",
    "hai",
    "hain",
    "hoga",
    "hogi",
    "honge",
    "hum",
    "isme",
    "ismein",
    "ispar",
    "kab",
    "ka",
    "kahan",
    "kaise",
    "kaun",
    "kaunsi",
    "kaunsa",
    "ke",
    "ki",
    "kis",
    "kya",
    "kyu",
    "kyun",
    "me",
    "mein",
    "mujhe",
    "nahi",
    "nahin",
    "samjhao",
    "samjhaiye",
    "se",
    "usme",
    "usmein",
    "wo",
    "woh",
    "ye",
    "yeh",
}
_HINGLISH_QUESTION_WORDS = {
    "kya",
    "kaise",
    "kyu",
    "kyun",
    "kis",
    "kahan",
    "kab",
    "kaun",
    "kaunsa",
    "kaunsi",
}

embeddings = CohereEmbeddings(
    model=EMBEDDING_MODEL,
    cohere_api_key=os.getenv("COHERE_API_KEY")
)

# Top-N candidates fetched before reranking; reranker then keeps RERANK_TOP_N.
RETRIEVAL_K  = 10   # candidates from each retriever
RERANK_TOP_N = 4    # final chunks passed to the LLM
OUT_OF_CONTEXT_MESSAGE = "Seems like this question doesn't match context provided in this document."


# ── PostgreSQL Chat History ──────────────────────────────────
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

    def add_message(self, message: BaseMessage, sources: list = None) -> None:
        raw = json.loads(self.record.messages)
        timestamp = datetime.utcnow().isoformat() + "Z"
        if isinstance(message, HumanMessage):
            raw.append({"type": "human", "content": message.content, "timestamp": timestamp})
        elif isinstance(message, AIMessage):
            msg_data = {"type": "ai", "content": message.content, "timestamp": timestamp}
            if sources:
                msg_data["sources"] = sources
            raw.append(msg_data)
        self.record.messages = json.dumps(raw)
        self.db.commit()

    def clear(self) -> None:
        self.record.messages = "[]"
        self.db.commit()


# ── Hybrid Retrieval Helpers ─────────────────────────────────

def _build_bm25_retriever(db: Session, document_id: str, k: int) -> BM25Retriever | None:
    """Build an in-memory BM25 retriever from chunks stored in PostgreSQL.

    Returns None when no chunks are found (e.g. legacy documents uploaded before
    Phase 5 — the pipeline gracefully falls back to dense-only retrieval).
    """
    from database import DocumentChunk

    rows = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id
    ).order_by(DocumentChunk.chunk_index).all()

    if not rows:
        return None

    langchain_docs = [
        Document(
            page_content=row.content,
            metadata={"page": row.page_num, "source": row.source or "", "chunk_index": row.chunk_index}
        )
        for row in rows
    ]
    retriever = BM25Retriever.from_documents(langchain_docs)
    retriever.k = k
    return retriever


def _rerank_with_cohere(question: str, docs: list[Document], top_n: int) -> tuple[list[Document], list[float] | None]:
    """Re-rank a list of LangChain Documents using Cohere's Rerank API.

    Falls back to returning the original list (truncated to top_n) if the
    Cohere API key is not set or the call fails.

    Returns:
        (reranked_docs, relevance_scores)
        relevance_scores is None when unavailable (e.g., fallback path).
    """
    api_key = os.getenv("COHERE_API_KEY")
    if not api_key or not docs:
        return docs[:top_n], None

    try:
        co = cohere.Client(api_key)
        texts = [doc.page_content for doc in docs]
        response = co.rerank(
            model="rerank-english-v3.0",
            query=question,
            documents=texts,
            top_n=top_n,
        )
        reranked = [docs[result.index] for result in response.results]
        scores = [float(getattr(result, "relevance_score", 0.0) or 0.0) for result in response.results]
        return reranked, scores
    except Exception:  # noqa: BLE001  # pylint: disable=broad-exception-caught
        # Reranking is an enhancement — never block a query on its failure.
        return docs[:top_n], None


def _normalize_source_page_number(doc: Document) -> int:
    """Normalize page metadata into human-readable 1-indexed page numbers.

    Dense Pinecone retrieval commonly stores `page` as 0-indexed from PyPDFLoader.
    BM25 chunks are persisted as 1-indexed (`document_chunks.page_num`).
    This function unifies both into a display-safe 1-indexed page number.
    """
    raw_page = doc.metadata.get("page", 1)
    try:
        page = int(raw_page)
    except (TypeError, ValueError):
        return 1

    # Prefer explicit page index base when present.
    page_index_base = doc.metadata.get("page_index_base")
    if page_index_base is None:
        # Infer base:
        # - BM25 docs include chunk_index and are already 1-indexed.
        # - Dense Pinecone docs are treated as 0-indexed.
        page_index_base = 1 if "chunk_index" in doc.metadata else 0

    if page_index_base == 0:
        page += 1

    return max(page, 1)


def _has_usable_context(reranked_docs: list[Document]) -> bool:
    """Return True when retrieval produced at least one non-empty context chunk."""
    if not reranked_docs:
        return False
    return any((doc.page_content or "").strip() for doc in reranked_docs)


def _is_ooc_answer(answer: str) -> bool:
    """Detect out-of-context responses so sources can be hidden."""
    normalized = (answer or "").strip().lower()
    expected = OUT_OF_CONTEXT_MESSAGE.strip().lower()
    return normalized == expected


def _looks_like_hinglish(text: str) -> bool:
    """Heuristic detector for Roman-script Hindi (Hinglish) questions."""
    tokens = _HINGLISH_TOKEN_PATTERN.findall((text or "").lower())
    if not tokens:
        return False

    hits = sum(1 for token in tokens if token in _HINGLISH_HINT_WORDS)
    if hits >= 2:
        return True

    # Queries like "kya ..." are strong Hinglish indicators even if short.
    return tokens[0] in _HINGLISH_QUESTION_WORDS and hits >= 1


def _detect_response_language(question: str) -> str:
    """Infer response language from user question.

    V2 strategy:
    - Devanagari script => Hindi response.
    - Explicit mention of Hindi/Hinglish in Latin script => Hindi response.
    - Hinglish heuristics for Roman-script Hindi => Hindi response.
    - Otherwise => English response.
    """
    text = (question or "").strip()
    if not text:
        return "English"

    if _DEVANAGARI_PATTERN.search(text):
        return "Hindi"

    lowered = text.lower()
    if "hindi" in lowered or "hindustani" in lowered or "hinglish" in lowered:
        return "Hindi"

    if _looks_like_hinglish(text):
        return "Hindi"

    return "English"


# ── Main Query Function ──────────────────────────────────────

def query_with_sources(
    question: str,
    namespace: str,
    db: Session,
    user_id: str,
    document_id: str
) -> dict:
    """
    Full RAG pipeline with hybrid retrieval and reranking.

    Returns:
        {
            "answer": "The termination clause requires...",
            "sources": [
                {"page": 4, "source": "contract.pdf", "content": "...excerpt..."},
            ]
        }
    """
    response_language = _detect_response_language(question)

    # ── Step 1: Dense (semantic) retriever via Pinecone ──────
    vectorstore = PineconeVectorStore(
        index_name=os.getenv("PINECONE_INDEX_NAME"),
        embedding=embeddings,
        namespace=namespace,
    )
    dense_retriever = vectorstore.as_retriever(search_kwargs={"k": RETRIEVAL_K})

    # ── Step 2: Sparse (keyword) retriever via BM25 ──────────
    bm25_retriever = _build_bm25_retriever(db, document_id, k=RETRIEVAL_K)

    # ── Step 3: Combine retrievers ───────────────────────────
    if bm25_retriever is not None:
        # BM25 weight 0.4, dense (semantic) weight 0.6.
        # Dense is weighted higher because meaning matters more than exact words
        # for document Q&A, but keywords anchor precision for entity names and
        # clause numbers that semantic search sometimes misses.
        ensemble_retriever = EnsembleRetriever(
            retrievers=[bm25_retriever, dense_retriever],
            weights=[0.4, 0.6],
        )
        retrieved_docs = ensemble_retriever.invoke(question)
    else:
        # Legacy document: fall back to dense-only retrieval
        retrieved_docs = dense_retriever.invoke(question)

    # ── Step 4: Rerank with Cohere ───────────────────────────
    reranked_docs, _relevance_scores = _rerank_with_cohere(question, retrieved_docs, top_n=RERANK_TOP_N)

    # ── Step 5: Load chat history ─────────────────────────────
    history_obj  = PostgresChatMessageHistory(db=db, user_id=user_id, document_id=document_id)
    chat_history = history_obj.messages

    # Strict fallback only when retrieval gives no usable context at all.
    if not _has_usable_context(reranked_docs):
        answer = OUT_OF_CONTEXT_MESSAGE
        history_obj.add_message(HumanMessage(content=question))
        history_obj.add_message(AIMessage(content=answer))
        return {
            "answer": answer,
            "sources": [],
        }

    # ── Step 6: Extract source citations ─────────────────────
    seen = set()
    sources = []
    for doc in reranked_docs:
        page_num = _normalize_source_page_number(doc)
        source   = doc.metadata.get("source", "")
        if page_num not in seen:
            seen.add(page_num)
            sources.append({
                "page":    page_num,
                "source":  source,
                "content": doc.page_content[:300],
            })
    sources.sort(key=lambda x: x["page"])

    # ── Step 7: Build context for the LLM ────────────────────
    context = "\n\n".join([doc.page_content for doc in reranked_docs])

    # ── Step 8: Run the LLM chain ─────────────────────────────
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a helpful assistant. Answer based ONLY on the context below.\n"
         "Respond in {response_language}.\n"
         "If response_language is Hindi, write in natural Hindi using Devanagari script.\n"
         "Be concise and precise. If the question does not match the context, "
         f"reply with EXACTLY: {OUT_OF_CONTEXT_MESSAGE}\n\n"
         "Context:\n{context}"),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    chain  = prompt | llm | StrOutputParser()
    answer = chain.invoke({
        "context":      context,
        "chat_history": chat_history,
        "question":     question,
        "response_language": response_language,
    })

    # If the model explicitly says out-of-context, hide all citations.
    if _is_ooc_answer(answer):
        answer = OUT_OF_CONTEXT_MESSAGE
        sources = []

    # ── Step 9: Persist conversation ─────────────────────────
    history_obj.add_message(HumanMessage(content=question))
    history_obj.add_message(AIMessage(content=answer), sources=sources)

    return {
        "answer":  answer,
        "sources": sources,
    }
