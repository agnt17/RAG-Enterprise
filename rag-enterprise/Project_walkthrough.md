# DocMind AI — Complete Project Walkthrough
### "How I built an Enterprise RAG Application using AI-assisted development"

---

## 1. THE BIG PICTURE — What Did I Build?

I built **DocMind AI** — a full-stack web application that lets users upload any PDF document and have an intelligent conversation with it using natural language. It targets Indian law firms and CA firms and is monetised with INR subscription plans via Razorpay.

**The core problem it solves:**
Traditional document search finds exact keywords. If you search "refund policy" in a contract, it only finds those exact words. DocMind AI understands *meaning* — so "money back guarantee" and "refund policy" return the same result because they mean the same thing.

**Real world use cases:**
- A lawyer uploading a 100-page contract and asking "what are the termination clauses?"
- A student uploading a textbook and asking "explain chapter 3 in simple terms"
- An HR manager uploading a policy handbook and answering employee questions instantly
- A developer uploading API documentation and asking "how do I authenticate?"

**The technology behind this is called RAG — Retrieval Augmented Generation.**

---

## 2. WHAT IS RAG — The Core Concept

This is the most important concept in the entire project. Understand this and everything else makes sense.

### The Problem with Just Using an LLM
If you send a 100-page PDF directly to an AI model, two problems arise:
1. **Token limits** — most models can only process ~32,000 words at once. A large document exceeds this.
2. **Cost** — sending an entire document on every question is extremely expensive.

### How RAG Solves This

```
INGESTION PHASE (happens once when you upload)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF → Extract Text → Split into Chunks → Embed (Cohere) → Store in Pinecone + PostgreSQL

QUERY PHASE (happens every time you ask a question)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question → Hybrid Retrieval (BM25 + Pinecone) → Cohere Rerank (top-4) → LLM → Answer
```

Instead of sending the entire document, RAG:
1. Breaks the document into small pieces (chunks)
2. Converts each piece into a mathematical representation (vector/embedding)
3. Stores vectors in Pinecone (semantic) and raw text in PostgreSQL (for BM25 keyword search)
4. When you ask a question, runs both BM25 keyword search and Pinecone semantic search in parallel
5. Merges all candidates (up to 20) and reranks them with Cohere's Rerank API
6. Keeps only the top-4 highest-quality chunks
7. Sends those 4 chunks + your question to the LLM
8. Gets a grounded, accurate answer with source citations

**The result:** Fast, cheap, accurate answers — regardless of document size.

---

## 3. PROJECT STRUCTURE — The Architecture

```
rag-enterprise/
│
├── backend/                    ← Python FastAPI server
│   ├── main.py                 ← API gateway (~1550 lines, all endpoints)
│   ├── database.py             ← SQLAlchemy ORM (8 tables + inline migrations)
│   ├── auth.py                 ← JWT + Google OAuth + OTP/magic-link verification
│   ├── ingest.py               ← PDF processing pipeline
│   ├── rag.py                  ← Hybrid search + reranking query engine
│   ├── payment.py              ← Razorpay + proration + GST
│   ├── plan_limits.py          ← Plan enforcement + usage tracking
│   ├── email_service.py        ← Email verification (console or SMTP)
│   ├── supabase_storage.py     ← Supabase Storage (PDFs + profile images)
│   ├── cleanup_data.py         ← Admin cleanup utility
│   ├── reset_db.py             ← Dev DB reset utility
│   ├── tests/                  ← pytest test suite
│   │   ├── test_api.py
│   │   ├── test_auth.py
│   │   ├── test_document_upload_quota.py
│   │   └── test_rag_out_of_context.py
│   └── requirements.txt        ← Python dependencies
│
├── frontend/                   ← React application
│   └── src/
│       ├── AppRouter.jsx       ← Routes + global background layers
│       ├── App.jsx             ← App shell + chat state orchestration
│       ├── AuthPage.jsx        ← Login / register / email-verify flow
│       ├── SettingsPage.jsx    ← Profile, billing, security settings
│       ├── UpgradePlanPage.jsx ← Pricing + Razorpay checkout
│       ├── PremiumWelcomePage.jsx ← Post-upgrade onboarding
│       ├── HelpPage.jsx        ← FAQ and support
│       ├── ProfileDropdown.jsx ← User menu + theme switcher
│       ├── MeshBackground.jsx  ← Animated gradient mesh
│       ├── Toast.jsx           ← Global toast notification system
│       ├── Loader.jsx          ← Spinner/button-loader primitives
│       ├── ErrorBoundary.jsx   ← Runtime error boundary
│       ├── NotFoundPage.jsx    ← 404 page
│       ├── ServerErrorPage.jsx ← 500 page
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── ChatHeader.jsx
│       │   ├── ChatMessages.jsx
│       │   ├── MessageBubble.jsx
│       │   ├── ChatInput.jsx
│       │   ├── QuickActions.jsx
│       │   ├── DocumentRow.jsx
│       │   └── SourceModal.jsx
│       ├── lib/                ← themes, animations, api, utils, templates
│       └── index.css           ← Global styles + shimmer/focus utilities
│
├── .env                        ← Secret API keys (never committed)
├── .env.sample                 ← Template showing what keys are needed
└── README.md
```

