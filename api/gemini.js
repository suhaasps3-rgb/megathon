// Production handler for /api/gemini (Vercel serverless function).
// Set GEMINI_API_KEY in the Vercel project's environment variables, never as a VITE_ variable.
import { nodeHandler } from '../server/gemini.js';

export default function handler(req, res) {
  return nodeHandler(req, res, process.env.GEMINI_API_KEY);
}
