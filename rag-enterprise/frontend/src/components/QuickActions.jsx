import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { getTemplatesForUser } from "../lib/templates"
import { staggerContainer, staggerItem, ease } from "../lib/animations"

const STORAGE_KEY = "quickactions_open"

export default function QuickActions({ user, uploadedFile, loading, resolvedTheme, t, onSendQuery }) {
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? true : saved === "true"
  })

  if (!uploadedFile || uploadedFile.status === "pending" || loading) return null

  const templates = getTemplatesForUser(user)
  const isDark = resolvedTheme === "dark"

  const toggle = () => {
    setOpen(v => {
      localStorage.setItem(STORAGE_KEY, String(!v))
      return !v
    })
  }

  return (
    <div className="max-w-3xl mx-auto mb-2 sm:mb-3">
      {/* Header row — always visible */}
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 mb-2 group cursor-pointer`}
      >
        <span className={`text-xs font-medium ${t.muted}`}>Quick actions</span>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className={`${t.muted} opacity-60 group-hover:opacity-100 transition-opacity duration-150`}
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>

      {/* Collapsible buttons */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="flex flex-wrap gap-1.5 sm:gap-2 pb-0.5"
            >
              {templates.map((tpl) => (
                <motion.button
                  key={tpl.label}
                  variants={staggerItem}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={ease.spring}
                  onClick={() => onSendQuery(tpl.prompt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors duration-150 ${t.quickAction}`}
                >
                  {tpl.label}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
