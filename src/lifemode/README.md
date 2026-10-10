# PaisaPath: Life Mode

A six-chapter financial life simulation. All rules live here, independent of React.

| Folder | What lives there |
| --- | --- |
| `domain/money.js` | Integer paise helpers and ₹ formatting |
| `domain/ledger.js` | Accounts, validated atomic transactions, derived balances, invariants, audit |
| `domain/game.js` | Run lifecycle, chapters, scenario selection, decision resolution (pure, idempotent) |
| `domain/learning.js` | Mastery from evidence and adaptive-support rules |
| `domain/progression.js` | XP, levels, achievements; once-only reward claims |
| `domain/replay.js` | Choice Replay on an isolated ledger (never returns game state) |
| `domain/futureLab.js` | Seeded, clearly hypothetical saving-vs-investing model |
| `domain/report.js` | End-of-run report computed from recorded state |
| `content/` | Concepts and the six chapters of scenarios, as data |
| `persistence/storage.js` | Versioned, validated localStorage save |
| `useLifeGame.js` | The only React binding; UI lives in `src/components/life/` |

Key rules (each documented at the top of its module):

- Balances are never stored; they are folded from the transaction list, so they cannot drift.
- `totalAssets = cash + savings + goal`, `netWorth = totalAssets − debt`. Transfers never change total assets.
- No account can go negative. Credit exists only as an explicit, interest-free family loan.
- A decision is applied once per scenario per run; repeats return the same state.
- Rewards are claims keyed per profile, so restarts and replays can't farm XP or badges.
- Mastery comes only from checks, inspections and concept-applying decisions, never from XP or clicks.
- AI is not used in Life Mode. All lessons and outcomes are deterministic local content.

Commands: `npm test`, `npm run typecheck`, `npm run build`, or `npm run check` for all three.
