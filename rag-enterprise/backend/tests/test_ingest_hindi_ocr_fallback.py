from langchain_core.documents import Document

import ingest


_GARBLED_HINDI = (
    "दलीप क ु मार गुप्ता वनोद गुप्ता यह क ै वयट आवेदन म ें दायर कया गया है। "
    "आवेदका द्वारा सीमा-ववाद क े संबंध म ें प्रार्थना की गई।"
)

_CLEAN_HINDI = (
    "दिलीप कुमार गुप्ता विनोद गुप्ता। यह कैविएट आवेदन में दायर किया गया है। "
    "आवेदिका द्वारा सीमा विवाद के संबंध में प्रार्थना की गई।"
)


def test_hindi_corruption_score_is_higher_for_garbled_text():
    garbled_score = ingest._hindi_corruption_score(_GARBLED_HINDI)
    clean_score = ingest._hindi_corruption_score(_CLEAN_HINDI)

    assert garbled_score > clean_score


def test_should_use_hindi_ocr_fallback_for_corrupted_hindi(monkeypatch):
    monkeypatch.setenv("ENABLE_HINDI_OCR_FALLBACK", "true")
    monkeypatch.setenv("HINDI_OCR_CORRUPTION_THRESHOLD", "0.01")

    docs = [Document(page_content=_GARBLED_HINDI, metadata={"page": 0})]

    assert ingest._should_use_hindi_ocr_fallback(docs) is True


def test_should_not_use_hindi_ocr_fallback_for_english_text(monkeypatch):
    monkeypatch.setenv("ENABLE_HINDI_OCR_FALLBACK", "true")
    monkeypatch.setenv("HINDI_OCR_CORRUPTION_THRESHOLD", "0.01")

    docs = [
        Document(
            page_content="This agreement is between the applicant and respondent for land demarcation.",
            metadata={"page": 0},
        )
    ]

    assert ingest._should_use_hindi_ocr_fallback(docs) is False


def test_load_documents_uses_ocr_when_quality_improves(monkeypatch):
    primary_docs = [Document(page_content=_GARBLED_HINDI, metadata={"page": 0, "source": "dummy.pdf"})]
    ocr_docs = [Document(page_content=_CLEAN_HINDI, metadata={"page": 0, "source": "dummy.pdf", "ocr_engine": "tesseract"})]

    class _FakeLoader:
        def __init__(self, file_path: str):
            self.file_path = file_path

        def load(self):
            return primary_docs

    monkeypatch.setattr(ingest, "PyPDFLoader", _FakeLoader)
    monkeypatch.setattr(ingest, "_extract_documents_with_tesseract_ocr", lambda _: ocr_docs)
    monkeypatch.setenv("ENABLE_HINDI_OCR_FALLBACK", "true")
    monkeypatch.setenv("HINDI_OCR_CORRUPTION_THRESHOLD", "0.01")
    monkeypatch.setenv("HINDI_OCR_MIN_IMPROVEMENT", "0.001")

    loaded_docs = ingest._load_documents_with_quality_fallback("dummy.pdf")

    assert loaded_docs == ocr_docs


def test_load_documents_keeps_primary_when_ocr_unavailable(monkeypatch):
    primary_docs = [Document(page_content=_GARBLED_HINDI, metadata={"page": 0, "source": "dummy.pdf"})]

    class _FakeLoader:
        def __init__(self, file_path: str):
            self.file_path = file_path

        def load(self):
            return primary_docs

    monkeypatch.setattr(ingest, "PyPDFLoader", _FakeLoader)
    monkeypatch.setattr(ingest, "_extract_documents_with_tesseract_ocr", lambda _: None)
    monkeypatch.setenv("ENABLE_HINDI_OCR_FALLBACK", "true")
    monkeypatch.setenv("HINDI_OCR_CORRUPTION_THRESHOLD", "0.01")

    loaded_docs = ingest._load_documents_with_quality_fallback("dummy.pdf")

    assert loaded_docs == primary_docs