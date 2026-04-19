import uuid
from unittest.mock import patch

from database import Conversation, Document, DocumentChunk


def _create_document_graph(db, user_id: str, filename: str = "sample.pdf") -> Document:
    doc_id = str(uuid.uuid4())
    doc = Document(
        id=doc_id,
        user_id=user_id,
        filename=filename,
        file_path=f"{doc_id}_{filename}",
        file_size="1024",
        chunk_count=1,
        is_active=True,
        status="ready",
    )
    db.add(doc)

    db.add(
        Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            document_id=doc_id,
            messages='[{"type":"human","content":"hello"}]',
        )
    )

    db.add(
        DocumentChunk(
            document_id=doc_id,
            user_id=user_id,
            content="Chunk content",
            chunk_index=0,
            page_num=1,
            source=filename,
        )
    )

    db.commit()
    db.refresh(doc)
    return doc


def test_delete_document_cleans_pinecone_storage_and_chunks(client, registered_user, db):
    doc = _create_document_graph(db, registered_user["user_id"])

    with patch("ingest.delete_namespace", return_value=True) as delete_ns, patch(
        "main.delete_stored_document",
        return_value=True,
    ) as delete_storage:
        response = client.delete(f"/documents/{doc.id}", headers=registered_user["headers"])

    assert response.status_code == 200
    delete_ns.assert_called_once_with(doc.id)
    delete_storage.assert_called_once_with(registered_user["user_id"], doc.file_path)

    assert db.query(Document).filter(Document.id == doc.id).first() is None
    assert (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id, DocumentChunk.user_id == registered_user["user_id"])
        .count()
        == 0
    )
    assert (
        db.query(Conversation)
        .filter(Conversation.document_id == doc.id, Conversation.user_id == registered_user["user_id"])
        .count()
        == 0
    )


def test_delete_document_stops_if_pinecone_cleanup_fails(client, registered_user, db):
    doc = _create_document_graph(db, registered_user["user_id"], filename="keep.pdf")

    with patch("ingest.delete_namespace", return_value=False) as delete_ns, patch(
        "main.delete_stored_document",
        return_value=True,
    ) as delete_storage:
        response = client.delete(f"/documents/{doc.id}", headers=registered_user["headers"])

    assert response.status_code == 500
    assert "Pinecone vectors" in response.json().get("detail", "")
    delete_ns.assert_called_once_with(doc.id)
    delete_storage.assert_not_called()

    assert db.query(Document).filter(Document.id == doc.id).first() is not None
    assert (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id, DocumentChunk.user_id == registered_user["user_id"])
        .count()
        == 1
    )
