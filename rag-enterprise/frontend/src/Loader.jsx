/**
 * Reusable loader/spinner component for async operations
 */

// Standard spinner icon - matches the one in App.jsx
export const Spinner = ({ size = "md", className = "" }) => {
  const sizes = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  }

  return (
    <svg 
      className={`animate-spin ${sizes[size] || sizes.md} ${className}`} 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
      />
    </svg>
  )
}

// Full page loader with centered spinner
export const PageLoader = ({ theme = "dark", message = "Loading..." }) => {
  const isDark = theme === "dark"
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-950" : "bg-slate-100"}`}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" className={isDark ? "text-blue-400" : "text-blue-600"} />
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>{message}</p>
      </div>
    </div>
  )
}

// Inline loader for buttons
export const ButtonLoader = ({ text = "Loading...", className = "" }) => (
  <span className={`flex items-center justify-center gap-2 ${className}`}>
    <Spinner size="sm" />
    <span>{text}</span>
  </span>
)

// Overlay loader for cards/sections
export const OverlayLoader = ({ theme = "dark", message }) => {
  const isDark = theme === "dark"
  
  return (
    <div className={`absolute inset-0 flex items-center justify-center rounded-xl z-10
      ${isDark ? "bg-gray-900/80" : "bg-white/80"}`}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className={isDark ? "text-blue-400" : "text-blue-600"} />
        {message && (
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>{message}</p>
        )}
      </div>
    </div>
  )
}

export default Spinner
