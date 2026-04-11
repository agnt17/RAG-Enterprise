import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare } from "lucide-react"
import MessageBubble from "./MessageBubble"
import { staggerContainer, fadeIn } from "../lib/animations"

// ── Skeleton message row (shown while switching docs) ──────
function MessageSkeleton({ align, resolvedTheme }) {
  const cls = resolvedTheme === "dark" ? "skeleton-dark" : "skeleton-light"
  const isRight = align === "right"
  return (
    <div className={`flex gap-3 ${isRight ? "flex-row-reverse" : ""}`}>
      <div className={`w-7 h-7 rounded-xl shrink-0 ${cls} opacity-80`} />
      <div className={`flex flex-col gap-2 ${isRight ? "items-end" : ""}`}>
        <div className={`h-3.5 rounded-lg ${cls}`} style={{ width: isRight ? 130 : 210 }} />
        <div className={`h-3.5 rounded-lg ${cls}`} style={{ width: isRight ? 90  : 170 }} />
        {!isRight && <div className={`h-3.5 rounded-lg ${cls}`} style={{ width: 140 }} />}
      </div>
    </div>
  )
}

export default function ChatMessages({
  messages, loading, switching,
  documents, user, resolvedTheme, t,
  onSourceClick
}) {
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const [isDelayed, setIsDelayed] = useState(false)
  useEffect(() => {
    if (!loading) { setIsDelayed(false); return }
    const timer = setTimeout(() => setIsDelayed(true), 6000)
    return () => clearTimeout(timer)
  }, [loading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 min-h-0">
      <AnimatePresence mode="wait">

        {/* ── Switching skeleton ── */}
        {switching && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-3xl mx-auto w-full flex flex-col gap-5 pt-2"
          >
            {[
              { align: "left"  },
              { align: "right" },
              { align: "left"  },
              { align: "right" },
            ].map((row, i) => (
              <MessageSkeleton key={i} align={row.align} resolvedTheme={resolvedTheme} />
            ))}
          </motion.div>
        )}

        {/* ── Empty state ── */}
        {!switching && messages.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center justify-center gap-4 h-full text-center"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${t.emptyIconBg}`}>
              <MessageSquare size={28} stroke={t.iconStroke} />
            </div>
            <div>
              <p className={`text-base font-semibold ${t.label}`}>No conversation yet</p>
              <p className={`text-sm ${t.subtext} mt-1`}>
                {documents.length > 0
                  ? "Select a document from the sidebar to continue"
                  : "Upload a PDF using the sidebar to get started"}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Messages ── */}
        {!switching && messages.length > 0 && (
          <motion.div
            key="messages"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            className="max-w-3xl mx-auto w-full flex flex-col gap-4"
          >
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                user={user}
                resolvedTheme={resolvedTheme}
                t={t}
                onSourceClick={onSourceClick}
              />
            ))}

            {/* Thinking indicator */}
            {loading && (
              <motion.div
                {...fadeIn}
                className="flex gap-3"
              >
                <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 border ${t.avatarAi}`}>
                  AI
                </div>
                <div className={`px-4 py-3 rounded-2xl ${t.msgAi}`}>
                  <div className="flex gap-[5px] items-center h-4">
                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${t.muted} animate-pulse-dot`} />
                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${t.muted} animate-pulse-dot animate-pulse-dot-2`} />
                    <span className={`w-1.5 h-1.5 rounded-full bg-current ${t.muted} animate-pulse-dot animate-pulse-dot-3`} />
                  </div>
                </div>
              </motion.div>
            )}
            <AnimatePresence>
              {loading && isDelayed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`text-xs text-center ${t.subtext} mt-1`}
                >
                  Taking longer than usual — server may be warming up.
                </motion.p>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
