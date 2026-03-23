import { useState, useRef, useEffect, useCallback } from "react"
import axios from "axios"
import AuthPage from "./AuthPage"
import ReactMarkdown from "react-markdown"
import { ToastContainer, toast } from "./Toast"

const API = (
  import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
)?.replace(/\/$/, "")

function getTime() {
  return new Date().toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}
function formatSize(bytes) {
  if (!bytes) return ""
  const b = parseInt(bytes)
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

// ── Themes ─────────────────────────────────────────────────
const themes = {
  light: {
    page:             "bg-slate-100",
    sidebar:          "bg-white border-slate-200",
    main:             "bg-slate-50",
    card:             "bg-white border-slate-200",
    inputBg:          "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-300 focus:bg-white",
    title:            "text-slate-900",
    label:            "text-slate-700",
    subtext:          "text-slate-400",
    muted:            "text-slate-500",
    msgUser:          "bg-slate-900 text-white rounded-tr-sm",
    msgAi:            "bg-white border border-slate-200 text-slate-800 rounded-tl-sm",
    msgSystem:        "bg-blue-50 border border-blue-100 text-blue-600 w-full",
    avatarUser:       "bg-slate-900 text-white",
    avatarAi:         "bg-slate-100 text-slate-500 border border-slate-200",
    thinkDot:         "bg-slate-300",
    badge:            "bg-slate-100 text-slate-500",
    divider:          "border-slate-100",
    sendBtn:          "bg-slate-900 hover:bg-slate-700 text-white shadow-sm",
    docRow:           "hover:bg-slate-50 text-slate-600",
    docRowActive:     "bg-blue-50 text-blue-700 border-l-2 border-blue-500",
    docAction:        "text-slate-400 hover:text-slate-700 hover:bg-slate-100",
    docActionDel:     "text-slate-400 hover:text-red-600 hover:bg-red-50",
    themeBtnBg:       "bg-slate-100",
    themeBtnActive:   "bg-white text-slate-900 shadow-sm",
    themeBtnInactive: "text-slate-400 hover:text-slate-600",
    uploadIdle:       "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300",
    uploadDone:       "border-emerald-200 bg-emerald-50",
    uploadActive:     "border-blue-200 bg-blue-50",
    iconStroke:       "#94a3b8",
    fileIconBg:       "bg-slate-100",
    emptyIconBg:      "bg-slate-100",
    dropdownBg:       "bg-white border-slate-200",
    citationBg:       "bg-blue-50 text-blue-600 border border-blue-200",
    citationDivider:  "border-slate-200",
  },
  dark: {
    page:             "bg-gray-950",
    sidebar:          "bg-gray-900 border-gray-800",
    main:             "bg-gray-950",
    card:             "bg-gray-900 border-gray-800",
    inputBg:          "bg-gray-800 border-gray-700 text-slate-100 placeholder-gray-500 focus:border-gray-600 focus:bg-gray-800",
    title:            "text-white",
    label:            "text-gray-200",
    subtext:          "text-gray-500",
    muted:            "text-gray-400",
    msgUser:          "bg-blue-600 text-white rounded-tr-sm",
    msgAi:            "bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm",
    msgSystem:        "bg-blue-900/30 border border-blue-800/50 text-blue-300 w-full",
    avatarUser:       "bg-blue-600 text-white",
    avatarAi:         "bg-gray-800 text-gray-400 border border-gray-700",
    thinkDot:         "bg-gray-600",
    badge:            "bg-gray-800 text-gray-500",
    divider:          "border-gray-800",
    sendBtn:          "bg-blue-600 hover:bg-blue-500 text-white",
    docRow:           "hover:bg-gray-800 text-gray-400",
    docRowActive:     "bg-blue-900/20 text-blue-400 border-l-2 border-blue-500",
    docAction:        "text-gray-500 hover:text-gray-200 hover:bg-gray-700",
    docActionDel:     "text-gray-500 hover:text-red-400 hover:bg-red-900/30",
    themeBtnBg:       "bg-gray-800",
    themeBtnActive:   "bg-gray-700 text-white",
    themeBtnInactive: "text-gray-500 hover:text-gray-300",
    uploadIdle:       "border-gray-700 bg-gray-800 hover:bg-gray-700 hover:border-gray-600",
    uploadDone:       "border-emerald-700/50 bg-emerald-900/20",
    uploadActive:     "border-blue-700/50 bg-blue-900/20",
    iconStroke:       "#4b5563",
    fileIconBg:       "bg-gray-700",
    emptyIconBg:      "bg-gray-800",
    dropdownBg:       "bg-gray-800 border-gray-700",
    citationBg:       "bg-blue-900/30 text-blue-400 border border-blue-800/50",
    citationDivider:  "border-gray-700",
  },
}

function useSystemTheme() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const fn = e => setIsDark(e.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])
  return isDark
}

