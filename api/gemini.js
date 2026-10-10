// Production handler for /api/gemini (Vercel-style serverless function).
// Set GEMINI_API_KEY in the host's environment settings, not in a VITE_ variable.
import { nodeHandler } from '../server/gemini.js';

export default function handler(req, res) {
  return nodeHandler(req, res, process.env.GEMINI_API_KEY);
}
