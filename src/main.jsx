import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Simple error reporting for white-screen debugging
window.onerror = (msg, url, line, col, error) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>System Error</h2>
      <p>${msg}</p>
      <pre>${error?.stack || ''}</pre>
    </div>`;
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
