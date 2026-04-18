# DocMind AI — Enterprise Document Intelligence

A production-grade **Retrieval-Augmented Generation (RAG)** platform for Indian law firms and CA firms. Upload any PDF and have an intelligent conversation with it — powered by hybrid search, Cohere reranking, and LLaMA-3.3-70b via Groq.

![Tech Stack](https://img.shields.io/badge/LangChain-RAG-blue) ![Groq](https://img.shields.io/badge/Groq-LLaMA--3.3--70b-orange) ![Pinecone](https://img.shields.io/badge/Pinecone-VectorDB-green) ![FastAPI](https://img.shields.io/badge/FastAPI-Backend-teal) ![React](https://img.shields.io/badge/React-Frontend-cyan)

---

## 🧠 How It Works

Traditional search finds exact keywords. This app understands **meaning**.

```
Upload PDF → Extract Text → Split into Chunks → Embed (Cohere) → Store in Pinecone + PostgreSQL

User asks question → Hybrid Retrieval (BM25 + Pinecone) → Cohere Rerank → Send to LLaMA → Get answer
```

1. **PDF Ingestion** — Document is loaded, text extraction quality is checked, Hindi OCR fallback is applied when needed, then text is split into 1000-character chunks with 200-character overlaps, embedded into 1024-dimensional vectors using Cohere, stored in Pinecone (semantic), and raw text chunks persisted to PostgreSQL (for BM25 keyword search)
2. **Hybrid Search** — At query time, BM25 (keyword, weight 0.4) and Pinecone dense retrieval (semantic, weight 0.6) run in parallel via `EnsembleRetriever`, each surfacing top-10 candidates
3. **Cohere Reranking** — The merged candidates are reranked using Cohere's Rerank API, keeping the top-4 most relevant chunks
4. **LLM Generation** — LLaMA-3.3-70b (via Groq) receives your question + reranked context and generates a grounded, accurate answer with source citations. Response language routing supports English, Hindi, and Roman-Hindi (Hinglish) inputs
5. **Conversation Memory** — Chat history is persisted to PostgreSQL per document, enabling natural follow-up questions

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| LLM | Groq + LLaMA-3.3-70b | Fast, free inference |
| Embeddings | Cohere `COHERE_EMBED_MODEL` (default: `embed-english-v3.0`) | Text → vectors (1024 dim) |
| Reranking | Cohere `rerank-english-v3.0` | Context quality boost |
| OCR Fallback | Tesseract + `pytesseract` + `pypdfium2` | Recover Hindi text when PDF extraction is corrupted |
| Vector DB | Pinecone | Semantic similarity search |
| Keyword Search | BM25 (in-memory) | Exact-match retrieval |
| RAG Framework | LangChain | Orchestrates the pipeline |
| Backend | FastAPI + Python | REST API server |
| Database | PostgreSQL + SQLAlchemy | Users, documents, conversations, payments |
| File Storage | Supabase Storage | PDF and profile image hosting |
| Payments | Razorpay (INR + GST) | Subscription billing |
| Auth | JWT + Google OAuth + Email OTP | User authentication |
| Rate Limiting | SlowAPI | Per-endpoint request throttling |
| Frontend | React 19 + Vite + Tailwind CSS v4 + Framer Motion | Glassmorphism chat UI |

---

## 💼 Plan Tiers (INR)

| Plan | Price | Documents | Questions/month | File Size |
|------|-------|-----------|-----------------|-----------|
| Free | ₹0 | 5 uploads | 100 | 10 MB |
| Basic | ₹999/mo | 50 uploads | 1,000 | 50 MB |
| Pro | ₹2,999/mo | Unlimited | Unlimited | 100 MB |
| Enterprise | Custom | Custom | Custom | 500 MB |

Yearly billing available at a discount (Basic: ₹9,999/yr, Pro: ₹19,999/yr).

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Accounts on: [Groq](https://console.groq.com), [Pinecone](https://pinecone.io), [Cohere](https://dashboard.cohere.com), [Supabase](https://supabase.com)

### 1. Clone the repository

```bash
git clone https://github.com/agnt17/rag-enterprise.git
cd rag-enterprise
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder (use `.env.sample` as reference):

```env
DATABASE_URL=postgresql://user:pass@host/dbname
GROQ_API_KEY=your-groq-api-key
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=rag-enterprise
COHERE_API_KEY=your-cohere-api-key
# Optional: set to embed-multilingual-v3.0 for Hindi/multilingual support
COHERE_EMBED_MODEL=embed-english-v3.0
# Optional: Hindi OCR fallback when extracted text is corrupted
ENABLE_HINDI_OCR_FALLBACK=true
HINDI_OCR_CORRUPTION_THRESHOLD=0.035
HINDI_OCR_MIN_IMPROVEMENT=0.010
OCR_LANGS=hin+eng
OCR_RENDER_SCALE=2.0
# Optional override for Windows path, e.g. C:\Program Files\Tesseract-OCR\tesseract.exe
TESSERACT_CMD=
JWT_SECRET=your-long-random-secret
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-razorpay-secret
GOOGLE_CLIENT_ID=your-google-client-id
ADMIN_SECRET=your-admin-secret

# Email verification delivery
EMAIL_MODE=console
EMAIL_FROM=no-reply@yourdomain.com
# Required when EMAIL_MODE=smtp
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

For Hindi OCR fallback, install Tesseract OCR and Hindi language data on your host machine.

Windows quick setup:

```bash
winget install --id tesseract-ocr.tesseract -e
curl -L -o "C:\Program Files\Tesseract-OCR\tessdata\hin.traineddata" "https://github.com/tesseract-ocr/tessdata_best/raw/main/hin.traineddata"
"C:\Program Files\Tesseract-OCR\tesseract.exe" --list-langs
```

Expected output must include `hin`.

If `tesseract` is not on PATH, set:

```env
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe
```

Important: OCR improvements apply at ingestion time. Re-upload or re-ingest existing Hindi PDFs to regenerate corrected chunks.

### 3. Pinecone Index Setup

Create a new index on [pinecone.io](https://pinecone.io) with:
- **Name:** `rag-enterprise`
- **Dimensions:** `1024`
- **Metric:** `cosine`

### 4. Start the Backend

```bash
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`  
API docs available at `http://localhost:8000/docs`

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 📁 Project Structure

```
rag-enterprise/
├── backend/
│   ├── main.py              # FastAPI server — all API endpoints (~1550 lines)
│   ├── rag.py               # RAG pipeline — hybrid search + reranking
│   ├── ingest.py            # PDF ingestion — chunking, embedding, Pinecone + PostgreSQL
│   ├── database.py          # SQLAlchemy ORM — 8 tables + inline migrations
│   ├── auth.py              # JWT + Google OAuth + OTP/magic-link verification
│   ├── payment.py           # Razorpay integration — orders, proration, GST
│   ├── plan_limits.py       # Usage enforcement per plan tier
│   ├── email_service.py     # Email verification sending (console/SMTP)
│   ├── supabase_storage.py  # File upload/download/delete (Supabase)
│   ├── cleanup_data.py      # Admin data cleanup utility
│   ├── reset_db.py          # Development DB reset utility
│   ├── tests/               # pytest test suite
│   │   ├── test_api.py
│   │   ├── test_auth.py
│   │   ├── test_document_upload_quota.py
│   │   ├── test_ingest_hindi_ocr_fallback.py
│   │   └── test_rag_out_of_context.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── AppRouter.jsx           # Routes + global background layers
│   │   ├── App.jsx                 # App shell + chat orchestration
│   │   ├── AuthPage.jsx            # Login / register / email-verify UI
│   │   ├── SettingsPage.jsx        # Profile, billing, security settings
│   │   ├── UpgradePlanPage.jsx     # Pricing + Razorpay checkout
│   │   ├── PremiumWelcomePage.jsx  # Post-upgrade onboarding
│   │   ├── HelpPage.jsx            # FAQ and support
│   │   ├── ProfileDropdown.jsx     # User menu + theme switcher
│   │   ├── MeshBackground.jsx      # Animated gradient mesh
│   │   ├── Toast.jsx               # Global toast notifications
│   │   ├── Loader.jsx              # Spinner primitives
│   │   ├── ErrorBoundary.jsx       # Runtime error boundary
│   │   ├── NotFoundPage.jsx        # 404 page
│   │   ├── ServerErrorPage.jsx     # 500 page
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ChatHeader.jsx
│   │   │   ├── ChatMessages.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── ChatInput.jsx
│   │   │   ├── DocumentRow.jsx
│   │   │   ├── QuickActions.jsx
│   │   │   └── SourceModal.jsx
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── animations.js
│   │   │   ├── themes.js
│   │   │   ├── templates.js
│   │   │   └── utils.js
│   │   └── index.css
│   └── package.json
├── .env.sample              # Environment variables template
└── README.md
```

---

## 🔌 API Endpoints

### Auth

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/register` | Register account and send email verification OTP/magic-link | 5/min |
| `POST` | `/verify-email` | Verify with OTP or magic-link token | 10/15min |
| `POST` | `/resend-verification` | Resend verification email (60s cooldown) | 3/15min |
| `POST` | `/login` | Login verified users, returns JWT | 10/min |
| `POST` | `/auth/google` | Google OAuth login/register | — |
| `GET` | `/me` | Get current user profile + plan info | — |

### Documents

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/upload` | Upload PDF — Supabase storage + background indexing | 10/day |
| `GET` | `/documents` | List all user documents | — |
| `GET` | `/documents/{id}/status` | Poll indexing status: `pending` → `ready` \| `failed` | — |
| `POST` | `/documents/{id}/activate` | Switch active document, returns conversation history | — |
| `DELETE` | `/documents/{id}` | Delete document, Pinecone namespace, and conversation | — |
| `GET` | `/files/{id}` | Get signed Supabase URL for a document (1h expiry) | — |
| `GET` | `/files/{id}/download` | Download document as PDF | — |

### RAG / Query

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/query` | Ask a question about the active document | 20/day |
| `GET` | `/history` | Get chat history for the active document | — |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/profile/details` | Update name, profession, or password |
| `POST` | `/profile/photo` | Upload profile photo to Supabase (5MB max) |
| `DELETE` | `/profile/photo` | Remove profile photo, revert to initials |

### Usage & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/usage` | Get usage summary (docs used, questions used, limits) |
| `GET` | `/analytics` | Monthly/all-time stats + daily trend + top documents |

### Payments & Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/payment/prices` | Get current plan prices |
| `GET` | `/payment/calculate-upgrade` | Preview prorated cost for a plan change |
| `POST` | `/payment/create-order` | Create a Razorpay order (with optional coupon) |
| `POST` | `/payment/verify` | Verify payment signature and activate plan |
| `POST` | `/coupon/validate` | Validate a coupon code and preview discount |
| `POST` | `/subscription/cancel` | Cancel subscription (stays active until expiry) |
| `GET` | `/billing/history` | Get payment history (last 20 payments) |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/cleanup-data` | Delete users/documents/conversations; requires `Authorization: Bearer <ADMIN_SECRET>` |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check — used by keep-alive cron |

### Admin Cleanup Endpoint

**POST** `/admin/cleanup-data` — Dry-run or execute data cleanup.

**Required header:** `Authorization: Bearer <ADMIN_SECRET>`

**Request body:**
```json
{
  "mode": "all",
  "email_filter": null,
  "delete_upload_files": true,
  "skip_pinecone": false,
  "confirm": false
}
```

**Fields:**
- `mode`: `"all"` (all users), `"test"` (emails containing "test"), or any string (filtered by `email_filter`)
- `email_filter`: Case-insensitive email substring match (used when `mode` is not `"all"` or `"test"`)
- `delete_upload_files`: If `true`, delete files from Supabase for deleted documents
- `skip_pinecone`: If `true`, skip Pinecone namespace deletion
- `confirm`: `false` = dry-run preview only; `true` = execute cleanup

**Example: Dry-run preview**
```bash
curl -X POST http://localhost:8000/admin/cleanup-data \
  -H "Authorization: Bearer your-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"mode": "all", "confirm": false}'
```

**Example: Execute cleanup**
```bash
curl -X POST http://localhost:8000/admin/cleanup-data \
  -H "Authorization: Bearer your-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"mode": "all", "delete_upload_files": true, "confirm": true}'
```

---

## ⚙️ Configuration

| Variable | Description | Where to Get |
|----------|-------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Render / Supabase DB |
| `GROQ_API_KEY` | LLM inference API key | [console.groq.com](https://console.groq.com) |
| `PINECONE_API_KEY` | Vector database key | [pinecone.io](https://pinecone.io) |
| `PINECONE_INDEX_NAME` | Name of your Pinecone index | Your Pinecone dashboard |
| `COHERE_API_KEY` | Embeddings + reranking API key | [dashboard.cohere.com](https://dashboard.cohere.com) |
| `JWT_SECRET` | Secret key used to sign login tokens | Generate securely (32+ random bytes) |
| `FRONTEND_URL` | Frontend URL used in email magic links | Your deployed frontend URL |
| `SUPABASE_URL` | Supabase project URL | [supabase.com](https://supabase.com) |
| `SUPABASE_KEY` | Supabase anon/service key | Supabase dashboard |
| `RAZORPAY_KEY_ID` | Razorpay public key | [razorpay.com](https://razorpay.com) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | Razorpay dashboard |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [console.cloud.google.com](https://console.cloud.google.com) |
| `ADMIN_SECRET` | Bearer token for admin endpoints | Generate securely |
| `EMAIL_MODE` | `console` for dev or `smtp` for real email delivery | Set manually |
| `EMAIL_FROM` | Sender email shown in verification emails | Your verified sender domain |
| `SMTP_HOST` | SMTP server host | Your mail provider |
| `SMTP_PORT` | SMTP server port | Usually 587 |
| `SMTP_USER` | SMTP auth username | Your mail provider |
| `SMTP_PASSWORD` | SMTP auth password | Your mail provider |

---

## 🗺️ Roadmap

### ✅ Phase 1–5 — Complete

- [x] PDF upload and ingestion
- [x] Semantic search with Pinecone
- [x] Conversational memory (PostgreSQL)
- [x] Source citations (page numbers)
- [x] Multi-document support with isolated Pinecone namespaces
- [x] User authentication (JWT + Google OAuth + email OTP/magic-link)
- [x] Subscription tiers with Razorpay payments (Free / Basic / Pro / Enterprise)
- [x] Prorated plan upgrades with GST breakdown
- [x] Coupon system (percentage + flat INR discounts)
- [x] Profile management (avatar, profession, password change)
- [x] Supabase file storage (PDFs + profile images)
- [x] CI/CD pipeline (GitHub Actions) with automated tests
- [x] Deployment on Render + Vercel
- [x] Hybrid search (BM25 keyword + Pinecone semantic via EnsembleRetriever)
- [x] Cohere re-ranking for higher-quality context selection
- [x] Usage analytics endpoint (`GET /analytics`)
- [x] Background PDF indexing — upload returns in ~2-3s, polling via `GET /documents/{id}/status`
- [x] Keep-alive cron job (cron-job.org) — eliminates Render cold-start login delays
- [x] Glassmorphism UI — mobile-first responsive design with animated mesh background

### 🔮 Future

- [ ] RAGAS evaluation metrics (answer quality scoring)
- [ ] Razorpay payment webhooks (auto-renewal)
- [ ] Multi-format support (Word, Excel, web pages)
- [ ] Chat export (PDF/Markdown)
- [ ] Team collaboration and shared document workspaces
- [ ] WhatsApp Business API integration
- [ ] Slack / Teams integration

---

## 🧩 Key Concepts

**RAG (Retrieval-Augmented Generation)** — Instead of sending the entire document to the LLM (expensive and often impossible due to token limits), RAG retrieves only the most relevant chunks and sends those. This results in faster, cheaper, and more accurate responses.

**Hybrid Search** — Combines BM25 keyword retrieval (great for exact entity names, clause numbers) with Pinecone semantic search (great for meaning). Both run in parallel via `EnsembleRetriever` and results are merged, giving the best of both worlds.

**Cohere Reranking** — After hybrid retrieval surfaces 20 candidates (10 from each retriever), Cohere's Rerank API reorders them by relevance to the specific question, keeping only the top-4. This significantly improves answer accuracy for complex queries.

**Vector Embeddings** — Text converted into arrays of numbers where semantic similarity = numerical proximity. "refund policy" and "money back guarantee" produce similar vectors even though they share no words.

**Chunking Strategy** — Documents are split into 1000-character chunks with 200-character overlaps. The overlap ensures that answers spanning chunk boundaries aren't lost.

**Pinecone Namespaces** — Each document's Pinecone vectors are stored under a namespace equal to its UUID. This enables multi-document support with complete isolation between documents.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/add-citations`)
3. Commit your changes (`git commit -m 'Add source citations'`)
4. Push to the branch (`git push origin feature/add-citations`)
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use this project for learning, portfolio, or building your own product.

---

## 👨‍💻 Built By

**Aditya Gupta** — Software Engineer specializing in AI-native systems and cloud infrastructure.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://www.linkedin.com/in/itsadityagupta17/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black)](https://github.com/agnt17)
