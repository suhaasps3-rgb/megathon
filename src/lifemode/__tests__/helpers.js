import { newGame, startRun, advance, choose, presentChoices, answerCheck } from '../domain/game.js';
import { SCENARIO_BY_ID } from '../content/scenarios.js';
import { auditLedger, balancesOf } from '../domain/ledger.js';

export function ok(result) {
  if (!result.ok) throw new Error(`Expected ok, got: ${result.error}`);
  return result.state;
}

/** New game, run started, advanced into the first scenario. */
export function begin(gs = newGame()) {
  return ok(advance(ok(startRun(gs, { name: 'Test', avatar: '🙂' }, 1))));
}

/** Choose the goal and move into chapter 2's first scenario ('saturday'). */
export function toSaturday(goal = 'course', gs) {
  let s = begin(gs);
  s = ok(choose(s, 'start', goal));
  s = ok(advance(s)); // → chapter-complete
  s = ok(advance(s)); // → chapter 2 intro
  s = ok(advance(s)); // → saturday
  return s;
}

export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/**
 * Play the rest of a run. `policy` maps scenarioId → preferred choice id (or array in order
 * of preference). Falls back to the first available choice. Asserts ledger integrity after
 * every step. Optionally answers checks via `answers` (scenarioId → option index).
 */
export function playOut(gs, policy = {}, { answers = {}, marked = {}, onStep } = {}) {
  let s = gs;
  for (let guard = 0; guard < 100; guard += 1) {
    const run = s.run;
    if (run.status === 'complete') return s;
    if (run.phase === 'deciding') {
      const opts = presentChoices(s);
      const prefs = [policy[run.scenarioId]].flat().filter(Boolean);
      const pick = prefs.find((id) => opts.some((o) => o.choice.id === id && o.available)) ?? opts.find((o) => o.available)?.choice.id;
      if (!pick) throw new Error(`No available choice in ${run.scenarioId}`);
      s = ok(choose(s, run.scenarioId, pick, { marked: marked[run.scenarioId] }));
      const sc = SCENARIO_BY_ID.get(run.scenarioId);
      if (sc.check && answers[run.scenarioId] !== undefined) s = ok(answerCheck(s, run.scenarioId, answers[run.scenarioId]));
    } else {
      s = ok(advance(s));
    }
    const problems = auditLedger(s.run.ledger);
    if (problems.length) throw new Error(problems.join('; '));
    const b = balancesOf(s.run.ledger);
    for (const k of ['cash', 'savings', 'goal', 'debt']) if (b[k] < 0) throw new Error(`${k} went negative`);
    onStep?.(s);
  }
  throw new Error('Run did not finish');
}
