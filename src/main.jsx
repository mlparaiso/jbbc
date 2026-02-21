import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Apply saved dark mode preference immediately (before React renders)
if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
}

// Auto-reload page when a new service worker is activated
registerSW({
  onNeedRefresh() {
    window.location.reload()
  },
  onOfflineReady() {
    // App is ready for offline use
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
