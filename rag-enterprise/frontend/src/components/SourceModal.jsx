import { motion, AnimatePresence } from "framer-motion"
import { FileText, X, Info } from "lucide-react"
import { overlayVariants, modalVariants, btnIcon, btnSubtle, staggerContainer, staggerItem } from "../lib/animations"

export default function SourceModal({ sourceModal, resolvedTheme, onClose }) {
  const isDark = resolvedTheme === "dark"

  return (
    <AnimatePresence>
      {sourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            {...overlayVariants}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            {...modalVariants}
            className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden
              ${isDark ? "bg-[#1c1c1e]" : "bg-white"}`}
          >
            {/* Header */}
            <div className={`px-4 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between
              ${isDark ? "border-[#2c2c2e] bg-[#2c2c2e]/40" : "border-slate-200/60 bg-slate-50/80"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center
                  ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-white" : "text-[#1d1d1f]"}`}>
                    Page {sourceModal.page}
                  </h3>
                  <p className={`text-xs ${isDark ? "text-[#86868b]" : "text-[#86868b]"}`}>
                    Source excerpt from document
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                {...btnIcon}
                className={`p-2 rounded-lg transition-colors duration-150 cursor-pointer
                  ${isDark
                    ? "hover:bg-[#3a3a3c] text-[#86868b] hover:text-white"
                    : "hover:bg-slate-200 text-[#86868b] hover:text-[#1d1d1f]"}`}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Content — staggered entrance */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="px-4 sm:px-6 py-4 sm:py-5 max-h-[65dvh] overflow-y-auto"
            >
              <motion.div
                variants={staggerItem}
                className={`p-4 rounded-xl border-l-4
                  ${isDark
                    ? "bg-[#2c2c2e]/50 border-[#0a84ff] text-[#f5f5f7]/80"
                    : "bg-slate-50 border-[#0071e3] text-slate-700"}`}
              >
                <p className="text-sm leading-relaxed italic">
                  "{sourceModal.content?.trim() || "No content preview available"}"
                  {sourceModal.content?.length >= 300 && (
                    <span className={`not-italic ${isDark ? "text-[#9ca3af]" : "text-[#86868b]"}`}>
                      {" "}[excerpt continues...]
                    </span>
                  )}
                </p>
              </motion.div>

              <motion.div
                variants={staggerItem}
                className={`mt-4 flex items-center gap-2 text-xs
                  ${isDark ? "text-[#9ca3af]" : "text-[#86868b]"}`}
              >
                <Info size={13} />
                <span>Retrieved based on semantic similarity to your question.</span>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <div className={`px-4 sm:px-6 py-3.5 sm:py-4 border-t
              ${isDark ? "border-[#2c2c2e] bg-[#2c2c2e]/20" : "border-slate-200/60 bg-slate-50/80"}`}>
              <motion.button
                onClick={onClose}
                {...btnSubtle}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors duration-150 cursor-pointer
                  ${isDark
                    ? "bg-[#0a84ff] hover:bg-[#409cff] text-white"
                    : "bg-[#0071e3] hover:bg-[#0077ED] text-white"}`}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
