import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { toast } from "./Toast"
import { Spinner, ButtonLoader } from "./Loader"

const API = (
  import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
)?.replace(/\/$/, "")

const IconArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const IconCamera = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const IconCrown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
)

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconDocument = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const IconReceipt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 17V7" />
  </svg>
)

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconAlertTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const planDetails = {
  free: {
    name: "Free",
    color: "gray",
    features: ["5 documents", "10 MB file limit", "100 questions/month"]
  },
  basic: {
    name: "Basic",
    price: "₹999/month",
    color: "blue",
    features: ["50 documents", "50 MB file limit", "1,000 questions/month"]
  },
  pro: {
    name: "Pro",
    price: "₹2,999/month",
    color: "purple",
    features: ["Unlimited documents", "100 MB file limit", "Unlimited questions"]
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    color: "amber",
    features: ["Everything in Pro", "Dedicated support", "Custom integrations"]
  }
}

export default function SettingsPage({ user: initialUser, theme, token }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [user, setUser] = useState(initialUser)
  const [usage, setUsage] = useState(null)
  const [loadingUsage, setLoadingUsage] = useState(true)
  const [billingHistory, setBillingHistory] = useState([])
  const [loadingBilling, setLoadingBilling] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const isDark = theme === "dark"
  const currentPlan = planDetails[user?.plan] || planDetails.free

  // Fetch usage stats
  useEffect(() => {
    const fetchUsage = async () => {
      if (!token) return
      try {
        const res = await axios.get(`${API}/usage`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUsage(res.data)
      } catch (err) {
        console.error("Failed to fetch usage:", err)
      } finally {
        setLoadingUsage(false)
      }
    }
    fetchUsage()
  }, [token])

  // Fetch billing history
  useEffect(() => {
    const fetchBilling = async () => {
      if (!token) return
      try {
        const res = await axios.get(`${API}/billing/history`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setBillingHistory(res.data.payments || [])
      } catch (err) {
        console.error("Failed to fetch billing:", err)
      } finally {
        setLoadingBilling(false)
      }
    }
    fetchBilling()
  }, [token])

  // Sync user prop to local state when it changes (e.g., after async fetch completes)
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setFormData(prev => ({ ...prev, name: initialUser.name || "" }))
    }
  }, [initialUser])

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
        return e.returnValue
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Helper to calculate usage percentage
  const getUsagePercent = (used, limit) => {
    if (limit === "Unlimited") return 0
    return Math.min((used / limit) * 100, 100)
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setHasUnsavedChanges(true)
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error("Image size should be less than 5MB")
      return
    }

    setUploading(true)
    const uploadFormData = new FormData()
    uploadFormData.append("file", file)

    try {
      const response = await axios.post(`${API}/profile/photo`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      })
      toast.success("Profile photo updated successfully")
      
      // Refetch user data instead of full page reload
      const userRes = await axios.get(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(userRes.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload photo")
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true)
    try {
      await axios.delete(`${API}/profile/photo`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Profile photo removed")
      
      // Refetch user data instead of full page reload
      const userRes = await axios.get(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(userRes.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove photo")
    } finally {
      setRemovingPhoto(false)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelling(true)
    try {
      await axios.post(`${API}/subscription/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Subscription cancelled. You'll retain access until the end of your billing period.")
      setShowCancelModal(false)
      // Refresh user data
      const userRes = await axios.get(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(userRes.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to cancel subscription")
    } finally {
      setCancelling(false)
    }
  }

  const handleSaveDetails = async (e) => {
    e.preventDefault()

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (formData.newPassword && formData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setSaving(true)
    try {
      const updateData = {
        name: formData.name
      }

      if (formData.newPassword) {
        updateData.current_password = formData.currentPassword
        updateData.new_password = formData.newPassword
      }

      await axios.put(`${API}/profile/details`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success("Profile updated successfully")
      setFormData({ ...formData, currentPassword: "", newPassword: "", confirmPassword: "" })
      setHasUnsavedChanges(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  // Get profile image or generate initial
  const getProfileDisplay = () => {
    if (user?.picture) {
      return (
        <img
          src={user.picture}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-4 border-white/10"
        />
      )
    }
    const initial = (user?.name || user?.email || "U")[0].toUpperCase()
    return (
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
        {initial}
      </div>
    )
  }

  const canRemovePhoto = user?.picture && user?.profile_image_source === "upload"

  // Show loading spinner while user data is being fetched
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${isDark ? "bg-black/20 backdrop-blur-xl border-white/[0.08]" : "bg-white/70 backdrop-blur-xl border-slate-200/50"}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer
              ${isDark ? "hover:bg-white/[0.08] text-[#86868b]" : "hover:bg-white/60 text-slate-600"}`}
          >
            <IconArrowLeft />
          </button>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Settings
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-8">
          {/* Profile Photo Section */}
          <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
            <h2 className={`text-lg font-semibold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
              Profile Photo
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="relative">
                {getProfileDisplay()}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <IconCamera />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  Upload a new profile photo. JPG, PNG, GIF or WebP. Max 5MB.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer
                      ${isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                  >
                    {uploading ? <ButtonLoader text="Uploading..." /> : "Upload Photo"}
                  </button>
                  {canRemovePhoto && (
                    <button
                      onClick={handleRemovePhoto}
                      disabled={removingPhoto}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50
                        ${isDark ? "bg-white/[0.08] hover:bg-white/[0.12] text-[#f5f5f7]" : "bg-white/60 hover:bg-white/80 text-slate-700"}`}
                    >
                      {removingPhoto ? <ButtonLoader text="Removing..." /> : "Remove"}
                    </button>
                  )}
                </div>
                {user?.profile_image_source === "google" && (
                  <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                    Using your Google profile picture
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Current Plan Section */}
          <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Current Plan
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold
                ${currentPlan.color === "gray" ? (isDark ? "bg-white/[0.08] text-[#86868b]" : "bg-slate-100/80 text-slate-600") :
                  currentPlan.color === "blue" ? "bg-blue-100 text-blue-700" :
                  currentPlan.color === "purple" ? "bg-purple-100 text-purple-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                {currentPlan.name}
              </div>
            </div>
            
            <div className={`flex items-start gap-4 p-4 rounded-xl ${isDark ? "bg-white/[0.04]" : "bg-white/40"}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                ${currentPlan.color === "gray" ? (isDark ? "bg-white/[0.1] text-[#86868b]" : "bg-slate-200/80 text-slate-500") :
                  currentPlan.color === "blue" ? "bg-blue-100 text-blue-600" :
                  currentPlan.color === "purple" ? "bg-purple-100 text-purple-600" :
                  "bg-amber-100 text-amber-600"
                }`}>
                <IconCrown />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {currentPlan.name}
                  </span>
                  {currentPlan.price && (
                    <span className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      {currentPlan.price}
                    </span>
                  )}
                </div>
                {user?.plan_expires_at && user?.plan !== "free" && (
                  <p className={`text-xs mb-2 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                    {user.billing_cycle === "yearly" ? "Yearly" : "Monthly"} • Expires:{" "}
                    {new Date(user.plan_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
                <ul className="space-y-1">
                  {currentPlan.features.map((feature, i) => (
                    <li key={i} className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => navigate("/upgrade")}
              className={`mt-4 w-full py-3 rounded-lg font-medium transition-colors cursor-pointer
                ${user?.plan === "enterprise" 
                  ? (isDark ? "bg-white/[0.06] text-[#9ca3af] cursor-not-allowed" : "bg-slate-100/80 text-slate-400 cursor-not-allowed")
                  : (isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white")
                }`}
              disabled={user?.plan === "enterprise"}
            >
              {user?.plan === "enterprise" ? "You have the best plan" : "Upgrade Plan"}
            </button>

            {/* Prompting Tips Link for premium users */}
            {user?.plan && user.plan !== "free" && (
              <button
                onClick={() => navigate(`/welcome?plan=${user.plan}`)}
                className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isDark 
                    ? "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50" 
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
              >
                💡 View Prompting Tips
              </button>
            )}
          </div>

          {/* Usage Statistics Section */}
          <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
              Usage Overview
            </h2>
            
            {loadingUsage ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : usage ? (
              <div className="space-y-6">
                {/* Documents Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IconDocument />
                      <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                        Documents Uploaded
                      </span>
                    </div>
                    <span className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      {usage.documents.used} / {usage.documents.limit}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/[0.12]" : "bg-slate-200/80"}`}>
                    <div 
                      className={`h-full rounded-full transition-all ${
                        getUsagePercent(usage.documents.used, usage.documents.limit) > 90 
                          ? "bg-red-500" 
                          : getUsagePercent(usage.documents.used, usage.documents.limit) > 70 
                            ? "bg-amber-500" 
                            : "bg-blue-500"
                      }`}
                      style={{ width: `${getUsagePercent(usage.documents.used, usage.documents.limit)}%` }}
                    />
                  </div>
                  {usage.documents.remaining !== "Unlimited" && (
                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                      {usage.documents.remaining} uploads remaining
                    </p>
                  )}
                </div>

                {/* Questions Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IconMessage />
                      <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                        Questions This Month
                      </span>
                    </div>
                    <span className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      {usage.questions.used} / {usage.questions.limit}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/[0.12]" : "bg-slate-200/80"}`}>
                    <div 
                      className={`h-full rounded-full transition-all ${
                        getUsagePercent(usage.questions.used, usage.questions.limit) > 90 
                          ? "bg-red-500" 
                          : getUsagePercent(usage.questions.used, usage.questions.limit) > 70 
                            ? "bg-amber-500" 
                            : "bg-green-500"
                      }`}
                      style={{ width: `${getUsagePercent(usage.questions.used, usage.questions.limit)}%` }}
                    />
                  </div>
                  {usage.questions.remaining !== "Unlimited" && (
                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                      {usage.questions.remaining} questions remaining this month
                    </p>
                  )}
                </div>

                {/* File Size Limit Info */}
                <div className={`flex items-center justify-between pt-4 border-t ${isDark ? "border-white/[0.08]" : "border-slate-200/60"}`}>
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    Max file size
                  </span>
                  <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                    {usage.file_size_limit_mb} MB
                  </span>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                Unable to load usage data
              </p>
            )}
          </div>

          {/* Account Details Section */}
          <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
            <h2 className={`text-lg font-semibold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
              Account Details
            </h2>
            <form onSubmit={handleSaveDetails} className="space-y-5">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors
                    ${isDark 
                      ? "bg-white/[0.06] backdrop-blur-md border-white/[0.1] text-[#f5f5f7] placeholder-[#9ca3af] focus:border-white/[0.2]"
                      : "bg-white/60 backdrop-blur-md border-slate-200/50 text-slate-900 placeholder-slate-400 focus:border-[#0071e3]/40"}`}
                  placeholder="Enter your name"
                />
              </div>

              {/* Email (Disabled) */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  Email
                  <span className={`ml-2 inline-flex items-center gap-1 text-xs font-normal ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                    <IconLock />
                    Cannot be changed
                  </span>
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className={`w-full px-4 py-2.5 rounded-lg border cursor-not-allowed
                    ${isDark
                      ? "bg-white/[0.04] border-white/[0.08] text-[#9ca3af]"
                      : "bg-white/30 border-slate-200/50 text-slate-500"}`}
                />
              </div>

              {/* Password Change Section */}
              <div className={`pt-4 border-t ${isDark ? "border-white/[0.08]" : "border-slate-200/60"}`}>
                <p className={`text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  {user?.has_password ? "Change Password" : "Set Password"}
                </p>
                {user?.is_google_user && !user?.has_password && (
                  <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                    You signed up with Google. Set a password to also login with email.
                  </p>
                )}

                <div className="space-y-4">
                  {user?.has_password && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-colors
                          ${isDark 
                            ? "bg-white/[0.06] backdrop-blur-md border-white/[0.1] text-[#f5f5f7] placeholder-[#9ca3af] focus:border-white/[0.2]"
                            : "bg-white/60 backdrop-blur-md border-slate-200/50 text-slate-900 placeholder-slate-400 focus:border-[#0071e3]/40"}`}
                        placeholder="Enter current password"
                      />
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors
                        ${isDark 
                          ? "bg-white/[0.06] backdrop-blur-md border-white/[0.1] text-[#f5f5f7] placeholder-[#9ca3af] focus:border-white/[0.2]"
                          : "bg-white/60 backdrop-blur-md border-slate-200/50 text-slate-900 placeholder-slate-400 focus:border-[#0071e3]/40"}`}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors
                        ${isDark 
                          ? "bg-white/[0.06] backdrop-blur-md border-white/[0.1] text-[#f5f5f7] placeholder-[#9ca3af] focus:border-white/[0.2]"
                          : "bg-white/60 backdrop-blur-md border-slate-200/50 text-slate-900 placeholder-slate-400 focus:border-[#0071e3]/40"}`}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer
                    ${isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  {saving ? <ButtonLoader text="Saving..." /> : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${isDark ? "bg-white/[0.08] hover:bg-white/[0.12] text-[#f5f5f7]" : "bg-white/60 hover:bg-white/80 text-slate-700"}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Billing History Section */}
          {user?.plan !== "free" && (
            <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                <IconReceipt />
                Billing History
              </h2>
              
              {loadingBilling ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : billingHistory.length === 0 ? (
                <p className={`text-sm ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                  No billing history available yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {billingHistory.slice(0, 5).map((payment, idx) => (
                    <div 
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg ${
                        isDark ? "bg-white/[0.04]" : "bg-white/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.status === "success" 
                            ? "bg-green-100 text-green-600" 
                            : payment.status === "failed" 
                              ? "bg-red-100 text-red-600" 
                              : "bg-yellow-100 text-yellow-600"
                        }`}>
                          {payment.status === "success" ? <IconCheck /> : <IconAlertTriangle />}
                        </div>
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                            {payment.plan?.charAt(0).toUpperCase() + payment.plan?.slice(1)} Plan ({payment.billing_cycle})
                          </p>
                          <p className={`text-xs ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                            {new Date(payment.date).toLocaleDateString('en-IN', { 
                              day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          ₹{payment.amount?.toLocaleString('en-IN')}
                        </p>
                        <p className={`text-xs text-green-500`}>
                          Paid
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plan Expiry Warning */}
          {user?.days_until_expiry && user.days_until_expiry <= 7 && user.days_until_expiry > 0 && !user?.is_cancelled && (
            <div className={`rounded-2xl border p-6 ${isDark ? "bg-orange-900/20 border-orange-700/30" : "bg-orange-50 border-orange-200"}`}>
              <div className="flex items-start gap-4">
                <div className="text-orange-500">
                  <IconAlertTriangle />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${isDark ? "text-orange-300" : "text-orange-800"}`}>
                    Your plan expires in {user.days_until_expiry} day{user.days_until_expiry !== 1 ? 's' : ''}
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? "text-orange-400/70" : "text-orange-700"}`}>
                    Renew now to keep your premium features and avoid losing access to your documents beyond free tier limits.
                  </p>
                  <button
                    onClick={() => navigate("/upgrade")}
                    className="mt-3 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    Renew Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Section */}
          {user?.plan !== "free" && !user?.is_cancelled && (
            <div className={`rounded-2xl border p-5 sm:p-6 ${isDark ? "bg-white/[0.06] backdrop-blur-xl border-white/[0.1]" : "bg-white/80 backdrop-blur-xl border-slate-200/50"}`}>
              <h2 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                Cancel Subscription
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                Your subscription will remain active until the end of your current billing period. 
                After that, your account will be downgraded to the Free plan.
              </p>
              <button
                onClick={() => setShowCancelModal(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isDark 
                    ? "bg-red-900/30 text-red-400 hover:bg-red-900/50" 
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
              >
                Cancel Subscription
              </button>
            </div>
          )}

          {/* Already Cancelled Notice */}
          {user?.is_cancelled && user?.plan !== "free" && (
            <div className={`rounded-2xl border p-6 ${isDark ? "bg-yellow-900/20 border-yellow-700/30" : "bg-yellow-50 border-yellow-200"}`}>
              <div className="flex items-start gap-4">
                <div className="text-yellow-500">
                  <IconAlertTriangle />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? "text-yellow-300" : "text-yellow-800"}`}>
                    Subscription Cancelled
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? "text-yellow-400/70" : "text-yellow-700"}`}>
                    Your {currentPlan.name} plan will remain active until {user?.plan_expires_at 
                      ? new Date(user.plan_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'the end of your billing period'
                    }. After that, you'll be moved to the Free plan.
                  </p>
                  <button
                    onClick={() => navigate("/upgrade")}
                    className="mt-3 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    Resubscribe
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl p-5 sm:p-6 ${isDark ? "bg-black/80 backdrop-blur-2xl border border-white/[0.1]" : "bg-white/90 backdrop-blur-2xl border border-white/90"}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Cancel Subscription?
              </h3>
              <button 
                onClick={() => setShowCancelModal(false)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isDark ? "hover:bg-white/[0.08] text-[#86868b]" : "hover:bg-white/60 text-slate-600"
                }`}
              >
                <IconX />
              </button>
            </div>
            
            <div className={`p-4 rounded-lg mb-4 ${isDark ? "bg-red-900/20" : "bg-red-50"}`}>
              <p className={`text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>
                <strong>You'll lose access to:</strong>
              </p>
              <ul className={`text-sm mt-2 space-y-1 ${isDark ? "text-red-400/80" : "text-red-600"}`}>
                {currentPlan.features.map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
            </div>

            <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              Your current plan will remain active until{" "}
              <strong>
                {user?.plan_expires_at 
                  ? new Date(user.plan_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'the end of your billing period'
                }
              </strong>
              . After that, you'll be downgraded to Free.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors cursor-pointer
                  ${isDark
                    ? "bg-white/[0.08] hover:bg-white/[0.12] text-[#f5f5f7]"
                    : "bg-white/60 hover:bg-white/80 text-slate-700"
                  }`}
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelling ? <ButtonLoader text="Cancelling..." /> : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
