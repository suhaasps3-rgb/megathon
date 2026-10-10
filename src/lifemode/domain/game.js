// @ts-check
/**
 * Game orchestration: run lifecycle, chapter progression, scenario selection and decision
 * resolution. Every function is pure: it takes a GameState and returns a new one (or an
 * error with the original state untouched). React only renders what these return.
 *
 * Run lifecycle (run.phase):
 *   intro            chapter title card; advance() enters its first scenario
 *   deciding         a scenario is waiting for a choice
 *   feedback         the choice was applied; optional knowledge check; advance() moves on
 *   chapter-complete recap; advance() opens the next chapter's intro
 *   complete         run finished; report available; run.status === 'complete'
 *
 * Restart policy: startRun() replaces the current run with a fresh one (new money, new
 * ledger, chapter 1). The profile keeps XP, badges, mastery and reward claims, so first-time
 * rewards cannot be claimed again. Completed runs are summarised in profile.pastRuns.
 */
import { createLedger, commit, balancesOf, summarize, totalAssets } from './ledger.js';
import { rupees } from './money.js';
import { levelFrom, supportFrom, addEvidence, gradeInspection } from './learning.js';
import { claim, evaluateAchievements, XP } from './progression.js';
import { SCENARIO_BY_ID, CHAPTERS, GOALS } from '../content/scenarios.js';

/** @typedef {import('./ledger.js').Ledger} Ledger */
/** @typedef {import('./ledger.js').Balances} Balances */
/** @typedef {import('./ledger.js').Transaction} Transaction */
/** @typedef {import('./learning.js').Evidence} Evidence */
/** @typedef {import('../content/scenarios.js').Scenario} Scenario */
/** @typedef {import('../content/scenarios.js').Choice} Choice */
/** @typedef {import('../content/scenarios.js').View} View */
/** @typedef {import('../content/scenarios.js').Outcome} Outcome */
/** @typedef {import('../content/scenarios.js').EffectDraft} EffectDraft */

/** @typedef {'intro' | 'deciding' | 'feedback' | 'chapter-complete' | 'complete'} Phase */

/**
 * @typedef {Object} Decision
 * @property {string} scenarioId
 * @property {string} choiceId
 * @property {number} chapter
 * @property {number} seqStart   Ledger seq before this decision's transactions.
 * @property {number} seqEnd     Ledger seq after them (exclusive).
 * @property {number} wellbeingDelta
 * @property {Outcome} outcome   Resolved text, frozen at decision time.
 * @property {{ marked: string[], found: number, total: number, falsePositives: number, correct: boolean }} [inspection]
 * @property {number} xp
 */

/**
 * @typedef {Object} CheckState
 * @property {number[]} attempts   Option indexes chosen, in order (max 2).
 * @property {boolean} correctFirst
 * @property {boolean} done
 */

/**
 * @typedef {Object} Run
 * @property {string} id
 * @property {number} number
 * @property {'active' | 'complete'} status
 * @property {Phase} phase
 * @property {{ name: string, avatar: string }} character
 * @property {string | null} goalId
 * @property {Ledger} ledger
 * @property {number} wellbeing
 * @property {Record<string, boolean | number | string>} flags
 * @property {number} chapterIndex
 * @property {string | null} scenarioId
 * @property {string[]} visited      Scenario ids entered this run (entry effects applied once).
 * @property {Record<string, string>} entryNotes
 * @property {Decision[]} decisions
 * @property {Record<string, CheckState>} checks
 * @property {Evidence[]} evidence   Evidence earned this run (also mirrored to the profile).
 * @property {number} xpGained
 * @property {string[]} badges       Achievements unlocked during this run.
 */

/**
 * @typedef {Object} RunSummary
 * @property {number} number
 * @property {string} goalId
 * @property {number} netWorth
 * @property {number} goalPct
 * @property {number} wellbeing
 */

/**
 * @typedef {Object} Profile
 * @property {number} xp
 * @property {Record<string, boolean>} claims
 * @property {Record<string, { run: number }>} achievements
 * @property {Record<string, Evidence[]>} mastery
 * @property {number} explanationsOpened
 * @property {number} labRuns
 * @property {string[]} labSignatures
 * @property {number} runsStarted
 * @property {number} runsCompleted
 * @property {RunSummary[]} pastRuns
 */

