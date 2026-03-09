# DocMind AI — Complete Project Walkthrough
### "How I built an Enterprise RAG Application using AI-assisted development"

---

## 1. THE BIG PICTURE — What Did I Build?

I built **DocMind AI** — a full-stack web application that lets users upload any PDF document and have an intelligent conversation with it using natural language.

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
PDF → Extract Text → Split into Chunks → Convert to Vectors → Store in Pinecone

QUERY PHASE (happens every time you ask a question)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question → Convert to Vector → Find Similar Chunks → Send to LLM → Get Answer
```

Instead of sending the entire document, RAG:
1. Breaks the document into small pieces (chunks)
2. Converts each piece into a mathematical representation (vector/embedding)
3. Stores all vectors in a vector database (Pinecone)
4. When you ask a question, converts your question to a vector
5. Finds the 4 most similar chunks using math (cosine similarity)
6. Sends ONLY those 4 chunks + your question to the LLM
7. Gets a grounded, accurate answer

**The result:** Fast, cheap, accurate answers — regardless of document size.

---

## 3. PROJECT STRUCTURE — The Architecture

```
rag-enterprise/
│
├── backend/                    ← Python FastAPI server
│   ├── main.py                 ← API gateway (entry point)
│   ├── ingest.py               ← PDF processing pipeline
│   ├── rag.py                  ← Query engine
│   └── requirements.txt        ← Python dependencies
│
├── frontend/                   ← React application
│   └── src/
│       ├── App.jsx             ← Entire frontend UI
│       └── index.css           ← Tailwind CSS
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
- Instead of writing custom code to connect PDF loading → chunking → embedding → retrieval → LLM, LangChain provides pre-built connectors
- Uses LCEL (LangChain Expression Language) — a pipe-based syntax where each step feeds into the next: `retrieve | prompt | llm | parse`

**Groq + LLaMA-3.3-70b**
- Why Groq instead of OpenAI? Groq runs LLaMA models on custom hardware called LPUs (Language Processing Units) — they're 10x faster than GPUs
- LLaMA-3.3-70b is Meta's open-source model that rivals GPT-4 in quality
- Most importantly: **completely free tier** — critical for a portfolio project

**Cohere Embeddings**
- Converts text to vectors (384 numbers per sentence that represent meaning)
- Why Cohere over HuggingFace? HuggingFace runs locally and needs 500MB+ RAM — too heavy for free deployment servers. Cohere is an API call — zero server RAM cost
- Free tier: 1000 calls/month — sufficient for a portfolio project

**Pinecone**
- A vector database — specifically designed to store and search millions of vectors with millisecond response time
- Why not a regular database? Regular databases (PostgreSQL, MongoDB) do exact matching. Pinecone does similarity matching — find the 4 most mathematically similar vectors out of millions
- Free tier: 1 index, sufficient for this project

### Frontend

**React + Vite**
- React for the component-based UI (reusable upload zone, message bubbles, etc.)
- Vite instead of Create React App — 10x faster build times, modern tooling

**Tailwind CSS v4**
- Utility-first CSS — write styling directly in JSX without separate CSS files
- v4 changed the configuration completely — no more tailwind.config.js, just `@import "tailwindcss"` in CSS

**Axios**
- HTTP client for making API calls to the FastAPI backend
- Cleaner than native fetch — automatic JSON parsing, better error handling

**React Markdown**
- LLaMA returns responses with markdown formatting (**bold**, bullet points, etc.)
- Without this library, the raw markdown symbols appear as text
- With it, the formatting renders properly in the chat interface

---

## 5. FILE BY FILE BREAKDOWN

### `ingest.py` — The Document Processing Pipeline

This file runs once every time a user uploads a PDF. Its job is to take a raw PDF and turn it into searchable vectors in Pinecone.

**Step 1 — Clean Slate**
```python
stats = index.describe_index_stats()
if stats.total_vector_count > 0:
    index.delete(delete_all=True)
```
Before ingesting a new document, we check if Pinecone has existing vectors and delete them. Without this, uploading a new PDF would mix its data with the previous document's data — users would get answers from both documents.

