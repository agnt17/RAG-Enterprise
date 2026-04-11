import { useNavigate } from "react-router-dom"

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const IconRefresh = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

const IconServer = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
)

const IconWrench = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

export default function ServerErrorPage({ error }) {
  const navigate = useNavigate()
  
  // Get theme from localStorage
  const theme = localStorage.getItem("theme") || "system"
  const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme
  const isDark = resolvedTheme === "dark"

  const handleRefresh = () => {
    window.location.reload()
  }

  const reportEmail = "adityagupta20042003@gmail.com"
  const errorDetails = error ? `\n\nError details:\n${error}` : ""
  const mailtoLink = `mailto:${reportEmail}?subject=DocMind Server Error Report&body=Hi DocMind Team,%0D%0A%0D%0AI encountered a server error while using DocMind.%0D%0A%0D%0ATime: ${new Date().toISOString()}%0D%0APage: ${window.location.href}${encodeURIComponent(errorDetails)}%0D%0A%0D%0APlease look into this issue.%0D%0A%0D%0AThank you!`

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6`}>
      {/* DocMind Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
        </div>
        <span className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>DocMind</span>
      </div>

      {/* 500 Illustration */}
      <div className="relative mb-6">
        <div className={`text-[120px] font-bold leading-none select-none ${isDark ? "text-gray-800" : "text-slate-200"}`}>
          500
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-28 h-28 rounded-2xl ${isDark ? "bg-white/[0.06] border-white/[0.1]" : "bg-white/80 border-slate-200/50"} border backdrop-blur-md flex items-center justify-center shadow-lg`}>
            <div className={`${isDark ? "text-orange-500" : "text-orange-500"}`}>
              <IconServer />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
              <IconWrench />
            </div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${isDark ? "bg-orange-500/10 border border-orange-500/20" : "bg-orange-50 border border-orange-200"}`}>
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
        <span className={`text-sm font-medium ${isDark ? "text-orange-400" : "text-orange-600"}`}>
          Server Issue Detected
        </span>
      </div>

      {/* Text */}
      <h1 className={`text-2xl font-bold mb-2 text-center ${isDark ? "text-white" : "text-slate-900"}`}>
        It's Not You, It's Us
      </h1>
      <p className={`text-center max-w-md mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
        Our servers are having a moment. Don't worry — our team is already on it!
      </p>
      <p className={`text-center max-w-md mb-8 text-sm ${isDark ? "text-gray-500" : "text-slate-500"}`}>
        Hold tight while we get things back up and running. This usually takes just a few minutes.
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <button
          onClick={handleRefresh}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors cursor-pointer
            ${isDark
              ? "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border border-white/[0.1]"
              : "bg-white/70 hover:bg-white/90 text-slate-700 border border-slate-200/60"
            }`}
        >
          <IconRefresh />
          Try Again
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all cursor-pointer shadow-lg shadow-blue-500/25"
        >
          <IconHome />
          Back to DocMind
        </button>
      </div>

      {/* Report Section */}
      <div className={`rounded-xl border p-5 max-w-md w-full ${isDark ? "bg-white/[0.06] backdrop-blur-md border-white/[0.08]" : "bg-white/80 backdrop-blur-md border-slate-200/50"}`}>
        <h3 className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
          Help Us Fix This Faster
        </h3>
        <p className={`text-sm mb-4 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
          If this keeps happening, let us know so we can investigate and fix it quickly.
        </p>
        <a
          href={mailtoLink}
          className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer
            ${isDark 
              ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20" 
              : "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200"
            }`}
        >
          <IconMail />
          Report to Team
        </a>
      </div>

      {/* Footer */}
      <p className={`mt-8 text-xs ${isDark ? "text-gray-600" : "text-slate-400"}`}>
        Error Code: 500 • Internal Server Error
      </p>
    </div>
  )
}
