// @ts-check
/**
 * Story engine for "A Week in Your Life". Pure functions over one authoritative StoryState:
 * every action takes the state and returns a new one (or an error with the state untouched).
 *
 * Money: the run owns a Life Mode ledger (`domain/ledger.js`). Every rupee that moves is a
 * validated, atomic ledger commit, so balances are always folded from history, transfers
 * never count as spending, and no account can go negative. Nothing here (and no AI) sets a
 * balance directly.
 *
 * Flow: a week has six days (Mon … Weekend). Each day has an ordered list of events; the
 * first unfinished one whose condition holds is "current". When none are left, endDay()
 * moves on. A snapshot of the run is kept at the start of each day so the player can rewind
 * and explore another path; the profile (memories, Aura, endings found) is kept across
 * rewinds and new weeks, and rewards are once-only claims so they can't be farmed.
 */
import { createLedger, commit, balancesOf, summarize } from '../domain/ledger.js';
import { addEvidence, gradeInspection, levelFrom } from '../domain/learning.js';
import {
  EVENTS, EVENT_BY_ID, MESSAGES, OPENING, POCKET_MONEY, RECHARGE, GOAL_COST, LAST_DAY,
  LOCATIONS, INTERESTS, PILLARS,
} from './content.js';

/** @typedef {import('../domain/ledger.js').Ledger} Ledger */
/** @typedef {import('../domain/ledger.js').Balances} Balances */
/** @typedef {import('../domain/learning.js').Evidence} Evidence */
/** @typedef {import('./content.js').StoryEvent} StoryEvent */
/** @typedef {import('./content.js').StoryView} StoryView */
/** @typedef {import('./content.js').Choice} Choice */
/** @typedef {import('./content.js').Line} Line */
/** @typedef {import('./content.js').Draft} Draft */
/** @typedef {import('./content.js').InterestId} InterestId */
/** @typedef {import('./content.js').LocationId} LocationId */

/**
 * @typedef {Object} Player
 * @property {string} name
 * @property {{ skin: number, hair: number, outfit: number }} look
 * @property {InterestId} interest
 */

/**
 * A finished event, frozen at decision time so the story review shows what really happened.
 * @typedef {Object} Done
 * @property {string} choiceId
 * @property {number} day
 * @property {number} seqStart
 * @property {number} seqEnd
 * @property {Line[]} outcome
 * @property {string} [lesson]
 * @property {Record<string, number>} params   Balances right after, for the outcome text.
 * @property {{ goal: number, savings: number }} [plan]
 * @property {{ marked: string[], found: number, total: number, falsePositives: number, correct: boolean }} [inspection]
 */

/**
 * @typedef {Object} Ending
 * @property {'goal' | 'close' | 'delayed'} id
 * @property {boolean} goalBought
 * @property {number} shortfall   Paise still needed for the goal (0 if bought).
 * @property {number} weeksToGoal
 * @property {string[]} traits
 */

/**
 * @typedef {Object} Run
 * @property {string} id
 * @property {number} number
 * @property {Player} player
 * @property {'playing' | 'ended'} status
 * @property {number} day
 * @property {LocationId} location
 * @property {Ledger} ledger
 * @property {Record<string, boolean | number | string>} flags
 * @property {number} mood
 * @property {Record<string, Done>} done
 * @property {string[]} order          Event ids in the order they were finished.
 * @property {Record<string, { answer: number, correct: boolean }>} checks
 * @property {string[]} read           Message ids opened.
 * @property {string[]} memories       Memories collected this week.
 * @property {Evidence[]} evidence
 * @property {number} rewinds
 * @property {Record<string, Omit<Run, 'snapshots'>>} snapshots  Day index → run at the start of that day.
 * @property {Ending | null} ending
 */

