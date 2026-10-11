# PaisaPath

## Requirements

- Node.js 18 or newer (with npm)
- A modern browser (Chrome recommended; WebGL is needed for the 3D World)

## Setup

```bash
git clone https://github.com/suhaasps3-rgb/megathon.git
cd megathon
npm install
```

## Run

```bash
npm run dev
```

Open the address printed in the terminal (usually http://localhost:5173).

## Optional: AI features

The app runs fully without a key, using built-in scenarios and offline replies. To enable AI-generated scenarios, create a `.env` file in the project root:

```
VITE_GEMINI_API_KEY=your_key_here
```

Restart `npm run dev` afterwards. Never commit `.env`.

## Other commands

```bash
npm test          # unit tests
npm run check     # typecheck + tests + production build
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Datasets and model weights

None. The app uses no external datasets and ships no model weights. AI features call the Google Gemini API only when a key is set.
