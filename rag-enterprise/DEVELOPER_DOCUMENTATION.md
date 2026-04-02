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

### Document Upload Flow
```
User → Frontend → POST /upload → Rate Limit Check → Plan Limit Check
                                         │
                                         ▼
                              File Validation (PDF, size)
                                         │
                                         ▼
                              Upload to Supabase Storage
                                         │
                                         ▼
                              PDF Text Extraction (PyPDF)
                                         │
                                         ▼
                              Text Chunking (1000 chars, 200 overlap)
                                         │
                                         ▼
                              Generate Embeddings (Cohere)
                                         │
                                         ▼
                              Store in Pinecone (namespace=doc_id)
                                         │
                                         ▼
                              Create DB Records (Document, Conversation)
                                         │
                                         ▼
                              Return Success Response → Frontend Update
```

### Query Processing Flow
```
User Question → Frontend → POST /query → Auth Check → Plan Limit Check
                                                │
                                                ▼
                                   Generate Question Embedding (Cohere)
                                                │
                                                ▼
                                   Search Pinecone (top 4 chunks)
                                                │
                                                ▼
                                   Build Context + Chat History
                                                │
                                                ▼
                                   Generate Answer (Groq LLM)
                                                │
                                                ▼
                                   Extract Source Citations
                                                │
                                                ▼
                                   Save to Conversation History
                                                │
                                                ▼
                                   Log Usage → Return Response
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
├── main.py                 # FastAPI app, all API endpoints
├── database.py             # SQLAlchemy models, DB connection
├── auth.py                 # Authentication logic, JWT, password hashing
├── rag.py                  # RAG query pipeline
├── ingest.py               # PDF ingestion pipeline
├── payment.py              # Razorpay integration
├── plan_limits.py          # Plan enforcement, usage tracking
├── supabase_storage.py     # Cloud storage operations
├── email_service.py        # Email sending (SMTP)
├── cleanup_data.py         # Admin data cleanup utility
├── reset_db.py             # Development DB reset utility
├── requirements.txt        # Python dependencies
└── Procfile                # Deployment command
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
- **Lines:** ~120
- **Role:** RAG query processing
- **Responsibilities:**
  - Question embedding generation
  - Pinecone similarity search
  - Context assembly
  - LLM answer generation
  - Source citation extraction
  - Chat history management

### ingest.py (Processing Layer)
- **Lines:** ~80
- **Role:** Document ingestion
- **Responsibilities:**
  - PDF loading and text extraction
  - Text chunking with overlap
  - Batch embedding generation
  - Pinecone vector storage
  - Namespace management

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
│   ├── main.jsx              # Entry point, React root
│   ├── AppRouter.jsx         # Route definitions, wrappers
│   ├── App.jsx               # Main chat interface (~900 lines)
│   ├── AuthPage.jsx          # Login/register/verify UI
│   ├── SettingsPage.jsx      # User settings (~600 lines)
│   ├── UpgradePlanPage.jsx   # Plan selection & payment
│   ├── PremiumWelcomePage.jsx# Post-upgrade onboarding
│   ├── HelpPage.jsx          # FAQ and support
│   ├── ProfileDropdown.jsx   # User menu component
│   ├── Toast.jsx             # Notification system
│   ├── Loader.jsx            # Loading components
│   ├── LanguageContext.jsx   # i18n context (en/hi)
│   ├── ErrorBoundary.jsx     # Error handling wrapper
│   ├── NotFoundPage.jsx      # 404 page
│   ├── ServerErrorPage.jsx   # 500 page
│   ├── index.css             # Global styles
│   └── assets/               # Static assets
├── public/                   # Public static files
├── package.json              # Dependencies
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── postcss.config.js         # PostCSS configuration
```

## 5.2 Component Hierarchy