/** @typedef {{ profile: Profile, run: Run | null }} GameState */

/**
 * @typedef {{ type: 'tx', tx: Transaction }
 *   | { type: 'xp', amount: number, reason: string }
 *   | { type: 'badge', id: string, name: string, emoji: string }
 *   | { type: 'chapter-complete', chapter: number }
 *   | { type: 'run-complete' }
 *   | { type: 'note', text: string }} GameEvent
 */

/** @typedef {{ ok: true, state: GameState, events: GameEvent[], duplicate?: boolean } | { ok: false, error: string, state: GameState }} Result */

export const OPENING = Object.freeze({ cash: rupees(500), savings: 0, goal: 0, debt: 0 });
export const START_WELLBEING = 60;
const MAX_PAST_RUNS = 5;
const MAX_LAB_SIGNATURES = 30;

/** @returns {Profile} */
export function newProfile() {
  return {
    xp: 0, claims: {}, achievements: {}, mastery: {}, explanationsOpened: 0,
    labRuns: 0, labSignatures: [], runsStarted: 0, runsCompleted: 0, pastRuns: [],
  };
}

/** @returns {GameState} */
export function newGame() {
  return { profile: newProfile(), run: null };
}

/** @param {string | null} id */
export function goalById(id) {
  return GOALS.find((g) => g.id === id) ?? null;
}

/**
 * Build the read-only view content functions see.
 * @param {Profile} profile
 * @param {Run} run
 * @param {Balances} [balances]
 * @returns {View}
 */
export function viewOf(profile, run, balances = balancesOf(run.ledger)) {
  return {
    balances,
    goal: goalById(run.goalId),
    flags: run.flags,
    wellbeing: run.wellbeing,
    mastery: (c) => levelFrom(profile.mastery[c] ?? []),
  };
}

/** @param {Profile} profile @param {string} concept */
export function supportFor(profile, concept) {
  return supportFrom(profile.mastery[concept] ?? []);
}

/**
 * Start a fresh run. Replaces any current run (see restart policy above).
 * @param {GameState} gs
 * @param {{ name?: string, avatar?: string }} character
 * @param {number} [now]
 * @returns {Result}
 */
export function startRun(gs, character = {}, now = Date.now()) {
  const name = String(character.name ?? '').trim().slice(0, 24) || 'You';
  const avatar = String(character.avatar ?? '🧑‍🎓').slice(0, 8);
  const number = gs.profile.runsStarted + 1;
  /** @type {Run} */
  const run = {
    id: `run-${number}-${now.toString(36)}`,
    number, status: 'active', phase: 'intro', character: { name, avatar }, goalId: null,
    ledger: createLedger(OPENING), wellbeing: START_WELLBEING, flags: {},
    chapterIndex: 0, scenarioId: null, visited: [], entryNotes: {}, decisions: [], checks: {},
    evidence: [], xpGained: 0, badges: [],
  };
  return { ok: true, state: { profile: { ...gs.profile, runsStarted: number }, run }, events: [] };
}

/** @param {Run} run */
export function currentScenario(run) {
  return run.scenarioId ? SCENARIO_BY_ID.get(run.scenarioId) ?? null : null;
}

/**
 * Find the next scenario in the chapter whose showIf passes.
 * @param {Profile} profile @param {Run} run @param {number} chapterIndex @param {number} fromPos
 * @returns {Scenario | null}
 */
function nextVisible(profile, run, chapterIndex, fromPos) {
  const ids = CHAPTERS[chapterIndex]?.scenarios ?? [];
  const view = viewOf(profile, run);
  for (let i = fromPos; i < ids.length; i += 1) {
    const s = SCENARIO_BY_ID.get(ids[i]);
    if (!s) continue;
    if (run.visited.includes(s.id)) continue;
    if (s.showIf && !s.showIf(view)) continue;
    return s;
  }
  return null;
}

