import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, Info, X } from "lucide-react"
import { ease } from "./lib/animations"

// ── Toast store — event-based, no prop drilling ───────────
let listeners = []

export const toast = {
  success: (message) => emit({ type: "success", message }),
  error:   (message) => emit({ type: "error",   message }),
  loading: (message) => emit({ type: "loading", message }),
  info:    (message) => emit({ type: "info",     message }),
}

function emit(t) {
  const id = Date.now() + Math.random()
  listeners.forEach(fn => fn({ ...t, id }))
}

// ── Colors ────────────────────────────────────────────────
const styles = {
  light: {
    success: { bg: "bg-white",      border: "border-emerald-200", icon: "text-emerald-500", text: "text-slate-800" },
    error:   { bg: "bg-white",      border: "border-red-200",     icon: "text-red-500",     text: "text-slate-800" },
    loading: { bg: "bg-white",      border: "border-blue-200",    icon: "text-blue-500",    text: "text-slate-800" },
    info:    { bg: "bg-white",      border: "border-slate-200",   icon: "text-slate-500",   text: "text-slate-800" },
  },
  dark: {
    success: { bg: "bg-[#1c1c1e]", border: "border-emerald-700/40", icon: "text-emerald-400", text: "text-[#f5f5f7]" },
    error:   { bg: "bg-[#1c1c1e]", border: "border-red-700/40",     icon: "text-red-400",     text: "text-[#f5f5f7]" },
    loading: { bg: "bg-[#1c1c1e]", border: "border-blue-700/40",    icon: "text-blue-400",    text: "text-[#f5f5f7]" },
    info:    { bg: "bg-[#1c1c1e]", border: "border-[#2c2c2e]",      icon: "text-[#86868b]",   text: "text-[#f5f5f7]" },
  },
}

const icons = {
  success: <CheckCircle2 size={16} />,
  error:   <XCircle      size={16} />,
  loading: <Loader2      size={16} className="animate-spin" />,
  info:    <Info         size={16} />,
}

// ── Single toast ──────────────────────────────────────────
function ToastItem({ toast: t, onRemove, resolvedTheme }) {
  const dismiss = useCallback(() => onRemove(t.id), [t.id, onRemove])

  useEffect(() => {
    if (t.type === "loading") return
    const timer = setTimeout(dismiss, 4000)
    return () => clearTimeout(timer)
  }, [])

  const s = styles[resolvedTheme]?.[t.type] ?? styles.dark[t.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1,  y: 0,   scale: 1    }}
      exit={{    opacity: 0,  y: -10, scale: 0.96 }}
      transition={ease.spring}
      onClick={() => t.type !== "loading" && dismiss()}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
        max-w-[min(92vw,24rem)] sm:max-w-sm w-full cursor-pointer select-none
        ${s.bg} ${s.border}`}
    >
      <span className={`shrink-0 ${s.icon}`}>{icons[t.type]}</span>
      <p className={`text-sm font-medium flex-1 leading-snug ${s.text}`}>{t.message}</p>
      {t.type !== "loading" && (
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          transition={ease.springBouncy}
          onClick={e => { e.stopPropagation(); dismiss() }}
          className={`shrink-0 opacity-40 hover:opacity-90 transition-opacity ${s.text}`}
        >
          <X size={13} />
        </motion.button>
      )}
    </motion.div>
  )
}

// ── Container ─────────────────────────────────────────────
export function ToastContainer({ resolvedTheme }) {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = t => setToasts(prev => [...prev, t])
    listeners.push(handler)
    return () => { listeners = listeners.filter(fn => fn !== handler) }
  }, [])

  const remove = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-50 flex flex-col gap-2 items-center sm:items-end pointer-events-none w-[calc(100%-1rem)] sm:w-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} resolvedTheme={resolvedTheme} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
