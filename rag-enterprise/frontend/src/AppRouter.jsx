import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import App from "./App"
import SettingsPage from "./SettingsPage"
import HelpPage from "./HelpPage"
import UpgradePlanPage from "./UpgradePlanPage"
import PremiumWelcomePage from "./PremiumWelcomePage"
import NotFoundPage from "./NotFoundPage"
import ServerErrorPage from "./ServerErrorPage"
import MeshBackground from "./MeshBackground"

function getStoredThemeMode() {
  return localStorage.getItem("theme") || "system"
}

function getSystemIsDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches || false
}

function resolveTheme(themeMode, systemIsDark) {
  return themeMode === "system" ? (systemIsDark ? "dark" : "light") : themeMode
}

export default function AppRouter() {
  const [themeMode, setThemeMode] = React.useState(getStoredThemeMode)
  const [systemIsDark, setSystemIsDark] = React.useState(getSystemIsDark)

  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!mq) return
    const onChange = (e) => setSystemIsDark(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  React.useEffect(() => {
    const syncThemeMode = () => setThemeMode(getStoredThemeMode())
    const onThemeChange = () => syncThemeMode()
    const onStorage = (e) => {
      if (e.key === "theme") syncThemeMode()
    }

    window.addEventListener("docmind-theme-change", onThemeChange)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("docmind-theme-change", onThemeChange)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const resolvedTheme = resolveTheme(themeMode, systemIsDark)

  return (
    <>
      {/* Global base color — sits behind mesh and all page content */}
      <div
        className="fixed inset-0"
        style={{ zIndex: -2, backgroundColor: resolvedTheme === "dark" ? "#000000" : "#f0f4ff" }}
      />
      <MeshBackground resolvedTheme={resolvedTheme} />
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<App />} />
        <Route path="/settings" element={<SettingsPageWrapper resolvedTheme={resolvedTheme} />} />
        <Route path="/help" element={<HelpPageWrapper resolvedTheme={resolvedTheme} />} />
        <Route path="/upgrade" element={<UpgradePlanPageWrapper resolvedTheme={resolvedTheme} />} />
        <Route path="/welcome" element={<PremiumWelcomePageWrapper resolvedTheme={resolvedTheme} />} />
        <Route path="/error" element={<ServerErrorPage resolvedTheme={resolvedTheme} />} />
        <Route path="*" element={<NotFoundPage resolvedTheme={resolvedTheme} />} />
      </Routes>
      </BrowserRouter>
    </>
  )
}

// Wrapper components that extract theme and user from App state
function SettingsPageWrapper({ resolvedTheme }) {
  const token = localStorage.getItem("token")
  
  // Fetch user data from localStorage or make API call if needed
  const [user, setUser] = React.useState(null)
  
  React.useEffect(() => {
    const fetchUser = async () => {
      if (!token) return
      try {
        const API = (
          import.meta.env.PROD
            ? import.meta.env.VITE_API_URL
            : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
        )?.replace(/\/$/, "")
        
        const res = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setUser(data)
      } catch (err) {
        console.error("Failed to fetch user:", err)
      }
    }
    fetchUser()
  }, [token])
  
  if (!token) {
    return <Navigate to="/" replace />
  }
  
  return <SettingsPage user={user} resolvedTheme={resolvedTheme} token={token} />
}

function HelpPageWrapper({ resolvedTheme }) {
  return <HelpPage resolvedTheme={resolvedTheme} />
}

function UpgradePlanPageWrapper({ resolvedTheme }) {
  const token = localStorage.getItem("token")
  
  const [user, setUser] = React.useState(null)
  
  React.useEffect(() => {
    const fetchUser = async () => {
      if (!token) return
      try {
        const API = (
          import.meta.env.PROD
            ? import.meta.env.VITE_API_URL
            : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
        )?.replace(/\/$/, "")
        
        const res = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setUser(data)
      } catch (err) {
        console.error("Failed to fetch user:", err)
      }
    }
    fetchUser()
  }, [token])
  
  if (!token) {
    return <Navigate to="/" replace />
  }
  
  return <UpgradePlanPage resolvedTheme={resolvedTheme} user={user} />
}

function PremiumWelcomePageWrapper({ resolvedTheme }) {
  const token = localStorage.getItem("token")
  
  const [user, setUser] = React.useState(null)
  
  React.useEffect(() => {
    const fetchUser = async () => {
      if (!token) return
      try {
        const API = (
          import.meta.env.PROD
            ? import.meta.env.VITE_API_URL
            : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
        )?.replace(/\/$/, "")
        
        const res = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setUser(data)
      } catch (err) {
        console.error("Failed to fetch user:", err)
      }
    }
    fetchUser()
  }, [token])
  
  if (!token) {
    return <Navigate to="/" replace />
  }
  
  return <PremiumWelcomePage resolvedTheme={resolvedTheme} user={user} />
}
