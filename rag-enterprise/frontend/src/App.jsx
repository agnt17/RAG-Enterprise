import { useState, useRef, useEffect } from "react"
import axios from "axios"
import AuthPage from "./AuthPage"
import ReactMarkdown from "react-markdown"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// ── Theme definitions ──────────────────────────────────────────────
const themes = {
  light: {
    page:             "bg-slate-50 text-slate-900",
    card:             "bg-white border-slate-200 shadow-sm",
    cardHover:        "hover:border-slate-300 hover:bg-slate-50",
    subtext:          "text-slate-400",
    muted:            "text-slate-500",
    label:            "text-slate-700",
    inputBg:          "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white",
    msgUser:          "bg-slate-900 text-white",
    msgAi:            "bg-slate-50 border border-slate-200 text-slate-700",
    msgSystem:        "bg-slate-50 border border-slate-200 text-slate-400",
    avatarUser:       "bg-slate-900 text-white",
    avatarAi:         "bg-slate-100 text-slate-500",
    thinkDot:         "bg-slate-400",
    badge:            "bg-slate-100 text-slate-400",
    divider:          "border-slate-100",
    uploadIdle:       "border-slate-200 bg-white",
    uploadActive:     "border-blue-200 bg-blue-50",
    uploadDone:       "border-emerald-200 bg-emerald-50",
    uploadIcon:       "bg-slate-100",
    iconStroke:       "#64748b",
    sendBtn:          "bg-slate-900 hover:bg-slate-700 text-white",
    footerText:       "text-slate-400",
    themeBtnBg:       "bg-white border-slate-200 shadow-sm",
    themeBtnActive:   "bg-slate-900 text-white",
    themeBtnInactive: "text-slate-500 hover:text-slate-700",
    userMenuBg:       "bg-white border-slate-200 shadow-lg",
    userMenuText:     "text-slate-700 hover:bg-slate-50",
    logoutText:       "text-red-500 hover:bg-red-50",
  },
  dark: {
    page:             "bg-gray-950 text-slate-100",
    card:             "bg-gray-900 border-gray-800",
    cardHover:        "hover:border-gray-700 hover:bg-gray-900",
    subtext:          "text-gray-500",
    muted:            "text-gray-400",
    label:            "text-gray-200",
    inputBg:          "bg-gray-800 border-gray-700 text-slate-100 placeholder-gray-600 focus:border-gray-500 focus:bg-gray-800",
    msgUser:          "bg-blue-600 text-white",
    msgAi:            "bg-gray-800 border border-gray-700 text-gray-200",
    msgSystem:        "bg-gray-800 border border-gray-700 text-gray-500",
    avatarUser:       "bg-blue-600 text-white",
    avatarAi:         "bg-gray-800 text-gray-400",
    thinkDot:         "bg-gray-500",
    badge:            "bg-gray-800 text-gray-500",
    divider:          "border-gray-800",
    uploadIdle:       "border-gray-700 bg-gray-900",
    uploadActive:     "border-blue-700 bg-blue-900/30",
    uploadDone:       "border-emerald-700 bg-emerald-900/20",
    uploadIcon:       "bg-gray-800",
    iconStroke:       "#6b7280",
    sendBtn:          "bg-blue-600 hover:bg-blue-500 text-white",
    footerText:       "text-gray-600",
    themeBtnBg:       "bg-gray-900 border-gray-700",
    themeBtnActive:   "bg-gray-700 text-white",
    themeBtnInactive: "text-gray-500 hover:text-gray-300",
    userMenuBg:       "bg-gray-800 border-gray-700 shadow-lg",
    userMenuText:     "text-gray-200 hover:bg-gray-700",
    logoutText:       "text-red-400 hover:bg-red-900/30",
  },
}

function useSystemTheme() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e) => setIsDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isDark
}

