import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { Bookmark } from "lucide-react"
import { ease, dur } from "../lib/animations"

export default function MessageBubble({ msg, user, resolvedTheme, t, onSourceClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`flex gap-2.5 sm:gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      {msg.role !== "system" && (
        <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 border
          ${msg.role === "user" ? t.avatarUser : t.avatarAi}`}>
          {msg.role === "user" ? (user?.name?.[0]?.toUpperCase() || "U") : "AI"}
        </div>
      )}

      {/* Bubble */}
      <div className={msg.role === "system" ? "w-full" : "max-w-[88%] sm:max-w-[80%]"}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${msg.role === "user"   ? t.msgUser :
            msg.role === "system" ? t.msgSystem :
                                    t.msgAi}`}>

          {msg.role === "ai" ? (
            <>
              <ReactMarkdown components={{
                p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mt-2">{children}</ul>,
                ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mt-2">{children}</ol>,
                li:     ({ children }) => <li>{children}</li>,
              }}>
                {msg.text}
              </ReactMarkdown>

              {/* Source citations */}
              {msg.sources?.length > 0 && (
                <div className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-1.5 ${t.citationDivider}`}>
                  <span className={`text-xs ${t.subtext} flex items-center gap-1`}>
                    <Bookmark size={11} /> Sources:
                  </span>
                  {msg.sources.map((s, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => onSourceClick(s)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`text-xs px-2.5 py-1 rounded-full font-mono cursor-pointer
                        ${resolvedTheme === "dark"
                          ? "bg-blue-900/30 text-blue-400 hover:bg-blue-800/50 border border-blue-700/40"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200/60"
                        }`}
                    >
                      Page {s.page}
                    </motion.button>
                  ))}
                </div>
              )}
            </>
          ) : msg.text}
        </div>

        {/* Timestamp — fades in after bubble */}
        {msg.time && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18, duration: dur.slow }}
            className={`text-xs ${t.subtext} mt-1 ${msg.role === "user" ? "text-right" : ""}`}
          >
            {msg.time}
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
