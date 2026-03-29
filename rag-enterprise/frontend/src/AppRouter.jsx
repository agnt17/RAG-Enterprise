import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import App from "./App"
import SettingsPage from "./SettingsPage"
import HelpPage from "./HelpPage"
import UpgradePlanPage from "./UpgradePlanPage"
import PremiumWelcomePage from "./PremiumWelcomePage"
import NotFoundPage from "./NotFoundPage"
import ServerErrorPage from "./ServerErrorPage"

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/settings" element={<SettingsPageWrapper />} />
        <Route path="/help" element={<HelpPageWrapper />} />
        <Route path="/upgrade" element={<UpgradePlanPageWrapper />} />
        <Route path="/welcome" element={<PremiumWelcomePageWrapper />} />
        <Route path="/error" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

// Wrapper components that extract theme and user from App state
function SettingsPageWrapper() {
  const token = localStorage.getItem("token")
  const theme = localStorage.getItem("theme") || "system"
  const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme
  
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
  
  return <SettingsPage user={user} theme={resolvedTheme} token={token} />
}

function HelpPageWrapper() {
  const theme = localStorage.getItem("theme") || "system"
  const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme
  
  return <HelpPage theme={resolvedTheme} />
}

function UpgradePlanPageWrapper() {
  const token = localStorage.getItem("token")
  const theme = localStorage.getItem("theme") || "system"
  const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme
  
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
  
  return <UpgradePlanPage theme={resolvedTheme} user={user} />
}

function PremiumWelcomePageWrapper() {
  const token = localStorage.getItem("token")
  const theme = localStorage.getItem("theme") || "system"
  const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme
  
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
  
  return <PremiumWelcomePage theme={resolvedTheme} user={user} />
}
