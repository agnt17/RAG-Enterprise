import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { motion } from "framer-motion"
import { ArrowLeft, BadgeAlert, Bug, ClipboardList, FileLock2, LifeBuoy, Send, ShieldAlert, Sparkles, Upload, MessageSquareText, WalletCards, ShieldCheck, UserRound } from "lucide-react"
import { API } from "./lib/api"
import { toast } from "./Toast"
import { btnPrimary, btnSubtle, pageEnter, staggerContainer, staggerItem } from "./lib/animations"

const categories = [
  { value: "ui", label: "UI / Layout", icon: UserRound, hint: "Spacing, alignment, responsiveness" },
  { value: "upload", label: "Upload / Documents", icon: Upload, hint: "PDF upload, status, file flow" },
  { value: "chat", label: "Chat / RAG", icon: MessageSquareText, hint: "Answers, sources, retrieval" },
  { value: "billing", label: "Billing / Subscription", icon: WalletCards, hint: "Plan, coupon, payment flow" },
  { value: "auth", label: "Login / Authentication", icon: ShieldCheck, hint: "Signup, login, account access" },
  { value: "other", label: "Other", icon: BadgeAlert, hint: "Anything outside these buckets" },
]

const severities = [
  { value: "critical", label: "Critical", tint: "red", hint: "Blocks testing or access" },
  { value: "high", label: "High", tint: "amber", hint: "Major issue, strong impact" },
  { value: "medium", label: "Medium", tint: "sky", hint: "Noticeable, but workaround exists" },
  { value: "low", label: "Low", tint: "emerald", hint: "Minor polish or edge case" },
]

function FormLabel({ children, isDark }) {
  return <label className={`text-sm font-medium ${isDark ? "text-[#f5f5f7]" : "text-slate-800"}`}>{children}</label>
}

function FieldShell({ children, isDark }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${isDark ? "bg-white/[0.05] border-white/[0.08]" : "bg-white/85 border-slate-200/70"}`}>
      {children}
    </div>
  )
}

function ChoiceCard({ selected, isDark, onClick, icon: Icon, label, hint, tone = "sky" }) {
  const toneStyles = {
    sky: isDark ? "border-sky-500/30 bg-sky-500/10 text-sky-200" : "border-sky-300 bg-sky-50 text-sky-800",
    red: isDark ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-red-300 bg-red-50 text-red-800",
    amber: isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-300 bg-amber-50 text-amber-800",
    emerald: isDark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-emerald-300 bg-emerald-50 text-emerald-800",
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      className={`text-left rounded-2xl border p-4 transition-all duration-150 ${selected ? toneStyles[tone] : isDark ? "border-white/[0.08] bg-black/10 text-[#f5f5f7] hover:bg-white/[0.05]" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-white/15" : isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{label}</p>
          <p className={`mt-1 text-xs leading-relaxed ${selected ? "opacity-90" : isDark ? "text-[#cbd5e1]" : "text-slate-500"}`}>{hint}</p>
        </div>
      </div>
    </motion.button>
  )
}

