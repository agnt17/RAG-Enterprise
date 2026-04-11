import { useEffect, useState } from "react"
import { GoogleLogin } from "@react-oauth/google"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { ButtonLoader } from "./Loader"
import { toast } from "./Toast"
import { staggerContainer, staggerItem, btnSubtle, ease } from "./lib/animations"

const API = (
  import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
)?.replace(/\/$/, "")

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login")   // "login", "register", or "verify"
  const [form, setForm] = useState({ email: "", password: "", name: "" })
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
    if (!API) {
      setError("API URL is not configured. Set VITE_API_URL in the frontend environment.")
      setLoading(false)
      return
    }
    try {
      const endpoint = mode === "login" ? "/login" : "/register"
      const payload  = mode === "login"
        ? { email: form.email.trim().toLowerCase(), password: form.password }
        : { email: form.email.trim().toLowerCase(), password: form.password, name: form.name }
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
    if (!API) {
      setError("API URL is not configured. Set VITE_API_URL in the frontend environment.")
      setLoading(false)
      return
    }
    try {
      // Send Google's ID token to our backend for verification
      const res = await axios.post(`${API}/auth/google`, {
        token: credentialResponse.credential
      })
      toast.success("👋 Welcome! Signed in with Google.")
      onLogin(res.data.token, res.data.user)
    } catch {
      setError("Google sign-in failed. Try again.")
      toast.error("Google sign-in failed. Try again.")
    }
    setLoading(false)
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/40 focus:bg-white/8 transition-colors duration-200 input-glow-dark"

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative w-full max-w-sm flex flex-col gap-6"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-blue-500/25"
          >
            ⬡
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DocMind AI</h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-gray-500 mt-1"
            >
              {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Verify your email"}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={staggerItem}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4"
        >
          {/* Google Button */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError("Google sign-in failed")}
              useOneTap={false}
              theme="filled_black"
              shape="pill"
              text={mode === "login" ? "signin_with" : "signup_with"}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
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
                  <motion.input variants={staggerItem} name="name" placeholder="Full name"
                    value={form.name} onChange={handle}
                    className={inputCls} />
                )}
                <motion.input variants={staggerItem} name="email" type="email" placeholder="Email address"
                  value={form.email} onChange={handle} required className={inputCls} />
                <motion.input variants={staggerItem} name="password" type="password" placeholder="Password"
                  value={form.password} onChange={handle} required className={inputCls} />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  variants={staggerItem}
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02, boxShadow: "0 8px 24px rgba(59,130,246,0.3)" } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  transition={ease.spring}
                  className="w-full py-2.5 rounded-xl bg-linear-to-br from-blue-400 to-cyan-400 text-gray-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? <ButtonLoader text="Please wait..." /> : mode === "login" ? "Sign In" : "Create Account"}
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
                <motion.p variants={staggerItem} className="text-xs text-gray-400">
                  Code sent to <span className="text-gray-300">{verificationEmail}</span>
                </motion.p>
                <motion.input variants={staggerItem} name="otp" inputMode="numeric" maxLength={6}
                  placeholder="6-digit OTP" value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  required className={inputCls} />

                <AnimatePresence>
                  {info && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                      {info}
                    </motion.p>
                  )}
                  {error && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button variants={staggerItem} type="submit" disabled={loading}
                  whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.98 } : {}}
                  transition={ease.spring}
                  className="w-full py-2.5 rounded-xl bg-linear-to-br from-blue-400 to-cyan-400 text-gray-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? "Please wait..." : "Verify & Continue"}
                </motion.button>

                <motion.button variants={staggerItem} type="button" onClick={resendVerification}
                  disabled={loading || resendCooldown > 0}
                  whileHover={resendCooldown === 0 && !loading ? { scale: 1.01 } : {}}
                  whileTap={resendCooldown === 0 && !loading ? { scale: 0.99 } : {}}
                  transition={ease.spring}
                  className="w-full py-2.5 rounded-xl border border-white/15 text-gray-200 text-sm hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Toggle mode */}
          <p className="text-center text-xs text-gray-600">
            {mode !== "verify" ? (
              <>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setInfo("") }}
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-150 font-medium"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </>
            ) : (
              <>
                Wrong email?{" "}
                <button
                  onClick={() => { setMode("login"); setVerifyCode(""); setError(""); setInfo("") }}
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-150 font-medium"
                >
                  Back to sign in
                </button>
              </>
            )}
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}