**Step 2 — Load PDF**
```python
loader = PyPDFLoader(file_path)
documents = loader.load()
```
PyPDFLoader extracts text from each page and returns a list of Document objects. Each Document has two things: `page_content` (the text) and `metadata` (page number, source filename). A 10-page PDF returns 10 Document objects.

**Step 3 — Chunking**
```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
chunks = splitter.split_documents(documents)
```
Why chunk? Because we need small, focused pieces of text — not entire pages. The "Recursive" splitter tries to split on paragraphs first, then sentences, then words — always preserving meaning.

`chunk_overlap=200` is critical — consecutive chunks share 200 characters. Why? If an answer spans the boundary between two chunks, the overlap ensures neither chunk loses that context.

**Step 4 — Embed and Store**
```python
PineconeVectorStore.from_documents(chunks, embeddings, index_name=...)
```
For every chunk, Cohere converts the text into 1024 numbers that represent its meaning, then uploads those numbers + original text + metadata to Pinecone. This is the most expensive step — it makes one API call per batch of chunks.

---

### `rag.py` — The Query Engine

This file runs every time a user asks a question. Its job is to find relevant context and generate an accurate answer.

**The Memory System**
```python
store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]
```
`store` is a Python dictionary in RAM that holds conversation history. Each session gets its own list of messages. This is why follow-up questions work — "what else did he work on?" knows who "he" refers to because the previous messages are in memory.

**Limitation:** This resets when the server restarts. For production, this would be moved to a database (Redis or PostgreSQL).

**The RAG Chain (LCEL Pipeline)**
```python
chain = (
    RunnablePassthrough.assign(context=lambda x: retriever.invoke(x["question"]))
    | prompt
    | llm
    | StrOutputParser()
)
```
Read this left to right like a Unix pipe:
1. `RunnablePassthrough.assign(context=...)` — runs the retriever on the question, adds the top 4 chunks as `context`
2. `| prompt` — fills the prompt template with context + chat history + question
3. `| llm` — sends everything to LLaMA-3.3-70b via Groq
4. `| StrOutputParser()` — extracts the text string from the LLM response object

**The Prompt Template**
```python
("system", "You are a helpful assistant. Answer based only on the context below:\n\n{context}"),
MessagesPlaceholder(variable_name="chat_history"),
("human", "{question}"),
```
The system prompt tells the LLM to ONLY answer from the provided context — this prevents hallucination. The model won't make up answers because it's explicitly instructed to use only what's in the document.

---

### `main.py` — The API Gateway

This is the entry point — the file uvicorn runs. It defines the HTTP endpoints that the frontend calls.

**CORS Middleware**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://rag-enterprise.vercel.app"],
    ...
)
```
CORS is a browser security feature. When React (on port 5173) calls FastAPI (on port 8000), the browser blocks it by default — they're on different origins. This middleware adds headers telling the browser "requests from these origins are allowed."

**Lazy Loading Pattern**
```python
rag_chain = None

def get_chain():
    global rag_chain
    if rag_chain is None:
        rag_chain = get_rag_chain()
    return rag_chain