/**
 * @typedef {Object} Profile
 * @property {number} aura
 * @property {Record<string, boolean>} claims
 * @property {string[]} memories      Every memory ever collected.
 * @property {string[]} endings       Ending ids discovered.
 * @property {number} weeksStarted
 * @property {number} weeksCompleted
 * @property {Record<string, Evidence[]>} mastery
 * @property {boolean} seasonUnlocked  Finishing a week unlocks the six-chapter Life Mode month.
 */

/** @typedef {{ profile: Profile, run: Run | null }} StoryState */

/**
 * @typedef {{ type: 'tx', tx: import('../domain/ledger.js').Transaction }
 *   | { type: 'aura', amount: number }
 *   | { type: 'memory', id: string }
 *   | { type: 'day', day: number }
 *   | { type: 'unlock', location: LocationId }
 *   | { type: 'week-complete' }} StoryEvt
 */

/** @typedef {{ ok: true, state: StoryState, events: StoryEvt[], duplicate?: boolean } | { ok: false, error: string, state: StoryState }} Result */

export const START_MOOD = 60;

/** Aura per claim kind. Each claim key pays once per profile, ever. */
const AURA = /** @type {Record<string, number>} */ ({ day: 10, week: 50, memory: 15, safe: 20, explore: 5, recover: 15, check: 10 });

/** @returns {Profile} */
export function newProfile() {
  return { aura: 0, claims: {}, memories: [], endings: [], weeksStarted: 0, weeksCompleted: 0, mastery: {}, seasonUnlocked: false };
}

/** @returns {StoryState} */
export function newStoryState() {
  return { profile: newProfile(), run: null };
}

/**
 * @param {Profile} p @param {string} key
 * @returns {{ profile: Profile, gained: number }}
 */
export function claimAura(p, key) {
  if (p.claims[key]) return { profile: p, gained: 0 };
  const amount = AURA[key.split(':')[0]] ?? 0;
  return { profile: { ...p, aura: p.aura + amount, claims: { ...p.claims, [key]: true } }, gained: amount };
}

/** @param {Run} run @returns {StoryView} */
export function viewOf(run, balances = balancesOf(run.ledger)) {
  /** @type {Record<string, string>} */
  const chosen = {};
  for (const [id, d] of Object.entries(run.done)) chosen[id] = d.choiceId;
  return { balances, flags: run.flags, interest: run.player.interest, chosen };
}

/** @param {Run} run */
export function balances(run) {
  return balancesOf(run.ledger);
}

/** Goal progress 0–100 (100 once the goal was bought). @param {Run} run */
export function goalPct(run) {
  if (run.flags.goalBought) return 100;
  return Math.min(100, Math.round((balancesOf(run.ledger).goal / GOAL_COST) * 100));
}

/**
 * Normalise what the title screen sends. Unknown values fall back to defaults, so setup
 * can always be skipped.
 * @param {Partial<Player> & { look?: Partial<Player['look']> }} [p]
 * @returns {Player}
 */
export function normalisePlayer(p = {}) {
  const look = /** @type {Partial<Player['look']>} */ (p.look ?? {});
  const pick = (/** @type {unknown} */ v, /** @type {number} */ max) => (Number.isInteger(v) && /** @type {number} */ (v) >= 0 && /** @type {number} */ (v) < max ? /** @type {number} */ (v) : 0);
  const interest = /** @type {InterestId} */ (p.interest && Object.hasOwn(INTERESTS, p.interest) ? p.interest : 'music');
  return {
    name: String(p.name ?? '').trim().slice(0, 20),
    look: { skin: pick(look.skin, 4), hair: pick(look.hair, 4), outfit: pick(look.outfit, 4) },
    interest,
  };
}

/**
 * Apply a day's automatic money events once. Only Monday has any: pocket money arrives and
 * the phone recharge goes out on AutoPay (a planned need, shown on the calendar).
 * @param {Run} run
 * @returns {{ run: Run, events: StoryEvt[] }}
 */