// ── SVG Icons — all standard, no emojis ───────────────────
const IconLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
)
const IconSun = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)
const IconLogOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconEye = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconDownload = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)
const IconDotsVertical = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
)
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconFile = ({ stroke }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
  </svg>
)
const IconFolder = ({ stroke }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke || "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconMessageSquare = ({ stroke }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={stroke || "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconUpload = ({ stroke }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const IconSpinner = () => (
  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
)
const IconBookmark = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
)

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [themeMode, setThemeMode]       = useState("system")
  const systemIsDark                    = useSystemTheme()
  const [messages, setMessages]         = useState([])
  const [question, setQuestion]         = useState("")
  const [uploading, setUploading]       = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [loading, setLoading]           = useState(false)
  const [appLoading, setAppLoading]     = useState(true)
  const [documents, setDocuments]       = useState([])
  const [switching, setSwitching]       = useState(false)
  const [sidebarOpen, setSidebarOpen]   = useState(() => window.innerWidth >= 1024)
  const [openMenuId, setOpenMenuId]     = useState(null)

  const [token, setToken] = useState(localStorage.getItem("token"))
  const [user, setUser]   = useState(null)

  const fileRef   = useRef()
  const bottomRef = useRef()

  const resolvedTheme = themeMode === "system" ? (systemIsDark ? "dark" : "light") : themeMode
  const t = themes[resolvedTheme]

  // Keep sidebar closed on small screens
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setSidebarOpen(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!openMenuId) return
    const close = () => setOpenMenuId(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [openMenuId])

  const loadDocuments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/documents`)
      setDocuments(res.data.documents || [])
    } catch { /* silent */ }
  }, [])

  // On mount: verify token → load history → load documents
  useEffect(() => {
    if (!token) { setAppLoading(false); return }

    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setUser(res.data)
        return axios.get(`${API}/history`, { headers: { Authorization: `Bearer ${token}` } })
      })
      .then(res => {
        const { messages: saved, document: savedDoc } = res.data
        if (saved?.length > 0) {
          setMessages(saved.map(m => ({
            role:    m.type === "human" ? "user" : "ai",
            text:    m.content,
            sources: [],
            time:    ""
          })))
        }
        if (savedDoc) setUploadedFile(savedDoc)
        return axios.get(`${API}/documents`, { headers: { Authorization: `Bearer ${token}` } })
      })
      .then(res => setDocuments(res.data.documents || []))
      .catch(() => { localStorage.removeItem("token"); setToken(null); setUser(null) })
      .finally(() => setAppLoading(false))
  }, [token])

  // Attach token to all axios requests
  useEffect(() => {
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    else delete axios.defaults.headers.common["Authorization"]
  }, [token])

  const handleLogin = (tok, userData) => {
    localStorage.setItem("token", tok)
    setToken(tok)
    setUser(userData)
  }
  const handleLogout = () => {
    localStorage.removeItem("token")
    setToken(null); setUser(null)
    setMessages([]); setUploadedFile(null); setDocuments([])
  }

  // ── Upload ────────────────────────────────────────────────
  const uploadPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const res      = await axios.post(`${API}/upload`, form)
      const filename = res.data.filename || file.name
      setUploadedFile({
        id:          res.data.document_id,
        filename,
        file_path:   res.data.file_path,
        uploaded_at: new Date().toISOString(),
        file_size:   String(file.size)
      })
      setMessages([{
        role: "system",
        text: `"${filename}" indexed successfully. Ask me anything about it!`,
        sources: [],
        time: getTime()
      }])
      toast.success(`"${filename}" indexed!`)
      await loadDocuments()
    } catch (err) {
      const s = err.response?.status
      const d = err.response?.data?.detail
      if (s === 429) toast.error("Upload limit reached. Max 10/day.")
      else if (s === 400) toast.error(d || "Invalid file.")
      else toast.error("Upload failed. Check your connection.")
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  // ── Switch document ───────────────────────────────────────
  const switchDocument = async (doc) => {
    if (uploadedFile?.id === doc.id) return
    setSwitching(true)
    try {
      const res = await axios.post(`${API}/documents/${doc.id}/activate`)
      const { messages: saved, document: savedDoc } = res.data
      setUploadedFile(savedDoc)
      setMessages(saved.length > 0
        ? saved.map(m => ({ role: m.type === "human" ? "user" : "ai", text: m.content, sources: [], time: "" }))
        : [{ role: "system", text: `Switched to "${savedDoc.filename}". Ask me anything!`, sources: [], time: getTime() }]
      )
      setDocuments(prev => prev.map(d => ({ ...d, is_active: d.id === doc.id })))
      toast.info(`Switched to "${savedDoc.filename}"`)
    } catch { toast.error("Failed to switch document.") }
    setSwitching(false)
  }

  // ── Document actions ──────────────────────────────────────
  const previewDocument = (doc, e) => {
    e.stopPropagation()
    window.open(`${API}/files/${doc.file_path}`, "_blank")
  }
  const downloadDocument = (doc, e) => {
    e.stopPropagation()
    const a = document.createElement("a")
    a.href = `${API}/files/${doc.file_path}`
    a.download = doc.filename
    a.click()
  }
  const deleteDocument = async (doc, e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return
    try {
      const res = await axios.delete(`${API}/documents/${doc.id}`)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      if (res.data.new_active) {
        setUploadedFile(res.data.new_active)
        setMessages(res.data.messages.length > 0
          ? res.data.messages.map(m => ({ role: m.type === "human" ? "user" : "ai", text: m.content, sources: [], time: "" }))
          : [{ role: "system", text: `Switched to "${res.data.new_active.filename}".`, sources: [], time: getTime() }]
        )
        setDocuments(prev => prev.map(d => ({ ...d, is_active: d.id === res.data.new_active.id })))
      } else if (uploadedFile?.id === doc.id) {
        setUploadedFile(null)
        setMessages([])
      }
      toast.success(`"${doc.filename}" deleted.`)
    } catch { toast.error("Delete failed.") }
  }

  // ── Send message ──────────────────────────────────────────
  const sendMessage = async () => {
    if (!question.trim() || loading) return
    const q = question.trim()
    setMessages(prev => [...prev, { role: "user", text: q, sources: [], time: getTime() }])
    setQuestion("")
    setLoading(true)
    try {
      const res = await axios.post(`${API}/query`, { question: q })
      setMessages(prev => [...prev, {
        role:    "ai",
        text:    res.data.answer,
        sources: res.data.sources || [],
        time:    getTime()
      }])
    } catch (err) {
      const msg = err.response?.status === 429
        ? "Daily query limit reached. Upgrade to Pro for more."
        : "Something went wrong. Please try again."
      setMessages(prev => [...prev, { role: "ai", text: msg, sources: [], time: getTime() }])
    }
    setLoading(false)
  }

  const userMsgCount = messages.filter(m => m.role === "user").length

  // ── Loading screen ────────────────────────────────────────
  if (appLoading) return (
    <div className={`min-h-screen flex items-center justify-center ${resolvedTheme === "dark" ? "bg-gray-950" : "bg-slate-100"}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl">
          <IconLogo />
        </div>
        <div className="flex gap-1.5">
          {[0, 150, 300].map(d => (
            <span key={d} style={{ animationDelay: `${d}ms` }}
              className={`w-2 h-2 rounded-full animate-bounce ${resolvedTheme === "dark" ? "bg-blue-500" : "bg-slate-400"}`}
            />
          ))}
        </div>
      </div>
    </div>
  )

  if (!token) return <AuthPage onLogin={handleLogin} />

  // ── Render ────────────────────────────────────────────────
  return (
    <div className={`h-screen flex overflow-hidden ${t.page} transition-colors duration-200`}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close sidebar"
        />
      )}

      <aside className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${sidebarOpen ? "w-72" : "w-0 lg:w-72"}
        fixed lg:static z-40 h-full
        flex-shrink-0 flex flex-col border-r overflow-hidden
        transition-all duration-300 ease-in-out
        ${t.sidebar}
      `}>

        {/* Logo */}
        <div className="flex-shrink-0 px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-md">
              <IconLogo />
            </div>
            <div>
              <p className={`text-sm font-bold tracking-tight ${t.title}`}>DocMind AI</p>
              <p className={`text-xs ${t.subtext}`}>Document Intelligence</p>
            </div>
          </div>

          {/* Upload button */}
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={uploadPDF} />
          <button
            onClick={() => !uploading && fileRef.current.click()}
            disabled={uploading}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold
              transition-all duration-200 border
              ${uploading
                ? "border-blue-300 bg-blue-50 text-blue-500 cursor-wait"
                : resolvedTheme === "dark"
                  ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-600"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
              }`}
          >
            {uploading ? <><IconSpinner /> Indexing...</> : <><IconPlus /> Upload New Document</>}
          </button>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          {documents.length > 0 ? (
            <>
              <p className={`text-xs font-semibold uppercase tracking-wider px-2 mb-2 ${t.subtext}`}>
                Documents · {documents.length}
              </p>
              <div className="flex flex-col gap-0.5">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => !switching && switchDocument(doc)}
                    className={`group relative flex items-start gap-2.5 px-2 py-2.5 rounded-lg cursor-pointer transition-all duration-150
                      ${doc.is_active ? t.docRowActive : t.docRow}`}
                  >
                    {/* File icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                      ${doc.is_active ? "bg-blue-500/20" : t.fileIconBg}`}>
                      {doc.is_active
                        ? <IconCheck />
                        : <IconFile stroke={resolvedTheme === "dark" ? "#6b7280" : "#94a3b8"} />
                      }
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0 pr-1">
                      <p className={`text-xs font-medium truncate leading-tight
                        ${doc.is_active
                          ? resolvedTheme === "dark" ? "text-blue-300" : "text-blue-700"
                          : t.label}`}>
                        {doc.filename}
                      </p>
                      <p className={`text-xs mt-0.5 ${t.subtext}`}>
                        {formatDate(doc.uploaded_at)}{doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
                      </p>
                    </div>

                    {/* 3-dot menu */}
                    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === doc.id ? null : doc.id) }}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
                          opacity-0 group-hover:opacity-100 ${t.docAction}`}
                      >
                        <IconDotsVertical />
                      </button>

                      {openMenuId === doc.id && (
                        <div className={`absolute right-0 top-7 z-50 w-36 rounded-xl border shadow-xl overflow-hidden ${t.dropdownBg}`}>
                          <button
                            onClick={e => { previewDocument(doc, e); setOpenMenuId(null) }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${t.docAction}`}
                          >
                            <IconEye /> Preview
                          </button>
                          <button
                            onClick={e => { downloadDocument(doc, e); setOpenMenuId(null) }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${t.docAction}`}
                          >
                            <IconDownload /> Download
                          </button>
                          <div className={`h-px mx-2 ${t.divider}`} />
                          <button
                            onClick={e => { deleteDocument(doc, e); setOpenMenuId(null) }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${t.docActionDel}`}
                          >
                            <IconTrash /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.emptyIconBg}`}>
                <IconFolder stroke={resolvedTheme === "dark" ? "#4b5563" : "#94a3b8"} />
              </div>
              <p className={`text-xs ${t.subtext}`}>No documents yet</p>
              <p className={`text-xs ${t.subtext} opacity-60`}>Upload a PDF to get started</p>
            </div>
          )}
        </div>

        {/* Sidebar bottom — theme + user */}
        <div className={`flex-shrink-0 border-t ${t.divider} p-3 flex flex-col gap-2`}>

          {/* Theme switcher */}
          <div className={`flex items-center rounded-xl p-1 ${t.themeBtnBg}`}>
            {[
              { key: "system", icon: <IconMonitor />, label: "System" },
              { key: "light",  icon: <IconSun />,     label: "Light"  },
              { key: "dark",   icon: <IconMoon />,    label: "Dark"   },
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => setThemeMode(key)} title={label}
                className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all
                  ${themeMode === key ? t.themeBtnActive : t.themeBtnInactive}`}>
                {icon}
              </button>
            ))}
          </div>

          {/* User profile */}
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors cursor-default group
            ${resolvedTheme === "dark" ? "hover:bg-gray-800" : "hover:bg-slate-50"}`}>
            {user?.picture
              ? <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-white/10 flex-shrink-0" />
              : <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(user?.name || user?.email || "U")[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${t.label}`}>{user?.name || "User"}</p>
              <p className={`text-xs truncate ${t.subtext}`}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                transition-all
                ${resolvedTheme === "dark" ? "hover:bg-red-900/30 text-red-400" : "hover:bg-red-50 text-red-500"}`}>
              <IconLogOut />
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${t.divider} ${t.card}`}>
          <div className="flex items-center gap-3">
            {/* Hamburger toggle */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center gap-1 transition-all
                ${resolvedTheme === "dark" ? "hover:bg-gray-800" : "hover:bg-slate-100"}`}
            >
              <span className={`block w-4 h-0.5 rounded ${resolvedTheme === "dark" ? "bg-gray-500" : "bg-slate-400"}`}/>
              <span className={`block w-4 h-0.5 rounded ${resolvedTheme === "dark" ? "bg-gray-500" : "bg-slate-400"}`}/>
              <span className={`block w-3 h-0.5 rounded ${resolvedTheme === "dark" ? "bg-gray-500" : "bg-slate-400"}`}/>
            </button>

            {uploadedFile ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <IconCheck />
                </div>
                <div>
                  <p className={`text-sm font-semibold truncate max-w-xs ${t.label}`}>{uploadedFile.filename}</p>
                  <p className={`text-xs ${t.subtext}`}>Active document</p>
                </div>
              </div>
            ) : (
              <div>
                <p className={`text-sm font-semibold ${t.label}`}>DocMind AI</p>
                <p className={`text-xs ${t.subtext}`}>Upload a document to start</p>
              </div>
            )}
          </div>

          {userMsgCount > 0 && (
            <span className={`text-xs ${t.badge} px-2.5 py-1 rounded-full font-mono`}>
              {userMsgCount} {userMsgCount === 1 ? "query" : "queries"}
            </span>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 min-h-0">
          {switching ? (
            <div className="flex flex-col items-center justify-center gap-3 h-full">
              <div className="flex gap-1.5">
                {[0,150,300].map(d => (
                  <span key={d} style={{animationDelay:`${d}ms`}}
                    className={`w-2 h-2 rounded-full animate-bounce ${t.thinkDot}`}/>
                ))}
              </div>
              <p className={`text-xs font-mono ${t.subtext}`}>Switching document...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 h-full text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${t.emptyIconBg}`}>
                <IconMessageSquare stroke={t.iconStroke} />
              </div>
              <div>
                <p className={`text-base font-semibold ${t.label}`}>No conversation yet</p>
                <p className={`text-sm ${t.subtext} mt-1`}>
                  {documents.length > 0
                    ? "Select a document from the sidebar to continue"
                    : "Upload a PDF using the sidebar to get started"}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  {msg.role !== "system" && (
                    <div className={`w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 border
                      ${msg.role === "user" ? t.avatarUser : t.avatarAi}`}>
                      {msg.role === "user" ? (user?.name?.[0]?.toUpperCase() || "U") : "AI"}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={msg.role === "system" ? "w-full" : "max-w-[80%]"}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${msg.role === "user"   ? t.msgUser :
                        msg.role === "system" ? t.msgSystem :
                        t.msgAi}`}>

                      {msg.role === "ai" ? (
                        <>
                          <ReactMarkdown components={{
                            p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mt-2">{children}</ul>,
                            ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mt-2">{children}</ol>,
                            li:     ({ children }) => <li>{children}</li>,
                          }}>
                            {msg.text}
                          </ReactMarkdown>

                          {/* Source citations */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-1.5 ${t.citationDivider}`}>
                              <span className={`text-xs ${t.subtext} flex items-center gap-1`}>
                                <IconBookmark /> Sources:
                              </span>
                              {msg.sources.map((s, idx) => (
                                <span key={idx} className={`text-xs px-2 py-0.5 rounded-full font-mono ${t.citationBg}`}>
                                  Page {s.page}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : msg.text}
                    </div>

                    {msg.time && (
                      <p className={`text-xs ${t.subtext} mt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                        {msg.time}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {loading && (
                <div className="flex gap-3">
                  <div className={`w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 border ${t.avatarAi}`}>
                    AI
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${t.msgAi}`}>
                    <div className="flex gap-1.5 items-center h-4">
                      {[0,150,300].map(d => (
                        <span key={d} style={{animationDelay:`${d}ms`}}
                          className={`w-1.5 h-1.5 rounded-full ${t.thinkDot} animate-bounce`}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className={`flex-shrink-0 border-t ${t.divider} px-4 py-3`}>
          <div className="max-w-3xl mx-auto flex gap-2 items-center">
            <input
              className={`flex-1 border rounded-xl px-4 py-3 text-sm outline-none transition-all ${t.inputBg}`}
              placeholder={
                switching    ? "Switching document..." :
                uploadedFile ? `Ask anything about "${uploadedFile.filename}"...` :
                "Upload a document from the sidebar to start..."
              }
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              disabled={!uploadedFile || loading || switching}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !uploadedFile || !question.trim() || switching}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all
                disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${t.sendBtn}`}
            >
              <IconSend />
            </button>
          </div>
          <p className={`text-center text-xs ${t.subtext} mt-2 opacity-50`}>
            Powered by LLaMA-3.3-70b · Pinecone · Cohere
          </p>
        </div>
      </div>

      <ToastContainer resolvedTheme={resolvedTheme} />
    </div>
  )
}