**Why this separation?**
The backend and frontend are completely independent applications that communicate via HTTP. This is the industry standard pattern because:
- You can deploy them separately (Render for backend, Vercel for frontend)
- You can swap the frontend (web, mobile, desktop) without touching the backend
- Teams can work on each independently

---

## 4. THE TECH STACK — Why I Chose Each Tool

### Backend

**FastAPI (Python)**
- Why not Flask or Django? FastAPI is specifically designed for AI/ML APIs — it's async by default, has automatic API documentation, and is the industry standard for Python AI backends
- Async means the server can handle multiple requests simultaneously without blocking

**LangChain**
- The orchestration framework that connects everything together
- Uses `EnsembleRetriever` to merge BM25 + Pinecone results in one call
- LCEL (LangChain Expression Language) pipe syntax: `prompt | llm | parser`

**Groq + LLaMA-3.3-70b**
- Why Groq instead of OpenAI? Groq runs LLaMA models on custom hardware called LPUs (Language Processing Units) — they're 10x faster than GPUs
- LLaMA-3.3-70b is Meta's open-source model that rivals GPT-4 in quality
- Most importantly: **completely free tier** — critical for a portfolio/early-stage product

**Cohere — Embeddings + Reranking**
- `COHERE_EMBED_MODEL` (default: `embed-english-v3.0`): Converts text to 1024-dimensional vectors
- `rerank-english-v3.0`: Takes 20 retrieved candidates and reranks them by relevance — the single biggest quality improvement in Phase 5
- Why Cohere over HuggingFace? HuggingFace runs the model locally and needs 500MB+ RAM — too heavy for free deployment servers. Cohere is an API call — zero server RAM cost

