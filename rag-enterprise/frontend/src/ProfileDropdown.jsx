import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, HelpCircle, PlusCircle, LogOut, Sun, Moon, Monitor, ChevronDown, Check } from "lucide-react"
import { dropdownVariants, btnSubtle, ease } from "./lib/animations"

export default function ProfileDropdown({ user, onLogout, theme, themeMode, setThemeMode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const dropdownRef = useRef(null)
  const navigate    = useNavigate()

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

  const go = (path) => { setIsOpen(false); setShowThemeMenu(false); navigate(path) }
  const logout = () => { setIsOpen(false); setShowThemeMenu(false); onLogout(); navigate("/") }

  const isDark = theme === "dark"

  const themeOptions = [
    { key: "light",  label: "Light",  icon: <Sun     size={14} /> },
    { key: "system", label: "System", icon: <Monitor size={14} /> },
    { key: "dark",   label: "Dark",   icon: <Moon    size={14} /> },
  ]

  const menuItems = [
    { label: "Settings",     icon: <Settings   size={17} strokeWidth={1.5} />, action: () => go("/settings") },
    { label: "Get help",     icon: <HelpCircle size={17} strokeWidth={1.5} />, action: () => go("/help") },
    { label: "Upgrade plan", icon: <PlusCircle size={17} strokeWidth={1.5} />, action: () => go("/upgrade") },
  ]

  const itemCls = `w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 cursor-pointer
    ${isDark ? "hover:bg-white/[0.08] text-[#f5f5f7]/80" : "hover:bg-black/[0.04] text-slate-700"}`

  const currentThemeLabel = themeOptions.find(t => t.key === themeMode)?.label

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile trigger */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        {...btnSubtle}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150 cursor-pointer
          ${isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.04]"}`}
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
          <p className={`text-xs truncate ${isDark ? "text-[#48484a]" : "text-[#86868b]"}`}>
            {user?.email}
          </p>
        </div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...dropdownVariants}
            className={`absolute bottom-full left-0 right-0 mb-2 rounded-2xl shadow-2xl border overflow-hidden
              ${isDark
                ? "bg-black/80 backdrop-blur-2xl border-white/[0.1]"
                : "bg-white/90 backdrop-blur-2xl border-slate-200/50"}`}
            style={{ minWidth: 280 }}
          >
            {/* Email header */}
            <div className={`px-4 py-3 border-b ${isDark ? "border-white/[0.08]" : "border-slate-100"}`}>
              <p className={`text-xs truncate ${isDark ? "text-[#86868b]" : "text-[#86868b]"}`}>{user?.email}</p>
            </div>

            <div className="py-2">
              {menuItems.map(item => (
                <motion.button
                  key={item.label}
                  whileHover={{ x: 3 }}
                  transition={ease.springGentle}
                  onClick={item.action}
                  className={itemCls}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                </motion.button>
              ))}

              {/* Theme row — inline expand */}
              <motion.button
                whileHover={{ x: 3 }}
                transition={ease.springGentle}
                onClick={() => setShowThemeMenu(v => !v)}
                className={`${itemCls} ${showThemeMenu ? (isDark ? "bg-white/[0.06]" : "bg-black/[0.03]") : ""}`}
              >
                <Sun size={17} strokeWidth={1.5} />
                <span className="flex-1 text-left">Theme</span>
                <span className={`text-xs mr-1 ${isDark ? "text-[#48484a]" : "text-[#86868b]"}`}>
                  {currentThemeLabel}
                </span>
                <motion.span
                  animate={{ rotate: showThemeMenu ? 180 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronDown size={14} />
                </motion.span>
              </motion.button>

              {/* Inline theme options */}
              <AnimatePresence>
                {showThemeMenu && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className={`mx-3 mb-1 rounded-xl border ${isDark ? "border-white/[0.06] bg-white/[0.03]" : "border-slate-100 bg-black/[0.02]"}`}>
                      {themeOptions.map(({ key, label, icon }) => (
                        <button
                          key={key}
                          onClick={() => { setThemeMode(key); setShowThemeMenu(false) }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 cursor-pointer first:rounded-t-xl last:rounded-b-xl
                            ${themeMode === key
                              ? isDark
                                ? "bg-[#0a84ff]/15 text-[#0a84ff]"
                                : "bg-[#0071e3]/8 text-[#0071e3]"
                              : isDark
                                ? "hover:bg-white/[0.06] text-[#f5f5f7]/70"
                                : "hover:bg-black/[0.04] text-slate-600"
                            }`}
                        >
                          {icon}
                          <span className="flex-1 text-left">{label}</span>
                          {themeMode === key && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`my-1.5 border-t ${isDark ? "border-white/[0.08]" : "border-slate-100"}`} />

              <motion.button
                whileHover={{ x: 3 }}
                transition={ease.springGentle}
                onClick={logout}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 cursor-pointer
                  ${isDark ? "hover:bg-red-900/20 text-red-400" : "hover:bg-red-50 text-red-600"}`}
              >
                <LogOut size={17} strokeWidth={1.5} />
                <span className="flex-1 text-left">Log out</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