// ── Icons ──────────────────────────────────────────────────────────
const SunIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const MoonIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const SystemIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)
const UploadIcon = ({ stroke }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const ChevronIcon = ({ stroke }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
)
const ChatIcon = ({ stroke }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const DocIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

// ── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [themeMode, setThemeMode]     = useState("system")
  const systemIsDark                  = useSystemTheme()
  const [messages, setMessages]       = useState([])
  const [question, setQuestion]       = useState("")
  const [uploading, setUploading]     = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)   // ← user dropdown toggle

  // ── Auth state ────────────────────────────────────────────
  const [token, setToken] = useState(localStorage.getItem("token"))
  const [user, setUser]   = useState(null)

  const fileRef   = useRef()
  const bottomRef = useRef()

  const resolvedTheme = themeMode === "system" ? (systemIsDark ? "dark" : "light") : themeMode
  const t = themes[resolvedTheme]

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // On load: verify stored token is still valid
  // If expired → auto logout
  useEffect(() => {
    if (!token) return
    axios.get(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setUser(res.data))
    .catch(() => {
      localStorage.removeItem("token")
      setToken(null)
      setUser(null)
    })
  }, [token])

  // Attach token to every axios request automatically
  // So you don't have to add headers manually in uploadPDF or sendMessage
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common["Authorization"]
    }
  }, [token])

  // Close user menu when clicking anywhere outside
  useEffect(() => {
    if (!showUserMenu) return
    const close = () => setShowUserMenu(false)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [showUserMenu])

  // ── Auth handlers ─────────────────────────────────────────
  const handleLogin = (newToken, userData) => {
    localStorage.setItem("token", newToken)
    setToken(newToken)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    setMessages([])
    setUploadedFile(null)
    setShowUserMenu(false)
  }

  // ── If not logged in → show AuthPage ─────────────────────
  if (!token) return <AuthPage onLogin={handleLogin} />

  // ── Upload ────────────────────────────────────────────────
  const uploadPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      await axios.post(`${API}/upload`, form)
      setUploadedFile(file.name)
      setMessages([{
        role: "system",
        text: `"${file.name}" has been indexed. You can now ask questions about it.`,
        time: getTime()
      }])
    } catch {
      alert("Upload failed. Check your API keys.")
    }
    setUploading(false)
    fileRef.current.value = ""
  }

  // ── Query ─────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!question.trim() || loading) return
    const q = question.trim()
    setMessages(prev => [...prev, { role: "user", text: q, time: getTime() }])
    setQuestion("")
    setLoading(true)
    try {
      const res = await axios.post(`${API}/query`, { question: q })
      setMessages(prev => [...prev, { role: "ai", text: res.data.answer, time: getTime() }])
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Something went wrong. Please try again.", time: getTime() }])
    }
    setLoading(false)
  }

  const userMsgCount = messages.filter(m => m.role === "user").length

  // ── Render ────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${t.page} flex flex-col items-center justify-center px-4 py-6 transition-colors duration-200`}>
      <div className="w-full max-w-2xl flex flex-col gap-3 h-screen max-h-[800px]">

        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-5 py-3.5 ${t.card} border rounded-xl transition-colors duration-200`}>

          {/* Left — Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
              <DocIcon />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight">DocMind AI</span>
              <span className={`${t.subtext} text-xs ml-2`}>Document Intelligence</span>
            </div>
          </div>

          {/* Right — Theme switcher + User avatar */}
          <div className="flex items-center gap-2">

            {/* Theme Switcher — unchanged from your original */}
            <div className={`flex items-center gap-0.5 p-1 border rounded-lg ${t.themeBtnBg} transition-colors duration-200`}>
              {[
                { key: "system", icon: <SystemIcon />, label: "System" },
                { key: "light",  icon: <SunIcon />,    label: "Light"  },
                { key: "dark",   icon: <MoonIcon />,   label: "Dark"   },
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => setThemeMode(key)}
                  title={label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                    ${themeMode === key ? t.themeBtnActive : t.themeBtnInactive}`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* User Avatar + Dropdown */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowUserMenu(v => !v) }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                title={user?.email || "Account"}
              >
                {/* Avatar — shows Google picture if available, otherwise initials */}
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {(user?.name || user?.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className={`text-xs font-medium ${t.muted} hidden sm:block max-w-[100px] truncate`}>
                  {user?.name || user?.email?.split("@")[0] || "Account"}
                </span>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div
                  className={`absolute right-0 top-10 w-52 border rounded-xl overflow-hidden z-50 ${t.userMenuBg}`}
                  onClick={e => e.stopPropagation()}
                >
                  {/* User info */}
                  <div className={`px-4 py-3 border-b ${t.divider}`}>
                    <p className={`text-xs font-semibold ${t.label} truncate`}>
                      {user?.name || "User"}
                    </p>
                    <p className={`text-xs ${t.subtext} truncate mt-0.5`}>
                      {user?.email}
                    </p>
                    <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono">
                      {user?.plan || "free"} plan
                    </span>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors ${t.logoutText}`}
                  >
                    <LogoutIcon />
                    Sign out
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Upload Zone — completely unchanged ── */}
        <div
          onClick={() => !uploading && fileRef.current.click()}
          className={`flex items-center gap-4 px-5 py-4 border rounded-xl cursor-pointer transition-all duration-200
            ${uploading    ? t.uploadActive :
              uploadedFile ? t.uploadDone   : `${t.uploadIdle} ${t.cardHover}`}`}
        >
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={uploadPDF} />

          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${uploading ? "bg-blue-100" : uploadedFile ? "bg-emerald-100" : t.uploadIcon}`}>
            {uploading ? (
              <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : uploadedFile ? (
              <CheckIcon />
            ) : (
              <UploadIcon stroke={t.iconStroke} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {uploading ? (
              <>
                <p className="text-sm font-medium text-blue-600">Processing your document...</p>
                <p className="text-xs text-blue-400 mt-0.5">Chunking · Embedding · Indexing</p>
                <div className="mt-2 h-1 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-blue-400 rounded-full animate-pulse" />
                </div>
              </>
            ) : uploadedFile ? (
              <>
                <p className="text-sm font-medium text-emerald-600 truncate">{uploadedFile}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Successfully indexed · Click to replace</p>
              </>
            ) : (
              <>
                <p className={`text-sm font-medium ${t.label}`}>Upload a PDF document</p>
                <p className={`text-xs ${t.subtext} mt-0.5`}>Click to browse · PDF files only</p>
              </>
            )}
          </div>

          {!uploading && <ChevronIcon stroke={t.iconStroke} />}
        </div>

        {/* ── Chat Container — completely unchanged ── */}
        <div className={`flex-1 flex flex-col ${t.card} border rounded-xl overflow-hidden min-h-0 transition-colors duration-200`}>

          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.divider} flex-shrink-0`}>
            <span className={`text-xs font-semibold ${t.subtext} tracking-wider uppercase`}>Conversation</span>
            {userMsgCount > 0 && (
              <span className={`text-xs ${t.badge} px-2.5 py-1 rounded-full`}>
                {userMsgCount} {userMsgCount === 1 ? "message" : "messages"}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 h-full text-center py-16">
                <div className={`w-14 h-14 rounded-2xl ${t.uploadIcon} flex items-center justify-center`}>
                  <ChatIcon stroke={t.iconStroke} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${t.muted}`}>No conversation yet</p>
                  <p className={`text-xs ${t.subtext} mt-1`}>Upload a document above to get started</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role !== "system" && (
                    <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-semibold mt-0.5
                      ${msg.role === "user" ? t.avatarUser : t.avatarAi}`}>
                      {msg.role === "user" ? (user?.name?.[0]?.toUpperCase() || "U") : "AI"}
                    </div>
                  )}
                  <div className={msg.role === "system" ? "w-full" : "max-w-[80%]"}>
                    <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed
                      ${msg.role === "user"   ? `${t.msgUser} rounded-tr-sm` :
                        msg.role === "system" ? t.msgSystem :
                        `${t.msgAi} rounded-tl-sm`}`}>
                      {msg.role === "ai" ? (
                        <ReactMarkdown
                          components={{
                            p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mt-2">{children}</ul>,
                            ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mt-2">{children}</ol>,
                            li:     ({ children }) => <li>{children}</li>,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : msg.text}
                    </div>
                    {msg.time && (
                      <p className={`text-xs ${t.subtext} mt-1.5 ${msg.role === "user" ? "text-right" : ""}`}>
                        {msg.time}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex gap-3">
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 ${t.avatarAi} flex items-center justify-center text-xs font-semibold mt-0.5`}>
                  AI
                </div>
                <div className={`px-4 py-3 rounded-xl rounded-tl-sm ${t.msgAi}`}>
                  <div className="flex gap-1 items-center h-4">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.thinkDot} animate-bounce [animation-delay:0ms]`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${t.thinkDot} animate-bounce [animation-delay:150ms]`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${t.thinkDot} animate-bounce [animation-delay:300ms]`} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={`px-4 py-3 border-t ${t.divider} flex gap-2 items-center flex-shrink-0`}>
            <input
              className={`flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${t.inputBg}`}
              placeholder={uploadedFile ? "Ask a question about your document..." : "Upload a document to get started..."}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              disabled={!uploadedFile || loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !uploadedFile || !question.trim()}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${t.sendBtn}`}
            >
              <SendIcon />
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-xs ${t.footerText}`}>
          Powered by LLaMA-3.3-70b · Pinecone · Cohere
        </p>

      </div>
    </div>
  )
}