function enterDay(run) {
  if (run.day !== 0 || run.ledger.transactions.length > 0) return { run, events: [] };
  const res = commit(run.ledger, [
    { type: 'income', to: 'cash', amount: POCKET_MONEY, description: 'tx.pocketMoney' },
    { type: 'expense', from: 'cash', amount: RECHARGE, category: 'need', description: 'tx.recharge' },
  ]);
  if (!res.ok) return { run, events: [] };
  return { run: { ...run, ledger: res.ledger }, events: res.applied.map((tx) => ({ type: /** @type {const} */ ('tx'), tx })) };
}

/** @param {Run} run @returns {Omit<Run, 'snapshots'>} */
function snap(run) {
  const { snapshots: _ignored, ...rest } = run;
  return rest;
}

/**
 * Start a new week. Replaces any current run; the profile is kept.
 * @param {StoryState} gs
 * @param {Partial<Player>} [player]
 * @param {number} [now]
 * @returns {Result}
 */
export function beginWeek(gs, player, now = Date.now()) {
  const number = gs.profile.weeksStarted + 1;
  /** @type {Run} */
  let run = {
    id: `week-${number}-${now.toString(36)}`,
    number, player: normalisePlayer(player), status: 'playing', day: 0, location: 'home',
    ledger: createLedger(OPENING), flags: {}, mood: START_MOOD, done: {}, order: [], checks: {},
    read: [], memories: [], evidence: [], rewinds: 0, snapshots: {}, ending: null,
  };
  const entered = enterDay(run);
  run = entered.run;
  run = { ...run, snapshots: { 0: snap(run) } };
  return { ok: true, state: { profile: { ...gs.profile, weeksStarted: number }, run }, events: entered.events };
}

/**
 * Events of a day in story order. Finished ones stay listed; unfinished ones appear only
 * while their condition holds.
 * @param {Run} run @param {number} [day]
 * @returns {StoryEvent[]}
 */
export function dayEvents(run, day = run.day) {
  const v = viewOf(run);
  return EVENTS.filter((e) => e.day === day && (run.done[e.id] || !e.showIf || e.showIf(v)));
}

/** The event the story is waiting on, or null when the day is finished. @param {Run} run */
export function currentEvent(run) {
  if (run.status !== 'playing') return null;
  return dayEvents(run).find((e) => !run.done[e.id]) ?? null;
}

/** @param {Run} run @param {LocationId} loc */
export function isUnlocked(run, loc) {
  return run.day >= LOCATIONS[loc].unlockDay;
}

/**
 * Turn the player's jar amounts into ledger drafts for Monday's plan.
 * @param {Balances} b @param {{ goal?: number, savings?: number }} plan
 * @returns {{ ok: true, drafts: Draft[], plan: { goal: number, savings: number } } | { ok: false, error: string }}
 */
export function planDrafts(b, plan) {
  const goal = plan.goal ?? 0;
  const savings = plan.savings ?? 0;
  if (!Number.isSafeInteger(goal) || !Number.isSafeInteger(savings) || goal < 0 || savings < 0) return { ok: false, error: 'Jar amounts must be whole, non-negative amounts' };
  if (goal + savings > b.cash) return { ok: false, error: 'You can only move money you have' };
  /** @type {Draft[]} */
  const drafts = [];
  if (goal > 0) drafts.push({ type: 'transfer', from: 'cash', to: 'goal', amount: goal, description: 'tx.toGoal' });
  if (savings > 0) drafts.push({ type: 'transfer', from: 'cash', to: 'savings', amount: savings, description: 'tx.toSafety' });
  return { ok: true, drafts, plan: { goal, savings } };
}

/**
 * Work out what a choice would do right now, without changing anything.
 * @param {Run} run @param {StoryEvent} e @param {Choice} c
 * @param {{ goal?: number, savings?: number }} [plan]
 */
