import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, HelpCircle, PlusCircle, LogOut, Sun, Moon, Monitor, Check, ChevronRight } from "lucide-react"
import { btnSubtle, ease } from "./lib/animations"

export default function ProfileDropdown({ user, onLogout, theme, themeMode, setThemeMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [themePos, setThemePos] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef(null)
  const themeRowRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setShowThemeMenu(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside)
      return () => document.removeEventListener("mousedown", handleOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!showThemeMenu) return
    const closeThemeMenu = () => setShowThemeMenu(false)
    window.addEventListener("resize", closeThemeMenu)
    window.addEventListener("scroll", closeThemeMenu, true)
    return () => {
      window.removeEventListener("resize", closeThemeMenu)
      window.removeEventListener("scroll", closeThemeMenu, true)
    }
  }, [showThemeMenu])

  const toggleTheme = () => {
    if (!themeRowRef.current) return
    const rect = themeRowRef.current.getBoundingClientRect()
    const menuWidth = 160
    const menuHeight = 140
    const margin = 8
    const left = Math.min(
      Math.max(margin, rect.right + margin),
      window.innerWidth - menuWidth - margin
    )
    const top = Math.min(
      Math.max(margin, rect.top),
      window.innerHeight - menuHeight - margin
    )
    setThemePos({ top, left })
    setShowThemeMenu(v => !v)
  }

  const go = (path) => { setIsOpen(false); setShowThemeMenu(false); navigate(path) }
  const logout = () => { setIsOpen(false); setShowThemeMenu(false); onLogout(); navigate("/") }

  const isDark = theme === "dark"

  const themeOptions = [
    { key: "light",  label: "Light",  icon: <Sun     size={14} /> },
    { key: "system", label: "System", icon: <Monitor size={14} /> },
    { key: "dark",   label: "Dark",   icon: <Moon    size={14} /> },
  ]

  const menuItems = [
    { label: "Settings",     icon: <Settings   size={16} strokeWidth={1.5} />, action: () => go("/settings") },
    { label: "Get help",     icon: <HelpCircle size={16} strokeWidth={1.5} />, action: () => go("/help") },
    { label: "Upgrade plan", icon: <PlusCircle size={16} strokeWidth={1.5} />, action: () => go("/upgrade") },
  ]

  const itemCls = `w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-100 cursor-pointer
    ${isDark ? "hover:bg-white/8 text-[#f5f5f7]/80" : "hover:bg-black/4 text-slate-700"}`

  const currentThemeLabel = themeOptions.find(t => t.key === themeMode)?.label

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile trigger */}
      <motion.button
        onClick={() => { setIsOpen(v => !v); setShowThemeMenu(false) }}
        {...btnSubtle}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150 cursor-pointer
          ${isDark ? "hover:bg-white/8" : "hover:bg-black/4"}`}
      >
        {user?.picture ? (
          <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-xs font-semibold truncate ${isDark ? "text-[#f5f5f7]" : "text-[#1d1d1f]"}`}>
            {user?.name || "User"}
          </p>
          <p className={`text-xs truncate ${isDark ? "text-[#cbd5e1]" : "text-[#86868b]"}`}>
            {user?.email}
          </p>
        </div>
      </motion.button>

      {/* Main dropdown — half inside sidebar, half outside */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={`absolute bottom-full mb-2 z-50 rounded-2xl shadow-2xl border overflow-hidden
              w-[min(88vw,15rem)] sm:w-60 right-0 sm:right-auto sm:left-0 lg:left-full lg:-translate-x-1/2
              ${isDark
                ? "bg-[#1c1c1e] border-white/10"
                : "bg-white border-slate-200"}`}
          >
            {/* Email header */}
            <div className={`px-4 py-2.5 border-b ${isDark ? "border-white/8" : "border-slate-100"}`}>
              <p className={`text-xs truncate ${isDark ? "text-[#86868b]" : "text-[#86868b]"}`}>{user?.email}</p>
            </div>

            <div className="py-1.5">
              {menuItems.map(item => (
                <motion.button
                  key={item.label}
                  whileHover={{ x: 2 }}
                  transition={ease.springGentle}
                  onClick={item.action}
                  className={itemCls}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                </motion.button>
              ))}

              {/* Theme row — opens flyout to the right */}
              <motion.button
                ref={themeRowRef}
                whileHover={{ x: 2 }}
                transition={ease.springGentle}
                onClick={toggleTheme}
                className={`${itemCls} ${showThemeMenu ? (isDark ? "bg-white/6" : "bg-black/3") : ""}`}
              >
                <Sun size={16} strokeWidth={1.5} />
                <span className="flex-1 text-left">Theme</span>
                <span className={`text-xs mr-1 ${isDark ? "text-[#cbd5e1]" : "text-[#86868b]"}`}>
                  {currentThemeLabel}
                </span>
                <ChevronRight size={13} className={`transition-opacity duration-150 ${showThemeMenu ? "opacity-100" : "opacity-40"}`} />
              </motion.button>

              <div className={`my-1 border-t mx-3 ${isDark ? "border-white/8" : "border-slate-100"}`} />

              <motion.button
                whileHover={{ x: 2 }}
                transition={ease.springGentle}
                onClick={logout}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-100 cursor-pointer
                  ${isDark ? "hover:bg-red-900/20 text-red-400" : "hover:bg-red-50 text-red-600"}`}
              >
                <LogOut size={16} strokeWidth={1.5} />
                <span className="flex-1 text-left">Log out</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme flyout — portal, no AnimatePresence (breaks portals) */}
      {showThemeMenu && createPortal(
        <motion.div
          initial={{ opacity: 0, x: -6, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: "fixed", top: themePos.top, left: themePos.left, zIndex: 9999 }}
          onMouseDown={e => e.stopPropagation()}
          className={`w-40 max-w-[calc(100vw-1rem)] rounded-xl shadow-xl border overflow-hidden
            ${isDark
              ? "bg-[#1c1c1e] border-white/10"
              : "bg-white border-slate-200"}`}
        >
          {themeOptions.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { setThemeMode(key); setShowThemeMenu(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-100 cursor-pointer
                ${themeMode === key
                  ? isDark ? "bg-[#0a84ff]/15 text-[#0a84ff]" : "bg-[#0071e3]/8 text-[#0071e3]"
                  : isDark ? "hover:bg-white/6 text-[#f5f5f7]/70" : "hover:bg-black/4 text-slate-600"
                }`}
            >
              {icon}
              <span className="flex-1 text-left">{label}</span>
              {themeMode === key && <Check size={13} />}
            </button>
          ))}
        </motion.div>,
        document.body
      )}
    </div>
  )
}