```
The RAG chain connects to Pinecone on initialization. We don't do this at server startup because Pinecone might be empty. Instead, we initialize on the first query after a document has been uploaded. We also reset it to `None` on each upload so it reconnects with fresh Pinecone data.

**The Upload Endpoint**
```python
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
```
`async def` means FastAPI can handle other requests while this one is processing. For large PDFs that take 10+ seconds to index, this prevents the server from being completely blocked.

---

### `App.jsx` — The Entire Frontend

**State Management**
```javascript
const [messages, setMessages] = useState([])
const [uploading, setUploading] = useState(false)
const [uploadedFile, setUploadedFile] = useState(null)
const [loading, setLoading] = useState(false)
```
Four pieces of state drive the entire UI:
- `messages` — array of all chat messages, each with role (user/ai/system), text, and timestamp
- `uploading` — shows the progress bar animation during PDF processing
- `uploadedFile` — once set, enables the input box
- `loading` — shows the bouncing dots animation while waiting for AI response

**The Upload Flow**
```javascript
const uploadPDF = async (e) => {
    const form = new FormData()
    form.append("file", file)
    await axios.post(`${API}/upload`, form)
}
```
`FormData` is the browser's way of sending files over HTTP — the same format as an HTML form submission. The file goes as multipart/form-data which FastAPI's `UploadFile` knows how to receive.

**The Query Flow**
```javascript
setMessages(prev => [...prev, { role: "user", text: q, time: getTime() }])
const res = await axios.post(`${API}/query`, { question: q })
setMessages(prev => [...prev, { role: "ai", text: res.data.answer, time: getTime() }])
```
We add the user message immediately (optimistic UI — don't wait for the server), then await the AI response and add it when it arrives. This makes the interface feel responsive.

---

## 6. THE DEPLOYMENT ARCHITECTURE

```
User Browser
    ↓ HTTPS
Vercel (Frontend — React)
    ↓ HTTPS API calls
Render (Backend — FastAPI)
    ↓ HTTPS
Pinecone (Vector DB — Cloud)
    ↓ API
Cohere (Embeddings — Cloud)
    ↓ API
