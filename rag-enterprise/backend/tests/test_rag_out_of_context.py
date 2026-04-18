from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda

import rag


class _FakeRetriever:
    def invoke(self, question: str):
        _ = question
        return [
            Document(
                page_content="Unrelated retrieved chunk",
                metadata={"page": 2, "source": "sample.pdf"},
            )
        ]


class _FakeVectorStore:
    def __init__(self, *args, **kwargs):
        _ = (args, kwargs)

    def as_retriever(self, search_kwargs=None):
        _ = search_kwargs
        return _FakeRetriever()


class _FakeHistory:
    instances = []

    def __init__(self, *args, **kwargs):
        _ = (args, kwargs)
        self.logged = []
        _FakeHistory.instances.append(self)

    @property
    def messages(self):
        return []

    def add_message(self, message, sources=None):
        self.logged.append((message, sources))


def test_out_of_context_query_returns_fixed_fallback_without_sources(monkeypatch):
    monkeypatch.setattr(rag, "PineconeVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag, "_build_bm25_retriever", lambda db, document_id, k: None)
    monkeypatch.setattr(
        rag,
        "_rerank_with_cohere",
        lambda question, docs, top_n: ([], [0.01]),
    )
    monkeypatch.setattr(rag, "PostgresChatMessageHistory", _FakeHistory)

    class _ShouldNotRunLLM:
        def __init__(self, *args, **kwargs):
            raise AssertionError("LLM should not run for out-of-context queries")

    monkeypatch.setattr(rag, "ChatGroq", _ShouldNotRunLLM)

    result = rag.query_with_sources(
        question="Who won the football world cup?",
        namespace="doc-id",
        db=None,
        user_id="user-id",
        document_id="doc-id",
    )

    assert result == {
        "answer": rag.OUT_OF_CONTEXT_MESSAGE,
        "sources": [],
    }

    history = _FakeHistory.instances[-1]
    assert len(history.logged) == 2

    _, ai_sources = history.logged[-1]
    assert ai_sources is None


def test_low_relevance_score_with_usable_context_still_answers(monkeypatch):
    monkeypatch.setattr(rag, "PineconeVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag, "_build_bm25_retriever", lambda db, document_id, k: None)
    monkeypatch.setattr(
        rag,
        "_rerank_with_cohere",
        lambda question, docs, top_n: (
            [Document(page_content="Bill no is HF2609", metadata={"page": 3, "source": "sample.pdf"})],
            [0.01],
        ),
    )
    monkeypatch.setattr(rag, "PostgresChatMessageHistory", _FakeHistory)
    monkeypatch.setattr(rag, "ChatGroq", lambda *args, **kwargs: RunnableLambda(lambda _: "Bill no is HF2609"))

    result = rag.query_with_sources(
        question="what is the bill no?",
        namespace="doc-id",
        db=None,
        user_id="user-id",
        document_id="doc-id",
    )

    assert result["answer"] == "Bill no is HF2609"
    assert result["sources"]
    assert result["sources"][0]["page"] >= 1


def test_llm_out_of_context_answer_hides_sources(monkeypatch):
    monkeypatch.setattr(rag, "PineconeVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag, "_build_bm25_retriever", lambda db, document_id, k: None)
    monkeypatch.setattr(
        rag,
        "_rerank_with_cohere",
        lambda question, docs, top_n: (
            [Document(page_content="Some context", metadata={"page": 4, "source": "sample.pdf"})],
            [0.02],
        ),
    )
    monkeypatch.setattr(rag, "PostgresChatMessageHistory", _FakeHistory)
    monkeypatch.setattr(
        rag,
        "ChatGroq",
        lambda *args, **kwargs: RunnableLambda(lambda _: rag.OUT_OF_CONTEXT_MESSAGE),
    )

    result = rag.query_with_sources(
        question="tell me about football history",
        namespace="doc-id",
        db=None,
        user_id="user-id",
        document_id="doc-id",
    )

    assert result == {
        "answer": rag.OUT_OF_CONTEXT_MESSAGE,
        "sources": [],
    }


def test_dense_zero_indexed_page_is_normalized_to_one(monkeypatch):
    monkeypatch.setattr(rag, "PineconeVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag, "_build_bm25_retriever", lambda db, document_id, k: None)
    monkeypatch.setattr(
        rag,
        "_rerank_with_cohere",
        lambda question, docs, top_n: (
            [Document(page_content="first page chunk", metadata={"page": 0, "source": "sample.pdf"})],
            [0.45],
        ),
    )
    monkeypatch.setattr(rag, "PostgresChatMessageHistory", _FakeHistory)
    monkeypatch.setattr(rag, "ChatGroq", lambda *args, **kwargs: RunnableLambda(lambda _: "Answer from first page"))

    result = rag.query_with_sources(
        question="what is this doc?",
        namespace="doc-id",
        db=None,
        user_id="user-id",
        document_id="doc-id",
    )

    assert result["sources"]
    assert result["sources"][0]["page"] == 1


def test_bm25_one_indexed_page_is_preserved(monkeypatch):
    monkeypatch.setattr(rag, "PineconeVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag, "_build_bm25_retriever", lambda db, document_id, k: None)
    monkeypatch.setattr(
        rag,
        "_rerank_with_cohere",
        lambda question, docs, top_n: (
            [Document(page_content="bm25 chunk", metadata={"page": 3, "chunk_index": 11, "source": "sample.pdf"})],
            [0.42],
        ),
    )
    monkeypatch.setattr(rag, "PostgresChatMessageHistory", _FakeHistory)
    monkeypatch.setattr(rag, "ChatGroq", lambda *args, **kwargs: RunnableLambda(lambda _: "Answer from page 3"))

    result = rag.query_with_sources(
        question="give clause details",
        namespace="doc-id",
        db=None,
        user_id="user-id",
        document_id="doc-id",
    )

    assert result["sources"]
    assert result["sources"][0]["page"] == 3


def test_detect_response_language_hindi_for_devanagari_text():
    assert rag._detect_response_language("यह क्लॉज समझाइए") == "Hindi"


def test_detect_response_language_english_for_latin_text():
    assert rag._detect_response_language("Explain this clause") == "English"


def test_detect_response_language_hindi_for_hinglish_text():
    assert rag._detect_response_language("Yeh document kis cheez ke bare me hai?") == "Hindi"


def test_hindi_question_can_return_hindi_answer(monkeypatch):
    monkeypatch.setattr(rag, "PineconeVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag, "_build_bm25_retriever", lambda db, document_id, k: None)
    monkeypatch.setattr(
        rag,
        "_rerank_with_cohere",
        lambda question, docs, top_n: (
            [Document(page_content="यह दस्तावेज कर निर्धारण के बारे में है", metadata={"page": 1, "source": "sample.pdf"})],
            [0.67],
        ),
    )
    monkeypatch.setattr(rag, "PostgresChatMessageHistory", _FakeHistory)
    monkeypatch.setattr(
        rag,
        "ChatGroq",
        lambda *args, **kwargs: RunnableLambda(lambda _: "यह दस्तावेज कर निर्धारण के बारे में है।"),
    )

    result = rag.query_with_sources(
        question="यह दस्तावेज किस बारे में है?",
        namespace="doc-id",
        db=None,
        user_id="user-id",
        document_id="doc-id",
    )

    assert "यह दस्तावेज" in result["answer"]
    assert result["sources"]


def test_hinglish_question_can_return_hindi_answer(monkeypatch):
    monkeypatch.setattr(rag, "PineconeVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag, "_build_bm25_retriever", lambda db, document_id, k: None)
    monkeypatch.setattr(
        rag,
        "_rerank_with_cohere",
        lambda question, docs, top_n: (
            [Document(page_content="यह दस्तावेज कर निर्धारण के बारे में है", metadata={"page": 1, "source": "sample.pdf"})],
            [0.67],
        ),
    )
    monkeypatch.setattr(rag, "PostgresChatMessageHistory", _FakeHistory)
    monkeypatch.setattr(
        rag,
        "ChatGroq",
        lambda *args, **kwargs: RunnableLambda(lambda _: "यह दस्तावेज कर निर्धारण के बारे में है।"),
    )

    result = rag.query_with_sources(
        question="Yeh document kis cheez ke bare me hai?",
        namespace="doc-id",
        db=None,
        user_id="user-id",
        document_id="doc-id",
    )

    assert "यह दस्तावेज" in result["answer"]
    assert result["sources"]
