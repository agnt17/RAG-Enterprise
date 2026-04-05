/auto# DocMind AI — Claude Code Instructions

## Project Overview
DocMind AI is a production-grade, enterprise RAG platform targeting Indian law firms and CA firms.
Built by Aditya Gupta (sole developer). Deployed on Render (backend) + Vercel (frontend).

## Architecture

### Backend (`backend/`)
- **Framework:** FastAPI + Python
- **Database:** PostgreSQL via SQLAlchemy ORM (`database.py` — 8 tables)
- **Vector DB:** Pinecone (each `document.id` is a Pinecone namespace)
- **Embeddings:** Cohere `embed-english-v3.0`
- **LLM:** LLaMA-3.3-70b via Groq
- **Reranking:** Cohere Rerank API
- **Storage:** Supabase (file storage)
- **Payments:** Razorpay (INR, with GST)
- **Auth:** JWT + Google OAuth + email OTP/magic-link verification
- **Rate limiting:** slowapi

### Frontend
- React 19 + Vite + Tailwind CSS v4 + React Router 7

### Key Backend Files
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, all API endpoints |
| `database.py` | SQLAlchemy ORM models + migrations |
| `rag.py` | RAG query pipeline (hybrid search + reranking) |
| `ingest.py` | PDF ingestion → Pinecone + PostgreSQL |
| `auth.py` | JWT, Google OAuth, OTP, password hashing |
| `payment.py` | Razorpay order creation + verification |
| `plan_limits.py` | Usage enforcement per plan tier |
| `email_service.py` | Email verification sending |
| `supabase_storage.py` | File upload/download/delete |

## Database Tables
1. `users` — auth, billing, profession, email verification
2. `documents` — uploaded PDFs (UUID = Pinecone namespace); `status` column: `"pending"` | `"ready"` | `"failed"`
3. `conversations` — per-document chat history (JSON messages)
4. `usage_logs` — question/upload tracking for plan limits
5. `coupons` — promo codes (percentage or flat INR discounts)
6. `coupon_usages` — per-user coupon redemption tracking
7. `payments` — Razorpay billing history with GST
8. `document_chunks` — raw text chunks for BM25 hybrid search

## Plan Tiers (INR)
| Plan | Price | Docs | Questions/month |
|------|-------|------|-----------------|
| Free | ₹0 | 5 | 100 |
| Basic | ₹999/mo | 50 | 1,000 |
| Pro | ₹2,999/mo | Unlimited | Unlimited |
| Enterprise | Custom | Custom | Custom |

## RAG Pipeline (Phase 5)
Every query goes through:
1. Load chunks from PostgreSQL → in-memory BM25Retriever
2. Connect to Pinecone namespace → dense retriever
3. EnsembleRetriever (BM25 weight 0.4, dense weight 0.6), fetch top-10 each
4. Cohere Rerank → keep top-4 chunks
5. Build context + load chat history from PostgreSQL
6. Call LLaMA-3.3-70b via Groq
7. Persist Q&A with source citations

Constants: `RETRIEVAL_K = 10`, `RERANK_TOP_N = 4`

## Upload Pipeline (Background Indexing)

`POST /upload` returns immediately (~2-3s) after uploading to Supabase and creating the DB record with `status="pending"`. Ingestion runs in a FastAPI `BackgroundTask` (`_run_ingest` in `main.py`) using its own `SessionLocal`. When done it flips `status` to `"ready"` or `"failed"`. Frontend polls `GET /documents/{id}/status` every 2 seconds until resolved.

## Coding Conventions
- Python type hints on all new function signatures
- SQLAlchemy migrations are done inline — `_ensure_user_columns()` for `users`, `_ensure_document_columns()` for `documents`. Never use Alembic.
- UUIDs are used as primary keys for `users`, `documents`, `conversations`, `payments`
- All amounts in INR (float). GST is computed and stored separately.
- Conversations store messages as a JSON string in a single `String` column
- `document.id` doubles as the Pinecone namespace — never change a document's ID after creation
- Do not use `--no-verify` to bypass git hooks
- Keep-alive cron job on cron-job.org pings `/health` every 10 min to prevent Render free tier cold starts

## Environment Variables Required
`DATABASE_URL`, `PINECONE_API_KEY`, `COHERE_API_KEY`, `GROQ_API_KEY`,
`SUPABASE_URL`, `SUPABASE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`JWT_SECRET`, `GOOGLE_CLIENT_ID`, `FRONTEND_URL`, `SMTP_*` (email)

## Deployment
- Backend: Render (`start.sh` entrypoint, `runtime.txt` sets Python version)
- Frontend: Vercel (auto-deploy from main branch)
- CORS allowed origins: `localhost:5173` + `rag-enterprise.vercel.app`

## Business Context
- Target market: Indian SMBs — law firms, CA firms in tier-2 cities
- Payments via Razorpay; prices always in INR
- GST must be shown and stored on all paid transactions
- `profession` field on `User` (`law_firm`, `ca_firm`, `other`) drives targeted onboarding tips

## What NOT to Do
- Don't use Alembic — schema changes go in `_ensure_user_columns()` in `database.py`
- Don't add venv or `__pycache__` to git
- Don't break the `document.id` = Pinecone namespace contract
- Don't add backwards-compatibility shims for removed features — just change the code
- Don't add docstrings/comments to code you didn't touch