export function evaluate(run, e, c, plan) {
  const view = viewOf(run);
  if (c.when) {
    const ok = c.when(view);
    if (ok !== true) return /** @type {const} */ ({ available: false, reason: ok });
  }
  /** @type {Draft[]} */
  let drafts;
  if (e.kind === 'budget') {
    const p = planDrafts(view.balances, plan ?? {});
    if (!p.ok) return /** @type {const} */ ({ available: false, reason: p.error });
    drafts = p.drafts;
  } else {
    drafts = c.effects ? c.effects(view) : [];
  }
  const tagged = drafts.map((d) => ({ ...d, scenarioId: e.id, choiceId: c.id }));
  const res = commit(run.ledger, tagged);
  if (!res.ok) return /** @type {const} */ ({ available: false, reason: 'why.notEnoughAtAll' });
  const after = balancesOf(res.ledger);
  const before = view.balances;
  return /** @type {const} */ ({
    available: true,
    ledger: res.ledger,
    applied: res.applied,
    before,
    after,
    // Scam losses are never previewed: not knowing is part of that lesson.
    concealed: drafts.some((d) => d.type === 'loss'),
    delta: { cash: after.cash - before.cash, savings: after.savings - before.savings, goal: after.goal - before.goal, debt: after.debt - before.debt },
  });
}

/**
 * Choices for an event with availability and a transparent money preview.
 * @param {Run} run @param {string} eventId
 */
export function presentChoices(run, eventId) {
  const e = EVENT_BY_ID.get(eventId);
  if (!e) return [];
  return e.choices.map((c) => {
    const ev = evaluate(run, e, c, { goal: 0, savings: 0 });
    return {
      choice: c,
      available: ev.available,
      reason: ev.available ? null : ev.reason,
      delta: ev.available && !ev.concealed ? ev.delta : null,
    };
  });
}

/**
 * Outcome lines for Monday's plan depend on its shape.
 * @param {{ goal: number, savings: number }} p @returns {Line[]}
 */
function planOutcome(p) {
  /** @type {Line[]} */
  const lines = [];
  if (p.goal === 0 && p.savings === 0) lines.push({ who: 'akka', key: 'mon_plan.o.none', mood: 'worried' });
  else if (p.savings === 0) lines.push({ who: 'akka', key: 'mon_plan.o.noSafety', mood: 'neutral' });
  else if (p.goal === 0) lines.push({ who: 'akka', key: 'mon_plan.o.noGoal', mood: 'neutral' });
  else lines.push({ who: 'akka', key: 'mon_plan.o.balanced', mood: 'happy' });
  lines.push({ who: 'narrator', key: 'mon_plan.o.summary' });
  return lines;
}

/**
 * Resolve a decision. Atomic and idempotent: repeating it returns the same state.
 * @param {StoryState} gs
 * @param {string} eventId
 * @param {string} choiceId
 * @param {{ goal?: number, savings?: number, marked?: string[] }} [extra]
 * @returns {Result}
 */
