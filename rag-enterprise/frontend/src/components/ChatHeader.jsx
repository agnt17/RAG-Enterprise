import { motion, AnimatePresence } from "framer-motion"
import { Check, Menu } from "lucide-react"
import { btnIcon, fadeInUp, fadeInScale, ease } from "../lib/animations"

export default function ChatHeader({
  sidebarOpen, setSidebarOpen,
  uploadedFile, userMsgCount,
  resolvedTheme, t
}) {
  return (
    <motion.header
      {...fadeInUp}
      className={`shrink-0 flex items-center justify-between px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 border-b ${t.divider} ${t.card} ${t.headerShadow}`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <motion.button
          onClick={() => setSidebarOpen(v => !v)}
          {...btnIcon}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150
            ${resolvedTheme === "dark" ? "hover:bg-white/8" : "hover:bg-slate-100"}`}
        >
          <Menu size={16} className={resolvedTheme === "dark" ? "text-[#cbd5e1]" : "text-[#86868b]"} />
        </motion.button>

        <AnimatePresence mode="wait">
          {uploadedFile ? (
            <motion.div
              key="doc"
              {...fadeInUp}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Check size={13} className="text-emerald-500" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate max-w-[9rem] sm:max-w-xs md:max-w-sm ${t.label}`}>
                  {uploadedFile.filename}
                </p>
                <p className={`text-xs ${t.subtext}`}>Active document</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" {...fadeInUp} className="min-w-0">
              <p className={`text-sm font-semibold ${t.label}`}>DocMind AI</p>
              <p className={`text-xs ${t.subtext} hidden sm:block`}>Upload a document to start</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {userMsgCount > 0 && (
          <motion.span
            key={userMsgCount}
            {...fadeInScale}
            className={`hidden sm:inline text-xs ${t.badge} px-2.5 py-1 rounded-full font-mono shrink-0`}
          >
            {userMsgCount} {userMsgCount === 1 ? "query" : "queries"}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
