import argparse
import os
from typing import Iterable

from sqlalchemy import and_

from database import SessionLocal, User, Document, Conversation
from ingest import delete_namespace


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cleanup users/documents/conversations with optional Pinecone and file cleanup."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually perform deletions. Default is dry-run.",
    )
    parser.add_argument(
        "--all-users",
        action="store_true",
        help="Delete all users and all related records.",
    )
    parser.add_argument(
        "--user-id",
        action="append",
        default=[],
        help="Specific user id to delete. Can be used multiple times.",
    )
    parser.add_argument(
        "--email-contains",
        default=None,
        help="Delete users whose email contains this string (case-insensitive).",
    )
    parser.add_argument(
        "--delete-upload-files",
        action="store_true",
        help="Delete files from uploads/ for deleted and orphaned documents.",
    )
    parser.add_argument(
        "--skip-pinecone",
        action="store_true",
        help="Skip Pinecone namespace deletion.",
    )
    return parser.parse_args()


def list_user_targets(db, args: argparse.Namespace) -> list[User]:
    query = db.query(User)

    filters = []
    if args.user_id:
        filters.append(User.id.in_(args.user_id))
    if args.email_contains:
        filters.append(User.email.ilike(f"%{args.email_contains}%"))

    if args.all_users:
        return query.all()

    if not filters:
        return []

    current = filters[0]
    for condition in filters[1:]:
        current = and_(current, condition)
    return query.filter(current).all()


def remove_local_file(stored_name: str) -> bool:
    if not stored_name:
        return False
    file_path = os.path.join("uploads", stored_name)
    if not os.path.exists(file_path):
        return False
    os.remove(file_path)
    return True


def delete_pinecone_namespaces(namespaces: Iterable[str], skip: bool) -> tuple[int, int]:
    ok = 0
    failed = 0
    if skip:
        return ok, failed

    for namespace in namespaces:
        if not namespace:
            continue
        try:
            delete_namespace(namespace)
            ok += 1
        except Exception:
            failed += 1
    return ok, failed


def main() -> None:
    args = parse_args()
    db = SessionLocal()

    try:
        users_to_delete = list_user_targets(db, args)
        user_ids = [u.id for u in users_to_delete]

        target_docs = []
        target_conversations = []
        if user_ids:
            target_docs = db.query(Document).filter(Document.user_id.in_(user_ids)).all()
            target_conversations = db.query(Conversation).filter(Conversation.user_id.in_(user_ids)).all()

        # Orphans are always cleaned in full cleanup flow.
        existing_user_ids = {row[0] for row in db.query(User.id).all()}
        existing_doc_ids = {row[0] for row in db.query(Document.id).all()}

        orphan_docs = [
            d
            for d in db.query(Document).all()
            if d.user_id not in existing_user_ids
        ]
        orphan_conversations = [
            c
            for c in db.query(Conversation).all()
            if c.user_id not in existing_user_ids or c.document_id not in existing_doc_ids
        ]

        namespaces_for_target_docs = [d.id for d in target_docs]
        namespaces_for_orphan_docs = [d.id for d in orphan_docs]

        print("=== Cleanup Plan ===")
        print(f"Mode: {'APPLY' if args.apply else 'DRY-RUN'}")
        print(f"Users to delete: {len(users_to_delete)}")
        print(f"Documents to delete (target users): {len(target_docs)}")
        print(f"Conversations to delete (target users): {len(target_conversations)}")
        print(f"Orphan documents to delete: {len(orphan_docs)}")
        print(f"Orphan conversations to delete: {len(orphan_conversations)}")
        print(f"Delete upload files: {args.delete_upload_files}")
        print(f"Delete Pinecone namespaces: {not args.skip_pinecone}")

        if not args.apply:
            print("\nDry-run only. Re-run with --apply to execute cleanup.")
            return

        # Delete vector namespaces first so external storage is cleaned before DB rows disappear.
        ok_target, failed_target = delete_pinecone_namespaces(namespaces_for_target_docs, args.skip_pinecone)
        ok_orphan, failed_orphan = delete_pinecone_namespaces(namespaces_for_orphan_docs, args.skip_pinecone)

        deleted_files = 0
        if args.delete_upload_files:
            for doc in target_docs + orphan_docs:
                try:
                    if remove_local_file(doc.file_path):
                        deleted_files += 1
                except Exception:
                    pass

        # Delete rows in dependency-safe order.
        deleted_conv_target = 0
        deleted_docs_target = 0
        deleted_users = 0

        if user_ids:
            deleted_conv_target = (
                db.query(Conversation)
                .filter(Conversation.user_id.in_(user_ids))
                .delete(synchronize_session=False)
            )
            deleted_docs_target = (
                db.query(Document)
                .filter(Document.user_id.in_(user_ids))
                .delete(synchronize_session=False)
            )
            deleted_users = (
                db.query(User)
                .filter(User.id.in_(user_ids))
                .delete(synchronize_session=False)
            )

        orphan_doc_ids = [d.id for d in orphan_docs]
        orphan_conv_ids = [c.id for c in orphan_conversations]

        deleted_orphan_conv = 0
        deleted_orphan_docs = 0

        if orphan_conv_ids:
            deleted_orphan_conv = (
                db.query(Conversation)
                .filter(Conversation.id.in_(orphan_conv_ids))
                .delete(synchronize_session=False)
            )

        if orphan_doc_ids:
            deleted_orphan_docs = (
                db.query(Document)
                .filter(Document.id.in_(orphan_doc_ids))
                .delete(synchronize_session=False)
            )

        db.commit()

        print("\n=== Cleanup Result ===")
        print(f"Deleted users: {deleted_users}")
        print(f"Deleted target documents: {deleted_docs_target}")
        print(f"Deleted target conversations: {deleted_conv_target}")
        print(f"Deleted orphan documents: {deleted_orphan_docs}")
        print(f"Deleted orphan conversations: {deleted_orphan_conv}")
        print(f"Deleted upload files: {deleted_files}")
        print(f"Pinecone namespaces deleted: {ok_target + ok_orphan}")
        print(f"Pinecone namespace delete failures: {failed_target + failed_orphan}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