export function choose(gs, eventId, choiceId, extra = {}) {
  const { run } = gs;
  let { profile } = gs;
  if (!run) return { ok: false, error: 'No week in progress', state: gs };
  if (run.done[eventId]) return { ok: true, state: gs, events: [], duplicate: true };
  const e = currentEvent(run);
  if (!e || e.id !== eventId) return { ok: false, error: 'That event isn’t happening right now', state: gs };
  if (e.location !== run.location && e.hotspot !== 'phone') return { ok: false, error: 'You need to be there first', state: gs };
  const c = e.choices.find((x) => x.id === choiceId);
  if (!c) return { ok: false, error: 'Unknown choice', state: gs };

  const ev = evaluate(run, e, c, extra);
  if (!ev.available) return { ok: false, error: ev.reason, state: gs };

  /** @type {StoryEvt[]} */
  const events = ev.applied.map((tx) => ({ type: /** @type {const} */ ('tx'), tx }));
  const flags = { ...run.flags, ...(c.flags ?? {}) };
  /** @type {Evidence[]} */
  const evidence = (c.evidence ?? []).map((x) => ({ ...x, source: /** @type {const} */ ('decision'), scenarioId: e.id, run: run.number }));
  const memories = [];
  if (c.memory) memories.push(c.memory);
  /** @type {string[]} */
  const auraKeys = [`explore:${e.id}:${c.id}`];
  if (c.aura) auraKeys.push(c.aura);

  /** @type {Done['plan']} */
  let plan;
  /** @type {Line[]} */
  let outcome = c.outcome;
  if (e.kind === 'budget') {
    const p = planDrafts(ev.before, extra);
    plan = p.ok ? p.plan : { goal: 0, savings: 0 };
    outcome = planOutcome(plan);
    evidence.push({ concept: 'budgeting', correct: plan.goal > 0 || plan.savings > 0, source: 'decision', scenarioId: e.id, run: run.number });
    memories.push('first_plan');
  }

  /** @type {Done['inspection']} */
  let inspection;
  if (e.segments) {
    const marked = Array.isArray(extra.marked) ? extra.marked.filter((m) => e.segments?.some((s) => s.id === m)) : [];
    const g = gradeInspection(e.segments, marked);
    inspection = { marked, ...g };
    evidence.push({ concept: 'scam_signs', correct: g.correct, source: 'inspection', scenarioId: e.id, run: run.number });
    if (g.correct) {
      flags.scamSpotted = true;
      memories.push('scam_radar');
    }
  }

  for (const m of memories) {
    auraKeys.push(`memory:${m}`);
    events.push({ type: 'memory', id: m });
  }
  for (const k of auraKeys) {
    const r = claimAura(profile, k);
    profile = r.profile;
    if (r.gained) events.push({ type: 'aura', amount: r.gained });
  }
  profile = {
    ...profile,
    mastery: addEvidence(profile.mastery, evidence),
    memories: [...profile.memories, ...memories.filter((m) => !profile.memories.includes(m))],
  };

  const after = ev.after;
  /** @type {Done} */
  const done = {
    choiceId, day: run.day, seqStart: run.ledger.nextSeq, seqEnd: ev.ledger.nextSeq, outcome,
    params: { cash: after.cash, savings: after.savings, goal: after.goal, debt: after.debt, left: Math.max(0, GOAL_COST - after.goal) },
    ...(c.lesson ? { lesson: c.lesson } : {}),
    ...(plan ? { plan } : {}),
    ...(inspection ? { inspection } : {}),
  };
  const next = {
    ...run,
    ledger: ev.ledger,
    flags,
    mood: Math.max(0, Math.min(100, run.mood + (c.mood ?? 0))),
    done: { ...run.done, [e.id]: done },
    order: [...run.order, e.id],
    memories: [...run.memories, ...memories.filter((m) => !run.memories.includes(m))],
    evidence: [...run.evidence, ...evidence],
  };
  return { ok: true, state: { profile, run: next }, events };
}

/**
 * Optional "quick question" after an event. One answer counts; it never blocks the story.
 * @param {StoryState} gs @param {string} eventId @param {number} answer
 * @returns {Result}
 */
export function answerCheck(gs, eventId, answer) {
  const { run } = gs;
  const e = EVENT_BY_ID.get(eventId);
  if (!run || !e?.check || !run.done[eventId]) return { ok: false, error: 'No question here', state: gs };
  if (run.checks[eventId]) return { ok: true, state: gs, events: [], duplicate: true };
  if (!Number.isInteger(answer) || answer < 0 || answer >= e.check.options.length) return { ok: false, error: 'Invalid answer', state: gs };
  const correct = answer === e.check.answer;
  /** @type {Evidence} */
  const ev = { concept: e.check.concept, correct, source: 'check', scenarioId: eventId, run: run.number };
  let profile = { ...gs.profile, mastery: addEvidence(gs.profile.mastery, [ev]) };
  /** @type {StoryEvt[]} */
  const events = [];
  if (correct) {
    const r = claimAura(profile, `check:${eventId}`);
    profile = r.profile;
    if (r.gained) events.push({ type: 'aura', amount: r.gained });
  }
  return { ok: true, state: { profile, run: { ...run, checks: { ...run.checks, [eventId]: { answer, correct } }, evidence: [...run.evidence, ev] } }, events };
}

