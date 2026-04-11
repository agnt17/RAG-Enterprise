import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { FileText } from "lucide-react"
import AuthPage from "./AuthPage"
import { ToastContainer, toast } from "./Toast"

import { API } from "./lib/api"
import { themes } from "./lib/themes"
import { getTime, formatTimestamp } from "./lib/utils"
import Sidebar from "./components/Sidebar"
import ChatHeader from "./components/ChatHeader"
import ChatMessages from "./components/ChatMessages"
import QuickActions from "./components/QuickActions"
import ChatInput from "./components/ChatInput"
import SourceModal from "./components/SourceModal"

// ── System theme hook ─────────────────────────────────────
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

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("theme") || "system")
  const systemIsDark = useSystemTheme()
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [appLoading, setAppLoading] = useState(true)
  const [documents, setDocuments] = useState([])
  const [switching, setSwitching] = useState(false)
  const [processingDocId, setProcessingDocId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [sourceModal, setSourceModal] = useState(null)

  const [token, setToken] = useState(localStorage.getItem("token"))
  const [user, setUser] = useState(null)

  const resolvedTheme = themeMode === "system" ? (systemIsDark ? "dark" : "light") : themeMode
  const t = themes[resolvedTheme]

  // Persist theme
  useEffect(() => { localStorage.setItem("theme", themeMode) }, [themeMode])

  // Sidebar responsive
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setSidebarOpen(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

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
            role: m.type === "human" ? "user" : "ai",
            text: m.content,
            sources: m.sources || [],
            time: formatTimestamp(m.timestamp)
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

  // Poll for document indexing status
  useEffect(() => {
    if (!processingDocId || !token) return
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/documents/${processingDocId}/status`)
        const { status } = res.data
        if (status === "ready") {
          clearInterval(interval)
          setDocuments(prev => prev.map(d => d.id === processingDocId ? { ...d, status: "ready" } : d))
          setUploadedFile(prev => prev?.id === processingDocId ? { ...prev, status: "ready" } : prev)
          setProcessingDocId(null)
          toast.success("Document indexed and ready! Ask me anything.")
        } else if (status === "failed") {
          clearInterval(interval)
          setDocuments(prev => prev.filter(d => d.id !== processingDocId))
          setUploadedFile(prev => prev?.id === processingDocId ? null : prev)
          setProcessingDocId(null)
          toast.error("Indexing failed. Please try uploading again.")
        }
      } catch { /* keep polling */ }
    }, 2000)
    return () => clearInterval(interval)
  }, [processingDocId, token])

  // ── Auth ─────────────────────────────────────────────────
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

  // ── Upload ───────────────────────────────────────────────
  const uploadPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await axios.post(`${API}/upload`, form)
      const filename = res.data.filename || file.name
      const docId = res.data.document_id
      const newDoc = {
        id: docId,
        filename,
        file_path: res.data.file_path,
        uploaded_at: new Date().toISOString(),
        file_size: String(file.size),
        is_active: true,
        status: "pending"
      }
      setDocuments(prev => [newDoc, ...prev.map(d => ({ ...d, is_active: false }))])
      setUploadedFile(newDoc)
      setMessages([{
        role: "system",
        text: `"${filename}" uploaded! Indexing in the background — ready in ~15 seconds.`,
        sources: [],
        time: getTime()
      }])
      setProcessingDocId(docId)
    } catch (err) {
      const s = err.response?.status
      const d = err.response?.data?.detail
      if (s === 403 && d?.upgrade_required) {
        toast.error(d.message)
        toast.info("Upgrade your plan for more documents!", { duration: 5000 })
      } else if (s === 429) {
        toast.error("Upload limit reached. Max 10/day.")
      } else if (s === 400) {
        toast.error(typeof d === 'string' ? d : d?.message || "Invalid file.")
      } else {
        toast.error("Upload failed. Check your connection.")
      }
    }
    setUploading(false)
    e.target.value = ""
  }

  // ── Switch document ──────────────────────────────────────
  const switchDocument = async (doc) => {
    if (uploadedFile?.id === doc.id) return
    setSwitching(true)
    try {
      const res = await axios.post(`${API}/documents/${doc.id}/activate`)
      const { messages: saved, document: savedDoc } = res.data
      setUploadedFile(savedDoc)
      setMessages(saved.length > 0
        ? saved.map(m => ({ role: m.type === "human" ? "user" : "ai", text: m.content, sources: [], time: formatTimestamp(m.timestamp) }))
        : [{ role: "system", text: `Switched to "${savedDoc.filename}". Ask me anything!`, sources: [], time: getTime() }]
      )
      setDocuments(prev => prev.map(d => ({ ...d, is_active: d.id === doc.id })))
      toast.info(`Switched to "${savedDoc.filename}"`)
    } catch { toast.error("Failed to switch document.") }
    setSwitching(false)
  }

  // ── Document actions ─────────────────────────────────────
  const previewDocument = async (doc, e) => {
    e.stopPropagation()
    try {
      const res = await axios.get(`${API}/files/${doc.id}`)
      window.open(res.data.url, "_blank")
    } catch { toast.error("Could not preview document") }
  }

  const downloadDocument = async (doc, e) => {
    e.stopPropagation()
    try {
      const res = await axios.get(`${API}/files/${doc.id}`)
      const a = document.createElement("a")
      a.href = res.data.url
      a.download = doc.filename
      a.click()
    } catch { toast.error("Could not download document") }
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
          ? res.data.messages.map(m => ({ role: m.type === "human" ? "user" : "ai", text: m.content, sources: [], time: formatTimestamp(m.timestamp) }))
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

  // ── Send query ───────────────────────────────────────────
  const sendQuery = async (q) => {
    setMessages(prev => [...prev, { role: "user", text: q, sources: [], time: getTime() }])
    setQuestion("")
    setLoading(true)
    try {
      const res = await axios.post(`${API}/query`, { question: q })
      setMessages(prev => [...prev, {
        role: "ai",
        text: res.data.answer,
        sources: res.data.sources || [],
        time: getTime()
      }])
    } catch (err) {
      let msg = "Something went wrong. Please try again."
      if (err.response?.status === 403 && err.response?.data?.detail?.upgrade_required) {
        const detail = err.response.data.detail
        msg = `${detail.message}\n\n[Upgrade your plan](/upgrade) to continue asking questions.`
      } else if (err.response?.status === 429) {
        msg = "Daily query limit reached. Upgrade to Pro for more."
      }
      setMessages(prev => [...prev, { role: "ai", text: msg, sources: [], time: getTime() }])
    }
    setLoading(false)
  }

  const sendMessage = () => {
    if (!question.trim() || loading) return
    sendQuery(question.trim())
  }

  const userMsgCount = messages.filter(m => m.role === "user").length

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <AnimatePresence mode="wait">
        {/* Boot screen */}
        {appLoading && (
          <motion.div
            key="boot"
            className="fixed inset-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center gap-5"
            >
              <div
                className="w-14 h-14 rounded-2xl bg-linear-to-br from-slate-800 to-slate-950 flex items-center justify-center"
                style={{
                  boxShadow: resolvedTheme === "dark"
                    ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 32px rgba(99,102,241,0.3), 0 8px 32px rgba(0,0,0,0.4)"
                    : "0 0 0 1px rgba(255,255,255,0.6), 0 0 32px rgba(99,102,241,0.2), 0 8px 32px rgba(99,102,241,0.1)"
                }}
              >
                <FileText size={22} className="text-white" />
              </div>
              <div className={`w-24 h-0.5 rounded-full overflow-hidden ${resolvedTheme === "dark" ? "bg-white/10" : "bg-black/10"}`}>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 2, ease: [0, 0, 0.2, 1] }}
                  className="h-full w-full origin-left bg-gradient-to-r from-indigo-400 to-cyan-400"
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Auth screen */}
        {!appLoading && !token && (
          <motion.div
            key="auth"
            className="fixed inset-0"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 1, 1] }}
          >
            <AuthPage onLogin={handleLogin} />
          </motion.div>
        )}

        {/* Main app */}
        {!appLoading && token && (
          <motion.div
            key="app"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className={`h-[100dvh] flex overflow-hidden ${t.page} transition-colors duration-300`}
          >
            <Sidebar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              documents={documents}
              uploadedFile={uploadedFile}
              switching={switching}
              uploading={uploading}
              resolvedTheme={resolvedTheme}
              t={t}
              user={user}
              onLogout={handleLogout}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              onUpload={uploadPDF}
              onSwitch={switchDocument}
              onPreview={previewDocument}
              onDownload={downloadDocument}
              onDelete={deleteDocument}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
            />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <ChatHeader
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                uploadedFile={uploadedFile}
                userMsgCount={userMsgCount}
                resolvedTheme={resolvedTheme}
                t={t}
              />

              <ChatMessages
                messages={messages}
                loading={loading}
                switching={switching}
                documents={documents}
                user={user}
                resolvedTheme={resolvedTheme}
                t={t}
                onSourceClick={setSourceModal}
              />

              {/* Input bar */}
              <div
                className={`shrink-0 border-t ${t.divider} px-3 sm:px-4 pt-3`}
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <QuickActions
                  user={user}
                  uploadedFile={uploadedFile}
                  loading={loading}
                  resolvedTheme={resolvedTheme}
                  t={t}
                  onSendQuery={sendQuery}
                />
                <ChatInput
                  question={question}
                  setQuestion={setQuestion}
                  onSend={sendMessage}
                  uploadedFile={uploadedFile}
                  loading={loading}
                  switching={switching}
                  t={t}
                  resolvedTheme={resolvedTheme}
                />
                <p className={`text-center text-xs ${t.subtext} mt-2 opacity-40`}>
                  Powered by LLaMA-3.3-70b · Pinecone · Cohere
                </p>
              </div>
            </div>

            <SourceModal
              sourceModal={sourceModal}
              resolvedTheme={resolvedTheme}
              onClose={() => setSourceModal(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer resolvedTheme={!appLoading && !token ? "dark" : resolvedTheme} />
    </>
  )
}
