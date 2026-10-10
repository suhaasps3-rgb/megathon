// @ts-check
/**
 * Local persistence for Life Mode (this app has no backend or accounts).
 *
 * Stored under one key as { version, profile, run }. On load everything is validated:
 *   - wrong/missing version   → start fresh, with a notice
 *   - invalid profile         → start fresh, with a notice
 *   - invalid run (bad ledger, unknown scenario, inconsistent decisions) → keep the profile,
 *     drop the run, with a notice
 * Only real game state is ever saved; Choice Replay results are never part of it.
 * No personal data is stored: just a nickname, an emoji avatar and game progress.
 */
import { auditLedger } from '../domain/ledger.js';
import { newGame, newProfile } from '../domain/game.js';
import { SCENARIO_BY_ID, GOALS, CHAPTERS } from '../content/scenarios.js';

export const STORAGE_KEY = 'paisapath.lifeMode';
export const SAVE_VERSION = 1;

/** @typedef {import('../domain/game.js').GameState} GameState */
/** @typedef {{ getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void }} KV */

/** @returns {KV | null} */
function defaultStore() {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null; // storage blocked (private mode, sandboxed iframe)
  }
}

/** @param {unknown} v */
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** @param {unknown} v */
const isInt = (v) => Number.isSafeInteger(v);

/**
 * @param {unknown} p
 * @returns {p is import('../domain/game.js').Profile}
 */
export function isValidProfile(p) {
  if (!isObj(p)) return false;
  const o = /** @type {Record<string, unknown>} */ (p);
  return isInt(o.xp) && /** @type {number} */ (o.xp) >= 0
    && isObj(o.claims) && isObj(o.achievements) && isObj(o.mastery)
    && Object.values(/** @type {object} */ (o.mastery)).every((l) => Array.isArray(l) && l.every((e) => isObj(e) && typeof e.concept === 'string' && typeof e.correct === 'boolean'))
    && isInt(o.explanationsOpened) && isInt(o.labRuns) && Array.isArray(o.labSignatures)
    && isInt(o.runsStarted) && isInt(o.runsCompleted) && Array.isArray(o.pastRuns);
}

/**
 * @param {unknown} r
 * @returns {string[]} problems
 */
export function validateRun(r) {
  if (!isObj(r)) return ['Run is malformed'];
  const run = /** @type {Record<string, any>} */ (r);
  /** @type {string[]} */
  const problems = [];
  if (typeof run.id !== 'string' || !isInt(run.number)) problems.push('Run id is invalid');
  if (!['active', 'complete'].includes(run.status)) problems.push('Run status is invalid');
  if (!['intro', 'deciding', 'feedback', 'chapter-complete', 'complete'].includes(run.phase)) problems.push('Run phase is invalid');
  if (!isObj(run.character) || typeof run.character.name !== 'string') problems.push('Character is invalid');
  if (run.goalId !== null && !GOALS.some((g) => g.id === run.goalId)) problems.push('Unknown goal');
  if (!isInt(run.wellbeing) || run.wellbeing < 0 || run.wellbeing > 100) problems.push('Wellbeing is invalid');
  if (!isInt(run.chapterIndex) || run.chapterIndex < 0 || run.chapterIndex >= CHAPTERS.length) problems.push('Chapter is invalid');
  if (run.scenarioId !== null && !SCENARIO_BY_ID.has(run.scenarioId)) problems.push('Unknown scenario');
  if ((run.phase === 'deciding' || run.phase === 'feedback') && run.scenarioId === null) problems.push('Missing scenario');
  if (!isObj(run.flags) || !isObj(run.checks) || !isObj(run.entryNotes)) problems.push('Run state is malformed');
  if (!Array.isArray(run.visited) || !Array.isArray(run.decisions) || !Array.isArray(run.evidence) || !Array.isArray(run.badges)) problems.push('Run lists are malformed');
  if (problems.length) return problems;
  problems.push(...auditLedger(run.ledger));
  const seen = new Set();
  for (const d of run.decisions) {
    const s = isObj(d) ? SCENARIO_BY_ID.get(d.scenarioId) : undefined;
    if (!s || !s.choices.some((c) => c.id === d.choiceId)) { problems.push('Decision refers to unknown content'); break; }
    if (seen.has(d.scenarioId)) { problems.push('Duplicate decision'); break; }
    seen.add(d.scenarioId);
    if (!isInt(d.seqStart) || !isInt(d.seqEnd) || d.seqEnd < d.seqStart || d.seqEnd > run.ledger.nextSeq) { problems.push('Decision ledger range is invalid'); break; }
    if (!isObj(d.outcome) || typeof d.outcome.title !== 'string') { problems.push('Decision outcome is invalid'); break; }
  }
  if (run.phase === 'deciding' && seen.has(run.scenarioId)) problems.push('Pending decision already resolved');
  if (run.phase === 'feedback' && !seen.has(run.scenarioId)) problems.push('Feedback without a decision');
  return problems;
}

/**
 * @param {KV | null} [store]
 * @returns {{ state: GameState, notice: string | null }}
 */
export function loadGame(store = defaultStore()) {
  if (!store) return { state: newGame(), notice: 'Progress can’t be saved in this browser, so it will reset when you leave.' };
  let raw;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { state: newGame(), notice: 'Saved progress couldn’t be read, so you’re starting fresh.' };
  }
  if (!raw) return { state: newGame(), notice: null };
  /** @type {any} */
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { state: newGame(), notice: 'Your saved game was damaged, so a new one was started.' };
  }
  if (!isObj(data) || data.version !== SAVE_VERSION) {
    return { state: newGame(), notice: 'Your saved game was from an older version, so a new one was started.' };
  }
  if (!isValidProfile(data.profile)) return { state: newGame(), notice: 'Your saved progress was damaged, so a new one was started.' };
  const profile = { ...newProfile(), ...data.profile };
  if (data.run === null || data.run === undefined) return { state: { profile, run: null }, notice: null };
  const problems = validateRun(data.run);
  if (problems.length) {
    return { state: { profile, run: null }, notice: 'Your last run couldn’t be restored safely, so it was cleared. Your XP and badges are kept.' };
  }
  return { state: { profile, run: data.run }, notice: null };
}

/**
 * @param {GameState} state
 * @param {KV | null} [store]
 * @returns {boolean} whether the save succeeded
 */
export function saveGame(state, store = defaultStore()) {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: SAVE_VERSION, profile: state.profile, run: state.run }));
    return true;
  } catch {
    return false; // quota or blocked storage; the UI shows a notice
  }
}

/** Erase everything, including XP and badges. @param {KV | null} [store] */
export function clearSave(store = defaultStore()) {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
