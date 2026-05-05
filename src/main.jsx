import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Expose React globally to prevent duplicate instances from SDK bundles
if (typeof window !== 'undefined') {
  window.__REACT_INSTANCE__ = React;
  window.__REACT_DOM_INSTANCE__ = ReactDOM;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)