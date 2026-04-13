# DocMind - Enterprise RAG System
## Complete Developer Documentation

---

# Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
    - [5.6 Profile Dropdown Component](#56-profile-dropdown-component)
    - [5.7 Responsive UX and Mobile Safety](#57-responsive-ux-and-mobile-safety)
    - [5.8 Animation and Loading Choreography](#58-animation-and-loading-choreography)
6. [Database Design](#6-database-design)
7. [Authentication & Authorization](#7-authentication--authorization)
   - [7.5 Email Verification Flow](#75-email-verification-flow)
8. [RAG Pipeline](#8-rag-pipeline)
   - [8.5 Source Citations System](#85-source-citations-system)
9. [Payment & Subscription System](#9-payment--subscription-system)
   - [9.5 Proration System](#95-proration-system-plan-upgrades)
   - [9.6 Coupon System](#96-coupon-system)
10. [Plan Enforcement & Usage Tracking](#10-plan-enforcement--usage-tracking)
11. [API Reference](#11-api-reference)
12. [Third-Party Integrations](#12-third-party-integrations)
    - [12.6 Google OAuth (with clock skew handling)](#126-google-oauth)
13. [Environment Configuration](#13-environment-configuration)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Security Considerations](#15-security-considerations)
16. [User Flows](#16-user-flows)
17. [Error Handling Strategy](#17-error-handling-strategy)
18. [Performance Considerations](#18-performance-considerations)
19. [CI/CD Pipeline & Branch Protection](#19-cicd-pipeline--branch-protection)
    - [19.1 GitHub Actions Workflow](#191-github-actions-workflow)
    - [19.2 Pre-commit Hooks](#192-pre-commit-hooks)
    - [19.3 Branch Protection Rules](#193-branch-protection-rules)
    - [19.4 Testing Strategy](#194-testing-strategy)

---

# 1. Executive Overview

## 1.1 Product Vision

**DocMind** is an AI-powered document intelligence platform that enables users to upload PDF documents and have natural language conversations with their content. It leverages Retrieval-Augmented Generation (RAG) technology to provide accurate, source-cited answers from uploaded documents.

## 1.2 Target Market

- **Primary:** Law firms and CA (Chartered Accountant) firms in Indian tier-2 cities
- **Secondary:** Small-to-medium businesses requiring document analysis
- **Use Cases:** Contract review, financial statement analysis, compliance checking, legal research

## 1.3 Business Model

| Plan | Pricing (Monthly) | Pricing (Yearly) | Key Features |
|------|-------------------|------------------|--------------|
| **Free** | ₹0 | ₹0 | 5 docs, 100 questions/month |
| **Basic** | ₹999 | ₹9,999 (save 17%) | 50 docs, 1,000 questions/month |
| **Pro** | ₹2,999 | ₹19,999 (save 44%) | Unlimited documents & questions |
| **Enterprise** | Custom | Custom | Dedicated capacity, SLA, support |

## 1.4 Core Capabilities

1. **Document Ingestion:** PDF upload with intelligent chunking
2. **Semantic Search:** Vector-based similarity search across document chunks
3. **AI-Powered Q&A:** Context-aware answers with source citations
4. **Multi-Document Support:** Switch between documents with isolated conversations
5. **Subscription Management:** Tiered plans with usage enforcement
6. **Profession-Specific Tips:** Tailored prompting guidance for legal/accounting use cases

---

# 2. System Architecture

## 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    React SPA (Vite + Tailwind)                     │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │  Auth   │  │  Chat   │  │ Upload  │  │Settings │  │ Payment │  │  │
│  │  │  Page   │  │Interface│  │ Handler │  │  Page   │  │  Page   │  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      FastAPI Application                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │  Auth   │  │Document │  │   RAG   │  │ Profile │  │ Payment │  │  │
│  │  │Endpoints│  │Endpoints│  │Endpoints│  │Endpoints│  │Endpoints│  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │  │
│  │                           │                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                   Middleware Layer                           │  │  │
│  │  │  • Rate Limiting (SlowAPI)    • CORS                         │  │  │
│  │  │  • JWT Authentication         • Request Logging              │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    RAG      │  │   Ingest    │  │    Auth     │  │   Payment   │     │
│  │   Engine    │  │   Pipeline  │  │   Service   │  │   Service   │     │
│  │  (rag.py)   │  │ (ingest.py) │  │  (auth.py)  │  │(payment.py) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │ Plan Limits │  │   Email     │  │  Storage    │                      │
│  │   Service   │  │   Service   │  │   Service   │                      │
│  │(plan_limits)│  │(email_svc)  │  │(supabase_st)│                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┬───────────────┐
                    ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  PostgreSQL │  │   Pinecone  │  │   Groq LLM  │  │   Supabase  │     │
│  │  (Primary   │  │  (Vector    │  │   (Answer   │  │  (File      │     │
│  │   Database) │  │   Database) │  │  Generation)│  │   Storage)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   Cohere    │  │  Razorpay   │  │   Google    │                      │
│  │ (Embeddings)│  │  (Payments) │  │   (OAuth)   │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Data Flow Architecture

### Document Upload Flow (Background Indexing)

```
User → Frontend → POST /upload → Rate Limit Check → Plan Limit Check
                                         │
                                         ▼
                              File Validation (PDF, size, magic bytes)
                                         │
                                         ▼
                              Upload to Supabase Storage
                                         │
                                         ▼
                              Create Document DB record (status="pending")
                                         │
                                         ▼
                    ◄──── Return 200 immediately (~2-3s) ────────────────
                    │                    │
                    │                    ▼ (BackgroundTask — runs after response)
                    │         PDF Text Extraction (PyPDF)
                    │                    │
                    │                    ▼
                    │         Text Chunking (1000 chars, 200 overlap)
                    │                    │
                    │                    ▼
                    │         Generate Embeddings (Cohere)
                    │                    │
                    │                    ▼
                    │         Store in Pinecone (namespace=doc_id)
                    │                    │
                    │                    ▼
                    │         Persist chunks to PostgreSQL (BM25)
                    │                    │
                    │                    ▼
                    │         Update Document status → "ready" | "failed"
                    │
                    └── Frontend polls GET /documents/{id}/status every 2s
                        until status = "ready" → enables chat input
```

### Query Processing Flow (Phase 5 — Hybrid Search + Reranking)
```
User Question → Frontend → POST /query → Auth Check → Plan Limit Check
                                                │
                                                ▼
                               ┌────────────────────────────────┐
                               │         Hybrid Retrieval        │
                               │  BM25 (from PostgreSQL, k=10)  │
                               │      +                          │
                               │  Pinecone Dense (k=10)         │
                               │  via EnsembleRetriever          │
                               │  weights: [0.4 BM25, 0.6 Dense]│
                               └────────────────────────────────┘
                                                │
                                                ▼
                                   Cohere Rerank API (top-4 of ~20)
                                                │
                                                ▼
                                   Build Context + Load Chat History (PostgreSQL)
                                                │
                                                ▼
                                   Generate Answer (Groq / LLaMA-3.3-70b, temp=0)
                                                │
                                                ▼
                                   Normalize Source Page Numbers
                                                │
                                                ▼
                                   Persist Q&A + Sources to PostgreSQL
                                                │
                                                ▼
                                   Log Usage → Return {answer, sources}
```

## 2.3 Component Interaction Matrix

| Component | Interacts With | Purpose |
|-----------|----------------|---------|
| **main.py** | All services | API endpoint definitions, request routing |
| **auth.py** | database.py, Google OAuth | User authentication, JWT tokens |
| **rag.py** | Pinecone, Cohere, Groq | RAG pipeline execution |
| **ingest.py** | Pinecone, Cohere, Supabase | Document processing |
| **payment.py** | Razorpay API, database.py | Payment processing |
| **plan_limits.py** | database.py | Usage enforcement |
| **supabase_storage.py** | Supabase API | File storage operations |
| **email_service.py** | SMTP | Email notifications |

---

# 3. Technology Stack

## 3.1 Backend Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | Python | 3.10+ | Core language |
| **Framework** | FastAPI | Latest | REST API framework |
| **ASGI Server** | Uvicorn | Latest | Async server |
| **ORM** | SQLAlchemy | 2.x | Database abstraction |
| **Database** | PostgreSQL | 14+ | Primary data store |
| **Vector DB** | Pinecone | Latest | Embedding storage & search |
| **Embeddings** | Cohere | embed-english-v3.0 | Text-to-vector conversion |
| **LLM** | Groq | llama-3.3-70b-versatile | Answer generation |
| **PDF Processing** | PyPDF | Latest | PDF text extraction |
| **Auth** | PyJWT + Argon2 | - | Token generation & password hashing |
| **Payments** | Razorpay | Latest | Payment processing |
| **File Storage** | Supabase Storage | - | Cloud file hosting |
| **Rate Limiting** | SlowAPI | - | Request throttling |

## 3.2 Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | React | 19.2.0 | UI library |
| **Build Tool** | Vite | 7.3.1 | Development & bundling |
| **Routing** | React Router DOM | 7.13.2 | Client-side routing |
| **Styling** | Tailwind CSS | 4.2.1 | Utility-first CSS |
| **HTTP Client** | Axios | 1.13.6 | API requests |
| **Auth** | @react-oauth/google | 0.13.4 | Google OAuth |
| **Markdown** | react-markdown | 10.1.0 | AI response rendering |
| **Linting** | ESLint | 9.39.1 | Code quality |

## 3.3 Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| **Backend Hosting** | Render | API deployment |
| **Frontend Hosting** | Vercel | Static SPA hosting |
| **Database** | Render PostgreSQL / Supabase | Managed PostgreSQL |
| **File Storage** | Supabase Storage | PDF & image storage |
| **Vector Database** | Pinecone (Free Tier) | Vector similarity search |
| **Email** | SMTP (Gmail/SendGrid) | Transactional emails |

---

# 4. Backend Architecture

## 4.1 File Structure

```
backend/
├── main.py                 # FastAPI app, all API endpoints (~1550 lines)
├── database.py             # SQLAlchemy ORM — 8 tables + inline migrations
├── auth.py                 # JWT + Google OAuth + OTP/magic-link verification
├── rag.py                  # Hybrid search + Cohere reranking query pipeline
├── ingest.py               # PDF ingestion — chunks to Pinecone + PostgreSQL
├── payment.py              # Razorpay — orders, proration, GST
├── plan_limits.py          # Plan enforcement, usage tracking
├── supabase_storage.py     # Supabase Storage — PDFs + profile images
├── email_service.py        # Email verification (console/SMTP)
├── cleanup_data.py         # Admin data cleanup utility
├── reset_db.py             # Development DB reset utility
├── start.sh                # Render deployment entrypoint
├── runtime.txt             # Python version for Render
├── requirements.txt        # Python dependencies
└── tests/
    ├── conftest.py
    ├── test_api.py
    ├── test_auth.py
    ├── test_document_upload_quota.py
    └── test_rag_out_of_context.py
```

## 4.2 Module Responsibilities

### main.py (API Layer)
- **Lines:** ~950+
- **Role:** Central API endpoint definitions
- **Responsibilities:**
  - CORS configuration
  - Rate limiting setup
  - Dependency injection for auth
  - All HTTP endpoint handlers
  - Request/response validation (Pydantic)
  - Error handling and HTTP exceptions

### database.py (Data Layer)
- **Lines:** ~160
- **Role:** Database models and connection
- **Responsibilities:**
  - SQLAlchemy engine configuration
  - ORM model definitions (User, Document, Conversation, UsageLog)
  - Database session management
  - Schema migration (column additions)

### auth.py (Security Layer)
- **Lines:** ~150
- **Role:** Authentication and authorization
- **Responsibilities:**
  - Password hashing (Argon2/bcrypt)
  - JWT token generation and validation
  - Google OAuth token verification
  - User session management
  - Password strength validation

### rag.py (AI Layer)
- **Lines:** ~325
- **Role:** Hybrid RAG query processing (Phase 5)
- **Responsibilities:**
  - BM25 retriever built from PostgreSQL `document_chunks`
  - Pinecone dense retrieval (semantic, k=10)
  - EnsembleRetriever — merges BM25 (0.4) + dense (0.6) results
  - Cohere Rerank API — selects top-4 from merged candidates
  - Context assembly + chat history loading from PostgreSQL
  - LLM answer generation (LLaMA-3.3-70b, temp=0)
  - Source citation extraction with page-number normalization
  - Out-of-context detection and sentinel response

### ingest.py (Processing Layer)
- **Lines:** ~120
- **Role:** Document ingestion
- **Responsibilities:**
  - PDF loading and text extraction (PyPDFLoader)
  - Text chunking with overlap (1000 chars / 200 overlap)
  - Batch embedding generation (Cohere embed-english-v3.0)
  - Pinecone vector storage (namespace = document UUID)
  - Persist raw chunks to PostgreSQL `document_chunks` for BM25
  - Namespace deletion on document removal

### payment.py (Commerce Layer)
- **Lines:** ~100
- **Role:** Payment processing
- **Responsibilities:**
  - Razorpay order creation
  - Payment signature verification
  - Plan pricing management
  - Billing cycle calculations
  - Expiry date computation

### plan_limits.py (Enforcement Layer)
- **Lines:** ~150
- **Role:** Usage control
- **Responsibilities:**
  - Plan limit configuration
  - Document count validation
  - File size validation
  - Question quota tracking
  - Usage logging
  - Usage summary generation

## 4.3 Request Processing Pipeline

```
Incoming Request
      │
      ▼
┌─────────────────┐
│  CORS Middleware │  ← Cross-origin request handling
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiter    │  ← SlowAPI: per-endpoint limits
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Request Parsing │  ← Pydantic model validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth Dependency │  ← get_current_user() → JWT validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route Handler   │  ← Business logic execution
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Response        │  ← JSON serialization
└─────────────────┘
```

## 4.4 Dependency Injection Pattern

```python
# Authentication dependency
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)  # Validates JWT
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user

# Usage in endpoint
@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, ...}
```

---

# 5. Frontend Architecture

## 5.1 File Structure

```
frontend/
├── src/
│   ├── main.jsx                # Entry point, providers
│   ├── AppRouter.jsx           # Routes + global background layers
│   ├── App.jsx                 # Auth/app shell + data orchestration
│   ├── MeshBackground.jsx      # Animated mesh background blobs
│   ├── AuthPage.jsx            # Login/register/verify UI
│   ├── SettingsPage.jsx        # User profile + billing + security
│   ├── UpgradePlanPage.jsx     # Pricing and checkout
│   ├── PremiumWelcomePage.jsx  # Post-upgrade onboarding flow
│   ├── HelpPage.jsx            # FAQ and support
│   ├── ProfileDropdown.jsx     # User menu + theme flyout
│   ├── Toast.jsx               # Global toast store + container
│   ├── Loader.jsx              # Spinner/loader primitives
│   ├── LanguageContext.jsx     # i18n context (en/hi)
│   ├── ErrorBoundary.jsx       # Runtime error boundaries
│   ├── NotFoundPage.jsx        # 404 page
│   ├── ServerErrorPage.jsx     # 500 page
│   ├── index.css               # Global styles + shimmer/focus utilities
│   ├── components/
│   │   ├── Sidebar.jsx         # Responsive left rail
│   │   ├── DocumentRow.jsx     # Document list item + action menu
│   │   ├── ChatHeader.jsx      # Active doc header
│   │   ├── ChatMessages.jsx    # Message list + loading states
│   │   ├── MessageBubble.jsx   # Message rendering + citations
│   │   ├── ChatInput.jsx       # Query input + send button
│   │   ├── QuickActions.jsx    # Prompt templates row
│   │   └── SourceModal.jsx     # Source excerpt modal
│   ├── lib/
│   │   ├── api.js              # API base URL resolution
│   │   ├── animations.js       # Shared motion presets
│   │   ├── templates.js        # Role-based quick prompts
│   │   ├── themes.js           # UI token maps for light/dark
│   │   └── utils.js            # Time/date/size helpers
│   └── assets/
├── public/
├── package.json
├── vite.config.js
└── eslint.config.js
```

## 5.2 Component Hierarchy

```
main.jsx
└── ErrorBoundary
    └── GoogleOAuthProvider
        └── AppRouter
      ├── GlobalBaseLayer
      ├── MeshBackground
      └── Routes
        ├── App (/)
        │   ├── BootScreen
        │   ├── AuthPage (when token absent)
        │   └── MainShell (when token present)
        │       ├── Sidebar
        │       │   ├── UploadButton
        │       │   ├── DocumentRow (x n)
        │       │   └── ProfileDropdown
        │       │       └── ThemeFlyout (portal)
        │       └── MainContent
        │           ├── ChatHeader
        │           ├── ChatMessages
        │           │   └── MessageBubble (x n)
        │           ├── QuickActions
        │           ├── ChatInput
        │           └── SourceModal
        ├── SettingsPageWrapper -> SettingsPage (/settings)
        ├── HelpPageWrapper -> HelpPage (/help)
        ├── UpgradePlanPageWrapper -> UpgradePlanPage (/upgrade)
        ├── PremiumWelcomePageWrapper -> PremiumWelcomePage (/welcome)
        ├── ServerErrorPage (/error)
        └── NotFoundPage (*)
```

## 5.3 State Management Strategy

### Pattern: Local State + localStorage + Context

**No external state management library (Redux, Zustand)** — React's built-in patterns suffice for this app's complexity.

#### 1. Component State (useState)
```javascript
// Authentication state
const [token, setToken] = useState(localStorage.getItem("token"))
const [user, setUser] = useState(null)

// UI state
const [sidebarOpen, setSidebarOpen] = useState(true)
const [loading, setLoading] = useState(false)

// Data state
const [documents, setDocuments] = useState([])
const [messages, setMessages] = useState([])
```

#### 2. Persistent State (localStorage)
```javascript
// Token persistence
localStorage.setItem("token", token)
localStorage.getItem("token")
localStorage.removeItem("token")

// Theme persistence
localStorage.setItem("theme", "dark") // "light" | "dark" | "system"
```

#### 3. Context API (Global State)
```javascript
// LanguageContext for i18n
const { language, setLanguage, t } = useLanguage()
t("settingsTitle") // Returns localized string
```

## 5.4 Route Protection Pattern

```javascript
function ProtectedWrapper({ Component }) {
  const token = localStorage.getItem("token")
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    if (!token) return
    fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setUser(data))
  }, [token])
  
  if (!token) {
    return <Navigate to="/" replace />
  }
  
  return <Component user={user} />
}
```

## 5.5 Theme System

### Theme Configuration Object
```javascript
const themes = {
  light: {
    page: "bg-slate-50",
    sidebar: "bg-white border-slate-200",
    card: "bg-white border-slate-200",
    msgUser: "bg-[#0071e3] text-white",
    msgAi: "bg-white border border-slate-200 text-[#1d1d1f]",
    inputBg: "bg-white border-slate-200 ...",
    // ... layout, typography, action, and elevation tokens
  },
  dark: {
    page: "bg-[#09090b]",
    sidebar: "bg-[#111113] border-white/8",
    card: "bg-[#111113] border-white/8",
    msgUser: "bg-[#0a84ff] text-white",
    msgAi: "bg-[#1c1c1e] border border-white/8 text-[#f5f5f7]",
    inputBg: "bg-white/6 border-white/10 ...",
    // ... layout, typography, action, and elevation tokens
  }
}
```

### System Theme Detection
```javascript
const [themeMode, setThemeMode] = useState(
  localStorage.getItem("theme") || "system"
)

const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches

const resolvedTheme = themeMode === "system" 
  ? (systemIsDark ? "dark" : "light")
  : themeMode
```

## 5.6 Profile Dropdown Component

The ProfileDropdown provides user account access with theme switching, navigation, and logout.

### Structure

```jsx
// ProfileDropdown.jsx
<ProfileDropdown
  user={user}                    // User object with name, email, picture
  themeMode={themeMode}          // "light" | "dark" | "system"
  setThemeMode={setThemeMode}    // Theme setter function
  onLogout={handleLogout}        // Logout callback
  resolvedTheme={resolvedTheme}  // Actual applied theme
/>
```

### Menu Options

| Option | Action | Route |
|--------|--------|-------|
| **Settings** | Navigate to settings | `/settings` |
| **Upgrade Plan** | Navigate to pricing | `/upgrade` |
| **Theme** | Opens submenu with Light/Dark/System | - |
| **Help** | Navigate to FAQ | `/help` |
| **Logout** | Clear token, redirect to auth | `/` |

### Theme Submenu

```
┌─────────────────────────┐
│ 👤 User Name            │
│    user@email.com       │
├─────────────────────────┤
│ ⚙️  Settings            │
│ 💎  Upgrade Plan        │
│ 🎨  Theme            ▶  │───┐
│ ❓  Help                │   │  ┌─────────────┐
├─────────────────────────┤   └──│ ☀️ Light    │
│ 🚪  Logout              │      │ 🌙 Dark     │
└─────────────────────────┘      │ 💻 System ✓ │
                                 └─────────────┘
```

### Click Outside Detection

```javascript
useEffect(() => {
  const close = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setIsOpen(false)
      setShowThemeSubmenu(false)
    }
  }
  window.addEventListener("click", close)
  return () => window.removeEventListener("click", close)
}, [])
```

### Responsive Behavior Upgrades

- Main dropdown width is constrained on small screens (`w-[min(88vw,15rem)]`) to avoid overflow.
- Theme submenu is rendered through a portal and positioned with viewport clamping so it never renders off-screen.
- Theme flyout auto-closes on window resize and scroll to prevent stale positioning.

### Profile Image Logic

```javascript
// Display priority:
// 1. User uploaded photo (profile_image_source === "upload")
// 2. Google profile picture (profile_image_source === "google")
// 3. First letter of name (fallback)

const getProfileImage = () => {
  if (user.picture) return <img src={user.picture} />
  return <span>{user.name?.[0]?.toUpperCase() || "U"}</span>
}
```

## 5.7 Responsive UX and Mobile Safety

The frontend now uses a shell-first responsive strategy. Shared shell components (`App`, `Sidebar`, `ChatHeader`, `ChatInput`, `Toast`) enforce mobile-safe behavior so route pages inherit consistent responsiveness.

### Core Responsiveness Rules

| Area | Implementation | Purpose |
|------|----------------|---------|
| Viewport height | `h-[100dvh]` app shell + `min-height: 100dvh` on `body/#root` | Prevents mobile browser toolbar jump issues |
| Horizontal overflow | `overflow-x: hidden` globally | Eliminates sideways scrolling on narrow screens |
| Safe area support | `paddingBottom: max(..., env(safe-area-inset-bottom))` | Avoids clipped controls on notched iOS devices |
| Sidebar width | `w-[min(88vw,18rem)] sm:w-72` | Keeps navigation usable on small phones |
| Touch-first menus | Persistent action icon opacity on mobile | Removes hover-only interaction dependency |
| Floating menus | Portal-based positioning + viewport clamping | Prevents off-screen action/theme menus |

### Components With Explicit Mobile Safeguards

- `Sidebar.jsx`: mobile overlay, responsive width, independent scroll area, safe-area padding in footer.
- `DocumentRow.jsx`: 3-dot action menu clamped to viewport and usable without hover.
- `ChatHeader.jsx`: tighter spacing and stricter filename truncation on small screens.
- `ChatInput.jsx`: mobile text sizing/padding tuned to improve typing ergonomics.
- `Toast.jsx`: centered top placement on mobile with bounded width (`max-w-[min(92vw,24rem)]`).
- `SourceModal.jsx`: compact mobile spacing and `max-h-[65dvh]` scrollable content body.
- `PremiumWelcomePage.jsx`: bottom action bar includes safe-area bottom padding.

## 5.8 Animation and Loading Choreography

UI transitions are centralized in `lib/animations.js` to keep motion consistent across routes/components.

### Key Motion Patterns

- `AnimatePresence` route-state choreography in `App.jsx` for boot, auth, and app shells.
- Boot screen uses an animated progress bar and scale/fade exit transition.
- Message list uses staggered reveal (`staggerChildren: 0.06`) with spring-based bubble entry.
- Switching documents shows themed skeleton rows (`skeleton-light`/`skeleton-dark`) before content settles.
- A delayed loading hint appears after 6 seconds: "Taking longer than usual — server may be warming up." to set user expectations during backend cold starts.

---

# 6. Database Design

## 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USERS                                   │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                    VARCHAR           UUID                    │
│ email                      VARCHAR           UNIQUE, INDEXED         │
│ name                       VARCHAR           NULLABLE                │
│ hashed_password            VARCHAR           NULLABLE (Google users) │
│ google_id                  VARCHAR           NULLABLE                │
│ picture                    VARCHAR           Profile image URL       │
│ profile_image_source       VARCHAR           initial/google/upload   │
│ plan                       VARCHAR           free/basic/pro/ent.     │
│ is_active                  BOOLEAN           Account status          │
│ created_at                 TIMESTAMP         Account creation        │
│ last_login                 TIMESTAMP         Last login time         │
│ billing_cycle              VARCHAR           monthly/yearly          │
│ plan_started_at            TIMESTAMP         Billing start           │
│ plan_expires_at            TIMESTAMP         Billing expiry          │
│ profession                 VARCHAR           law_firm/ca_firm/other  │
│ email_verified             BOOLEAN           Email confirmation      │
│ email_verification_*       VARCHAR/TS/INT    Verification fields     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 1:N
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            DOCUMENTS                                 │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                    VARCHAR           UUID (=Pinecone NS)     │
│ user_id (FK)               VARCHAR           Owner reference         │
│ filename                   VARCHAR           Display name            │
│ file_path                  VARCHAR           Supabase storage path   │
│ file_size                  VARCHAR           Size in bytes           │
│ chunk_count                INTEGER           Ingested chunks         │
│ is_active                  BOOLEAN           Current context doc     │
│ status                     VARCHAR           pending/ready/failed    │
│ uploaded_at                TIMESTAMP         Upload time             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 1:1
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CONVERSATIONS                               │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                    VARCHAR           UUID                    │
│ user_id (FK)               VARCHAR           Owner reference         │
│ document_id (FK)           VARCHAR           Document reference      │
│ messages                   TEXT              JSON array of messages  │
│ created_at                 TIMESTAMP         Conversation start      │
│ updated_at                 TIMESTAMP         Last message time       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           USAGE_LOGS                                 │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                    SERIAL            Auto-increment          │
│ user_id (FK)               VARCHAR           User reference          │
│ action                     VARCHAR           question/upload         │
│ extra_data                 TEXT              JSON metadata           │
│ created_at                 TIMESTAMP         Action timestamp        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT_CHUNKS                              │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)                    SERIAL            Auto-increment          │
│ document_id (FK)           VARCHAR           Parent document UUID    │
│ content                    TEXT              Raw chunk text          │
│ page_num                   INTEGER           1-indexed page number   │
│ chunk_index                INTEGER           Order within document   │
│ source                     VARCHAR           Source filename         │
└─────────────────────────────────────────────────────────────────────┘
Note: document_chunks powers BM25 keyword retrieval in Phase 5.
Each row is one chunk; all rows for a document_id are loaded into
memory at query time to build the BM25Retriever.
```

## 6.2 Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| User → Documents | 1:N | One user owns many documents |
| User → Conversations | 1:N | One user has many conversations |
| Document → Conversation | 1:1 | Each document has one conversation |
| User → UsageLog | 1:N | All user actions are logged |

## 6.3 Messages JSON Schema

```json
{
  "messages": [
    {
      "type": "human",
      "content": "What are the key terms?",
      "timestamp": "2025-01-26T12:00:00Z"
    },
    {
      "type": "ai", 
      "content": "The key terms include...",
      "timestamp": "2025-01-26T12:00:05Z",
      "sources": [
        {"page": 3, "content": "Term 1: ..."},
        {"page": 7, "content": "Term 2: ..."}
      ]
    }
  ]
}
```

## 6.4 Database Migrations

Auto-migrations run on application startup:

```python
def _ensure_user_columns():
    """Add new columns to existing users table if missing"""
    migration_sql = {
        "billing_cycle": "ALTER TABLE users ADD COLUMN billing_cycle VARCHAR",
        "plan_started_at": "ALTER TABLE users ADD COLUMN plan_started_at TIMESTAMP",
        "plan_expires_at": "ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP",
        "profession": "ALTER TABLE users ADD COLUMN profession VARCHAR",
        # ... other columns
    }
    
    for column_name, sql in migration_sql.items():
        if column_name not in existing_columns:
            connection.execute(text(sql))
```

---

# 7. Authentication & Authorization

## 7.1 Authentication Methods

### Method 1: Email/Password

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Register   │ →  │ Hash Password│ →  │ Store in DB  │
│  (email,pwd) │    │   (Argon2)   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Login     │ →  │ Verify Hash  │ →  │  Issue JWT   │
│  (email,pwd) │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Method 2: Google OAuth

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Google Login │ →  │ Verify Token │ →  │ Get/Create   │
│ (ID Token)   │    │ with Google  │    │    User      │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  Issue JWT   │
                                        └──────────────┘
```

## 7.2 JWT Token Structure

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "user_uuid_here",        // User ID
  "email": "user@example.com",    // User email
  "exp": 1735689600               // Expiry (7 days from issue)
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

## 7.3 Password Requirements

| Requirement | Rule |
|-------------|------|
| Minimum Length | 8 characters |
| Letter | At least 1 (A-Za-z) |
| Number | At least 1 (0-9) |
| Special Character | At least 1 (!@#$%^&*) |

## 7.4 Protected Endpoints

**Public Endpoints (No Auth Required):**
- `POST /register`
- `POST /login`
- `POST /verify-email`
- `POST /resend-verification`
- `POST /auth/google`
- `GET /health`
- `GET /payment/prices`

**Protected Endpoints (JWT Required):**
- All `/me`, `/profile/*`, `/documents/*`, `/query`, `/history`
- All `/payment/*` (except prices)
- All `/admin/*` (requires ADMIN_SECRET)

## 7.5 Email Verification Flow (Optional)

```
1. User registers → Generate 6-digit OTP + magic token
2. Hash both values → Store in DB
3. Send email with OTP and magic link
4. User verifies via:
   a. Enter OTP manually
   b. Click magic link (auto-submits token)
5. Verify: hash(input) == stored_hash
6. On success: email_verified = true
```

**Limits:**
- Max 5 verification attempts
- Expires in 15 minutes
- 60-second cooldown between resends

---

# 8. RAG Pipeline

## 8.1 RAG Architecture Overview (Phase 5 — Hybrid Search + Reranking)

**RAG = Retrieval-Augmented Generation**

The system combines hybrid document retrieval (BM25 keyword + Pinecone semantic) with Cohere reranking and language model generation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   RAG PIPELINE (Phase 5)                             │
│                                                                      │
│  ┌───────────┐   ┌──────────────────────────────────┐               │
│  │  Question │ → │         Hybrid Retrieval          │               │
│  └───────────┘   │  ┌────────────┐  ┌────────────┐  │               │
│                  │  │BM25 (k=10) │  │Pinecone    │  │               │
│                  │  │PostgreSQL  │  │Dense (k=10)│  │               │
│                  │  │weight: 0.4 │  │weight: 0.6 │  │               │
│                  │  └────────────┘  └────────────┘  │               │
│                  │        EnsembleRetriever          │               │
│                  └──────────────────────────────────┘               │
│                                    │ ~20 candidates                  │
│                                    ▼                                 │
│                         ┌──────────────────┐                         │
│                         │  Cohere Rerank   │ → top-4 chunks          │
│                         │ rerank-english-  │                         │
│                         │    v3.0          │                         │
│                         └──────────────────┘                         │
│                                    │                                 │
│                                    ▼                                 │
│  ┌───────────┐     ┌───────────┐  ┌───────────────────────────────┐ │
│  │  Answer + │ ←   │  Generate │← │  Context + PostgreSQL History │ │
│  │  Sources  │     │  (Groq)   │  │                               │ │
│  └───────────┘     └───────────┘  └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Constants:**
- `RETRIEVAL_K = 10` — candidates fetched from each retriever
- `RERANK_TOP_N = 4` — final chunks passed to the LLM

## 8.2 Document Ingestion Pipeline

### Step 1: PDF Loading
```python
loader = PyPDFLoader(file_path)
pages = loader.load()
# Each page: Document(page_content=text, metadata={page: N})
```

### Step 2: Text Chunking
```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,        # Characters per chunk
    chunk_overlap=200       # Overlap between chunks
)
chunks = splitter.split_documents(pages)
# Preserves page metadata for source citations
```

### Step 3: Embedding Generation
```python
embeddings = CohereEmbeddings(model="embed-english-v3.0")
# Converts each chunk text → 1024-dimensional vector
```

### Step 4: Vector Storage (Pinecone)
```python
PineconeVectorStore.from_documents(
    chunks,
    embeddings,
    index_name=PINECONE_INDEX_NAME,
    namespace=document_id    # Isolates each document
)
```

### Step 5: Persist Chunks to PostgreSQL (for BM25)
```python
# Saves raw text chunks to document_chunks table
DocumentChunk(
    document_id=document_id,
    content=chunk.page_content,
    page_num=chunk.metadata.get("page", 1),
    chunk_index=i,
    source=chunk.metadata.get("source", "")
)
```
This enables BM25 keyword retrieval at query time without re-fetching from Pinecone.

## 8.3 Query Processing Pipeline (Phase 5)

### Step 1: Dense Retriever (Pinecone)
```python
vectorstore = PineconeVectorStore(
    index_name=os.getenv("PINECONE_INDEX_NAME"),
    embedding=embeddings,
    namespace=namespace,      # = document_id (UUID)
)
dense_retriever = vectorstore.as_retriever(search_kwargs={"k": RETRIEVAL_K})
```

### Step 2: Sparse Retriever (BM25 from PostgreSQL)
```python
# Load chunks from DB, build in-memory BM25 retriever
rows = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
bm25_retriever = BM25Retriever.from_documents(langchain_docs)
bm25_retriever.k = RETRIEVAL_K
# Returns None for legacy documents — pipeline falls back to dense-only
```

### Step 3: Hybrid Retrieval via EnsembleRetriever
```python
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, dense_retriever],
    weights=[0.4, 0.6],   # Dense weighted higher — meaning matters more than exact match
)
retrieved_docs = ensemble_retriever.invoke(question)
# Returns up to 20 candidates (10 from each retriever, deduplicated)
```

### Step 4: Cohere Reranking
```python
co = cohere.Client(api_key)
response = co.rerank(
    model="rerank-english-v3.0",
    query=question,
    documents=[doc.page_content for doc in retrieved_docs],
    top_n=RERANK_TOP_N,   # Keep top-4
)
reranked_docs = [retrieved_docs[r.index] for r in response.results]
# Gracefully falls back to retrieved_docs[:4] if Cohere call fails
```

### Step 5: Context Assembly + LLM Generation
```python
context = "\n\n".join([doc.page_content for doc in reranked_docs])

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Answer based ONLY on the context below.\n"
     f"If the question doesn't match the context, reply EXACTLY: {OUT_OF_CONTEXT_MESSAGE}\n\n"
     "Context:\n{context}"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])
chain = prompt | llm | StrOutputParser()
answer = chain.invoke({"context": context, "chat_history": history, "question": question})
```

### Step 6: Source Citation Extraction
```python
# Page number normalization: BM25 chunks are 1-indexed, Pinecone chunks are 0-indexed
def _normalize_source_page_number(doc):
    raw_page = doc.metadata.get("page", 1)
    page_index_base = 1 if "chunk_index" in doc.metadata else 0  # BM25 vs dense
    return max(int(raw_page) + (0 if page_index_base == 1 else 1), 1)

sources = [{"page": page_num, "source": source, "content": doc.page_content[:300]}
           for doc in reranked_docs]
sources.sort(key=lambda x: x["page"])
# Sources hidden entirely if LLM returns OUT_OF_CONTEXT_MESSAGE
```

## 8.4 Namespace Isolation

Each document has its own Pinecone namespace:

```
Pinecone Index: "docmind-index"
├── Namespace: "doc_uuid_1" → Document A chunks
├── Namespace: "doc_uuid_2" → Document B chunks
├── Namespace: "doc_uuid_3" → Document C chunks
└── ...

Benefits:
- No cross-document contamination
- Fast document switching (just change namespace)
- Easy cleanup on document deletion
```

## 8.5 Source Citations System

Source citations provide transparency by showing users exactly where answers come from in their documents.

### Citation Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SOURCE CITATIONS FLOW                              │
│                                                                      │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐                  │
│  │  Pinecone │ →   │  Extract  │ →   │  Format   │                  │
│  │  Results  │     │  Metadata │     │  Sources  │                  │
│  └───────────┘     └───────────┘     └─────┬─────┘                  │
│                                            │                         │
│       ┌────────────────────────────────────┘                         │
│       │                                                              │
│       ▼                                                              │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐                  │
│  │  Store in │ →   │  Return   │ →   │  Display  │                  │
│  │  Database │     │  to API   │     │  in Modal │                  │
│  └───────────┘     └───────────┘     └───────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Backend Implementation

**File: `rag.py`**

```python
def query_with_sources(question, namespace, db, user_id, document_id):
    # Retrieve documents with metadata
    retrieved_docs = retriever.invoke(question)
    
    # Extract unique sources with deduplication
    sources = []
    seen = set()
    for doc in retrieved_docs:
        page = doc.metadata.get("page", 0) + 1  # Convert to 1-indexed
        if page not in seen:
            seen.add(page)
            sources.append({
                "page": page,
                "source": doc.metadata.get("source", ""),
                "content": doc.page_content[:300]  # First 300 chars
            })
    
    sources.sort(key=lambda x: x["page"])
    
    # Generate answer...
    
    # Store sources with AI message in database
    history_obj.add_message(AIMessage(content=answer), sources=sources)
    
    return {"answer": answer, "sources": sources}
```

### Source Persistence

Sources are stored in the `Conversation.messages` JSON alongside AI responses:

```python
def add_message(self, message: BaseMessage, sources: list = None) -> None:
    raw = json.loads(self.record.messages)
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    if isinstance(message, AIMessage):
        msg_data = {
            "type": "ai",
            "content": message.content,
            "timestamp": timestamp
        }
        if sources:
            msg_data["sources"] = sources  # Persist with message
        raw.append(msg_data)
    
    self.record.messages = json.dumps(raw)
    self.db.commit()
```

**Stored Message Format:**
```json
{
  "type": "ai",
  "content": "The termination clause requires 30 days notice...",
  "timestamp": "2024-01-15T10:30:15.000Z",
  "sources": [
    {"page": 4, "source": "contract.pdf", "content": "Clause 5.1: Either party..."},
    {"page": 7, "source": "contract.pdf", "content": "Liability is limited to..."}
  ]
}
```

### Frontend Display

**File: `App.jsx`**

```jsx
// Loading sources from history
setMessages(saved.map(m => ({
  role: m.type === "human" ? "user" : "ai",
  text: m.content,
  sources: m.sources || [],  // Restore from database
  time: formatTimestamp(m.timestamp)
})))

// Clickable source badges
{msg.sources?.map((s, idx) => (
  <button
    key={idx}
    onClick={() => setSourceModal(s)}
    className="text-xs px-2.5 py-1 rounded-full cursor-pointer"
  >
    📄 Page {s.page}
  </button>
))}

// Source modal shows full excerpt
{sourceModal && (
  <div className="modal">
    <h3>Page {sourceModal.page}</h3>
    <p>"{sourceModal.content}"</p>
  </div>
)}
```

### API Response Format

**POST `/query`** returns:

```json
{
  "answer": "Based on the document, the termination clause...",
  "sources": [
    {
      "page": 4,
      "source": "contract.pdf",
      "content": "Clause 5.1: Either party may terminate this agreement with 30 days written notice..."
    },
    {
      "page": 7,
      "source": "contract.pdf", 
      "content": "Liability under this agreement shall be limited to the total fees paid..."
    }
  ]
}
```

### Key Features

| Feature | Implementation |
|---------|---------------|
| **Page Numbers** | Extracted from PyPDFLoader metadata (0-indexed → 1-indexed) |
| **Deduplication** | Same page appears only once even if multiple chunks match |
| **Persistence** | Sources stored in database, survive logout/login |
| **Clickable UI** | Page badges open modal with full excerpt |
| **Sorted Display** | Sources ordered by page number ascending |

### Why This Matters for Law/CA Firms

- **Audit Trail**: Users can verify exactly which part of a contract the AI referenced
- **Citation Support**: "According to Page 4 of the agreement..." 
- **Trust Building**: Transparency increases confidence in AI-generated answers
- **Compliance**: Some regulations require showing sources for legal opinions

---

# 9. Payment & Subscription System

## 9.1 Razorpay Integration

### Payment Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                       PAYMENT FLOW                                    │
│                                                                       │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│  │ Select  │ →  │ Create  │ →  │ Razorpay│ →  │  User   │            │
│  │  Plan   │    │  Order  │    │ Checkout│    │  Pays   │            │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘            │
│                                                     │                 │
│       ┌─────────────────────────────────────────────┘                 │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│  │Razorpay │ →  │ Verify  │ →  │ Update  │ →  │Redirect │            │
│  │Callback │    │Signature│    │  Plan   │    │ Welcome │            │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

### Order Creation
```python
def create_order(plan: str, billing_cycle: str, email: str) -> dict:
    amount = PLAN_PRICES[plan][billing_cycle]  # In paise
    
    receipt = f"{plan}_{billing_cycle[0]}_{int(time())}"  # Max 40 chars
    
    order = razorpay_client.order.create({
        "amount": amount,
        "currency": "INR",
        "receipt": receipt,
        "notes": {"email": email, "plan": plan}
    })
    
    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR"
    }
```

### Signature Verification
```python
def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)
```

## 9.2 Pricing Configuration

```python
PLAN_PRICES = {
    "basic": {
        "monthly": 99_900,      # ₹999 in paise
        "yearly": 999_900       # ₹9,999 in paise (save 17%)
    },
    "pro": {
        "monthly": 299_900,     # ₹2,999 in paise
        "yearly": 1_999_900     # ₹19,999 in paise (save 44%)
    }
}
```

## 9.3 Plan Hierarchy

```python
PLAN_HIERARCHY = {
    "free": 0,
    "basic": 1,
    "pro": 2,
    "enterprise": 3
}

# Prevents downgrades
if get_plan_level(new_plan) < get_plan_level(current_plan):
    raise HTTPException(400, "Cannot downgrade plan")
```

## 9.4 Billing Cycle Management

### Expiry Calculation
```python
def calculate_expiry_date(billing_cycle: str, start_date: datetime) -> datetime:
    if billing_cycle == "monthly":
        return start_date + timedelta(days=30)
    else:  # yearly
        return start_date + timedelta(days=365)
```

### Auto-Expiration Check
```python
def check_and_expire_plan(user: User, db: Session):
    if user.plan == "free":
        return
    
    if user.plan_expires_at and user.plan_expires_at < datetime.utcnow():
        user.plan = "free"
        user.billing_cycle = None
        user.plan_expires_at = None
        db.commit()
```

This check runs on:
- `/login` endpoint
- `/me` endpoint
- `/usage` endpoint

---

# 10. Plan Enforcement & Usage Tracking

## 10.1 Plan Limits Configuration

```python
PLAN_LIMITS = {
    "free": {
        "max_documents": 5,
        "max_file_size_mb": 10,
        "max_questions_per_month": 100,
        "features": ["Basic AI model", "Email support"]
    },
    "basic": {
        "max_documents": 50,
        "max_file_size_mb": 50,
        "max_questions_per_month": 1000,
        "features": ["Advanced AI", "Priority support", "Export"]
    },
    "pro": {
        "max_documents": float("inf"),
        "max_file_size_mb": 100,
        "max_questions_per_month": float("inf"),
        "features": ["Premium AI", "24/7 support", "Collaboration"]
    },
    "enterprise": {
        "max_documents": float("inf"),
        "max_file_size_mb": 500,
        "max_questions_per_month": float("inf"),
        "features": ["Dedicated capacity", "SLA", "Custom integrations"]
    }
}
```

## 10.2 Enforcement Points

### Document Upload (/upload)
```python
def check_document_limit(db: Session, user_id: str, plan: str):
    # Counts lifetime upload events, NOT active documents.
    # Deleting a document does NOT refund the upload credit.
    # This prevents the quota exploit of delete + re-upload.
    count = db.query(UsageLog).filter(
        UsageLog.user_id == user_id,
        UsageLog.action == "upload"
    ).count()
    limit = PLAN_LIMITS[plan]["max_documents"]
    
    if count >= limit:
        raise HTTPException(403, {
            "message": f"Document limit reached ({limit})",
            "upgrade_required": True,
            "current_usage": count,
            "limit": limit
        })

def check_file_size_limit(plan: str, file_size_bytes: int):
    limit_mb = PLAN_LIMITS[plan]["max_file_size_mb"]
    file_size_mb = file_size_bytes / (1024 * 1024)
    
    if file_size_mb > limit_mb:
        raise HTTPException(400, f"File too large. Your plan allows up to {limit_mb}MB")
```

### Question Query (/query)
```python
def check_question_limit(db: Session, user_id: str, plan: str):
    limit = PLAN_LIMITS[plan]["max_questions_per_month"]
    if limit == float("inf"):
        return
    
    month_start = datetime(now.year, now.month, 1)
    count = db.query(UsageLog).filter(
        UsageLog.user_id == user_id,
        UsageLog.action == "question",
        UsageLog.created_at >= month_start
    ).count()
    
    if count >= limit:
        raise HTTPException(403, {
            "message": f"Monthly question limit reached ({limit})",
            "upgrade_required": True,
            "current_usage": count,
            "limit": limit
        })
```

## 10.3 Usage Logging

```python
def log_usage(db: Session, user_id: str, action: str, extra_data: dict = None):
    log = UsageLog(
        user_id=user_id,
        action=action,  # "question", "upload", "download"
        extra_data=json.dumps(extra_data) if extra_data else None
    )
    db.add(log)
    db.commit()
```

## 10.4 Usage Summary Endpoint

```json
// GET /usage response
{
  "plan": "basic",
  "documents": {
    "used": 12,
    "limit": 50,
    "remaining": 38
  },
  "questions": {
    "used": 450,
    "limit": 1000,
    "remaining": 550,
    "reset_date": "2025-02-01"
  },
  "file_size_limit_mb": 50,
  "features": ["Advanced AI", "Priority support", "Export"]
}
```

---

# 11. API Reference

## 11.1 Authentication Endpoints

### POST /register
Create new account with email verification

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (202):**
```json
{
  "issued_email": "user@example.com",
  "expires_in_minutes": 15,
  "verification_methods": ["otp", "magic_link"]
}
```

### POST /login
Authenticate and receive JWT token

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "picture": null
  }
}
```

### POST /auth/google
Google OAuth login

**Request:**
```json
{
  "token": "google_id_token_from_frontend"
}
```

### POST /verify-email
Verify email with OTP or magic link

**Request (OTP):**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Request (Magic Link):**
```json
{
  "email": "user@example.com",
  "token": "magic_token_here"
}
```

## 11.2 User Endpoints

### GET /me
Get current user profile

**Response:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://...",
  "plan": "pro",
  "billing_cycle": "yearly",
  "plan_expires_at": "2026-01-26T00:00:00",
  "profile_image_source": "upload",
  "has_password": true,
  "is_google_user": false,
  "profession": "law_firm"
}
```

### PUT /profile/details
Update profile information

**Request:**
```json
{
  "name": "John Updated",
  "profession": "ca_firm",
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

### POST /profile/photo
Upload profile photo (multipart/form-data)

### DELETE /profile/photo
Remove profile photo

## 11.3 Document Endpoints

### POST /upload
Upload PDF document (multipart/form-data, rate limit: 10/day).

Returns immediately (~2-3s) after uploading to Supabase. Indexing runs in a background task — poll the status endpoint to track completion.

**Response:**
```json
{
  "message": "Upload received, indexing in background",
  "filename": "contract.pdf",
  "document_id": "uuid...",
  "file_path": "uuid_contract.pdf",
  "status": "pending"
}
```

### GET /documents/{id}/status

Poll this endpoint every 2 seconds after upload to track background indexing progress.

**Response:**
```json
{
  "document_id": "uuid...",
  "status": "pending | ready | failed"
}
```

### GET /documents
List all user documents. Each document includes a `status` field (`"pending"` | `"ready"` | `"failed"`).

### POST /documents/{id}/activate
Switch active document

### DELETE /documents/{id}
Delete document

### GET /files/{id}
Get signed URL for preview

### GET /files/{id}/download
Download document file

## 11.4 Query Endpoints

### POST /query
Ask question about active document (rate limit: 20/day)

**Request:**
```json
{
  "question": "What are the termination clauses?"
}
```

**Response:**
```json
{
  "answer": "The document contains the following termination clauses...",
  "sources": [
    {
      "page": 4,
      "source": "contract.pdf",
      "content": "Termination clause excerpt..."
    }
  ]
}
```

### GET /history
Get chat history for active document

## 11.5 Payment & Subscription Endpoints

### GET /payment/prices
Get current plan prices (public, no auth required)

### GET /payment/calculate-upgrade
Preview prorated cost for a plan change before creating an order.

**Query params:** `plan`, `billing_cycle`

**Response includes:** base price, proration credit, coupon discount, GST, and final total.

### POST /payment/create-order
Create Razorpay order (with optional coupon, rate limit: 5/min)

**Request:**
```json
{
  "plan": "pro",
  "billing_cycle": "yearly",
  "coupon_code": "LAUNCH50"
}
```

### POST /payment/verify
Verify Razorpay signature and activate plan (rate limit: 10/min)

**Request:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_hash",
  "plan": "pro",
  "billing_cycle": "yearly",
  "coupon_code": "LAUNCH50"
}
```

### POST /coupon/validate
Validate a coupon code and preview discount amount

**Request:**
```json
{
  "code": "LAUNCH50",
  "plan": "pro",
  "billing_cycle": "monthly"
}
```

**Response:**
```json
{
  "valid": true,
  "code": "LAUNCH50",
  "discount_type": "percentage",
  "discount_value": 50,
  "discount_amount": 1499.5,
  "message": "Coupon applied! You save ₹1500"
}
```

### POST /subscription/cancel
Cancel subscription — remains active until `plan_expires_at`

### GET /billing/history
Get last 20 successful payments with GST breakdown

### GET /usage
Get usage summary (docs used, questions used, limits, features)

## 11.6 Analytics Endpoint

### GET /analytics
Returns per-user usage analytics for the current user.

**Response:**
```json
{
  "monthly": {
    "queries": 42,
    "uploads": 3,
    "month": "April 2026"
  },
  "all_time": {
    "queries": 215,
    "documents": 18
  },
  "daily_trend": [
    {"date": "2026-03-15", "queries": 5},
    {"date": "2026-03-16", "queries": 12}
  ],
  "top_documents": [
    {"document_id": "uuid...", "filename": "contract.pdf", "query_count": 38}
  ]
}
```

## 11.7 Admin Endpoint

### POST /admin/cleanup-data
Delete users, documents, conversations, and optionally Pinecone vectors.

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

- `mode`: `"all"` (all users), `"test"` (emails containing "test"), or `""` with `email_filter`
- `confirm`: `false` = dry-run; `true` = execute

---

# 12. Third-Party Integrations

## 12.1 Pinecone (Vector Database)

**Purpose:** Store and search document embeddings

**Configuration:**
```
PINECONE_API_KEY=your_api_key
PINECONE_INDEX_NAME=docmind-index
```

**Index Settings:**
- Dimension: 1024 (Cohere embed-english-v3.0)
- Metric: Cosine similarity
- Cloud: AWS (us-east-1 recommended)

**Usage Pattern:**
```python
# Upsert vectors
index.upsert(vectors=[(id, vector, metadata)], namespace=doc_id)

# Query
results = index.query(vector=query_vec, top_k=4, namespace=doc_id)

# Delete namespace
index.delete(delete_all=True, namespace=doc_id)
```

## 12.2 Cohere (Embeddings + Reranking)

**Purpose:** Convert text to vectors (ingestion + query) and rerank retrieved chunks (query)

**Configuration:**
```
COHERE_API_KEY=your_api_key
```

**Embeddings — `embed-english-v3.0`**
- Output dimension: 1024
- Used at ingestion (chunks) and query time (question embedding for Pinecone)

```python
from langchain_cohere import CohereEmbeddings

embeddings = CohereEmbeddings(model="embed-english-v3.0")
vector = embeddings.embed_query("Hello world")      # Returns list[float]
vectors = embeddings.embed_documents(["text1", "text2"])  # Batch
```

**Reranking — `rerank-english-v3.0`**
- Takes the merged BM25 + Pinecone candidates (~20) and reorders by relevance
- Keeps top `RERANK_TOP_N = 4` chunks to pass to the LLM
- Gracefully falls back to first-4 of the merged list if the API call fails

```python
import cohere

co = cohere.Client(os.getenv("COHERE_API_KEY"))
response = co.rerank(
    model="rerank-english-v3.0",
    query=question,
    documents=[doc.page_content for doc in retrieved_docs],
    top_n=4,
)
reranked = [retrieved_docs[r.index] for r in response.results]
```

## 12.3 Groq (LLM)

**Purpose:** Generate AI responses

**Configuration:**
```
GROQ_API_KEY=your_api_key
```

**Model:** `llama-3.3-70b-versatile`
- Context window: 128K tokens
- Response time: ~500ms

**Usage:**
```python
from langchain_groq import ChatGroq

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
response = llm.invoke(messages)
```

## 12.4 Supabase Storage

**Purpose:** Store PDFs and profile images

**Configuration:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

**Buckets:**
- `profile-images`: Public bucket for avatars
- `documents`: Private bucket for PDFs

**File Structure:**
```
profile-images/
  └── {user_id}/avatar.{ext}

documents/
  └── {user_id}/{doc_id}_{filename}.pdf
```

## 12.5 Razorpay (Payments)

**Purpose:** Process subscription payments

**Configuration:**
```
RAZORPAY_KEY_ID=rzp_test_xxx  # or rzp_live_xxx
RAZORPAY_KEY_SECRET=your_secret
```

**Test Cards:**
- 4111 1111 1111 1111 (Visa)
- Any future expiry, any CVV

## 12.6 Google OAuth

**Purpose:** Social login

**Configuration:**
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

**Setup:**
1. Create project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 Client ID
4. Add authorized origins and redirect URIs

**Token Verification with Clock Skew Tolerance:**

Google tokens are time-sensitive. To handle minor clock differences between servers:

```python
# auth.py
def verify_google_token(id_token_str: str) -> dict:
    try:
        info = id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID"),
            clock_skew_in_seconds=30  # Allow 30 seconds tolerance
        )
        return info
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Google token")
```

**Common Issues:**
- `Token used too early` - Server clock is behind; add `clock_skew_in_seconds`
- `Wrong audience` - `GOOGLE_CLIENT_ID` mismatch between frontend/backend
- `Token expired` - Token is valid for ~1 hour; frontend should refresh

---

# 13. Environment Configuration

## 13.1 Required Environment Variables

### Core Database
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Authentication
```bash
JWT_SECRET=your-secret-key-at-least-32-characters-long
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
FRONTEND_URL=https://rag-enterprise.vercel.app  # Used in magic-link emails
```

### AI Services
```bash
COHERE_API_KEY=your_cohere_api_key      # Used for embeddings AND reranking
GROQ_API_KEY=your_groq_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=rag-enterprise      # Must match your Pinecone index name
```

### Storage
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_supabase_anon_or_service_key
```

### Payments
```bash
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
```

### Admin
```bash
ADMIN_SECRET=super-secret-admin-key     # Bearer token for /admin/* endpoints
```

### Email
```bash
EMAIL_MODE=console                      # "console" (dev) or "smtp" (prod)
EMAIL_FROM=no-reply@yourdomain.com
# Required when EMAIL_MODE=smtp:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=app_specific_password
```

## 13.2 Frontend Environment Variables

```bash
VITE_API_URL=http://localhost:8000      # or production URL
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
```

## 13.3 Sample .env File

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/docmind

# Auth
JWT_SECRET=change-this-to-a-very-long-random-string-at-least-32-chars
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
FRONTEND_URL=http://localhost:5173

# AI Services
COHERE_API_KEY=xxx
GROQ_API_KEY=xxx
PINECONE_API_KEY=xxx
PINECONE_INDEX_NAME=rag-enterprise

# Storage
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx

# Payments
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Admin
ADMIN_SECRET=change-in-production

# Email (development — prints to console)
EMAIL_MODE=console
EMAIL_FROM=no-reply@docmind.app
```

---

# 14. Deployment Architecture

## 14.1 Production Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION SETUP                             │
│                                                                      │
│  ┌─────────────┐                          ┌─────────────┐           │
│  │   Vercel    │ ←── Frontend (SPA) ────→ │   Render    │           │
│  │   (CDN)     │                          │  (Backend)  │           │
│  └─────────────┘                          └──────┬──────┘           │
│                                                  │                   │
│                                                  │                   │
│                    ┌─────────────────────────────┴────────┐         │
│                    │                                      │         │
│                    ▼                                      ▼         │
│  ┌─────────────────────────┐            ┌─────────────────────────┐│
│  │     Render Postgres     │            │      Supabase          ││
│  │    (Primary Database)   │            │   (File Storage)       ││
│  └─────────────────────────┘            └─────────────────────────┘│
│                                                                      │
│                    ┌──────────────────────────────┐                 │
│                    │       External APIs          │                 │
│                    │  • Pinecone (vectors)        │                 │
│                    │  • Cohere (embeddings)       │                 │
│                    │  • Groq (LLM)                │                 │
│                    │  • Razorpay (payments)       │                 │
│                    │  • Google (OAuth)            │                 │
│                    └──────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

## 14.2 Deployment Configuration

### Backend (Render)

**render.yaml:**
```yaml
services:
  - type: web
    name: docmind-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: docmind-db
          property: connectionString
      - key: JWT_SECRET
        sync: false
      # ... other env vars

databases:
  - name: docmind-db
    databaseName: docmind
    plan: starter
```

### Frontend (Vercel)

**vercel.json:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

## 14.3 Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs on port 5173
```

---

# 15. Security Considerations

## 15.1 Authentication Security

| Measure | Implementation |
|---------|----------------|
| Password Hashing | Argon2id (memory-hard, resistant to GPU attacks) |
| JWT Algorithm | HS256 with 256-bit secret |
| Token Expiry | 7 days (configurable) |
| Rate Limiting | Login: 10/min, Register: 5/min |
| Email Verification | SHA256 hashed OTP/tokens |

## 15.2 API Security

| Measure | Implementation |
|---------|----------------|
| CORS | Strict origin whitelist |
| Rate Limiting | Per-endpoint limits via SlowAPI |
| Input Validation | Pydantic models for all requests |
| SQL Injection | SQLAlchemy ORM (parameterized queries) |
| File Upload | Type validation, size limits |

## 15.3 Data Security

| Data Type | Protection |
|-----------|------------|
| Passwords | Never stored in plaintext, Argon2 hashed |
| JWT Secret | Environment variable, never in code |
| API Keys | Environment variables, not committed |
| Payment Data | Handled by Razorpay (PCI compliant) |
| Documents | Private Supabase bucket, signed URLs |

## 15.4 Infrastructure Security

| Measure | Implementation |
|---------|----------------|
| HTTPS | Enforced on all production endpoints |
| Database | SSL connections required |
| Admin Endpoints | Separate ADMIN_SECRET authentication |
| Secrets Management | Environment variables, not in repo |

---

# 16. User Flows

## 16.1 New User Registration

```
1. User lands on app → Sees AuthPage (login/register toggle)
2. User clicks "Register" → Enters name, email, password
3. POST /register → Backend validates, sends verification email
4. User receives email with 6-digit OTP and magic link
5. User enters OTP or clicks link
6. POST /verify-email → Backend verifies
7. User receives JWT token → Logged in
8. App fetches document list (empty for new user)
9. User sees empty state with "Upload your first document"
```

## 16.2 Document Upload & Query

```
1. User clicks "Upload Document" button
2. File picker opens (PDF only)
3. User selects PDF
4. Frontend shows upload progress
5. POST /upload → Backend:
   a. Validates file type and size
   b. Checks plan limits
   c. Uploads to Supabase
   d. Extracts text from PDF
   e. Chunks text (1000 chars, 200 overlap)
   f. Generates embeddings (Cohere)
   g. Stores in Pinecone (namespace = doc_id)
   h. Creates Document and Conversation records
6. Frontend shows success toast
7. Document appears in sidebar (active)
8. User types question in chat input
9. POST /query → Backend:
   a. Generates question embedding
   b. Searches Pinecone for similar chunks
   c. Builds context from top 4 matches
   d. Sends to LLM with chat history
   e. Extracts source citations
   f. Logs usage
10. Frontend displays AI response with sources
```

## 16.3 Plan Upgrade

```
1. User clicks "Upgrade" from profile dropdown
2. Navigate to /upgrade
3. User sees pricing cards (Free, Basic, Pro, Enterprise)
4. User toggles billing cycle (Monthly/Yearly)
5. User selects desired plan
6. User clicks "Upgrade to [Plan]"
7. POST /payment/create-order
8. Razorpay checkout modal opens
9. User completes payment
10. Razorpay returns payment details
11. POST /payment/verify → Backend verifies signature
12. User's plan updated in database
13. Navigate to /welcome (onboarding wizard)
14. User goes through:
    a. Welcome message
    b. Feature showcase
    c. Profession selection
    d. Prompting tips
15. User clicks "Start Using DocMind"
16. Navigate to main app with new plan active
```

## 16.4 Document Switching

```
1. User has multiple documents in sidebar
2. User clicks different document
3. POST /documents/{id}/activate
4. Backend:
   a. Sets clicked document as active
   b. Sets previous document as inactive
   c. Returns conversation history
5. Frontend:
   a. Updates active indicator in sidebar
   b. Loads chat history for new document
   c. Shows system message "Switched to [filename]"
6. User can now query the new document
```

---

# 17. Error Handling Strategy

## 17.1 Backend Error Responses

All errors follow consistent format:

```json
{
  "detail": "Error message here"
}
```

Or for complex errors:

```json
{
  "detail": {
    "message": "Descriptive message",
    "upgrade_required": true,
    "current_usage": 5,
    "limit": 5
  }
}
```

## 17.2 HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Query answered |
| 201 | Created | Document uploaded |
| 202 | Accepted | Verification email sent |
| 400 | Bad Request | Invalid file type |
| 401 | Unauthorized | Invalid/expired token |
| 403 | Forbidden | Plan limit exceeded |
| 404 | Not Found | Document doesn't exist |
| 429 | Too Many Requests | Rate limit hit |
| 500 | Server Error | External service failure |

## 17.3 Frontend Error Handling

```javascript
try {
  const res = await axios.post(`${API}/query`, { question })
  // Handle success
} catch (err) {
  const status = err.response?.status
  const detail = err.response?.data?.detail
  
  if (status === 403 && detail?.upgrade_required) {
    toast.error(detail.message)
    toast.info("Consider upgrading your plan")
  } else if (status === 429) {
    toast.error("Rate limit reached. Try again later.")
  } else if (status === 401) {
    // Token expired - logout user
    handleLogout()
  } else {
    toast.error(typeof detail === 'string' ? detail : "Something went wrong")
  }
}
```

## 17.4 Error Boundary

Frontend wraps entire app in ErrorBoundary:

```jsx
<ErrorBoundary fallback={<ServerErrorPage />}>
  <App />
</ErrorBoundary>
```

Catches unhandled React errors and displays friendly error page.

---

# 18. Performance Considerations

## 18.1 Backend Optimizations

| Area | Optimization |
|------|--------------|
| Database | Connection pooling (SQLAlchemy pool) |
| Queries | Indexed columns (email, user_id) |
| Embeddings | Batch processing for document chunks |
| Pinecone | Namespace isolation for fast queries |
| Rate Limiting | Protects against abuse |
| Upload latency | `POST /upload` returns in ~2-3s via FastAPI `BackgroundTasks`; ingestion (Cohere + Pinecone) runs after the response |
| Cold starts | cron-job.org pings `GET /health` every 10 min to keep Render free-tier container warm; login drops from 15s → 2-3s |

## 18.2 Frontend Optimizations

| Area | Optimization |
|------|--------------|
| Bundle Size | Vite tree-shaking, code splitting |
| Images | Lazy loading, WebP support |
| State | Local state > Context (minimal re-renders) |
| API | Debounced inputs, optimistic updates |
| Caching | localStorage for theme/token |

## 18.3 Scalability Considerations

| Component | Scaling Strategy |
|-----------|------------------|
| Backend | Horizontal (multiple Render instances) |
| Database | Vertical (Render managed scaling) |
| Pinecone | Horizontal (auto-scales) |
| Supabase | Storage auto-scales |
| LLM (Groq) | API rate limits apply |

## 18.4 Monitoring Recommendations

| Metric | Tool |
|--------|------|
| API Response Times | Render metrics |
| Error Rates | Sentry (recommended) |
| Usage Patterns | Custom analytics (UsageLog table) |
| Uptime | UptimeRobot / Better Uptime |

---

# Appendix A: Glossary

| Term | Definition |
|------|------------|
| **RAG** | Retrieval-Augmented Generation - combining search with LLM |
| **Embedding** | Vector representation of text for similarity search |
| **Chunk** | Portion of document text (1000 chars) |
| **Namespace** | Isolated section in Pinecone for each document |
| **JWT** | JSON Web Token for stateless authentication |
| **OTP** | One-Time Password for email verification |
| **Paise** | Smallest currency unit in INR (1 INR = 100 paise) |

---

# Appendix B: Quick Reference

## API Base URLs

- **Development:** `http://localhost:8000`
- **Production:** `https://your-render-app.onrender.com`

## Common Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
npm run build  # Production build
```

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `backend/main.py` | All API endpoints |
| `backend/database.py` | Database models |
| `backend/auth.py` | Authentication |
| `backend/rag.py` | AI query pipeline |
| `backend/payment.py` | Razorpay integration |
| `frontend/src/App.jsx` | App shell, auth/app transitions, chat orchestration |
| `frontend/src/AppRouter.jsx` | Global background layers + route wrappers |
| `frontend/src/components/Sidebar.jsx` | Responsive document rail and profile area |
| `frontend/src/components/ChatMessages.jsx` | Message rendering, skeletons, delayed loading hint |
| `frontend/src/lib/themes.js` | Theme token system used across all UI surfaces |

---

---

# 19. CI/CD Pipeline & Branch Protection

This section covers the Continuous Integration/Continuous Deployment setup that ensures code quality and prevents broken code from reaching production.

## 19.1 GitHub Actions Workflow

The CI pipeline (`.github/workflows/ci.yml`) runs automatically on:
- Every push to `main` branch
- Every pull request targeting `main`
- Manual trigger via GitHub Actions UI

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │  backend-lint  │      │ frontend-lint  │  ← Run in parallel  │
│  │   (ruff)       │      │   (eslint)     │                     │
│  └───────┬────────┘      └───────┬────────┘                     │
│          │                       │                               │
│          ▼                       ▼                               │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │  backend-test  │      │ frontend-build │  ← Run after lint   │
│  │   (pytest)     │      │    (vite)      │                     │
│  └───────┬────────┘      └───────┬────────┘                     │
│          │                       │                               │
│          └───────────┬───────────┘                               │
│                      ▼                                           │
│             ┌────────────────┐                                   │
│             │ All Checks ✅  │  ← Final gate for branch protect  │
│             └────────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Jobs Breakdown

| Job | Tools | Purpose | Failure Impact |
|-----|-------|---------|----------------|
| `backend-lint` | ruff | Python style & bug detection | Blocks merge |
| `backend-test` | pytest | API endpoint tests | Blocks merge |
| `frontend-lint` | eslint | JS/React issues | Blocks merge |
| `frontend-build` | vite | Compilation check | Blocks merge |
| `security-scan` | pip-audit, npm audit | Vulnerability check | Warning only |
| `all-checks-passed` | bash | Summary gate | Required for merge |

### Key Configuration Choices

**Why ruff over flake8/pylint?**
- 10-100x faster (written in Rust)
- Single tool for linting AND formatting
- Modern Python support (3.11+ features)

**Why pytest with coverage?**
- Standard Python testing framework
- Coverage reports identify untested code
- `--cov-fail-under=50` enforces minimum coverage

**Why concurrency group?**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
Saves CI minutes by canceling redundant runs when new commits are pushed.

## 19.2 Pre-commit Hooks

Pre-commit hooks run **locally** before code reaches GitHub, providing faster feedback.

### Installation

```bash
# Install pre-commit tool
pip install pre-commit

# Install hooks from config
cd rag-enterprise
pre-commit install
pre-commit install --hook-type commit-msg
```

### Hook Configuration (`.pre-commit-config.yaml`)

| Hook | Purpose |
|------|---------|
| `no-commit-to-branch` | Prevents direct commits to main |
| `check-added-large-files` | Warns about files > 500KB |
| `detect-private-key` | Catches accidental secret commits |
| `ruff` | Lints Python (auto-fixes issues) |
| `ruff-format` | Formats Python code |
| `eslint` | Lints JavaScript/React |
| `commitizen` | Enforces conventional commit messages |

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

Examples:
feat(auth): add Google OAuth login
fix(payment): correct GST calculation
docs(readme): add deployment guide
test(api): add registration tests
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 19.3 Branch Protection Rules

### Recommended GitHub Settings

Navigate to: **Settings → Branches → Add rule**

**Branch name pattern:** `main`

```
[✅] Require a pull request before merging
    [✅] Require approvals: 1
    [✅] Dismiss stale approvals when new commits are pushed
    
[✅] Require status checks to pass before merging
    [✅] Require branches to be up to date before merging
    Required checks:
    - All Checks Passed ✅
    
[✅] Require conversation resolution before merging

[✅] Do not allow bypassing the above settings

[ ] Allow force pushes
[ ] Allow deletions
```

### Developer Workflow

```bash
# 1. Create feature branch
git checkout main && git pull
git checkout -b feature/my-feature

# 2. Make changes & commit
git add .
git commit -m "feat(scope): description"  # Pre-commit hooks run

# 3. Push & create PR
git push origin feature/my-feature
# → CI pipeline runs automatically
# → Request code review
# → Merge when checks pass
```

## 19.4 Testing Strategy

### Backend Tests (`backend/tests/`)

**Location:** `backend/tests/`
**Framework:** pytest + httpx (for async testing)
**Database:** SQLite in-memory (isolated, fast)

**Test Categories:**

| File | Coverage |
|------|----------|
| `test_auth.py` | Registration, login, email verification, password validation |
| `test_api.py` | Documents, query, usage, billing, profile endpoints |
| `conftest.py` | Fixtures: test client, database, authenticated user |

**Running Tests Locally:**

```bash
cd backend

# Install test dependencies
pip install pytest pytest-asyncio httpx pytest-cov

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=term-missing

# Run specific test file
pytest tests/test_auth.py -v
```

**Test Database Isolation:**

```python
# conftest.py - Each test gets fresh database
@pytest.fixture(scope="function")
def client(db):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

### Frontend Tests (Future)

Currently, frontend uses ESLint for static analysis. Future additions:
- **Vitest** for unit tests
- **Playwright** for E2E tests

### Test Environment Variables

CI uses mock values for external services:

```yaml
env:
  DATABASE_URL: sqlite:///./test.db
  JWT_SECRET: test-secret-key-for-ci
  EMAIL_MODE: console  # Don't send real emails
  GROQ_API_KEY: test-key
  PINECONE_API_KEY: test-key
```

---

# Appendix C: CI/CD Quick Reference

## File Locations

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI pipeline definition |
| `.pre-commit-config.yaml` | Pre-commit hooks config |
| `backend/pyproject.toml` | Python linter (ruff) config |
| `backend/tests/conftest.py` | Test fixtures |
| `backend/tests/test_*.py` | Test files |
| `BRANCH_PROTECTION_GUIDE.md` | Full setup guide |

## Commands

```bash
# Pre-commit
pre-commit install              # Install hooks
pre-commit run --all-files      # Run all hooks manually

# Testing
pytest tests/ -v               # Run tests
pytest --cov=. --cov-report=html  # Coverage report

# Linting
ruff check .                   # Python lint
ruff format .                  # Python format
npm run lint                   # Frontend lint
```

---

## 20. Phase 5 — Hybrid Search & Reranking

### 20.1 Overview

Phase 5 upgrades the RAG retrieval pipeline from pure semantic search to a **hybrid retrieval + reranking** architecture. This improves answer quality in two key ways:

1. **Hybrid Search** — Combines BM25 (keyword match) with Pinecone dense vectors (semantic match). Keyword matching is essential when users query exact entity names, clause numbers, or section headings that semantic search may rank poorly.
2. **Cohere Reranking** — After merging BM25 and dense candidates, Cohere's `rerank-english-v3.0` model reorders them by true relevance to the query. Only the top-4 reranked chunks are passed to the LLM.

### 20.2 Architecture Change

**Before (Phase 1–4):**

```text
Question → Cohere Embedding → Pinecone Top-4 → LLaMA → Answer
```

**After (Phase 5):**

```text
Question → Cohere Embedding → Pinecone Top-10 (dense)
                            + PostgreSQL BM25 Top-10 (keyword)
                            → EnsembleRetriever (merge, deduplicate)
                            → Cohere Reranker (top-4 selected)
                            → LLaMA → Answer
```

### 20.3 New Database Table: `document_chunks`

Chunks must be stored in PostgreSQL for BM25 retrieval (BM25 operates on raw text, not vectors).

```sql
CREATE TABLE document_chunks (
    id           SERIAL PRIMARY KEY,
    document_id  VARCHAR NOT NULL,
    user_id      VARCHAR NOT NULL,
    content      TEXT    NOT NULL,
    chunk_index  INTEGER,
    page_num     INTEGER,
    source       VARCHAR,
    created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON document_chunks (document_id);
CREATE INDEX ON document_chunks (user_id);
```

The table is created automatically by `create_tables()` on server start. Existing documents ingested before Phase 5 will **not** have rows here — the pipeline gracefully falls back to dense-only retrieval for those documents. Users can re-upload to gain hybrid search.

### 20.4 Ingestion Changes (`ingest.py`)

`ingest_pdf()` now accepts three optional parameters:

| Parameter     | Type      | Purpose                                  |
|---------------|-----------|------------------------------------------|
| `db`          | `Session` | SQLAlchemy session for chunk persistence |
| `user_id`     | `str`     | Owner of the document                    |
| `document_id` | `str`     | Links chunks to the right document       |

When all three are provided, chunks are bulk-inserted into `document_chunks` after Pinecone ingestion. Old chunks are deleted first to handle re-uploads cleanly.

The `/upload` endpoint in `main.py` passes these parameters automatically.

### 20.5 Retrieval Weights

```python
EnsembleRetriever(
    retrievers=[bm25_retriever, dense_retriever],
    weights=[0.4, 0.6],   # BM25 40% : dense 60%
)
```

Dense is weighted higher because **meaning matters more than exact words** for document Q&A. However, BM25's 40% weight ensures that entity names, clause numbers, and section references are not missed.

### 20.6 Reranking Configuration

```python
RETRIEVAL_K  = 10   # candidates fetched from each retriever
RERANK_TOP_N = 4    # final chunks sent to the LLM after reranking
```

The Cohere reranker uses model `rerank-english-v3.0`. If the API call fails, the pipeline falls back to the top-4 merged candidates — answers are never blocked by a reranking failure.

### 20.7 New Dependency

```text
rank_bm25   # BM25Retriever from langchain_community requires this
```

Install: `pip install rank_bm25`

### 20.8 Analytics Endpoint (`GET /analytics`)

New endpoint added to surface usage data for dashboard display.

**Authentication:** Bearer JWT required.

**Response:**

```json
{
  "monthly": {
    "queries": 47,
    "uploads": 3,
    "month": "April 2026"
  },
  "all_time": {
    "queries": 312,
    "documents": 18
  },
  "daily_trend": [
    {"date": "2026-03-05", "queries": 12},
    {"date": "2026-03-06", "queries": 8}
  ],
  "top_documents": [
    {"document_id": "abc-123", "filename": "contract.pdf", "query_count": 45}
  ]
}
```

`daily_trend` contains one entry per day (last 30 days) with non-zero query counts — suitable for rendering a bar/line chart on a frontend analytics dashboard.

---

**Document Version:** 2.1
**Last Updated:** April 2026
**Maintainer:** DocMind Development Team
