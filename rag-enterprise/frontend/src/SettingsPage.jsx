import { useState, useRef } from "react"
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

const planDetails = {
  free: {
    name: "Free",
    color: "gray",
    features: ["5 documents", "10 MB file limit", "100 questions/month"]
  },
  basic: {
    name: "Basic",
    price: "$19/month",
    color: "blue",
    features: ["50 documents", "50 MB file limit", "1,000 questions/month"]
  },
  pro: {
    name: "Pro",
    price: "$49/month",
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

export default function SettingsPage({ user, theme, token }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: user?.name || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)

  const isDark = theme === "dark"
  const currentPlan = planDetails[user?.plan] || planDetails.free

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
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
      await axios.post(`${API}/profile/photo`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      })
      toast.success("Profile photo updated successfully")
      window.location.reload()
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
      window.location.reload()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove photo")
    } finally {
      setRemovingPhoto(false)
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

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-slate-100"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer
              ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-slate-100 text-slate-600"}`}
          >
            <IconArrowLeft />
          </button>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Settings
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Profile Photo Section */}
          <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <h2 className={`text-lg font-semibold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
              Profile Photo
            </h2>
            <div className="flex items-center gap-6">
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
                <div className="flex gap-3">
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
                        ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
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
          <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Current Plan
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold
                ${currentPlan.color === "gray" ? (isDark ? "bg-gray-800 text-gray-300" : "bg-slate-100 text-slate-600") :
                  currentPlan.color === "blue" ? "bg-blue-100 text-blue-700" :
                  currentPlan.color === "purple" ? "bg-purple-100 text-purple-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                {currentPlan.name}
              </div>
            </div>
            
            <div className={`flex items-start gap-4 p-4 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-slate-50"}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                ${currentPlan.color === "gray" ? (isDark ? "bg-gray-700 text-gray-400" : "bg-slate-200 text-slate-500") :
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
                  ? (isDark ? "bg-gray-800 text-gray-400 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed")
                  : (isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white")
                }`}
              disabled={user?.plan === "enterprise"}
            >
              {user?.plan === "enterprise" ? "You have the best plan" : "Upgrade Plan"}
            </button>
          </div>

          {/* Account Details Section */}
          <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
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
                      ? "bg-gray-800 border-gray-700 text-slate-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"}`}
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
                      ? "bg-gray-800/50 border-gray-700 text-gray-500" 
                      : "bg-slate-100 border-slate-200 text-slate-500"}`}
                />
              </div>

              {/* Password Change Section */}
              <div className={`pt-4 border-t ${isDark ? "border-gray-800" : "border-slate-200"}`}>
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
                            ? "bg-gray-800 border-gray-700 text-slate-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"}`}
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
                          ? "bg-gray-800 border-gray-700 text-slate-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"}`}
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
                          ? "bg-gray-800 border-gray-700 text-slate-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"}`}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer
                    ${isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  {saving ? <ButtonLoader text="Saving..." /> : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