Groq (LLM — Cloud)
```

**Why Vercel for frontend?**
Vercel is made by the creators of Next.js — it's the gold standard for deploying React/Next.js apps. Free tier, automatic deployments on git push, global CDN, HTTPS automatic.

**Why Render for backend?**
Render is the most straightforward Python deployment platform. Connect GitHub repo, add environment variables, deploy. Free tier spins down after 15 minutes of inactivity (first request takes ~50 seconds to wake up) — upgrade to $7/month for always-on.

**Environment Variables — Security**
API keys are never in the code. They're stored in:
- `.env` file locally (added to `.gitignore` — never committed to GitHub)
- Render dashboard → Environment Variables (for production backend)
- Vercel dashboard → Environment Variables (for production frontend)

---

## 7. KEY TECHNICAL DECISIONS AND TRADE-OFFS

**Decision 1: Cohere over HuggingFace for embeddings**
- HuggingFace runs the model locally — great for local dev, needs 500MB RAM on server
- Free deployment servers (Render) have 512MB total RAM — HuggingFace would crash it
- Cohere is an API call — uses ~0MB server RAM, perfect for free deployment
- Trade-off: Adds a dependency on Cohere's service, 1000 free calls/month limit

**Decision 2: Groq over OpenAI**
- OpenAI requires a credit card and charges per token
- Groq is genuinely free with generous limits, and actually faster than OpenAI
- LLaMA-3.3-70b quality is comparable to GPT-4 for document Q&A tasks
- Trade-off: Less community documentation, fewer model options

**Decision 3: In-memory chat history over database**
- Simpler to implement — no database setup needed
- Works perfectly for single-user demo/portfolio use
- Trade-off: History lost on server restart, doesn't scale to multiple users
- Future fix: Move to Redis (fast in-memory database) or PostgreSQL

**Decision 4: Delete all vectors on new upload**
- Simple, clean implementation — one document at a time
- Prevents data mixing between documents
- Trade-off: Can't query multiple documents simultaneously
- Future fix: Use Pinecone namespaces to store each document separately

---

## 8. HOW I USED AI ASSISTANCE IN DEVELOPMENT

This is specifically what the prompt is asking about. Here's an honest account:

**Architecture decisions**
Used Claude to decide the tech stack — specifically why Groq over OpenAI (free tier), why Cohere over HuggingFace (deployment RAM constraints), and the overall RAG architecture pattern.

**Debugging dependency conflicts**
LangChain had major breaking changes in 2024 — the package was split into `langchain`, `langchain-core`, `langchain-community`, `langchain-text-splitters`. Used AI to identify which package each import belonged to after migration errors.

**LCEL chain syntax**
The pipe-based chain syntax (`retrieve | prompt | llm | parse`) is LangChain-specific. Used AI to understand how `RunnablePassthrough.assign` works and why `RunnableWithMessageHistory` is the modern replacement for the deprecated `ConversationalRetrievalChain`.

**CORS debugging**
The trailing slash bug (`"https://rag-enterprise.vercel.app/"` vs `"https://rag-enterprise.vercel.app"`) was identified by Claude after I shared the error — a subtle bug that would have taken hours to find manually.

**What I understood and owned:**
Every line of code was explained to me and I understand what it does. I can explain the RAG concept, why chunking matters, what embeddings are, how cosine similarity works, why async is important, and every architectural decision made.

**The key insight about AI-assisted development:**
AI doesn't replace understanding — it accelerates it. The difference between using AI and not using AI is the difference between spending 2 weeks fighting dependency errors and spending 2 hours building the actual product. The understanding has to be yours.

---

## 9. HOW TO SCALE THIS — The Path to Production

### Current State (MVP)
- 1 user at a time
- 1 document at a time
- In-memory chat history
- Free tier services

### Scale to 100 Users
**Add user authentication (JWT)**
Each user logs in, gets a token, their requests are identified. FastAPI has excellent JWT support via `python-jose`.

**Add Pinecone namespaces**
```python
# Instead of one shared index, each user gets their own space
PineconeVectorStore.from_documents(chunks, embeddings, namespace=user_id)
```

**Add PostgreSQL**
Store users, their uploaded documents, and chat history. Use `asyncpg` for async database queries.

### Scale to 10,000 Users
**Add a job queue (Celery + Redis)**
PDF processing takes 10-30 seconds. Instead of making the user wait, add it to a queue and notify when done.

**Add hybrid search**
Combine vector search (semantic) with keyword search (BM25) for better retrieval accuracy. Pinecone supports this natively.

**Add re-ranking**
After retrieving 10 chunks, use Cohere's reranker to select the best 4. Significant quality improvement for complex questions.

### Make It a Real SaaS Product
- **Stripe integration** — charge $20/month, offer different tiers by document count
- **Multi-format support** — Word docs, Excel files, web pages (not just PDFs)
- **Source citations** — show exactly which page each answer came from
- **RAGAS evaluation** — automated quality scoring for faithfulness and relevancy
- **Slack/Teams integration** — query documents directly from messaging apps

---

## 10. WHAT THIS PROJECT DEMONSTRATES

**For interviews, this project shows:**

1. **Full-stack capability** — Python backend + React frontend, both deployed and working together

2. **Modern AI/ML engineering** — RAG architecture is the dominant pattern in production AI systems today. Every company building document AI uses this pattern.

3. **System design thinking** — made conscious trade-offs (Cohere vs HuggingFace, in-memory vs database) with clear reasoning

4. **Production mindset** — environment variables, CORS, async endpoints, deployment — not just "works on my machine"

5. **Learning velocity** — went from concept to deployed product, debugging real production issues (Pinecone 404, CORS trailing slash, Tailwind v4 config changes)

6. **Understanding of the AI stack** — can explain embeddings, vector similarity, chunking strategy, prompt engineering, and why each piece exists

---

## 11. QUICK REFERENCE — KEY TERMS TO KNOW

| Term | What It Means | Where Used |
|------|--------------|------------|
| RAG | Retrieve relevant context, then generate answer | Core architecture |
| Embedding | Text converted to numbers representing meaning | Cohere API |
| Vector | An array of numbers (1024 for Cohere) | Pinecone storage |
| Cosine Similarity | Math that measures how similar two vectors are | Pinecone search |
| Chunking | Splitting documents into small pieces | ingest.py |
| Chunk Overlap | Consecutive chunks share some text | ingest.py |
| LCEL | LangChain pipe syntax for building chains | rag.py |
| CORS | Browser security for cross-origin requests | main.py |
| Lazy Loading | Initialize only when first needed | main.py |
| Namespace | Isolated space in Pinecone per user/document | Future scaling |

---

*Built by Aditya Gupta — March 2026*