/**
 * Enter a scenario: apply its entry effects exactly once.
 * @param {Profile} profile @param {Run} run @param {Scenario} s
 * @returns {{ run: Run, events: GameEvent[] }}
 */
function enter(profile, run, s) {
  /** @type {GameEvent[]} */
  const events = [];
  let next = { ...run, scenarioId: s.id, phase: /** @type {Phase} */ ('deciding'), visited: [...run.visited, s.id] };
  if (s.entry && !run.visited.includes(s.id)) {
    const view = viewOf(profile, next);
    const drafts = typeof s.entry.effects === 'function' ? s.entry.effects(view) : s.entry.effects;
    let note = typeof s.entry.note === 'function' ? s.entry.note(view) : s.entry.note;
    for (const d of drafts) {
      // Entry events commit one by one: a recurring charge that can't be paid is skipped
      // (and explained) rather than blocking the income that arrives with it.
      const res = commit(next.ledger, [{ ...d, scenarioId: s.id }]);
      if (res.ok) {
        next = { ...next, ledger: res.ledger };
        for (const tx of res.applied) events.push({ type: 'tx', tx });
      } else {
        note += ` (${d.description} could not be paid: ${res.error.toLowerCase()}, so it was skipped.)`;
      }
    }
    next = { ...next, entryNotes: { ...next.entryNotes, [s.id]: note } };
  }
  return { run: next, events };
}

/**
 * @param {Choice} choice @param {View} view
 * @returns {string}
 */
export function choiceDetail(choice, view) {
  return typeof choice.detail === 'function' ? choice.detail(view) : choice.detail;
}

/**
 * Work out exactly what a choice would do from a given state, without changing anything.
 * Used for availability, previews, decisions and Choice Replay alike.
 * @param {Profile} profile @param {Run} run @param {Scenario} s @param {Choice} c
 * @param {Balances} [balances]
 */
export function evaluateChoice(profile, run, s, c, balances) {
  const ledger = balances ? createLedger(balances) : run.ledger;
  const view = viewOf(profile, run, balances ?? balancesOf(run.ledger));
  if (c.when) {
    const ok = c.when(view);
    if (ok !== true) return /** @type {const} */ ({ available: false, reason: ok });
  }
  const effects = typeof c.effects === 'function' ? c.effects(view) : c.effects ?? [];
  const drafts = effects.map((e) => ({ ...e, scenarioId: s.id, choiceId: c.id }));
  const res = commit(ledger, drafts);
  if (!res.ok) return /** @type {const} */ ({ available: false, reason: affordReason(res.error, drafts, view.balances) });
  const after = balancesOf(res.ledger);
  return /** @type {const} */ ({
    available: true,
    drafts,
    before: view.balances,
    after,
    applied: res.applied,
    ledger: res.ledger,
    // Losses (fraud, scams) are never previewed: uncertainty is part of those lessons.
    concealed: drafts.some((d) => d.type === 'loss'),
  });
}

/**
 * @param {string} error @param {EffectDraft[]} drafts @param {Balances} b
 */
function affordReason(error, drafts, b) {
  if (error.startsWith('Not enough')) {
    const spend = drafts.filter((d) => d.type === 'expense' || d.type === 'repay' || d.type === 'loss').reduce((n, d) => n + d.amount, 0);
    const transfersOut = drafts.filter((d) => d.type === 'transfer' && d.from === 'cash').reduce((n, d) => n + d.amount, 0);
    const need = spend + transfersOut;
    return `Needs ${fmt(need)}; you have ${fmt(b.cash)} in cash`;
  }
  return error;
}

