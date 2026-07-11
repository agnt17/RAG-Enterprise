import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { inject } from '@vercel/analytics'
import './index.css'
import AppRouter from './AppRouter.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

inject()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <AppRouter />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>
)