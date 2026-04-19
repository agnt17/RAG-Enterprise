import { useEffect, useState } from "react"
import { GoogleLogin } from "@react-oauth/google"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { ButtonLoader } from "./Loader"
import { toast } from "./Toast"
import { staggerContainer, staggerItem, ease } from "./lib/animations"

const API = (
  import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
)?.replace(/\/$/, "")

export default function AuthPage({ onLogin, resolvedTheme = "dark" }) {
  const isDark = resolvedTheme === "dark"
  const [mode, setMode] = useState("login")   // "login", "register", or "verify"
  const [form, setForm] = useState({ email: "", password: "", name: "" })
  const [acceptLegal, setAcceptLegal] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [info, setInfo] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const parseError = (err, fallback) => {
    const detail = err?.response?.data?.detail
    if (typeof detail === "string") return detail
    if (detail?.message) return detail.message
    return fallback
  }

  const detailRetryAfter = (err) => {
    const detail = err?.response?.data?.detail
    if (typeof detail === "object" && Number.isFinite(detail?.retry_after_seconds)) {
      return Math.max(0, detail.retry_after_seconds)
    }
    return 0
  }

  const verifyWithToken = async (email, token) => {
    if (!API) return
    setLoading(true)
    setError("")
    try {
      const res = await axios.post(`${API}/verify-email`, { email, token })
      toast.success("🎉 Email verified successfully! Welcome aboard!")
      onLogin(res.data.token, res.data.user)
    } catch (err) {
      setError(parseError(err, "Magic link is invalid or expired. Request a new email."))
      setMode("verify")
      setVerificationEmail(email)
    }
    setLoading(false)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("verify_token")
    const email = params.get("email")
    if (token && email) {
      verifyWithToken(email, token)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const submit = async () => {
    setLoading(true)
    setError("")
    setInfo("")

    if (mode === "register" && !acceptLegal) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.")
      setLoading(false)
      return
    }

    if (!API) {
      setError("API URL is not configured. Set VITE_API_URL in the frontend environment.")
      setLoading(false)
      return
    }
    try {
      const endpoint = mode === "login" ? "/login" : "/register"
      const payload  = mode === "login"
        ? { email: form.email.trim().toLowerCase(), password: form.password }
        : {
            email: form.email.trim().toLowerCase(),
            password: form.password,
            name: form.name,
            accept_terms: true,
            accept_privacy: true,
          }
      const res = await axios.post(`${API}${endpoint}`, payload)
      if (res.data?.needs_verification) {
        setMode("verify")
        setVerificationEmail(res.data.email || payload.email)
        setResendCooldown(res.data.resend_after_seconds || 60)
        setInfo("We sent a verification code and a magic link to your email.")
        toast.info("📧 Verification email sent! Check your inbox.")
      } else {
        toast.success(mode === "login" ? "👋 Welcome back!" : "🎉 Account created successfully!")
        onLogin(res.data.token, res.data.user)
      }
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (typeof detail === "object" && detail?.code === "EMAIL_NOT_VERIFIED") {
        setMode("verify")
        setVerificationEmail(detail.email || form.email.trim().toLowerCase())
        setInfo("Your account is pending verification. Enter OTP or use the link in your email.")
        toast.info("📧 Please verify your email to continue.")
      } else {
        setError(parseError(err, "Something went wrong"))
        toast.error(parseError(err, "Something went wrong"))
      }
    }
    setLoading(false)
  }

  const submitVerification = async () => {
    setLoading(true)
    setError("")
    setInfo("")
    if (!API) {
      setError("API URL is not configured. Set VITE_API_URL in the frontend environment.")
      setLoading(false)
      return
    }
    try {
      const res = await axios.post(`${API}/verify-email`, {
        email: verificationEmail.trim().toLowerCase(),
        otp: verifyCode.trim()
      })
      toast.success("🎉 Email verified successfully! Welcome aboard!")
      onLogin(res.data.token, res.data.user)
    } catch (err) {
      setError(parseError(err, "Verification failed. Check your code and try again."))
      toast.error("Invalid code. Please try again.")
    }
    setLoading(false)
  }

  const resendVerification = async () => {
    if (resendCooldown > 0 || !verificationEmail) return
    setLoading(true)
    setError("")
    setInfo("")
    try {
      const res = await axios.post(`${API}/resend-verification`, {
        email: verificationEmail.trim().toLowerCase()
      })
      setResendCooldown(res.data.resend_after_seconds || 60)
      setInfo("A new verification email has been sent.")
      toast.success("📧 New verification code sent!")
    } catch (err) {
      const retryAfter = detailRetryAfter(err)
      if (retryAfter > 0) setResendCooldown(retryAfter)
      setError(parseError(err, "Could not resend verification email."))
      toast.error("Could not resend email. Try again later.")
    }
    setLoading(false)
  }

  const handleGoogle = async (credentialResponse) => {
    setLoading(true)
    setError("")

    if (mode === "register" && !acceptLegal) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.")
      setLoading(false)
      return
    }

    if (!API) {
      setError("API URL is not configured. Set VITE_API_URL in the frontend environment.")
      setLoading(false)
      return
    }
    try {
      // Send Google's ID token to our backend for verification
      const res = await axios.post(`${API}/auth/google`, {
        token: credentialResponse.credential,
        accept_terms: mode === "register" ? true : false,
        accept_privacy: mode === "register" ? true : false,
      })
      toast.success("👋 Welcome! Signed in with Google.")
      onLogin(res.data.token, res.data.user)
    } catch {
      setError("Google sign-in failed. Try again.")
      toast.error("Google sign-in failed. Try again.")
    }
    setLoading(false)
  }

  // ── Theme tokens ──────────────────────────────────────────
  const inputCls = isDark
    ? "w-full rounded-xl border border-slate-700/70 bg-slate-950/55 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-400/70 focus:bg-slate-950 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)] sm:px-4 sm:py-3 sm:text-[15px]"
    : "w-full rounded-xl border border-slate-300 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-sky-500 focus:shadow-[0_0_0_4px_rgba(2,132,199,0.13)] sm:px-4 sm:py-3 sm:text-[15px]"

  const cardCls = isDark
    ? "auth-pane-scroll relative flex h-full flex-col overflow-y-visible rounded-3xl border border-white/12 bg-slate-950/70 p-4 backdrop-blur-2xl shadow-[0_24px_90px_rgba(2,8,23,0.68)] sm:p-6 lg:overflow-y-auto lg:p-7"
    : "auth-pane-scroll relative flex h-full flex-col overflow-y-visible rounded-3xl border border-slate-200/90 bg-white/90 p-4 backdrop-blur-2xl shadow-[0_24px_90px_rgba(15,23,42,0.18)] sm:p-6 lg:overflow-y-auto lg:p-7"

  const paneHeightCls = "h-auto lg:h-[760px]"

  const titleCls = isDark ? "text-3xl font-semibold leading-tight text-white sm:text-[34px]" : "text-3xl font-semibold leading-tight text-slate-900 sm:text-[34px]"
  const subtitleCls = isDark ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-slate-500"
  const fieldLabelCls = isDark ? "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400" : "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
  const dividerLine = isDark ? "h-px flex-1 bg-white/12" : "h-px flex-1 bg-slate-200"
  const dividerText = isDark ? "text-xs text-slate-500" : "text-xs text-slate-400"
  const footerText = isDark ? "text-center text-xs text-slate-500" : "text-center text-xs text-slate-500"
  const footerLink = isDark ? "font-medium text-cyan-300 hover:text-cyan-200 transition-colors duration-150" : "font-medium text-sky-600 hover:text-sky-700 transition-colors duration-150"
  const resendBtn = isDark ? "w-full rounded-xl border border-white/15 py-2.5 text-sm text-slate-200 transition-colors duration-150 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40" : "w-full rounded-xl border border-slate-200 py-2.5 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
  const verifyNote = isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"
  const verifyEmail = isDark ? "font-medium text-slate-200" : "font-medium text-slate-800"
  const legalNote = isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"

  const modeTabsWrap = isDark ? "grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1" : "grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
  const modeTabBase = "rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors duration-150 sm:px-3 sm:text-sm"
  const modeTabActive = isDark ? "bg-cyan-400 text-slate-950" : "bg-sky-600 text-white"
  const modeTabIdle = isDark ? "text-slate-300 hover:bg-white/8" : "text-slate-600 hover:bg-white"
  const googleWrapCls = isDark ? "flex justify-center overflow-hidden rounded-xl border border-white/12 bg-white/5 p-2" : "flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2"
  const infoBoxCls = isDark ? "rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200" : "rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-700"
  const errorBoxCls = isDark ? "rounded-lg border border-red-500/25 bg-red-500/12 px-3 py-2 text-xs text-red-200" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"

  const quickNotes = [
    "Hybrid retrieval combines vector search with BM25 for better relevance.",
    "Chunk-level citations let you verify the exact supporting source text.",
    "Per-user namespaces keep document indexes isolated across accounts.",
    "Cross-encoder reranking improves precision before final context selection.",
    "Upload processing tracks indexing state so query readiness is explicit.",
  ]

  const trustNotes = [
    { value: "Vector + BM25", label: "Hybrid retrieval" },
    { value: "Cited", label: "Traceable answers" },
    { value: "Per-user", label: "Data isolation" },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-0">
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_15%_18%,rgba(6,182,212,0.16),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,0.14),transparent_36%),radial-gradient(circle_at_72%_84%,rgba(20,184,166,0.12),transparent_40%)]"
            : "bg-[radial-gradient(circle_at_15%_18%,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(56,189,248,0.16),transparent_36%),radial-gradient(circle_at_72%_84%,rgba(45,212,191,0.12),transparent_40%)]"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 opacity-40 ${
          isDark
            ? "[background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:52px_52px]"
            : "[background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:52px_52px]"
        }`}
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative mx-auto grid min-h-screen w-full max-w-6xl content-center items-stretch gap-4 md:gap-5 lg:grid-cols-[1.08fr_0.92fr]"
      >
        <motion.aside
          variants={staggerItem}
          className={`${paneHeightCls} relative hidden flex-col overflow-hidden rounded-[30px] border p-4 sm:p-6 lg:flex lg:p-8 ${
            isDark
              ? "border-white/12 bg-white/[0.03] shadow-[0_24px_80px_rgba(2,8,23,0.56)]"
              : "border-slate-200/80 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.14)]"
          }`}
        >
          <div className="relative z-10 flex h-full flex-col">
            <p className={isDark ? "text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80" : "text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80"}>
              DocMind AI
            </p>
            <h2 className={isDark ? "mt-3 text-[30px] font-semibold leading-[1.08] text-white sm:mt-4 sm:text-4xl 2xl:text-[42px]" : "mt-3 text-[30px] font-semibold leading-[1.08] text-slate-900 sm:mt-4 sm:text-4xl 2xl:text-[42px]"}>
              Document Intelligence
            </h2>
            <p className={isDark ? "mt-4 max-w-md text-sm leading-relaxed text-slate-300" : "mt-4 max-w-md text-sm leading-relaxed text-slate-600"}>
              Upload, index, and query documents with verifiable output.
            </p>

            <div className="mt-6 space-y-2.5 sm:mt-8 sm:space-y-3">
              {quickNotes.map((item, idx) => (
                <motion.div
                  key={item}
                  variants={staggerItem}
                  className={isDark ? "flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 sm:gap-3 sm:px-4 sm:py-3" : "flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5 text-sm text-slate-700 sm:gap-3 sm:px-4 sm:py-3"}
                >
                  <span className={isDark ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-semibold text-cyan-200" : "inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700"}>
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2 pt-6 sm:gap-3 sm:pt-8">
              {trustNotes.map((item) => (
                <div
                  key={item.label}
                  className={isDark ? "rounded-xl border border-white/10 bg-white/5 px-3 py-3" : "rounded-xl border border-slate-200 bg-white/90 px-3 py-3"}
                >
                  <p className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>{item.value}</p>
                  <p className={isDark ? "mt-1 text-[10px] uppercase tracking-wide text-slate-400" : "mt-1 text-[10px] uppercase tracking-wide text-slate-500"}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>

        <motion.section variants={staggerItem} className={`${paneHeightCls} relative mx-auto w-full max-w-xl lg:max-w-none`}>
          <div className={isDark ? "pointer-events-none absolute -inset-3 rounded-[34px] bg-cyan-500/12 blur-xl" : "pointer-events-none absolute -inset-3 rounded-[34px] bg-sky-300/35 blur-xl"} />

          <motion.div variants={staggerItem} className={cardCls}> 
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
                isDark ? "bg-linear-to-r from-transparent via-cyan-300/70 to-transparent" : "bg-linear-to-r from-transparent via-sky-500/70 to-transparent"
              }`}
            />

            <div className="mb-4 flex items-start justify-between gap-3 sm:gap-4">
              <div>
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-400 to-cyan-400 text-lg text-slate-950 shadow-lg shadow-cyan-500/30 sm:h-12 sm:w-12 sm:text-xl">
                  ⬡
                </div>
                <h1 className={titleCls}>DocMind AI</h1>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={mode}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={subtitleCls}
                  >
                    {mode === "login" ? "Sign in to your account" : mode === "register" ? "Create a new account" : "Verify your email"}
                  </motion.p>
                </AnimatePresence>
              </div>

              <span className={isDark ? "shrink-0 rounded-full border border-white/12 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 sm:px-2.5" : "shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 sm:px-2.5"}>
                {mode === "verify" ? "Step 2" : "Step 1"}
              </span>
            </div>

            {mode !== "verify" && (
              <div className={`${modeTabsWrap} mb-4`}>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login")
                    setError("")
                    setInfo("")
                    setAcceptLegal(false)
                  }}
                  className={`${modeTabBase} ${mode === "login" ? modeTabActive : modeTabIdle}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register")
                    setError("")
                    setInfo("")
                  }}
                  className={`${modeTabBase} ${mode === "register" ? modeTabActive : modeTabIdle}`}
                >
                  Create account
                </button>
              </div>
            )}

            <div className={googleWrapCls}>
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError("Google sign-in failed")}
                useOneTap={false}
                theme={isDark ? "filled_black" : "outline"}
                shape="pill"
                text={mode === "login" ? "signin_with" : "signup_with"}
              />
            </div>

            <div className="my-4 flex items-center gap-2.5 sm:gap-3">
              <div className={dividerLine} />
              <span className={`${dividerText} shrink-0`}>or continue with email</span>
              <div className={dividerLine} />
            </div>

            <AnimatePresence mode="wait">
              {mode !== "verify" ? (
                <motion.form
                  key="auth"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, y: -6 }}
                  onSubmit={(e) => { e.preventDefault(); submit() }}
                  className="flex flex-col gap-3"
                >
                  {mode === "register" && (
                    <motion.div variants={staggerItem}>
                      <label className={fieldLabelCls}>Full name</label>
                      <input
                        name="name"
                        placeholder="Enter your name"
                        value={form.name}
                        onChange={handle}
                        className={inputCls}
                      />
                    </motion.div>
                  )}

                  <motion.div variants={staggerItem}>
                    <label className={fieldLabelCls}>Email</label>
                    <input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handle}
                      required
                      className={inputCls}
                    />
                  </motion.div>

                  <motion.div variants={staggerItem}>
                    <label className={fieldLabelCls}>Password</label>
                    <input
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={handle}
                      required
                      className={inputCls}
                    />
                  </motion.div>

                  {mode === "register" && (
                    <motion.label variants={staggerItem} className={`${legalNote} flex items-start gap-2.5 rounded-xl border px-3 py-2 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                      <input
                        type="checkbox"
                        checked={acceptLegal}
                        onChange={(e) => setAcceptLegal(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        I agree to the{" "}
                        <a href="/legal/terms-of-service.html" target="_blank" rel="noreferrer" className={footerLink}>
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/legal/privacy-policy.html" target="_blank" rel="noreferrer" className={footerLink}>
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </motion.label>
                  )}

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={errorBoxCls}
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    variants={staggerItem}
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.01, boxShadow: "0 10px 28px rgba(56,189,248,0.25)" } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    transition={ease.spring}
                    className="mt-1 flex w-full items-center justify-center rounded-xl bg-linear-to-r from-sky-400 to-cyan-300 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? <ButtonLoader text="Please wait..." /> : mode === "login" ? "Sign in" : "Create account"}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form
                  key="verify"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, y: -6 }}
                  onSubmit={(e) => { e.preventDefault(); submitVerification() }}
                  className="flex flex-col gap-3"
                >
                  <motion.p variants={staggerItem} className={verifyNote}>
                    Code sent to <span className={verifyEmail}>{verificationEmail}</span>
                  </motion.p>

                  <motion.div variants={staggerItem}>
                    <label className={fieldLabelCls}>Verification code</label>
                    <input
                      name="otp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                      required
                      className={inputCls}
                    />
                  </motion.div>

                  <AnimatePresence>
                    {info && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={infoBoxCls}
                      >
                        {info}
                      </motion.p>
                    )}
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={errorBoxCls}
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    variants={staggerItem}
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.01 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    transition={ease.spring}
                    className="w-full rounded-xl bg-linear-to-r from-sky-400 to-cyan-300 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? "Please wait..." : "Verify and continue"}
                  </motion.button>

                  <motion.button
                    variants={staggerItem}
                    type="button"
                    onClick={resendVerification}
                    disabled={loading || resendCooldown > 0}
                    whileHover={resendCooldown === 0 && !loading ? { scale: 1.01 } : {}}
                    whileTap={resendCooldown === 0 && !loading ? { scale: 0.99 } : {}}
                    transition={ease.spring}
                    className={resendBtn}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className={`${footerText} mt-4`}>
              {mode !== "verify" ? (
                <>
                  {mode === "login" ? "Need an account? " : "Already have an account? "}
                  <button
                    onClick={() => {
                      setMode(mode === "login" ? "register" : "login")
                      setError("")
                      setInfo("")
                      setAcceptLegal(false)
                    }}
                    className={footerLink}
                  >
                    {mode === "login" ? "Create one" : "Sign in"}
                  </button>
                </>
              ) : (
                <>
                  Wrong email?{" "}
                  <button
                    onClick={() => { setMode("login"); setVerifyCode(""); setError(""); setInfo("") }}
                    className={footerLink}
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </p>

            <p className={`${footerText} mt-2 leading-relaxed sm:px-1`}>
              By continuing, you agree to our{" "}
              <a href="/legal/terms-of-service.html" target="_blank" rel="noreferrer" className={footerLink}>
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/legal/privacy-policy.html" target="_blank" rel="noreferrer" className={footerLink}>
                Privacy Policy
              </a>
              .{" "}
              <a href="/legal/ai-transparency.html" target="_blank" rel="noreferrer" className={footerLink}>
                AI Notice
              </a>
            </p>
          </motion.div>
        </motion.section>
      </motion.div>
    </div>
  )
}