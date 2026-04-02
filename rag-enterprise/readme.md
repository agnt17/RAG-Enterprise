# DocMind AI — Enterprise Document Intelligence

A production-grade **Retrieval-Augmented Generation (RAG)** application that lets you upload any PDF and have an intelligent conversation with it. Built with LangChain, Groq (LLaMA-3.3-70b), Pinecone, and React.

![Tech Stack](https://img.shields.io/badge/LangChain-RAG-blue) ![Groq](https://img.shields.io/badge/Groq-LLaMA--3.3--70b-orange) ![Pinecone](https://img.shields.io/badge/Pinecone-VectorDB-green) ![FastAPI](https://img.shields.io/badge/FastAPI-Backend-teal) ![React](https://img.shields.io/badge/React-Frontend-cyan)

---

## 🧠 How It Works

Traditional search finds exact keywords. This app understands **meaning**.

```
Upload PDF → Extract Text → Split into Chunks → Convert to Vectors → Store in Pinecone

User asks question → Convert to Vector → Find similar chunks → Send to LLaMA → Get answer
```

1. **PDF Ingestion** — Your document is loaded, split into 1000-character chunks with 200-character overlaps, embedded into 1024-dimensional vectors using Cohere, and stored in Pinecone
2. **Semantic Search** — When you ask a question, it's converted to a vector and the top 4 most semantically similar chunks are retrieved from Pinecone
3. **LLM Generation** — LLaMA-3.3-70b (via Groq) receives your question + retrieved context and generates a grounded, accurate answer
4. **Conversation Memory** — Chat history is maintained so you can ask follow-up questions naturally

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| LLM | Groq + LLaMA-3.3-70b | Fast, free inference |
| Embeddings | Cohere `embed-english-light-v3.0` | Text → vectors (1024 dim) |
| Vector DB | Pinecone | Store & search embeddings |
| RAG Framework | LangChain | Orchestrates the pipeline |
| Backend | FastAPI + Python | REST API server |
| Frontend | React + Vite + Tailwind | Chat UI |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Accounts on: [Groq](https://console.groq.com), [Pinecone](https://pinecone.io), [Cohere](https://dashboard.cohere.com)

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
GROQ_API_KEY=your-groq-api-key
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=rag-enterprise
COHERE_API_KEY=your-cohere-api-key
JWT_SECRET=your-long-random-secret
FRONTEND_URL=http://localhost:5173

# Email verification delivery
EMAIL_MODE=console
EMAIL_FROM=no-reply@yourdomain.com
# Required when EMAIL_MODE=smtp
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

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
│   ├── main.py          # FastAPI server — API endpoints
│   ├── rag.py           # RAG chain — query pipeline
│   ├── ingest.py        # PDF ingestion — chunking & embedding
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   └── index.css    # Tailwind CSS
│   └── package.json
├── .env.sample          # Environment variables template
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register account and send email verification |
| `POST` | `/verify-email` | Verify with OTP or magic link token |
| `POST` | `/resend-verification` | Resend verification email with cooldown |
| `POST` | `/login` | Login verified users |
| `POST` | `/upload` | Upload and index a PDF file |
| `POST` | `/query` | Ask a question about the document |
| `POST` | `/admin/cleanup-data` | **Admin only:** Cleanup users/documents/Pinecone (requires X-Admin-Secret header) |
| `GET` | `/health` | Check server status |

### Admin Cleanup Endpoint

**POST** `/admin/cleanup-data` — Delete users, documents, conversations, and optionally Pinecone namespaces and local files.

**Required header:** `X-Admin-Secret: <ADMIN_SECRET>`

**Request body:**
```json
{
  "mode": "all-users",
  "email_filter": null,
  "delete_upload_files": true,
  "skip_pinecone": false,
  "confirm": false
}
```

**Fields:**
- `mode`: `"all-users"` (delete all) or `"email-contains"` (filter by email substring)
- `email_filter`: Used only when `mode="email-contains"`. Case-insensitive substring match.
- `delete_upload_files`: If `true`, delete PDF files from `uploads/` for deleted documents
- `skip_pinecone`: If `true`, skip Pinecone namespace deletion (only DB cleanup)
- `confirm`: If `false`, returns dry-run preview only. If `true`, executes cleanup.

**Example: Dry-run preview**
```bash
curl -X POST http://localhost:8000/admin/cleanup-data \
  -H "X-Admin-Secret: dev-admin-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"mode": "all-users", "confirm": false}'
```

**Example: Execute cleanup for all users**
```bash
curl -X POST http://localhost:8000/admin/cleanup-data \
  -H "X-Admin-Secret: dev-admin-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"mode": "all-users", "delete_upload_files": true, "confirm": true}'
```

### Example Request

```bash
# Upload a PDF
curl -X POST http://localhost:8000/upload \
  -F "file=@document.pdf"

# Query the document
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the key points?"}'
```

---

## ⚙️ Configuration

| Variable | Description | Where to Get |
|----------|-------------|-------------|
| `GROQ_API_KEY` | LLM inference API key | [console.groq.com](https://console.groq.com) |
| `PINECONE_API_KEY` | Vector database key | [pinecone.io](https://pinecone.io) |
| `PINECONE_INDEX_NAME` | Name of your Pinecone index | Your Pinecone dashboard |
| `COHERE_API_KEY` | Embeddings API key | [dashboard.cohere.com](https://dashboard.cohere.com) |
| `JWT_SECRET` | Secret key used to sign login tokens | Generate securely (32+ random bytes) |
| `FRONTEND_URL` | Frontend URL used in email magic links | Your deployed frontend URL |
| `EMAIL_MODE` | `console` for dev or `smtp` for real email delivery | Set manually |
| `EMAIL_FROM` | Sender email shown in verification emails | Your verified sender domain |
| `SMTP_HOST` | SMTP server host | Your mail provider |
| `SMTP_PORT` | SMTP server port | Usually 587 |
| `SMTP_USER` | SMTP auth username | Your mail provider |
| `SMTP_PASSWORD` | SMTP auth password | Your mail provider |

---

## 🗺️ Roadmap

- [x] PDF upload and ingestion
- [x] Semantic search with Pinecone
- [x] Conversational memory
- [x] Clean document slate on new upload
- [ ] Source citations (page numbers)
- [ ] Multi-document support
- [ ] User authentication
- [ ] PostgreSQL for persistent chat history
- [ ] RAGAS evaluation metrics
- [ ] Deployment on Render + Vercel

---

## 🧩 Key Concepts

**RAG (Retrieval-Augmented Generation)** — Instead of sending the entire document to the LLM (expensive and often impossible due to token limits), RAG retrieves only the most relevant chunks and sends those. This results in faster, cheaper, and more accurate responses.

**Vector Embeddings** — Text converted into arrays of numbers where semantic similarity = numerical proximity. "refund policy" and "money back guarantee" produce similar vectors even though they share no words.

**Chunking Strategy** — Documents are split into 1000-character chunks with 200-character overlaps. The overlap ensures that answers spanning chunk boundaries aren't lost.

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
#   t e s t  
 #   T e s t i n g   C I  
 