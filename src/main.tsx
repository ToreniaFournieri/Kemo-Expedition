import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ensureLanguageLoaded, resolveInitialLanguage } from './i18n'

async function bootstrap() {
  await ensureLanguageLoaded(resolveInitialLanguage())
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
