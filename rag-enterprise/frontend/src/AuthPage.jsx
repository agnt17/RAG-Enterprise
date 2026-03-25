import { useEffect, useState } from "react"
import { GoogleLogin } from "@react-oauth/google"
import axios from "axios"

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
      } else {
        onLogin(res.data.token, res.data.user)
      }
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (typeof detail === "object" && detail?.code === "EMAIL_NOT_VERIFIED") {
        setMode("verify")
        setVerificationEmail(detail.email || form.email.trim().toLowerCase())
        setInfo("Your account is pending verification. Enter OTP or use the link in your email.")
      } else {
        setError(parseError(err, "Something went wrong"))
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
      onLogin(res.data.token, res.data.user)
    } catch (err) {
      setError(parseError(err, "Verification failed. Check your code and try again."))
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
    } catch (err) {
      const retryAfter = detailRetryAfter(err)
      if (retryAfter > 0) setResendCooldown(retryAfter)
      setError(parseError(err, "Could not resend verification email."))
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
      onLogin(res.data.token, res.data.user)
    } catch {
      setError("Google sign-in failed. Try again.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-700 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-blue-500/30">
            ⬡
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DocMind AI</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">
            {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Verify your email"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">

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
                <span className="text-xs text-gray-500 font-mono">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            

          {/* Traditional Auth Form */}
          {mode !== "verify" ? (
            <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex flex-col gap-4">
            {/* Name field — only on register */}
            {mode === "register" && (
              <input
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handle}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-all"
              />
            )}

            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handle}
              required
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-all"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handle}
              required
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-all"
            />

            {/* Error message */}
            {error && (
              <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-linear-to-br from-blue-400 to-cyan-400 text-gray-950 font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submitVerification() }} className="flex flex-col gap-4">
              <p className="text-xs text-gray-400 font-mono">
                Enter the 6-digit code sent to <span className="text-gray-300">{verificationEmail}</span>
              </p>
              <input
                name="otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit OTP"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                required
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/50 transition-all"
              />

              {info && (
                <p className="text-xs text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                  {info}
                </p>
              )}

              {error && (
                <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-linear-to-br from-blue-400 to-cyan-400 text-gray-950 font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Please wait..." : "Verify & Continue"}
              </button>

              <button
                type="button"
                onClick={resendVerification}
                disabled={loading || resendCooldown > 0}
                className="w-full py-2.5 rounded-xl border border-white/15 text-gray-200 text-sm hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
              </button>
            </form>
          )}

          {mode !== "verify" && error && (
            <p className="text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {mode !== "verify" && info && (
            <p className="text-xs text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          {/* Toggle mode */}
          {mode !== "verify" ? (
            <p className="text-center text-xs text-gray-500">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setInfo("") }}
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          ) : (
            <p className="text-center text-xs text-gray-500">
              Wrong email?
              <button
                onClick={() => { setMode("login"); setVerifyCode(""); setError(""); setInfo("") }}
                className="ml-1 text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Back to sign in
              </button>
            </p>
          )}

        </div>
      </div>
    </div>
  )
}