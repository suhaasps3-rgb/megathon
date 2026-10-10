# PaisaPath

Financial literacy for Grade 11–12 students: Learn Mode (AI-personalised lessons with an offline fallback) and Life Mode (a six-chapter money simulation, fully offline). Stack: Vite 5, React 18, Tailwind 3.

## Run locally

```bash
npm install
cp .env.example .env    # optional: add GEMINI_API_KEY to turn on the AI lessons
npm run dev
```

Students never see or enter an API key. The browser calls `/api/gemini`, and the server adds the key from `GEMINI_API_KEY`.

- With a key, the welcome screen says AI lessons are on, and students can still pick "Continue without AI".
- Without a key (or if Gemini fails or is rate-limited), the app quietly uses the built-in offline lessons. Life Mode never uses AI.

Keep the variable name `GEMINI_API_KEY`. Do not rename it to `VITE_GEMINI_API_KEY`: anything with the `VITE_` prefix is copied into the public JavaScript bundle.

## Checks

`npm run check` runs the typecheck, the tests and the production build.

## Deploy

- `npm run build && npm run preview` also serves `/api/gemini`, using `GEMINI_API_KEY` from `.env` or the shell.
- On Vercel, `api/gemini.js` is picked up as a serverless function. Set `GEMINI_API_KEY` in the project's environment variables.
- On a static-only host the AI endpoint is missing, so the app runs in offline mode.

## Layout

- `server/gemini.js`: the proxy. Prompts are built on the server and only the known tasks (`scenario`, `assess`, `voice`) are accepted, so the endpoint can't be used as an open Gemini relay.
- `src/services/llm.js`: the browser client for the proxy.
- `src/lifemode/`: Life Mode domain logic (see its README).
