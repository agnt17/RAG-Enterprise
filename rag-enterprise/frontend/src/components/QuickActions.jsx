import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, FileText, Scale, Calculator, Sparkles, ArrowUpRight, ListChecks, ShieldCheck } from "lucide-react"
import { getTemplatesForUser } from "../lib/templates"
import { staggerContainer, staggerItem, ease } from "../lib/animations"

const STORAGE_KEY = "quickactions_open"

export default function QuickActions({ user, uploadedFile, loading, resolvedTheme, t, onSendQuery }) {
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? true : saved === "true"
  })

  if (!uploadedFile || uploadedFile.status === "pending" || loading) return null

  const templatePack = getTemplatesForUser(user)
  const templates = templatePack.templates
  const isDark = resolvedTheme === "dark"

  const packIcons = {
    scale: Scale,
    calculator: Calculator,
    sparkles: Sparkles,
  }

  const itemIcons = {
    Judgment: Scale,
    Entities: FileText,
    Timeline: ArrowUpRight,
    Risk: ShieldCheck,
    Authorities: ListChecks,
    Financials: Calculator,
    Compliance: ShieldCheck,
    Metrics: ListChecks,
    Summary: Sparkles,
    Highlights: ArrowUpRight,
    Tasks: ListChecks,
    Glossary: FileText,
  }

  const PackIcon = packIcons[templatePack.icon] || Sparkles

  const toggle = () => {
    setOpen(v => {
      localStorage.setItem(STORAGE_KEY, String(!v))
      return !v
    })
  }

  return (
    <div className="max-w-4xl mx-auto mb-2 sm:mb-3">
      <motion.button
        onClick={toggle}
        className={`group w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${isDark ? "border-white/8 bg-white/4 hover:bg-white/6" : "border-slate-200 bg-white hover:bg-slate-50"}`}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${isDark ? "border-white/10 bg-white/8 text-sky-300" : "border-slate-200 bg-slate-50 text-[#0071e3]"}`}>
            <PackIcon size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${t.title}`}>Prompt templates</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "border-white/10 bg-white/8 text-[#cbd5e1]" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                {templatePack.audience}
              </span>
            </div>
            <p className={`mt-0.5 text-xs sm:text-sm ${t.subtext}`}>{templatePack.description}</p>
          </div>
        </div>

        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className={`${t.muted} shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-150`}
        >
          <ChevronDown size={14} />
        </motion.span>
      </motion.button>

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
            <div className={`relative mt-3 overflow-hidden rounded-3xl border p-3 sm:p-4 ${isDark ? "border-white/8 bg-gradient-to-br from-white/6 via-white/4 to-transparent" : "border-slate-200 bg-gradient-to-br from-white via-white to-slate-50"}`}>
              <div className={`pointer-events-none absolute inset-x-6 top-0 h-px ${isDark ? "bg-gradient-to-r from-transparent via-sky-300/30 to-transparent" : "bg-gradient-to-r from-transparent via-sky-400/30 to-transparent"}`} />
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
              >
                {templates.map((tpl, index) => {
                  const CardIcon = itemIcons[tpl.category] || FileText
                  return (
                    <motion.button
                      key={tpl.label}
                      variants={staggerItem}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={ease.spring}
                      onClick={() => onSendQuery(tpl.prompt)}
                      className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 ${isDark ? "border-white/8 bg-[#111113]/80 hover:border-sky-400/30 hover:bg-[#151518]" : "border-slate-200 bg-white hover:border-[#0071e3]/20 hover:shadow-sm"}`}
                    >
                      <div className={`absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${isDark ? "bg-gradient-to-br from-sky-400/10 to-transparent" : "bg-gradient-to-br from-sky-50 to-transparent"}`} />
                      <div className="relative flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${isDark ? "border-white/10 bg-white/8 text-sky-300" : "border-slate-200 bg-slate-50 text-[#0071e3]"}`}>
                          <CardIcon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-sm font-semibold leading-5 ${t.label}`}>{tpl.label}</span>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${isDark ? "border-white/10 bg-white/8 text-[#cbd5e1]" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                              {tpl.category}
                            </span>
                          </div>
                          <p className={`mt-1 min-h-[2.5rem] text-xs leading-5 ${t.subtext}`}>{tpl.summary}</p>
                        </div>
                      </div>
                      <div className="relative mt-3 flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-medium ${isDark ? "text-[#9ca3af]" : "text-slate-400"}`}>Tap to auto-fill the prompt</span>
                        <ArrowUpRight size={13} className={`${isDark ? "text-sky-300/70" : "text-[#0071e3]/60"} transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} />
                      </div>
                      <span className="sr-only">Use template {index + 1}</span>
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