/** @param {number} p */
function fmt(p) {
  return '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * Choices for the current scenario with availability and a transparent preview.
 * @param {GameState} gs
 */
export function presentChoices(gs) {
  const run = gs.run;
  const s = run ? currentScenario(run) : null;
  if (!run || !s) return [];
  const view = viewOf(gs.profile, run);
  return s.choices.map((c) => {
    const ev = evaluateChoice(gs.profile, run, s, c);
    return {
      choice: c,
      detail: choiceDetail(c, view),
      available: ev.available,
      reason: ev.available ? null : ev.reason,
      preview: ev.available && !ev.concealed ? diff(ev.before, ev.after) : null,
    };
  });
}

/**
 * @param {Balances} a @param {Balances} b
 */
export function diff(a, b) {
  return { cash: b.cash - a.cash, savings: b.savings - a.savings, goal: b.goal - a.goal, debt: b.debt - a.debt, assets: totalAssets(b) - totalAssets(a) };
}

/**
 * Resolve a decision. Atomic and idempotent: a second call for the same scenario returns
 * the unchanged state with `duplicate: true`.
 * @param {GameState} gs
 * @param {string} scenarioId
 * @param {string} choiceId
 * @param {{ marked?: string[] }} [extra]
 * @returns {Result}
 */
export function choose(gs, scenarioId, choiceId, extra = {}) {
  const { profile, run } = gs;
  if (!run) return { ok: false, error: 'No active run', state: gs };
  if (run.decisions.some((d) => d.scenarioId === scenarioId)) return { ok: true, state: gs, events: [], duplicate: true };
  if (run.status !== 'active' || run.phase !== 'deciding') return { ok: false, error: 'Not waiting for a decision', state: gs };
  if (run.scenarioId !== scenarioId) return { ok: false, error: 'That scenario is not active', state: gs };
  const s = SCENARIO_BY_ID.get(scenarioId);
  const c = s?.choices.find((x) => x.id === choiceId);
  if (!s || !c) return { ok: false, error: 'Unknown choice', state: gs };

  const ev = evaluateChoice(profile, run, s, c);
  if (!ev.available) return { ok: false, error: ev.reason, state: gs };

  /** @type {GameEvent[]} */
  const events = ev.applied.map((tx) => ({ type: /** @type {const} */ ('tx'), tx }));
  const lossTotal = ev.applied.filter((t) => t.type === 'loss').reduce((n, t) => n + t.amount, 0);

  // Non-money effects.
  /** @type {Record<string, boolean | number | string>} */
  const flags = { ...run.flags, ...(c.setFlags ?? {}) };
  if (c.setFlags?.scammed) flags.scamLossPaise = lossTotal;
  if (c.setFlags?.borrowed) flags.borrowed = true; // never cleared within a run
  const wellbeingDelta = c.wellbeing ?? 0;
  const wellbeing = Math.max(0, Math.min(100, run.wellbeing + wellbeingDelta));

  // Learning evidence.
  /** @type {Evidence[]} */
  const evidence = [];
  /** @type {Decision['inspection']} */
  let inspection;
  if (s.inspect) {
    const marked = Array.isArray(extra.marked) ? extra.marked.filter((m) => s.inspect?.segments.some((seg) => seg.id === m)) : [];
    const g = gradeInspection(s.inspect.segments, marked);
    inspection = { marked, ...g };
    evidence.push({ concept: 'scam_signs', correct: g.correct, source: 'inspection', scenarioId, run: run.number });
  }
  for (const e of c.evidence ?? []) evidence.push({ concept: e.concept, correct: e.correct, source: 'decision', scenarioId, run: run.number });

  let nextRun = {
    ...run,
    ledger: ev.ledger,
    flags,
    wellbeing,
    goalId: c.setGoal ? c.setGoal.id : run.goalId,
    phase: /** @type {Phase} */ ('feedback'),
    evidence: [...run.evidence, ...evidence],
  };
  const afterView = viewOf(profile, nextRun);
  const outcome = typeof c.outcome === 'function' ? c.outcome(afterView) : c.outcome;

  // Rewards: each claim pays once per profile.
  let p = { ...profile, mastery: addEvidence(profile.mastery, evidence) };
  let xp = 0;
  for (const [key, amount] of /** @type {[string, number][]} */ ([[`decide:${scenarioId}`, XP.decide], [`explore:${scenarioId}:${choiceId}`, XP.explore]])) {
    const r = claim(p, key, amount);
    p = r.profile;
    xp += r.gained;
  }

  /** @type {Decision} */
  const decision = {
    scenarioId, choiceId, chapter: s.chapter, seqStart: run.ledger.nextSeq, seqEnd: ev.ledger.nextSeq,
    wellbeingDelta, outcome, xp, ...(inspection ? { inspection } : {}),
  };
  nextRun = { ...nextRun, decisions: [...nextRun.decisions, decision], xpGained: run.xpGained + xp };
  if (xp > 0) events.push({ type: 'xp', amount: xp, reason: 'Decision made' });

  return withAchievements({ profile: p, run: nextRun }, events);
}

/**
 * @param {GameState} gs @param {GameEvent[]} events
 * @returns {Result}
 */
function withAchievements(gs, events) {
  if (!gs.run) return { ok: true, state: gs, events };
  const balances = balancesOf(gs.run.ledger);
  const totals = summarize(gs.run.ledger.transactions);
  const before = gs.profile.xp;
  const { profile, unlocked } = evaluateAchievements({ run: gs.run, profile: gs.profile, balances, totals });
  if (unlocked.length === 0) return { ok: true, state: gs, events };
  const run = { ...gs.run, badges: [...gs.run.badges, ...unlocked.map((a) => a.id)], xpGained: gs.run.xpGained + (profile.xp - before) };
  for (const a of unlocked) events.push({ type: 'badge', id: a.id, name: a.name, emoji: a.emoji });
  if (profile.xp > before) events.push({ type: 'xp', amount: profile.xp - before, reason: 'Achievement' });
  return { ok: true, state: { profile, run }, events };
}

/**
 * Answer the current scenario's knowledge check. One retry is allowed after a wrong answer
 * (the retry counts as evidence of learning but never earns XP).
 * @param {GameState} gs @param {string} scenarioId @param {number} optionIndex
 * @returns {Result}
 */
export function answerCheck(gs, scenarioId, optionIndex) {
  const { run, profile } = gs;
  if (!run || run.phase !== 'feedback' || run.scenarioId !== scenarioId) return { ok: false, error: 'No check is open', state: gs };
  const s = SCENARIO_BY_ID.get(scenarioId);
  if (!s?.check) return { ok: false, error: 'This scenario has no check', state: gs };
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= s.check.options.length) return { ok: false, error: 'Invalid answer', state: gs };
  const prev = run.checks[scenarioId] ?? { attempts: [], correctFirst: false, done: false };
  if (prev.done) return { ok: true, state: gs, events: [], duplicate: true };
  const correct = s.check.options[optionIndex].correct === true;
  const first = prev.attempts.length === 0;
  /** @type {CheckState} */
  const cs = { attempts: [...prev.attempts, optionIndex], correctFirst: first && correct, done: correct || !first };
  /** @type {Evidence} */
  const e = { concept: s.check.concept, correct, source: first ? 'check' : 'retry', scenarioId, run: run.number };
  let p = { ...profile, mastery: addEvidence(profile.mastery, [e]) };
  /** @type {GameEvent[]} */
  const events = [];
  let gained = 0;
  if (first && correct) {
    const r = claim(p, `check:${scenarioId}`, XP.check);
    p = r.profile;
    gained = r.gained;
    if (gained) events.push({ type: 'xp', amount: gained, reason: 'Knowledge check' });
  }
  const nextRun = { ...run, checks: { ...run.checks, [scenarioId]: cs }, evidence: [...run.evidence, e], xpGained: run.xpGained + gained };
  return { ok: true, state: { profile: p, run: nextRun }, events };
}