/**
 * Walk to another location.
 * @param {StoryState} gs @param {LocationId} loc
 * @returns {Result}
 */
export function travel(gs, loc) {
  const { run } = gs;
  if (!run) return { ok: false, error: 'No week in progress', state: gs };
  if (!Object.hasOwn(LOCATIONS, loc)) return { ok: false, error: 'Unknown place', state: gs };
  if (!isUnlocked(run, loc)) return { ok: false, error: 'why.locked', state: gs };
  if (run.location === loc) return { ok: true, state: gs, events: [], duplicate: true };
  return { ok: true, state: { ...gs, run: { ...run, location: loc } }, events: [] };
}

/**
 * Finish the day. On the last day this ends the week and computes the ending.
 * @param {StoryState} gs
 * @returns {Result}
 */
export function endDay(gs) {
  const { run } = gs;
  let { profile } = gs;
  if (!run || run.status !== 'playing') return { ok: false, error: 'No week in progress', state: gs };
  if (currentEvent(run)) return { ok: false, error: 'Something is still happening today', state: gs };
  /** @type {StoryEvt[]} */
  const events = [];
  const r = claimAura(profile, `day:${run.day}`);
  profile = r.profile;
  if (r.gained) events.push({ type: 'aura', amount: r.gained });

  if (run.day >= LAST_DAY) {
    const ending = computeEnding(run);
    const w = claimAura(profile, 'week:first');
    profile = w.profile;
    if (w.gained) events.push({ type: 'aura', amount: w.gained });
    profile = {
      ...profile,
      weeksCompleted: profile.weeksCompleted + 1,
      endings: profile.endings.includes(ending.id) ? profile.endings : [...profile.endings, ending.id],
      seasonUnlocked: true,
    };
    events.push({ type: 'week-complete' });
    return { ok: true, state: { profile, run: { ...run, status: 'ended', ending } }, events };
  }

  const day = run.day + 1;
  let next = { ...run, day, location: /** @type {LocationId} */ ('home') };
  const entered = enterDay(next);
  next = entered.run;
  next = { ...next, snapshots: { ...run.snapshots, [day]: snap(next) } };
  events.push(...entered.events, { type: 'day', day });
  for (const loc of /** @type {LocationId[]} */ (Object.keys(LOCATIONS))) {
    if (LOCATIONS[loc].unlockDay === day) events.push({ type: 'unlock', location: loc });
  }
  return { ok: true, state: { profile, run: next }, events };
}

/**
 * Rewind to the start of an earlier day to try a different path. Money, choices and
 * flags return to that morning; memories and Aura already earned stay on the profile.
 * @param {StoryState} gs @param {number} day
 * @returns {Result}
 */
export function rewind(gs, day) {
  const { run } = gs;
  if (!run) return { ok: false, error: 'No week in progress', state: gs };
  const s = run.snapshots[day];
  if (!s) return { ok: false, error: 'You haven’t reached that day yet', state: gs };
  /** @type {Run['snapshots']} */
  const kept = {};
  for (const [k, v] of Object.entries(run.snapshots)) if (Number(k) <= day) kept[k] = v;
  return { ok: true, state: { ...gs, run: { ...s, read: run.read, rewinds: run.rewinds + 1, snapshots: kept } }, events: [] };
}

/** @param {StoryState} gs @param {string[]} ids @returns {Result} */
export function markRead(gs, ids) {
  const { run } = gs;
  if (!run) return { ok: false, error: 'No week in progress', state: gs };
  const add = ids.filter((id) => !run.read.includes(id) && MESSAGES.some((m) => m.id === id));
  if (!add.length) return { ok: true, state: gs, events: [], duplicate: true };
  return { ok: true, state: { ...gs, run: { ...run, read: [...run.read, ...add] } }, events: [] };
}

