# PaisaPath UI audit and route checklist

Audit of the existing app (branch `claude/project-thread-zn9k8c`). Stack: Vite 5, React 18,
Tailwind 3, framer-motion 14, lucide-react 0.300, three.js via React Three Fiber (3D world only).
No shadcn/ui or other component library; shared styles live in `src/index.css` and
`tailwind.config.js`.

## Routes (state machine in `src/App.jsx`)

| Route | Component | Status |
| --- | --- | --- |
| HOME | `components/Home.jsx` | Redesigned in the design pass. Real progress shown. |
| ONBOARDING | `components/Onboarding.jsx` | **Done.** Three labelled steps with a progress indicator, Back that keeps choices, inline name validation, disabled Continue with a stated reason (it was an invisible but clickable button before), `aria-pressed` choices, focus moves to each step heading, summary before starting, translated (en, hi, te). Checked at 1280 and 390 widths. |
| ASSESSMENT | `components/Assessment.jsx` | **Done.** Announced loading and result, a stated notice (not a silent swap) when the AI cannot be reached, offline read when there is no key, "Change my answer", stale-answer guard. Checked at 1280 and 390 widths. |
| GAME (Learn mode) | `components/Game.jsx` | Not yet reviewed. Known: with no key it still tries an AI call before falling back, which logs console errors. |
| REPORT | `components/Report.jsx` | Not yet reviewed. |
| LIFE | `components/life/LifeMode.jsx` (+ Hud, Room, ScenarioView, FutureLab, LifeReport) | Has its own `prefers-reduced-motion` handling. HUD not yet reviewed. |
| NEIGHBORHOOD (3D world) | `components/world/NeighborhoodGame.jsx`, `World.jsx`, `ResultsPanel.jsx` | Results and controls redesigned. Mission card and shop dialogue added. HUD still a single overlay. |
| VOICE (Mentor) | `components/VoiceCompanion.jsx` | **Done.** Distinct states (ready, listening, thinking, speaking, error) with a status pill; conversation history; quick prompts; animated balance; AI failure falls back to offline with a notice; translated (en, hi, te). Checked at 1280, 768 and 390 widths. Not tested: a real microphone and spoken output (headless browser has neither). |
| BLIND_MODE (Audio mode) | `components/BlindMode.jsx` | Full-screen audio-first mode. Not yet reviewed. |
| NGO dashboard | `components/NgoDashboard.jsx` | Not yet reviewed. |
| Not routed | `components/Setup.jsx` | Unrouted since the Gemini key moved server-side. Candidate for removal. |

## Shared shell

- `components/shell/AppHeader.jsx`: top nav, language switch, Audio mode, NGO link. Reviewed.
- `components/shell/JourneyBar.jsx`: progress strip. Reviewed.
- `components/brand/Mascot.jsx`: mascot and logo. Used across routes.

## Issues found

1. Accessibility: `reducedMotion="user"` is set globally in `App.jsx`, but the 3D HUD and
   the results panel animate with their own timers (`ResultsPanel` bar transitions) and do not
   check the preference.
2. Reactivity: several surfaces read saved state once on mount (`Home` progress uses `useMemo`
   with no subscription), so they can go stale if another route changes the wallet.
3. Duplicate styling: button and card classes are repeated across components instead of coming
   from one token set in `index.css` (for example `card`, `btn-primary`, `btn-secondary` are
   defined, but many components still write their own classes).
4. Dead code: `Setup.jsx` is not routed.
5. Overlays: the 3D HUD, pause menu and results panel are absolutely positioned over the canvas,
   which means they must be checked at each breakpoint for overlap.
6. ~~Voice states: the Mentor does not show a distinct listening / thinking / speaking state.~~ Fixed in the Mentor.

## Plan (in order)

1. Design tokens: consolidate colour, radius, shadow and motion values into `index.css` and the
   Tailwind theme. Remove duplicated card and button classes.
2. Shared states: `StatusPill`, `EmptyState`, `AnimatedNumber` and `StepProgress` now exist in `components/ui/` (used by the Mentor and Onboarding). Still to add: `Skeleton` and `Toast`, and to use these on the other routes.
3. Route-by-route pass, each checked in a browser at 1280, 768 and 390 widths:
   Onboarding → Assessment → Learn game → Report → Mentor → Audio mode → Life Mode → NGO →
   3D world HUD.
4. Reduced motion: gate every timed animation (3D pulse, results bars, toast) on
   `useReducedMotion()`.
   Done so far: Mentor balance (`AnimatedNumber`). Still to do: 3D results bars and toasts.
5. Remove `Setup.jsx` after confirming nothing imports it.

Each step is done only when the route has been checked in a browser and the checks pass.