/**
 * Move the run forward from its current phase.
 * @param {GameState} gs
 * @returns {Result}
 */
export function advance(gs) {
  const { run } = gs;
  let { profile } = gs;
  if (!run) return { ok: false, error: 'No active run', state: gs };
  /** @type {GameEvent[]} */
  const events = [];

  if (run.phase === 'intro') {
    const s = nextVisible(profile, run, run.chapterIndex, 0);
    if (!s) return advance({ profile, run: { ...run, phase: 'chapter-complete' } });
    const entered = enter(profile, run, s);
    return { ok: true, state: { profile, run: entered.run }, events: entered.events };
  }

  if (run.phase === 'feedback') {
    const s = currentScenario(run);
    const ids = CHAPTERS[run.chapterIndex].scenarios;
    const pos = s ? ids.indexOf(s.id) + 1 : ids.length;
    const next = s?.endsRun ? null : nextVisible(profile, run, run.chapterIndex, pos);
    if (next) {
      const entered = enter(profile, run, next);
      return { ok: true, state: { profile, run: entered.run }, events: entered.events };
    }
    // Chapter finished.
    const n = CHAPTERS[run.chapterIndex].n;
    const r = claim(profile, `chapter:${n}`, XP.chapter);
    profile = r.profile;
    events.push({ type: 'chapter-complete', chapter: n });
    if (r.gained) events.push({ type: 'xp', amount: r.gained, reason: `Chapter ${n} complete` });
    const isLast = run.chapterIndex >= CHAPTERS.length - 1 || s?.endsRun === true;
    if (isLast) return completeRun({ profile, run: { ...run, xpGained: run.xpGained + r.gained } }, events);
    return withAchievements({ profile, run: { ...run, phase: 'chapter-complete', scenarioId: null, xpGained: run.xpGained + r.gained } }, events);
  }

  if (run.phase === 'chapter-complete') {
    return { ok: true, state: { profile, run: { ...run, chapterIndex: run.chapterIndex + 1, phase: 'intro', scenarioId: null } }, events };
  }

  if (run.phase === 'deciding') return { ok: false, error: 'Make a choice first', state: gs };
  return { ok: false, error: 'This run is complete', state: gs };
}

