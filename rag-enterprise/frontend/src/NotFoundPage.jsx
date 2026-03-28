import { useNavigate } from "react-router-dom"

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const IconArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const IconDocument = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

export default function NotFoundPage() {
  const navigate = useNavigate()
  
  // Get theme from localStorage
  const theme = localStorage.getItem("theme") || "system"
  const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme
  const isDark = resolvedTheme === "dark"

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 ${isDark ? "bg-gray-950" : "bg-slate-100"}`}>
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

      {/* 404 Illustration */}
      <div className="relative mb-6">
        <div className={`text-[140px] font-bold leading-none select-none ${isDark ? "text-gray-800" : "text-slate-200"}`}>
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-28 h-28 rounded-2xl ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-slate-300"} border-2 flex items-center justify-center rotate-12 shadow-lg`}>
            <div className={`${isDark ? "text-gray-600" : "text-slate-400"}`}>
              <IconDocument />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">?</span>
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <h1 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
        Document Not Found
      </h1>
      <p className={`text-center max-w-md mb-8 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
        Looks like this page got lost in the documents! The page you're looking for 
        doesn't exist or may have been moved.
      </p>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors cursor-pointer
            ${isDark 
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300" 
              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
            }`}
        >
          <IconArrowLeft />
          Go Back
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all cursor-pointer shadow-lg shadow-blue-500/25"
        >
          <IconHome />
          Back to DocMind
        </button>
      </div>

      {/* Helpful suggestions */}
      <div className={`mt-12 text-center ${isDark ? "text-gray-500" : "text-slate-500"}`}>
        <p className="text-sm mb-3">Here are some helpful links:</p>
        <div className="flex gap-4 text-sm">
          <button 
            onClick={() => navigate("/")} 
            className={`hover:underline cursor-pointer ${isDark ? "text-blue-400" : "text-blue-600"}`}
          >
            Dashboard
          </button>
          <span>•</span>
          <button 
            onClick={() => navigate("/settings")} 
            className={`hover:underline cursor-pointer ${isDark ? "text-blue-400" : "text-blue-600"}`}
          >
            Settings
          </button>
          <span>•</span>
          <button 
            onClick={() => navigate("/help")} 
            className={`hover:underline cursor-pointer ${isDark ? "text-blue-400" : "text-blue-600"}`}
          >
            Help Center
          </button>
        </div>
      </div>
    </div>
  )
}
