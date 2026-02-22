import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Apply saved dark mode preference immediately (before React renders)
if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
}

// Auto-reload when a new service worker takes control (skipWaiting + clientsClaim fired)
// This ensures the installed PWA on mobile picks up new deployments without manual reinstall.
let refreshing = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

registerSW({
  onNeedRefresh() {
    // autoUpdate mode handles skipWaiting automatically;
    // the controllerchange listener above will trigger the reload.
  },
  onOfflineReady() {
    // App is ready for offline use
  },
  immediate: true,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
