import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { ConfirmProvider } from './components/app/ConfirmProvider'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <ConfirmProvider>
            <App />
            <Toaster position="bottom-right" richColors />
          </ConfirmProvider>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