export default function ReportBugPage({ user, resolvedTheme = "dark", token }) {
  const navigate = useNavigate()
  const isDark = resolvedTheme === "dark"
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "ui",
    severity: "medium",
    title: "",
    description: "",
    steps_to_reproduce: "",
    browser: "",
    device: "",
    additional_context: "",
  })

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      name: user?.name || prev.name,
      email: user?.email || prev.email,
      browser: prev.browser || navigator.userAgent,
      device: prev.device || `${navigator.platform || "Unknown platform"} · ${window.innerWidth}px`,
    }))
  }, [user])

  const selectedCategory = categories.find(option => option.value === form.category) || categories[0]
  const selectedSeverity = severities.find(option => option.value === form.severity) || severities[2]

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        ...form,
        route: "/report-bug",
      }

      const response = await axios.post(`${API}/bug-reports`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setSubmitted(true)
      toast.success(response.data?.storage_backend === "google_sheets"
        ? "Bug report submitted successfully and saved to Google Sheets."
        : "Bug report submitted successfully.")
      setForm(prev => ({
        ...prev,
        category: "ui",
        severity: "medium",
        title: "",
        description: "",
        steps_to_reproduce: "",
        additional_context: "",
      }))
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bug report submission failed. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <motion.div {...pageEnter} className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className={`sticky top-0 z-10 mb-5 sm:mb-6 rounded-3xl border backdrop-blur-xl ${isDark ? "bg-black/25 border-white/[0.08]" : "bg-white/75 border-slate-200/70"}`}>
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${isDark ? "hover:bg-white/[0.08] text-white" : "hover:bg-slate-100 text-slate-700"}`}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <p className={`text-xs uppercase tracking-[0.22em] ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Support</p>
                <h1 className={`text-xl sm:text-2xl font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>Report a bug</h1>
              </div>
            </div>

            <div className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${isDark ? "border-white/[0.08] text-[#cbd5e1]" : "border-slate-200 text-slate-600"}`}>
              <Sparkles size={14} />
              Private issue log
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.85fr] gap-5 sm:gap-6">
          <motion.form {...staggerContainer} onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? "bg-red-500/15 text-red-300" : "bg-red-100 text-red-600"}`}>
                    <Bug size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Tell us what broke</h2>
                    <p className={`mt-1 text-sm leading-relaxed ${isDark ? "text-[#cbd5e1]" : "text-slate-600"}`}>
                      Share the issue with enough detail to reproduce it. The report will be stored in a spreadsheet for follow-up.
                    </p>
                  </div>
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel isDark={isDark}>Your name</FormLabel>
                    <input
                      name="name"
                      value={form.name}
                      readOnly
                      tabIndex={-1}
                      className={`w-full rounded-xl border px-4 py-3 outline-none cursor-not-allowed ${isDark ? "bg-white/[0.04] border-white/[0.08] text-[#f5f5f7]" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                      placeholder="Linked to your account"
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel isDark={isDark}>Email</FormLabel>
                    <input
                      name="email"
                      value={form.email}
                      readOnly
                      tabIndex={-1}
                      className={`w-full rounded-xl border px-4 py-3 outline-none cursor-not-allowed ${isDark ? "bg-white/[0.04] border-white/[0.08] text-[#f5f5f7]" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                      placeholder="Linked to your account"
                    />
                  </div>
                </div>
                <p className={`mt-3 text-xs ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Name and email are locked to your signed-in account.</p>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <FormLabel isDark={isDark}>Category</FormLabel>
                    <p className={`text-xs mt-1 ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Pick the area that best matches the bug.</p>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs ${isDark ? "border-white/[0.08] text-[#cbd5e1]" : "border-slate-200 text-slate-500"}`}>{selectedCategory.label}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map(option => (
                    <ChoiceCard
                      key={option.value}
                      selected={form.category === option.value}
                      isDark={isDark}
                      onClick={() => setForm(prev => ({ ...prev, category: option.value }))}
                      icon={option.icon}
                      label={option.label}
                      hint={option.hint}
                    />
                  ))}
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <FormLabel isDark={isDark}>Severity</FormLabel>
                    <p className={`text-xs mt-1 ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Set the impact level for triage.</p>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs ${isDark ? "border-white/[0.08] text-[#cbd5e1]" : "border-slate-200 text-slate-500"}`}>{selectedSeverity.label}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {severities.map(option => (
                    <ChoiceCard
                      key={option.value}
                      selected={form.severity === option.value}
                      isDark={isDark}
                      onClick={() => setForm(prev => ({ ...prev, severity: option.value }))}
                      icon={ShieldAlert}
                      label={option.label}
                      hint={option.hint}
                      tone={option.tint}
                    />
                  ))}
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="space-y-2">
                  <FormLabel isDark={isDark}>Bug summary</FormLabel>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition-colors ${isDark ? "bg-black/20 border-white/[0.10] text-white placeholder:text-[#737380] focus:border-sky-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                    placeholder="Short title describing the issue"
                    required
                  />
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="space-y-2">
                  <FormLabel isDark={isDark}>What happened?</FormLabel>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={5}
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition-colors resize-y ${isDark ? "bg-black/20 border-white/[0.10] text-white placeholder:text-[#737380] focus:border-sky-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                    placeholder="Describe the issue in detail"
                    required
                  />
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel isDark={isDark}>Steps to reproduce</FormLabel>
                    <span className={`text-xs ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Optional</span>
                  </div>
                  <textarea
                    name="steps_to_reproduce"
                    value={form.steps_to_reproduce}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition-colors resize-y ${isDark ? "bg-black/20 border-white/[0.10] text-white placeholder:text-[#737380] focus:border-sky-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                    placeholder="1. Go to ...\n2. Click ...\n3. See the issue"
                  />
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel isDark={isDark}>Browser</FormLabel>
                      <span className={`text-xs ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Optional</span>
                    </div>
                    <input
                      name="browser"
                      value={form.browser}
                      onChange={handleChange}
                      className={`w-full rounded-xl border px-4 py-3 outline-none transition-colors ${isDark ? "bg-black/20 border-white/[0.10] text-white placeholder:text-[#737380] focus:border-sky-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                      placeholder="Browser, app version, or environment"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel isDark={isDark}>Device</FormLabel>
                      <span className={`text-xs ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Optional</span>
                    </div>
                    <input
                      name="device"
                      value={form.device}
                      onChange={handleChange}
                      className={`w-full rounded-xl border px-4 py-3 outline-none transition-colors ${isDark ? "bg-black/20 border-white/[0.10] text-white placeholder:text-[#737380] focus:border-sky-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                      placeholder="Laptop, mobile, tablet"
                    />
                  </div>
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem}>
              <FieldShell isDark={isDark}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel isDark={isDark}>Additional context</FormLabel>
                    <span className={`text-xs ${isDark ? "text-[#8b8b92]" : "text-slate-500"}`}>Optional</span>
                  </div>
                  <textarea
                    name="additional_context"
                    value={form.additional_context}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition-colors resize-y ${isDark ? "bg-black/20 border-white/[0.10] text-white placeholder:text-[#737380] focus:border-sky-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                    placeholder="Anything else that helps us debug the issue"
                  />
                </div>
              </FieldShell>
            </motion.div>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3 pb-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={`px-5 py-3 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/[0.10] text-[#f5f5f7] hover:bg-white/[0.06]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                {...btnSubtle}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-slate-950 ${submitting ? "opacity-70 cursor-not-allowed" : "hover:bg-slate-800"}`}
                {...btnPrimary}
              >
                {submitting ? "Submitting..." : <><Send size={16} /> Submit bug report</>}
              </button>
            </motion.div>
          </motion.form>

          <div className="space-y-4 sm:space-y-5">
            <FieldShell isDark={isDark}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isDark ? "bg-sky-500/15 text-sky-300" : "bg-sky-100 text-sky-600"}`}>
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>What we record</h3>
                    <p className={`text-sm ${isDark ? "text-[#cbd5e1]" : "text-slate-600"}`}>The report is appended live to your Google Sheet for review.</p>
                </div>
              </div>
              <div className={`mt-4 space-y-3 text-sm ${isDark ? "text-[#cbd5e1]" : "text-slate-600"}`}>
                <div className="flex items-start gap-3">
                  <LifeBuoy size={16} className="mt-0.5 shrink-0" />
                  <p>Include reproduction steps so we can verify the issue quickly.</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <p>Use the severity field to show whether it blocks work or is minor.</p>
                </div>
              </div>
            </FieldShell>

            <FieldShell isDark={isDark}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Prefilled context</h3>
                  <p className={`text-sm ${isDark ? "text-[#cbd5e1]" : "text-slate-600"}`}>We auto-fill your account, browser, and device details where possible.</p>
                </div>
              </div>
              <div className={`mt-4 rounded-2xl border p-4 text-sm ${isDark ? "border-white/[0.08] bg-black/20 text-[#cbd5e1]" : "border-slate-200/70 bg-white text-slate-600"}`}>
                <p className="font-medium mb-2">Signed in as</p>
                <p>{user?.name || "User"}</p>
                <p className="break-all">{user?.email || ""}</p>
                <p className="mt-3 opacity-80">Reports are saved privately to your account-owned sheet.</p>
              </div>
            </FieldShell>

            {submitted && (
              <FieldShell isDark={isDark}>
                <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Report submitted</h3>
                <p className={`mt-2 text-sm ${isDark ? "text-[#cbd5e1]" : "text-slate-600"}`}>
                  Your bug report has been saved. You can go back to the app or submit another issue if needed.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className={`mt-4 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-950 text-white hover:bg-slate-800"}`}
                >
                  Return to app
                </button>
              </FieldShell>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}