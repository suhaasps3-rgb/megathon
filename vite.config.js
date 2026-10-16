import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { nodeHandler } from './server/gemini.js'

// Serves /api/gemini from the dev and preview servers so the Gemini key stays server-side.
// GEMINI_API_KEY has no VITE_ prefix, so it is never exposed to client code.
function geminiProxy(apiKey) {
  const mount = (server) => {
    server.middlewares.use('/api/gemini', (req, res) => nodeHandler(req, res, apiKey))
  }
  return { name: 'gemini-proxy', configureServer: mount, configurePreviewServer: mount }
}

// Link previews (LinkedIn, WhatsApp) need an absolute og:image URL, so index.html uses
// __SITE_URL__ and it is filled in at build time.
function siteUrl(url) {
  return { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url) }
}

function resolveSiteUrl(env) {
  const host = env.SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL || ''
  if (!host) return ''
  return (host.startsWith('http') ? host : `https://${host}`).replace(/\/+$/, '')
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    plugins: [react(), geminiProxy(env.GEMINI_API_KEY), siteUrl(resolveSiteUrl(env))],
    test: {
      include: ['src/**/*.test.js', 'server/**/*.test.js'],
    },
  }
})
