// @ts-check
/**
 * Local save for the story ("A Week in Your Life"). One versioned key, validated on load:
 * a bad profile starts fresh; a bad run (broken ledger, unknown events, impossible day)
 * keeps the profile and drops the run. Settings are saved separately (see settings key).
 * Only a nickname, a look, an interest and game progress are stored.
 */
import { auditLedger } from '../domain/ledger.js';
import { newStoryState, newProfile } from './engine.js';
import { EVENT_BY_ID, INTERESTS, LOCATIONS, LAST_DAY } from './content.js';

export const STORY_KEY = 'paisapath.story';
export const STORY_VERSION = 1;

/** @typedef {import('./engine.js').StoryState} StoryState */
/** @typedef {{ getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void }} KV */

/** @returns {KV | null} */
function defaultStore() {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** @param {unknown} v */
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** @param {unknown} v */
const isInt = (v) => Number.isSafeInteger(v);

/** @param {unknown} p */
export function isValidProfile(p) {
  if (!isObj(p)) return false;
  const o = /** @type {Record<string, any>} */ (p);
  return isInt(o.aura) && o.aura >= 0 && isObj(o.claims) && Array.isArray(o.memories) && Array.isArray(o.endings)
    && isInt(o.weeksStarted) && isInt(o.weeksCompleted) && isObj(o.mastery) && typeof o.seasonUnlocked === 'boolean';
}

/** @param {unknown} r @returns {string[]} */
export function validateRun(r) {
  if (!isObj(r)) return ['Run is malformed'];
  const run = /** @type {Record<string, any>} */ (r);
  /** @type {string[]} */
  const problems = [];
  if (typeof run.id !== 'string' || !isInt(run.number)) problems.push('Run id is invalid');
  if (!['playing', 'ended'].includes(run.status)) problems.push('Status is invalid');
  if (!isInt(run.day) || run.day < 0 || run.day > LAST_DAY) problems.push('Day is invalid');
  if (!Object.hasOwn(LOCATIONS, run.location)) problems.push('Location is invalid');
  if (!isObj(run.player) || !Object.hasOwn(INTERESTS, run.player.interest) || !isObj(run.player.look)) problems.push('Player is invalid');
  if (!isObj(run.flags) || !isObj(run.done) || !isObj(run.checks) || !isObj(run.snapshots)) problems.push('Run state is malformed');
  if (!Array.isArray(run.order) || !Array.isArray(run.read) || !Array.isArray(run.memories) || !Array.isArray(run.evidence)) problems.push('Run lists are malformed');
  if (!isInt(run.mood) || run.mood < 0 || run.mood > 100) problems.push('Mood is invalid');
  if (problems.length) return problems;
  problems.push(...auditLedger(run.ledger));
  for (const id of Object.keys(run.done)) {
    const e = EVENT_BY_ID.get(id);
    const d = run.done[id];
    if (!e || !isObj(d) || !e.choices.some((c) => c.id === d.choiceId)) { problems.push('Unknown event in history'); break; }
    if (!isInt(d.seqStart) || !isInt(d.seqEnd) || d.seqEnd < d.seqStart || d.seqEnd > run.ledger.nextSeq) { problems.push('Event ledger range is invalid'); break; }
  }
  if (run.order.length !== Object.keys(run.done).length || run.order.some((/** @type {unknown} */ id) => typeof id !== 'string' || !run.done[id])) problems.push('History order is inconsistent');
  for (const s of Object.values(run.snapshots)) {
    if (!isObj(s) || auditLedger(/** @type {any} */ (s).ledger).length) { problems.push('Snapshot is invalid'); break; }
  }
  return problems;
}

/**
 * @param {KV | null} [store]
 * @returns {{ state: StoryState, notice: string | null }}
 */
export function loadStory(store = defaultStore()) {
  if (!store) return { state: newStoryState(), notice: null };
  let raw;
  try { raw = store.getItem(STORY_KEY); } catch { return { state: newStoryState(), notice: null }; }
  if (!raw) return { state: newStoryState(), notice: null };
  /** @type {any} */
  let data;
  try { data = JSON.parse(raw); } catch { return { state: newStoryState(), notice: 'save.corrupt' }; }
  if (!isObj(data) || data.version !== STORY_VERSION || !isValidProfile(data.profile)) {
    return { state: { profile: newProfile(), run: null }, notice: 'save.corrupt' };
  }
  if (data.run === null) return { state: { profile: data.profile, run: null }, notice: null };
  if (validateRun(data.run).length) return { state: { profile: data.profile, run: null }, notice: 'save.runReset' };
  return { state: { profile: data.profile, run: data.run }, notice: null };
}

/**
 * @param {StoryState} gs @param {KV | null} [store]
 * @returns {boolean} false if it couldn't be saved
 */
export function saveStory(gs, store = defaultStore()) {
  if (!store) return false;
  try {
    store.setItem(STORY_KEY, JSON.stringify({ version: STORY_VERSION, profile: gs.profile, run: gs.run }));
    return true;
  } catch {
    return false;
  }
}

/** @param {KV | null} [store] */
export function clearStory(store = defaultStore()) {
  try { store?.removeItem(STORY_KEY); } catch { /* ignore */ }
}
