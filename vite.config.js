import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { nodeHandler } from './server/gemini.js'

// Serves /api/gemini from the dev and preview servers so the Gemini key stays
// server-side. GEMINI_API_KEY is read from .env or the shell; it has no VITE_
// prefix, so it is never exposed to client code.
function geminiProxy(apiKey) {
  const mount = (server) => {
    server.middlewares.use('/api/gemini', (req, res) => nodeHandler(req, res, apiKey))
  }
  return { name: 'gemini-proxy', configureServer: mount, configurePreviewServer: mount }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), geminiProxy(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY)],
  }
})
