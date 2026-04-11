import { motion } from "framer-motion"
import { ArrowUp } from "lucide-react"
import { btnPrimary, fadeInUp, dur, ease } from "../lib/animations"

export default function ChatInput({
  question, setQuestion, onSend,
  uploadedFile, loading, switching, t, resolvedTheme
}) {
  const isDisabled = !uploadedFile || loading || switching || uploadedFile?.status === "pending"

  return (
    <motion.div
      {...fadeInUp}
      className="max-w-3xl mx-auto flex gap-2 sm:gap-2.5 items-center"
    >
      <input
        className={`
          flex-1 min-w-0 border rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm outline-none
          transition-colors duration-200
          ${resolvedTheme === "dark" ? "input-glow-dark" : "input-glow-light"}
          ${t.inputBg}
        `}
        placeholder={
          switching                       ? "Switching document..." :
          uploadedFile?.status === "pending" ? "Indexing document, please wait..." :
          uploadedFile                    ? `Ask anything about "${uploadedFile.filename}"...` :
                                            "Upload a document from the sidebar to start..."
        }
        value={question}
        onChange={e => setQuestion(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !isDisabled && onSend()}
        disabled={isDisabled}
      />

      <motion.button
        onClick={onSend}
        disabled={loading || !uploadedFile || !question.trim() || switching || uploadedFile?.status === "pending"}
        {...btnPrimary}
        whileHover={!isDisabled && !loading ? {
          scale: 1.08,
          boxShadow: resolvedTheme === "dark"
            ? "0 4px 16px rgba(10, 132, 255, 0.4)"
            : "0 4px 16px rgba(0, 113, 227, 0.35)"
        } : {}}
        whileTap={!isDisabled ? { scale: 0.91 } : {}}
        className={`
          w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0
          disabled:opacity-25 disabled:cursor-not-allowed
          transition-colors duration-150
          ${t.sendBtn}
        `}
      >
        {loading ? (
          <span className="flex gap-[3px] items-center">
            <span className="w-1 h-1 rounded-full bg-current animate-pulse-dot animate-pulse-dot" />
            <span className="w-1 h-1 rounded-full bg-current animate-pulse-dot animate-pulse-dot-2" />
            <span className="w-1 h-1 rounded-full bg-current animate-pulse-dot animate-pulse-dot-3" />
          </span>
        ) : (
          <ArrowUp size={16} strokeWidth={2.5} />
        )}
      </motion.button>
    </motion.div>
  )
}
