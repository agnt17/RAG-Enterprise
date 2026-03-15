import { useState, useEffect, useCallback } from "react"

// ── Toast Store — lives outside React ─────────────────────
// We use a simple event-based system so any component can
// trigger a toast without prop drilling
let listeners = []

export const toast = {
  success: (message) => emit({ type: "success", message }),
  error:   (message) => emit({ type: "error",   message }),
  loading: (message) => emit({ type: "loading", message }),
  info:    (message) => emit({ type: "info",     message }),
}

function emit(toast) {
  const id = Date.now() + Math.random()
  listeners.forEach(fn => fn({ ...toast, id }))
}

// ── Single Toast Item ──────────────────────────────────────
function ToastItem({ toast, onRemove, resolvedTheme }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation on mount
    const enterTimer = setTimeout(() => setVisible(true), 10)

    // Auto dismiss after 4 seconds (loading toasts stay until dismissed)
    let exitTimer
    if (toast.type !== "loading") {
      exitTimer = setTimeout(() => dismiss(), 4000)
    }

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
    }
  }, [])

  const dismiss = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onRemove(toast.id), 300) // wait for exit animation
  }, [toast.id, onRemove])

  // ── Icon per type ────────────────────────────────────────
  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
    loading: (
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  }

  // ── Colors per type — respects dark/light theme ──────────
  const styles = {
    light: {
      success: {
        bg:     "bg-emerald-50",
        border: "border-emerald-200",
        icon:   "bg-emerald-100 text-emerald-600",
        text:   "text-emerald-900",
      },
      error: {
        bg:     "bg-red-50",
        border: "border-red-200",
        icon:   "bg-red-100 text-red-600",
        text:   "text-red-900",
      },
      loading: {
        bg:     "bg-blue-50",
        border: "border-blue-200",
        icon:   "bg-blue-100 text-blue-600",
        text:   "text-blue-900",
      },
      info: {
        bg:     "bg-slate-50",
        border: "border-slate-200",
        icon:   "bg-slate-100 text-slate-600",
        text:   "text-slate-900",
      },
    },
    dark: {
      success: {
        bg:     "bg-emerald-900/30",
        border: "border-emerald-700/50",
        icon:   "bg-emerald-800/50 text-emerald-400",
        text:   "text-emerald-100",
      },
      error: {
        bg:     "bg-red-900/30",
        border: "border-red-700/50",
        icon:   "bg-red-800/50 text-red-400",
        text:   "text-red-100",
      },
      loading: {
        bg:     "bg-blue-900/30",
        border: "border-blue-700/50",
        icon:   "bg-blue-800/50 text-blue-400",
        text:   "text-blue-100",
      },
      info: {
        bg:     "bg-gray-800",
        border: "border-gray-700",
        icon:   "bg-gray-700 text-gray-300",
        text:   "text-gray-100",
      },
    },
  }

  const s = styles[resolvedTheme][toast.type]

  return (
    <div
      onClick={() => toast.type !== "loading" && dismiss()}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border
        shadow-lg backdrop-blur-md cursor-pointer
        max-w-sm w-full
        transition-all duration-300 ease-out
        ${s.bg} ${s.border}
        ${visible && !leaving
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-2 scale-95"
        }
      `}
    >
      {/* Icon */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.icon}`}>
        {icons[toast.type]}
      </div>

      {/* Message */}
      <p className={`text-sm font-medium flex-1 ${s.text}`}>
        {toast.message}
      </p>

      {/* Close button — only on non-loading toasts */}
      {toast.type !== "loading" && (
        <button
          onClick={e => { e.stopPropagation(); dismiss() }}
          className={`flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ${s.text}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Toast Container — renders all active toasts ────────────
export function ToastContainer({ resolvedTheme }) {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    // Subscribe to toast events
    const handler = (newToast) => {
      setToasts(prev => [...prev, newToast])
    }
    listeners.push(handler)

    // Cleanup on unmount
    return () => {
      listeners = listeners.filter(fn => fn !== handler)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    // Fixed position — bottom right corner
    // z-50 ensures it's above everything else
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <ToastItem
          key={t.id}
          toast={t}
          onRemove={removeToast}
          resolvedTheme={resolvedTheme}
        />
      ))}
    </div>
  )
}