```
main.jsx
└── ErrorBoundary
    └── GoogleOAuthProvider
        └── AppRouter
            ├── App (/)
            │   ├── Sidebar
            │   │   ├── Logo
            │   │   ├── UploadButton
            │   │   ├── DocumentList
            │   │   │   └── DocumentItem (×n)
            │   │   └── ProfileDropdown
            │   │       └── ThemeSubmenu
            │   └── MainContent
            │       ├── Header
            │       ├── ChatMessages
            │       │   └── MessageBubble (×n)
            │       └── InputArea
            │
            ├── SettingsPage (/settings)
            │   ├── ProfileSection
            │   ├── DetailsForm
            │   ├── PlanSection
            │   └── UsageSection
            │
            ├── UpgradePlanPage (/upgrade)
            │   ├── BillingToggle
            │   └── PricingCard (×4)
            │
            ├── PremiumWelcomePage (/welcome)
            │   ├── WelcomeStep
            │   ├── FeaturesStep
            │   ├── ProfessionStep
            │   └── TipsStep
            │
            ├── HelpPage (/help)
            ├── NotFoundPage (*)
            └── ServerErrorPage (/error)
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
    page: "bg-slate-100",
    sidebar: "bg-white border-slate-200",
    card: "bg-white border-slate-200",
    title: "text-slate-900",
    msgUser: "bg-slate-900 text-white",
    msgAi: "bg-white border-slate-200 text-slate-800",
    // ... 20+ properties
  },
  dark: {
    page: "bg-gray-950",
    sidebar: "bg-gray-900 border-gray-800",
    card: "bg-gray-900 border-gray-800",
    title: "text-white",
    msgUser: "bg-blue-600 text-white",
    msgAi: "bg-gray-800 text-gray-100",
    // ... 20+ properties
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
│ file_path                  VARCHAR           Storage path            │
│ file_size                  VARCHAR           Size in bytes           │
│ chunk_count                INTEGER           Ingested chunks         │
│ is_active                  BOOLEAN           Current context         │
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
│ action                     VARCHAR           question/upload/download│
│ extra_data                 TEXT              JSON metadata           │
│ created_at                 TIMESTAMP         Action timestamp        │
└─────────────────────────────────────────────────────────────────────┘
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

## 8.1 RAG Architecture Overview

**RAG = Retrieval-Augmented Generation**

The system combines document retrieval (finding relevant chunks) with language model generation (producing answers).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAG PIPELINE                                  │
│                                                                      │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌─────────┐ │
│  │  Question │ →   │  Embed    │ →   │  Search   │ →   │ Retrieve│ │
│  │           │     │  (Cohere) │     │ (Pinecone)│     │ Top 4   │ │
│  └───────────┘     └───────────┘     └───────────┘     └────┬────┘ │
│                                                              │      │
│                                                              ▼      │
│  ┌───────────┐     ┌───────────┐     ┌───────────────────────────┐ │
│  │  Answer   │ ←   │  Generate │ ←   │  Context + Chat History   │ │
│  │           │     │  (Groq)   │     │                           │ │
│  └───────────┘     └───────────┘     └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

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

### Step 4: Vector Storage
```python
Pinecone.from_documents(
    documents=chunks,
    embedding=embeddings,
    index_name=PINECONE_INDEX_NAME,
    namespace=document_id    # Isolates each document
)
```

## 8.3 Query Processing Pipeline

### Step 1: Question Embedding
```python
question_vector = embeddings.embed_query(question)
```

### Step 2: Similarity Search
```python
index = pinecone.Index(PINECONE_INDEX_NAME)
results = index.query(
    vector=question_vector,
    namespace=document_id,
    top_k=4,                 # Retrieve top 4 matches
    include_metadata=True
)
```

### Step 3: Context Assembly
```python
context = "\n\n".join([
    f"[Page {r.metadata['page']}]: {r.metadata['text']}"
    for r in results.matches
])
```

### Step 4: LLM Generation
```python
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0            # Deterministic output
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Use the context to answer.\n\nContext:\n{context}"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}")
])

chain = prompt | llm | StrOutputParser()
answer = chain.invoke({
    "context": context,
    "chat_history": previous_messages,
    "question": user_question
})
```

### Step 5: Source Extraction
```python
sources = [
    {
        "page": result.metadata["page"],
        "content": result.metadata["text"][:200]  # Excerpt
    }
    for result in results.matches
]
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
    count = db.query(Document).filter(Document.user_id == user_id).count()
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
Upload PDF document (multipart/form-data, rate limit: 10/day)

**Response:**
```json
{
  "message": "Ingested 45 chunks successfully",
  "filename": "contract.pdf",
  "document_id": "uuid...",
  "file_path": "uuid_contract.pdf"
}
```

### GET /documents
List all user documents

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

## 11.5 Payment Endpoints

### POST /payment/create-order
Create Razorpay order

**Request:**
```json
{
  "plan": "pro",
  "billing_cycle": "yearly"
}
```

### POST /payment/verify
Verify payment and upgrade plan

**Request:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_hash",
  "plan": "pro",
  "billing_cycle": "yearly"
}
```

### GET /payment/prices
Get current pricing

### GET /usage
Get usage statistics

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

## 12.2 Cohere (Embeddings)

**Purpose:** Convert text to vectors

**Configuration:**
```
COHERE_API_KEY=your_api_key
```

**Model:** `embed-english-v3.0`
- Dimension: 1024
- Max tokens: 512 per text

**Usage:**
```python
from langchain_cohere import CohereEmbeddings

embeddings = CohereEmbeddings(model="embed-english-v3.0")
vector = embeddings.embed_query("Hello world")  # Returns list[float]
vectors = embeddings.embed_documents(["text1", "text2"])  # Batch
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
```

### AI Services
```bash
COHERE_API_KEY=your_cohere_api_key
GROQ_API_KEY=your_groq_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=docmind-index
```

### Storage
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

### Payments
```bash
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
```

### Email (Optional)
```bash
EMAIL_MODE=smtp  # or "console" for development
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=app_specific_password
EMAIL_FROM=noreply@docmind.app
APP_NAME=DocMind
```

### Admin (Optional)
```bash
ADMIN_SECRET=super-secret-admin-key
```

## 13.2 Frontend Environment Variables

```bash
VITE_API_URL=http://localhost:8000  # or production URL
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
```

## 13.3 Sample .env File

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/docmind

# Auth
JWT_SECRET=change-this-to-a-very-long-random-string-at-least-32-chars

# AI Services
COHERE_API_KEY=xxx
GROQ_API_KEY=xxx
PINECONE_API_KEY=xxx
PINECONE_INDEX_NAME=docmind-index

# Storage
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx

# Payments
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Email (development)
EMAIL_MODE=console
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
| `frontend/src/App.jsx` | Main chat UI |
| `frontend/src/AppRouter.jsx` | Route definitions |

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

**Document Version:** 2.0  
**Last Updated:** April 2026  
**Maintainer:** DocMind Development Team
