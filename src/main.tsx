import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import './index.css'
import App from './App.tsx'

// Manifest URL must be a public URL pointing to your tonconnect-manifest.json
const manifestUrl = 'https://badger-clicker-tma-production.up.railway.app/tonconnect-manifest.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)
