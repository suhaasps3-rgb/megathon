// @ts-check
/**
 * Learning domain: mastery from evidence, and the adaptive-support rules built on it.
 *
 * Evidence is recorded only from things that show understanding: answers to knowledge
 * checks, scam inspections, and specific decisions content marks as applying a concept.
 * Opening explanations or clicking through never creates evidence. XP lives elsewhere.
 *
 * Rules (deterministic, documented in one place):
 *   level  'new'        no evidence yet
 *          'confident'  ≥ 2 correct overall AND the last two pieces of evidence are correct
 *          'practicing' the latest evidence is correct
 *          'learning'   the latest evidence is incorrect
 *   support 'extra'     latest evidence incorrect → show a simpler worked example first
 *           'brief'     confident → collapse explanations (still one tap away)
 *           'standard'  otherwise
 * One wrong answer only changes the kind of help shown; it never labels the player.
 */

/** @typedef {'new' | 'learning' | 'practicing' | 'confident'} MasteryLevel */
/** @typedef {'extra' | 'standard' | 'brief'} SupportLevel */
/** @typedef {'check' | 'retry' | 'decision' | 'inspection'} EvidenceSource */

/**
 * @typedef {Object} Evidence
 * @property {string} concept
 * @property {boolean} correct
 * @property {EvidenceSource} source
 * @property {string} scenarioId
 * @property {number} run  Run number the evidence came from.
 */

/** Keep only the most recent evidence per concept so saves stay bounded. */
export const MAX_EVIDENCE_PER_CONCEPT = 12;

/**
 * @param {Evidence[]} list Evidence for one concept, oldest first.
 * @returns {MasteryLevel}
 */
export function levelFrom(list) {
  if (!list || list.length === 0) return 'new';
  const last = list[list.length - 1];
  if (!last.correct) return 'learning';
  const correct = list.filter((e) => e.correct).length;
  const prev = list[list.length - 2];
  if (correct >= 2 && prev && prev.correct) return 'confident';
  return 'practicing';
}

/**
 * @param {Evidence[]} list
 * @returns {SupportLevel}
 */
export function supportFrom(list) {
  if (!list || list.length === 0) return 'standard';
  if (!list[list.length - 1].correct) return 'extra';
  return levelFrom(list) === 'confident' ? 'brief' : 'standard';
}

/**
 * Pure append with bound.
 * @param {Record<string, Evidence[]>} mastery
 * @param {Evidence[]} items
 * @returns {Record<string, Evidence[]>}
 */
export function addEvidence(mastery, items) {
  if (items.length === 0) return mastery;
  const next = { ...mastery };
  for (const e of items) {
    const list = [...(next[e.concept] ?? []), e];
    next[e.concept] = list.slice(-MAX_EVIDENCE_PER_CONCEPT);
  }
  return next;
}

/** Numeric value for progress bars: new 0, learning 1, practicing 2, confident 3. */
export const LEVEL_RANK = /** @type {const} */ ({ new: 0, learning: 1, practicing: 2, confident: 3 });

export const LEVEL_LABEL = /** @type {const} */ ({
  new: 'Not seen yet',
  learning: 'Learning',
  practicing: 'Practising',
  confident: 'Confident',
});

/**
 * Grade a scam inspection: correct when the player found at least three-quarters of the
 * real warning signs and marked at most one harmless detail.
 * @param {{ id: string, flag: boolean }[]} segments
 * @param {string[]} marked
 */
export function gradeInspection(segments, marked) {
  const set = new Set(marked);
  const flags = segments.filter((s) => s.flag);
  const found = flags.filter((s) => set.has(s.id)).length;
  const falsePositives = segments.filter((s) => !s.flag && set.has(s.id)).length;
  const correct = found >= Math.ceil(flags.length * 0.75) && falsePositives <= 1;
  return { found, total: flags.length, falsePositives, correct };
}