**Pinecone**
- A vector database — specifically designed to store and search millions of vectors with millisecond response time
- Each uploaded document gets its own **namespace** (= the document's UUID) for complete isolation
- Why not a regular database? Regular databases do exact matching. Pinecone does similarity matching — find the most mathematically similar vectors out of millions

**BM25 (in-memory keyword search)**
- Classic information retrieval algorithm — great at finding exact entity names, clause numbers, and specific terms that semantic search sometimes misses
- Chunks are persisted to PostgreSQL (`document_chunks` table), loaded into memory at query time
- Weighted 0.4 vs Pinecone's 0.6 in the EnsembleRetriever — dense is weighted higher because meaning matters more for document Q&A, but BM25 anchors precision

**Supabase Storage**
- Cloud file storage for PDF documents and user profile photos
- Generates time-limited signed URLs (1-hour expiry) for secure document access
- Replaces the original local-disk `uploads/` folder for production use

**Razorpay**
- Indian payment gateway — supports UPI, cards, net banking
- Prices in INR with 18% GST computed and stored separately
- Prorated billing: when upgrading mid-cycle, user gets credit for unused days

**PostgreSQL + SQLAlchemy**
- 8 tables: `users`, `documents`, `conversations`, `usage_logs`, `coupons`, `coupon_usages`, `payments`, `document_chunks`
- Inline migrations via `_ensure_user_columns()` — no Alembic, no migration files
- Conversation history stored as a JSON string in a single `String` column (simple, no JOIN needed)

**SlowAPI (Rate Limiting)**
- Per-endpoint rate limits: `/register` 5/min, `/login` 10/min, `/upload` 10/day, `/query` 20/day
- Prevents abuse without needing a Redis setup

### Frontend

**React 19 + Vite**
- React for the component-based UI
- Vite instead of Create React App — 10x faster build times, modern tooling

**Tailwind CSS v4**
- Utility-first CSS — write styling directly in JSX without separate CSS files
- v4 config: just `@import "tailwindcss"` in CSS, no `tailwind.config.js`

**Framer Motion**
- Smooth animations: staggered message reveal, sidebar transitions, modal animations

**Glassmorphism Design**
- All pages use backdrop blur, semi-transparent glass cards, and the animated `MeshBackground` gradient mesh
- Mobile-first responsive with `100dvh`, `env(safe-area-inset-bottom)`, and sidebar overlay

---

## 5. FILE BY FILE BREAKDOWN

### `ingest.py` — The Document Processing Pipeline

This file runs once every time a user uploads a PDF. Its job is to take a raw PDF and turn it into searchable vectors in Pinecone, and also persist raw chunks to PostgreSQL for BM25.

**Step 1 — Load PDF with quality guard**
```python
documents = _load_documents_with_quality_fallback(file_path)
```
PyPDFLoader extracts text from each page. If Hindi extraction appears corrupted (split matras/characters), the pipeline can run Tesseract OCR fallback (`pytesseract` + `pypdfium2`) and switch to OCR text only when quality improves. A 10-page PDF returns 10 Document objects with `page_content` and metadata.

**Step 2 — Chunking**
```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
chunks = splitter.split_documents(documents)
```
The "Recursive" splitter tries to split on paragraphs first, then sentences, then words — preserving meaning. `chunk_overlap=200` ensures context isn't lost at boundaries.

**Step 3 — Embed and Store in Pinecone**
```python
PineconeVectorStore.from_documents(chunks, embeddings, index_name=..., namespace=document_id)
```
Cohere converts each chunk into a 1024-dimensional vector, then uploads to Pinecone under the document's UUID namespace. Each document has its own namespace — deleting a document deletes only its vectors.

**Step 4 — Persist chunks to PostgreSQL (for BM25)**
```python
DocumentChunk(document_id=document_id, content=chunk.page_content, page_num=..., chunk_index=i)
```
Raw text chunks are saved to the `document_chunks` table. At query time, these are loaded into memory to build an in-memory BM25Retriever.

---

### `rag.py` — The Query Engine (Phase 5: Hybrid Search + Reranking)

This file runs every time a user asks a question. It implements the full pipeline.

**Step 1 — Dense (semantic) retriever via Pinecone**
```python
vectorstore = PineconeVectorStore(index_name=..., embedding=embeddings, namespace=namespace)
dense_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})
```

**Step 2 — Sparse (keyword) retriever via BM25**
```python
bm25_retriever = _build_bm25_retriever(db, document_id, k=10)
```
Loads chunks from PostgreSQL and builds an in-memory BM25 retriever. Returns `None` for legacy documents (graceful fallback to dense-only).

**Step 3 — Hybrid retrieval with EnsembleRetriever**
```python
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, dense_retriever],
    weights=[0.4, 0.6],
)
retrieved_docs = ensemble_retriever.invoke(question)
```
Both retrievers run in parallel and results are merged and scored. BM25 weight 0.4, dense weight 0.6.

**Step 4 — Cohere Reranking**
```python
reranked_docs, scores = _rerank_with_cohere(question, retrieved_docs, top_n=4)
```
Cohere's `rerank-english-v3.0` model reorders all candidates by relevance to the specific question, keeping only the top-4. This is the single highest-impact quality improvement.

**Step 5 — LLM Chain**
```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer based ONLY on the context below..."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])
chain = prompt | llm | StrOutputParser()
```
The system prompt strictly constrains the LLM to only use the provided context, preventing hallucination.

**Chat History — PostgreSQL-backed**
```python
class PostgresChatMessageHistory(BaseChatMessageHistory):
    ...
```
Unlike the original in-memory `store = {}`, conversation history is now persisted to the `conversations` table in PostgreSQL. History survives server restarts and scales to multiple users. Each conversation is stored as a JSON array of messages in a single `String` column.

**Source Citations**
Each answer includes a `sources` list with page numbers, source filename, and a 300-character excerpt. The `_normalize_source_page_number` helper unifies 0-indexed Pinecone pages and 1-indexed BM25 chunks into display-safe 1-indexed page numbers.

**Out-of-Context Detection**
If retrieval returns no usable content, or the LLM explicitly returns the out-of-context sentinel message, sources are hidden and the sentinel is returned directly. This prevents hallucination responses.

**Language Routing (Hindi + Hinglish)**
`rag.py` now detects response language from the question. Devanagari queries route to Hindi, and common Roman-Hindi (Hinglish) patterns also route to Hindi. This improves consistency for users who speak Hindi but type in Latin script.

---

### `main.py` — The API Gateway

This is the entry point. It defines all ~25 HTTP endpoints.

**CORS Middleware**
```python
allow_origins=["http://localhost:5173", "https://rag-enterprise.vercel.app"]
```

**Background Upload Pattern**
```python
@app.post("/upload")
async def upload_pdf(background_tasks: BackgroundTasks, ...):
    # 1. Validate plan limits, file type, file size, magic bytes
    # 2. Upload to Supabase Storage
    # 3. Create DB record (status="pending")
    # 4. Log upload credit
    background_tasks.add_task(_run_ingest, temp_path, doc_id, ...)
    return {"status": "pending", "document_id": doc_id}
```
Returns in ~2-3s. Frontend polls `GET /documents/{id}/status` every 2s until `"ready"`.

**Plan Enforcement Pattern**
Every protected endpoint calls `check_document_limit()` or `check_question_limit()` before doing any work. Upload credits are consumed on acceptance (not refunded on deletion — this is intentional business logic).

**Rate Limiting**
All sensitive endpoints use `@limiter.limit()`:
- `/register`: 5/minute
- `/login`: 10/minute
- `/verify-email`: 10/15 minutes
- `/resend-verification`: 3/15 minutes
- `/upload`: 10/day
- `/query`: 20/day

**Plan Expiration**
`check_and_expire_plan()` is called on every `/me` and `/login` response. If the user's `plan_expires_at` has passed, their plan is automatically downgraded to `"free"`.

---

### `database.py` — The 8-Table Schema

| Table | Purpose |
|-------|---------|
| `users` | Auth, billing, profession, email verification state |
| `documents` | Uploaded PDFs — UUID is the Pinecone namespace; `status`: `pending`/`ready`/`failed` |
| `conversations` | Per-document chat history (JSON messages array in a String column) |
| `usage_logs` | Question + upload events for plan enforcement + analytics |
| `coupons` | Promo codes (percentage or flat INR discounts, per-user limits) |
| `coupon_usages` | Per-user coupon redemption tracking |
| `payments` | Razorpay billing history with GST stored separately |
| `document_chunks` | Raw text chunks for BM25 hybrid search |

Schema changes are applied inline via `_ensure_user_columns()` — no Alembic, ever.

---

### `payment.py` — Razorpay + Proration + GST

**Prorated Upgrades**
When a user upgrades mid-cycle (e.g., Basic → Pro on day 15 of 30), they get credit for their unused days. The credit is based on the **actual amount they paid** (not the base plan price), preventing a coupon exploit where users could get full-price credit after paying a discounted price.

**GST (18%)**
All amounts are stored in INR. GST is computed and stored separately in the `payments` table. The UI shows a full price breakdown: base → coupon discount → subtotal → GST → total.

**Coupon System**
- Percentage or flat INR discounts
- Per-user redemption limits
- Plan-specific applicability (e.g., only on Pro plan)
- Minimum order amount requirement

---

### `App.jsx` + Modular UI Components — The Frontend

The frontend is a React SPA. `App.jsx` manages all data state and orchestration; rendering is delegated to focused components.

**Component Tree:**
```text
AppRouter
├── Global base color layer
├── MeshBackground (animated gradient blobs)
└── Route handlers
    ├── AuthPage      (login / register / verify-email)
    ├── App           (chat shell)
    │   ├── Sidebar → DocumentRow (×N)
    │   ├── ChatHeader
    │   ├── ChatMessages → MessageBubble (×N)
    │   ├── QuickActions
    │   ├── ChatInput
    │   └── SourceModal
    ├── SettingsPage  (profile + billing + security)
    ├── UpgradePlanPage
    ├── PremiumWelcomePage
    ├── HelpPage
    ├── NotFoundPage
    └── ServerErrorPage
```

**Core State in App.jsx:**
```javascript
const [messages, setMessages] = useState([])
const [uploading, setUploading] = useState(false)
const [uploadedFile, setUploadedFile] = useState(null)
const [loading, setLoading] = useState(false)
const [documents, setDocuments] = useState([])
const [processingDocId, setProcessingDocId] = useState(null) // polling state
const [sidebarOpen, setSidebarOpen] = useState(...)
const [sourceModal, setSourceModal] = useState(null)
const [user, setUser] = useState(null)
```

**The Upload Flow with Background Polling:**
```javascript
// 1. POST /upload → returns immediately with {status: "pending", document_id}
// 2. Frontend polls GET /documents/{id}/status every 2s
// 3. When status === "ready", enable chat input and show success toast
setProcessingDocId(doc_id)
// ... interval polling ...
```

**The Query Flow:**
```javascript
// Optimistic UI — add user message immediately
setMessages(prev => [...prev, { role: "user", text: q, sources: [], time }])
// Await AI response
const res = await axios.post(`${API}/query`, { question: q })
// Add AI message with sources
setMessages(prev => [...prev, {
    role: "ai",
    text: res.data.answer,
    sources: res.data.sources,
    time
}])
```

**Glassmorphism UI:**
- `MeshBackground` renders animated gradient blobs behind all pages
- All cards use `backdrop-filter: blur` + semi-transparent fills
- Safe-area padding: `env(safe-area-inset-bottom)` for mobile browsers
- `100dvh` shell prevents layout jumps on mobile (accounts for browser chrome)
- Sidebar overlay on mobile, persistent on ≥1024px

---

## 6. THE DEPLOYMENT ARCHITECTURE

```
User Browser
    ↓ HTTPS
Vercel (Frontend — React SPA)
    ↓ HTTPS API calls
Render (Backend — FastAPI)
    ├── ↓ HTTPS      Pinecone (Vector DB — Cloud)
    ├── ↓ API        Cohere (Embeddings + Reranking — Cloud)
    ├── ↓ API        Groq (LLM — Cloud)
    ├── ↓ HTTPS      Supabase (File Storage — Cloud)
    └── ↓ HTTPS      PostgreSQL (Managed DB — Render/Supabase)
```

**Why Vercel for frontend?**
Vercel is the gold standard for React/Next.js apps. Free tier, automatic deployments on git push, global CDN, HTTPS automatic.

**Why Render for backend?**
Straightforward Python deployment. Free tier spins down after 15 minutes of inactivity — a keep-alive cron job on cron-job.org pings `/health` every 10 minutes to prevent cold starts.

**Environment Variables — Security**
API keys are never in the code. They're stored in:
- `.env` file locally (added to `.gitignore`)
- Render dashboard → Environment Variables (production backend)
- Vercel dashboard → Environment Variables (production frontend)

---

## 7. KEY TECHNICAL DECISIONS AND TRADE-OFFS

**Decision 1: Hybrid Search over Pure Semantic Search**
- Semantic search alone misses exact entity names, clause numbers, and case citations
- BM25 alone misses paraphrased queries and conceptual questions
- EnsembleRetriever with weights [0.4, 0.6] gets the best of both
- Trade-off: More complex pipeline; requires persisting chunks to PostgreSQL

**Decision 2: Cohere Reranking**
- The biggest single quality improvement in Phase 5
- Without it, the top-4 from hybrid search might include noise; with it, the model gets the 4 most precisely relevant chunks
- Trade-off: Adds an extra API call per query; graceful fallback if Cohere is down

**Decision 3: Supabase Storage over Local Disk**
- Local disk storage doesn't survive Render restarts on free tier
- Supabase gives permanent cloud storage with signed URLs for security
- Trade-off: Adds a dependency; file access goes through an extra HTTP hop

**Decision 4: PostgreSQL Chat History over In-Memory**
- Original design stored history in a Python dict (`store = {}`), reset on server restart
- PostgreSQL history persists forever, supports multiple users, and survives deployments
- Trade-off: Slightly more complex `PostgresChatMessageHistory` class; every message does a DB commit

**Decision 5: Inline Migrations over Alembic**
- Alembic requires migration files, version tracking, and careful sequencing
- `_ensure_user_columns()` adds missing columns if they don't exist — zero setup, always safe
- Trade-off: Not suitable for column renames or type changes (need manual DB intervention)

**Decision 6: Upload Credits (non-refundable)**
- `get_user_uploaded_documents_count()` counts lifetime upload events from `usage_logs`, not active documents
- Deleting a document does NOT refund the upload credit
- Trade-off: Stricter for users, but prevents the exploit where users delete + re-upload to reset their quota

**Decision 7: Cohere over HuggingFace for embeddings**
- HuggingFace runs the model locally — needs 500MB+ RAM
- Free deployment servers (Render) have 512MB total RAM — HuggingFace would crash it
- Cohere is an API call — ~0MB server RAM cost
- Trade-off: 1000 free API calls/month limit (but enough for dev/portfolio use)

---

## 8. HOW I USED AI ASSISTANCE IN DEVELOPMENT

**Architecture decisions**
Used Claude to design the hybrid search architecture — specifically how to weight BM25 vs. dense retrieval, and why Cohere reranking provides better quality than just returning top-K from the ensemble.

**Debugging dependency conflicts**
LangChain had major breaking changes in 2024. The split into `langchain-classic` (for EnsembleRetriever) vs `langchain-community` required AI assistance to trace which package each import lived in after the migration.

**LCEL chain syntax**
The pipe-based chain syntax and `RunnablePassthrough` patterns are LangChain-specific. Used AI to understand composition patterns for the hybrid pipeline.

**Payment proration logic**
The coupon-exploit protection (crediting actual paid amount, not base price) was a non-obvious edge case identified and solved with AI assistance.

**What I understood and owned:**
Every architectural decision — why hybrid search, why reranking, how proration works, the namespace = document UUID contract, why BM25 upload credits are non-refundable. The understanding has to be yours. AI accelerates — it doesn't replace.

---

## 9. HOW TO SCALE THIS — The Path to Production

### Current State
- Multi-user (JWT auth, per-user namespaces)
- Multi-document (document switching with isolated conversations)
- PostgreSQL-backed history (survives restarts)
- Supabase file storage (survives restarts)
- Razorpay subscriptions with usage enforcement

### Scale to 10,000 Users
**Add a job queue (Celery + Redis)**
PDF processing takes 10-30 seconds. Move from FastAPI `BackgroundTasks` to a proper queue for retry logic and visibility.

**Cache BM25 retrievers**
Currently rebuilt from DB on every query. Cache per `document_id` with TTL eviction.

**Add Redis for rate limiting**
SlowAPI in-memory counters reset on restart. Redis-backed counters survive restarts and work across multiple instances.

### Make It a Full SaaS Product
- **Razorpay webhooks** — auto-renewal instead of manual re-subscription
- **Multi-format support** — Word, Excel, web pages
- **RAGAS evaluation** — automated answer quality scoring (faithfulness + relevancy)
- **Chat export** — download conversation as PDF or Markdown
- **WhatsApp Business API** — query documents from WhatsApp for tier-2 city users
- **Team workspaces** — shared documents across law firm team members

---

## 10. WHAT THIS PROJECT DEMONSTRATES

**For interviews, this project shows:**

1. **Full-stack capability** — Python backend + React frontend, both deployed and working together

2. **Modern AI/ML engineering** — RAG + hybrid search + reranking is the production pattern used by every serious document AI product today

3. **System design thinking** — conscious trade-offs (Cohere vs HuggingFace, inline migrations vs Alembic, upload credits as non-refundable) with clear reasoning

4. **Production mindset** — rate limiting, plan enforcement, JWT auth, Supabase storage, GST billing, environment variables, CI/CD

5. **Business understanding** — built for a specific market (Indian law/CA firms), with INR pricing, GST compliance, and profession-specific onboarding

6. **Learning velocity** — went from basic RAG to hybrid search + reranking + payments + multi-tenant auth in sequential phases

7. **Understanding of the AI stack** — can explain embeddings, hybrid retrieval, reranking, chunking strategy, prompt engineering, and why each piece exists

---

## 11. QUICK REFERENCE — KEY TERMS TO KNOW

| Term | What It Means | Where Used |
|------|--------------|------------|
| RAG | Retrieve relevant context, then generate answer | Core architecture |
| Hybrid Search | BM25 (keyword) + Pinecone (semantic) combined | rag.py |
| Reranking | Cohere API reorders retrieved chunks by relevance | rag.py |
| Embedding | Text converted to numbers representing meaning | Cohere API |
| Vector | An array of numbers (1024 for Cohere) | Pinecone storage |
| Cosine Similarity | Math that measures how similar two vectors are | Pinecone search |
| BM25 | Classic keyword relevance algorithm | rag.py, document_chunks table |
| Chunking | Splitting documents into small pieces | ingest.py |
| Chunk Overlap | Consecutive chunks share some text | ingest.py |
| LCEL | LangChain pipe syntax for building chains | rag.py |
| EnsembleRetriever | Merges multiple retrievers' results | rag.py |
| Namespace | Isolated space in Pinecone per document (= document UUID) | ingest.py, rag.py |
| CORS | Browser security for cross-origin requests | main.py |
| Proration | Credit for unused days when upgrading mid-cycle | payment.py |
| Upload Credit | Non-refundable quota consumed on upload acceptance | plan_limits.py |
| OTP | One-time password for email verification | main.py, auth.py |
| Magic Link | One-click email verification URL | main.py, email_service.py |

---

*Built by Aditya Gupta — April 2026*
