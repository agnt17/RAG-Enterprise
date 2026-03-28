import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"

const SimpleIconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconUpgrade = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
)

const IconLogOut = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const IconTheme = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const IconMonitor = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

export default function ProfileDropdown({ user, onLogout, theme, themeMode, setThemeMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef(null)
  const themeButtonRef = useRef(null)
  const flyoutRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Also check if click is on flyout (portal)
        if (flyoutRef.current && flyoutRef.current.contains(event.target)) {
          return
        }
        setIsOpen(false)
        setShowThemeMenu(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Update flyout position when theme menu opens
  useEffect(() => {
    if (showThemeMenu && themeButtonRef.current) {
      const rect = themeButtonRef.current.getBoundingClientRect()
      setFlyoutPosition({
        top: rect.top,
        left: rect.right + 4, // 4px gap
      })
    }
  }, [showThemeMenu])

  const handleNavigation = (path) => {
    setIsOpen(false)
    setShowThemeMenu(false)
    navigate(path)
  }

  const handleLogout = () => {
    setIsOpen(false)
    setShowThemeMenu(false)
    onLogout()
    navigate("/")
  }

  const handleThemeChange = (newTheme) => {
    setThemeMode(newTheme)
    setShowThemeMenu(false)
  }

  const isDark = theme === "dark"

  const themeOptions = [
    { key: "light", label: "Light", icon: <IconSun /> },
    { key: "system", label: "System", icon: <IconMonitor /> },
    { key: "dark", label: "Dark", icon: <IconMoon /> },
  ]

  const currentThemeLabel = themeOptions.find(t => t.key === themeMode)?.label || "System"

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer
          ${isDark ? "hover:bg-gray-800" : "hover:bg-slate-50"}`}
      >
        {user?.picture ? (
          <img
            src={user.picture}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover border-2 border-white/10 flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-xs font-semibold truncate ${isDark ? "text-gray-200" : "text-slate-900"}`}>
            {user?.name || "User"}
          </p>
          <p className={`text-xs truncate ${isDark ? "text-gray-500" : "text-slate-400"}`}>
            {user?.email}
          </p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute bottom-full left-0 right-0 mb-2 rounded-2xl shadow-2xl border overflow-visible
            ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}
          style={{ minWidth: "280px" }}
        >
          {/* User Email Header */}
          <div className={`px-4 py-3 border-b ${isDark ? "border-gray-800" : "border-slate-100"}`}>
            <p className={`text-xs truncate ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {user?.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Settings */}
            <button
              onClick={() => handleNavigation("/settings")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer
                ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-slate-50 text-slate-700"}`}
            >
              <SimpleIconSettings />
              <span className="flex-1 text-left text-sm">Settings</span>
            </button>

            {/* Theme with side flyout (via portal) */}
            <div>
              <button
                ref={themeButtonRef}
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer
                  ${showThemeMenu 
                    ? (isDark ? "bg-gray-800 text-gray-200" : "bg-slate-50 text-slate-900")
                    : (isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-slate-50 text-slate-700")
                  }`}
              >
                <IconTheme />
                <span className="flex-1 text-left text-sm">Theme</span>
                <span className={`text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  {currentThemeLabel}
                </span>
                <IconChevronRight />
              </button>

              {/* Theme Submenu - Portal flyout to the right */}
              {showThemeMenu && createPortal(
                <div 
                  ref={flyoutRef}
                  className={`fixed rounded-xl shadow-xl border py-1 z-[9999]
                    ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-slate-200"}`}
                  style={{ 
                    top: flyoutPosition.top,
                    left: flyoutPosition.left,
                    minWidth: "140px"
                  }}
                >
                  {themeOptions.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer
                        ${themeMode === key 
                          ? (isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600")
                          : (isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-slate-50 text-slate-700")
                        }`}
                    >
                      {icon}
                      <span className="flex-1 text-left text-sm">{label}</span>
                      {themeMode === key && <IconCheck />}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>

            {/* Get Help */}
            <button
              onClick={() => handleNavigation("/help")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer
                ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-slate-50 text-slate-700"}`}
            >
              <IconHelp />
              <span className="flex-1 text-left text-sm">Get help</span>
            </button>

            {/* Upgrade Plan */}
            <button
              onClick={() => handleNavigation("/upgrade")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer
                ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-slate-50 text-slate-700"}`}
            >
              <IconUpgrade />
              <span className="flex-1 text-left text-sm">Upgrade plan</span>
            </button>

            {/* Divider */}
            <div className={`my-2 border-t ${isDark ? "border-gray-800" : "border-slate-100"}`} />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer
                ${isDark ? "hover:bg-red-900/30 text-red-400" : "hover:bg-red-50 text-red-600"}`}
            >
              <IconLogOut />
              <span className="flex-1 text-left text-sm">Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