/** Messages that have arrived so far, oldest first. @param {Run} run */
export function inbox(run) {
  const v = viewOf(run);
  return MESSAGES.filter((m) => m.day <= run.day && (!m.showIf || m.showIf(v)));
}

/** @param {Run} run */
export function unreadCount(run) {
  return inbox(run).filter((m) => !run.read.includes(m.id)).length;
}

/**
 * The ending is calculated from what actually happened this week.
 * @param {Run} run @returns {Ending}
 */
export function computeEnding(run) {
  const b = balancesOf(run.ledger);
  const t = summarize(run.ledger.transactions);
  const goalBought = run.flags.goalBought === true;
  const shortfall = goalBought ? 0 : Math.max(0, GOAL_COST - b.goal);
  // Pace: what this week put into the goal jar (at least ₹100 so the estimate stays finite).
  const pace = Math.max(10000, t.toGoal - t.fromGoal);
  const weeksToGoal = shortfall === 0 ? 0 : Math.ceil(shortfall / pace);
  const f = run.flags;
  /** @type {string[]} */
  const traits = [];
  if (f.repair === 'safety') traits.push('safety_net');
  if (f.scamSpotted || f.scam === 'checked' || f.scam === 'reported') traits.push('scam_proof');
  if (f.scam === 'paid' || f.scam === 'stopped' || f.scam === 'paidTwice') traits.push('scam_hit');
  if (f.borrowed && b.debt === 0) traits.push('debt_free');
  if (b.debt > 0) traits.push('in_debt');
  if (f.outing === 'cheap') traits.push('social_budget');
  if (f.outing === 'full') traits.push('social_full');
  if (f.waited) traits.push('patient');
  if (f.bought === 'deal') traits.push('impulse');
  if (f.gig === 'goal' || f.gig === 'cash') traits.push('hustle');
  if (f.dippedGoal) traits.push('dipped_goal');
  const id = goalBought ? 'goal' : shortfall <= 30000 ? 'close' : 'delayed';
  return { id, goalBought, shortfall, weeksToGoal, traits };
}

/**
 * Learning progress per pillar from mastery evidence: 'new' until something in the pillar
 * was experienced, then the best level among its concepts.
 * @param {Profile} profile
 */
export function pillarProgress(profile) {
  const rank = { new: 0, learning: 1, practicing: 2, confident: 3 };
  /** @type {Record<string, 'new' | 'learning' | 'practicing' | 'confident'>} */
  const out = {};
  for (const [pillar, concepts] of Object.entries(PILLARS)) {
    let best = /** @type {'new' | 'learning' | 'practicing' | 'confident'} */ ('new');
    for (const c of concepts) {
      const l = levelFrom(profile.mastery[c] ?? []);
      if (rank[l] > rank[best]) best = l;
    }
    out[pillar] = best;
  }
  return out;
}

/**
 * Where the week's money went, from recorded transactions only.
 * @param {Run} run
 */
export function moneyStory(run) {
  const t = summarize(run.ledger.transactions);
  const b = balancesOf(run.ledger);
  return {
    received: t.income + t.borrowed,
    needs: t.byCategory.need,
    wants: t.byCategory.want,
    goalSpent: t.byCategory.goal,
    lost: t.losses,
    repaid: t.repaid,
    balances: b,
  };
}

/**
 * Per-day story log for the review screen: which choices were made and what each did to
 * total money (transfers net to zero).
 * @param {Run} run
 */
export function timeline(run) {
  return run.order.map((id) => {
    const d = run.done[id];
    const txs = run.ledger.transactions.filter((t) => t.seq >= d.seqStart && t.seq < d.seqEnd);
    let change = 0;
    for (const t of txs) {
      if (t.type === 'income' || t.type === 'borrow') change += t.amount;
      if (t.type === 'expense' || t.type === 'loss' || t.type === 'repay') change -= t.amount;
    }
    return { eventId: id, day: d.day, choiceId: d.choiceId, change, txs };
  });
}

export { GOAL_COST };
