# PaisaPath

Powered by Vanguard

<img src="public/vanguard-logo.png" alt="Vanguard" height="32">

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

## Credits

Third-party software and assets used by this project:

- [React](https://react.dev) and [React DOM](https://react.dev), MIT License
- [Vite](https://vitejs.dev), with [Tailwind CSS](https://tailwindcss.com) and PostCSS, for the build (MIT License)
- [Framer Motion](https://www.framer.com/motion/), MIT License
- [Lucide](https://lucide.dev) icons (`lucide-react`), ISC License
- [three.js](https://threejs.org) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber), MIT License (3D World)
- [Google Fonts](https://fonts.google.com): Plus Jakarta Sans, Bricolage Grotesque, Noto Sans Devanagari and Noto Sans Telugu, SIL Open Font License 1.1
- Vanguard name and logo (`public/vanguard-logo.png`) are trademarks of The Vanguard Group, shown to credit the problem statement sponsor

Optional: AI features use the Google Gemini API when a key is configured.

Project code is released under the MIT License (see `LICENSE`).

---

PaisaPath · Powered by Vanguard <img src="public/vanguard-logo.png" alt="Vanguard" height="16">