/**
 * @param {GameState} gs @param {GameEvent[]} events
 * @returns {Result}
 */
function completeRun(gs, events) {
  const run = /** @type {Run} */ (gs.run);
  let profile = gs.profile;
  const r = claim(profile, 'run:first', XP.runFirst);
  profile = r.profile;
  if (r.gained) events.push({ type: 'xp', amount: r.gained, reason: 'First full run' });
  const b = balancesOf(run.ledger);
  const goal = goalById(run.goalId);
  /** @type {RunSummary} */
  const summary = {
    number: run.number, goalId: run.goalId ?? '',
    netWorth: totalAssets(b) - b.debt,
    goalPct: run.flags.goalBought ? 100 : goal ? Math.min(100, Math.round((b.goal / goal.cost) * 100)) : 0,
    wellbeing: run.wellbeing,
  };
  profile = { ...profile, runsCompleted: profile.runsCompleted + 1, pastRuns: [...profile.pastRuns, summary].slice(-MAX_PAST_RUNS) };
  const done = { ...run, status: /** @type {const} */ ('complete'), phase: /** @type {Phase} */ ('complete'), scenarioId: null, xpGained: run.xpGained + r.gained };
  events.push({ type: 'run-complete' });
  return withAchievements({ profile, run: done }, events);
}

/**
 * Count an opened deeper explanation (for the Curious Mind badge). Not mastery evidence.
 * @param {GameState} gs
 * @returns {Result}
 */
export function recordExplanation(gs) {
  const profile = { ...gs.profile, explanationsOpened: Math.min(gs.profile.explanationsOpened + 1, 9999) };
  return gs.run ? withAchievements({ profile, run: gs.run }, []) : { ok: true, state: { ...gs, profile }, events: [] };
}

/**
 * Count a distinct Future Lab experiment. Repeating the same settings counts once.
 * @param {GameState} gs @param {string} signature
 * @returns {Result}
 */
export function recordLabRun(gs, signature) {
  if (gs.profile.labSignatures.includes(signature)) return { ok: true, state: gs, events: [], duplicate: true };
  const profile = {
    ...gs.profile,
    labRuns: gs.profile.labRuns + 1,
    labSignatures: [...gs.profile.labSignatures, signature].slice(-MAX_LAB_SIGNATURES),
  };
  return gs.run ? withAchievements({ profile, run: gs.run }, []) : { ok: true, state: { ...gs, profile }, events: [] };
}

/** Progress through the run for the progress bar: chapters done out of six. */
/** @param {Run} run */
export function runProgress(run) {
  const done = run.status === 'complete' ? CHAPTERS.length : run.chapterIndex + (run.phase === 'chapter-complete' ? 1 : 0);
  return { done, total: CHAPTERS.length };
}
