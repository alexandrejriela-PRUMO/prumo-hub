// MUST be first — patches React dispatcher before any SDK chunk loads
import '@/lib/react-shim.js'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)