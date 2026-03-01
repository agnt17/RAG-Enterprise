import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"

const API = "http://127.0.0.1:8000"

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const uploadPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      await axios.post(`${API}/upload`, form)
      setUploadedFile(file.name)
      setMessages([{ role: "system", text: `✓ "${file.name}" indexed successfully. Ask me anything!`, time: getTime() }])
    } catch {
      alert("Upload failed. Check your API keys in .env")
    }
    setUploading(false)
    fileRef.current.value = ""
  }

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
      setMessages(prev => [...prev, { role: "ai", text: "⚠ Something went wrong. Try again.", time: getTime() }])
    }
    setLoading(false)
  }

  const userMsgCount = messages.filter(m => m.role === "user").length

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-6">

      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-700 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-700 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl flex flex-col gap-4 h-screen max-h-[780px]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-gray-950 font-bold text-lg shadow-lg shadow-blue-500/30">
              ⬡
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight">DocMind AI</div>
              <div className="text-xs text-gray-500 font-mono">RAG · LLaMA-3.3 · Pinecone</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-400 font-mono">backend:8000</span>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onClick={() => !uploading && fileRef.current.click()}
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-pointer transition-all duration-300 backdrop-blur-md
            ${uploading
              ? "bg-blue-500/10 border-blue-500/40"
              : uploadedFile
                ? "bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10"
                : "bg-white/5 border-white/10 hover:bg-white/5 hover:border-blue-500/40"
            }`}
        >
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={uploadPDF} />
          <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
            {uploading ? "⏳" : uploadedFile ? "✅" : "📄"}
          </div>
          <div className="flex-1 min-w-0">
            {uploading ? (
              <>
                <p className="text-sm font-semibold text-blue-300">Processing document...</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Chunking · Embedding · Indexing</p>
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse" />
                </div>
              </>
            ) : uploadedFile ? (
              <>
                <p className="text-sm font-semibold text-emerald-400 truncate">{uploadedFile}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Indexed · Click to replace</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Upload a PDF document</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Click to browse · PDF only</p>
              </>
            )}
          </div>
          {!uploading && <span className="text-gray-600 text-lg">→</span>}
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md min-h-0">

          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Conversation</span>
            {userMsgCount > 0 && (
              <span className="text-xs font-mono text-gray-500 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full">
                {userMsgCount} {userMsgCount === 1 ? "query" : "queries"}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center h-full py-16">
                <div className="text-4xl opacity-20">◎</div>
                <p className="text-sm text-gray-600 font-mono">No conversation yet</p>
                <p className="text-xs text-gray-700">Upload a document to start querying</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>

                  {msg.role !== "system" && (
                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm border border-white/10
                      ${msg.role === "user" ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-white/5 text-cyan-400"}`}>
                      {msg.role === "user" ? "U" : "⬡"}
                    </div>
                  )}

                  <div className={msg.role === "system" ? "w-full" : "max-w-[78%]"}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${msg.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm border border-blue-500/30"
                        : msg.role === "system"
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs"
                          : "bg-white/5 border border-white/10 text-gray-200 rounded-bl-sm"}`}>
                      {msg.role === "ai" ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mt-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mt-1">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-200">{children}</li>,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>
                    {msg.time && (
                      <p className={`text-xs text-gray-600 font-mono mt-1.5 ${msg.role === "user" ? "text-right" : ""}`}>
                        {msg.time}
                      </p>
                    )}
                  </div>

                </div>
              ))
            )}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm border border-white/10 bg-white/5 text-cyan-400">⬡</div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/5 border border-white/10">
                  <div className="flex gap-1.5 items-center h-4">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/10 flex gap-3 items-center flex-shrink-0">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-all"
              placeholder={uploadedFile ? "Ask anything about your document..." : "Upload a document first..."}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              disabled={!uploadedFile || loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !uploadedFile || !question.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 text-gray-950 font-bold text-lg flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
            >
              ↑
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}