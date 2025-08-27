import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupGlobalErrorHandler } from './utils/errorHandler'

// Setup global error handler for postMessage errors
setupGlobalErrorHandler()

createRoot(document.getElementById("root")!).render(<App />);
