// @ts-check
/**
 * "A Week in Your Life": the story layer of PaisaPath, written as data.
 *
 * Content never touches balances. Every money change is a ledger draft that the story
 * engine validates and commits through `domain/ledger.js`, the same ledger Life Mode
 * uses. All player-facing text is an i18n key (see ./i18n), so the story reads the same
 * in English, Hindi and Telugu. Descriptions on drafts are keys too (`tx.*`).
 *
 * Numbers are tuned so that no single choice "wins": reaching the goal by Sunday needs a
 * plan on Monday that survives Thursday's surprise.
 */
import { rupees as r } from '../domain/money.js';

/** @typedef {import('../domain/ledger.js').Balances} Balances */
/** @typedef {import('../domain/ledger.js').SpendCategory} SpendCategory */
/** @typedef {Omit<import('../domain/ledger.js').TxDraft, 'scenarioId' | 'choiceId'>} Draft */

/** @typedef {'music' | 'gaming' | 'sports' | 'art' | 'tech'} InterestId */
/** @typedef {'home' | 'hangout' | 'market'} LocationId */
/** @typedef {'you' | 'akka' | 'zoya' | 'arjun' | 'raju' | 'aunty' | 'narrator'} Speaker */
/** @typedef {'happy' | 'neutral' | 'worried' | 'excited' | 'sad' | 'smug'} Mood */

/**
 * What content may read about the run. Built by the engine; read-only.
 * @typedef {Object} StoryView
 * @property {Balances} balances
 * @property {Record<string, boolean | number | string>} flags
 * @property {InterestId} interest
 * @property {Record<string, string>} chosen   eventId → choiceId for finished events.
 */

/**
 * A line of dialogue. `key` is an i18n key; params are filled in at render time.
 * @typedef {Object} Line
 * @property {Speaker} who
 * @property {string} key
 * @property {Mood} [mood]
 */

/**
 * @typedef {Object} Choice
 * @property {string} id
 * @property {string} label                       i18n key
 * @property {(v: StoryView) => Draft[]} [effects]
 * @property {(v: StoryView) => true | string} [when]  true, or an i18n key explaining why not.
 * @property {Record<string, boolean | number | string>} [flags]
 * @property {number} [mood]                      Change to the 0–100 vibe meter.
 * @property {{ concept: string, correct: boolean }[]} [evidence]
 * @property {string} [memory]                    Story memory collected.
 * @property {string} [aura]                      Aura claim key (paid once per profile).
 * @property {Line[]} outcome                     What happens next, on screen.
 * @property {string} [lesson]                    One-line takeaway, i18n key.
 */

/**
 * @typedef {Object} Segment
 * @property {string} id
 * @property {boolean} flag     Is this a real warning sign?
 */

/**
 * @typedef {Object} StoryEvent
 * @property {string} id
 * @property {number} day                 0 = Monday … 5 = Weekend
 * @property {LocationId} location
 * @property {string} hotspot             Object or character that starts it.
 * @property {'choice' | 'budget' | 'shop' | 'scam' | 'snowball' | 'goal'} kind
 * @property {(v: StoryView) => boolean} [showIf]
 * @property {Line[]} lines
 * @property {string} short               One-line version for Short Dialogue mode.
 * @property {string} hint                Akka's optional hint.
 * @property {string[]} concepts
 * @property {Choice[]} choices
 * @property {Segment[]} [segments]      Scam inspection.
 * @property {{ key: string, options: string[], answer: number, explain: string, concept: string }} [check]
 */

export const OPENING = Object.freeze({ cash: 0, savings: 0, goal: r(600), debt: 0 });
export const POCKET_MONEY = r(1200);
export const RECHARGE = r(199);
export const GOAL_COST = r(1500);
export const OUTING_FULL = r(350);
export const OUTING_CHEAP = r(150);
export const POPCORN = r(180);
export const DEAL_PRICE = r(599);
export const DEAL_WAS = r(999);
export const ALT_PRICE = r(249);
export const REPAIR = r(350);
export const REPAIR_LATE = r(450);
export const BUS_FARE = r(60);
export const GIG_PAY = r(400);
export const SCAM_FEE = r(99);
export const SCAM_TAX = r(499);
export const STEP = r(50);

export const DAYS = /** @type {const} */ (['mon', 'tue', 'wed', 'thu', 'fri', 'wkd']);
export const LAST_DAY = DAYS.length - 1;

/** Locations open up as the story moves on: new places are a reward, not a menu. */
/** @type {Record<LocationId, { unlockDay: number }>} */
export const LOCATIONS = {
  home: { unlockDay: 0 },
  hangout: { unlockDay: 1 },
  market: { unlockDay: 2 },
};

/**
 * Interest changes the goal, the market temptation and the hobby corner in the room.
 * Item names live in i18n under `item.<id>`.
 * @type {Record<InterestId, { goal: string, deal: string, alt: string, emoji: string, dealEmoji: string, altEmoji: string }>}
 */
export const INTERESTS = {
  music: { goal: 'headphones', deal: 'earbuds', alt: 'wired', emoji: '🎧', dealEmoji: '🎵', altEmoji: '🔌' },
  gaming: { goal: 'controller', deal: 'skins', alt: 'grips', emoji: '🎮', dealEmoji: '💎', altEmoji: '🕹️' },
  sports: { goal: 'boots', deal: 'jersey', alt: 'socks', emoji: '⚽', dealEmoji: '👕', altEmoji: '🧦' },
  art: { goal: 'tablet', deal: 'markers', alt: 'sketchbook', emoji: '🎨', dealEmoji: '🖍️', altEmoji: '📓' },
  tech: { goal: 'kit', deal: 'lights', alt: 'breadboard', emoji: '🤖', dealEmoji: '💡', altEmoji: '🔧' },
};
export const INTEREST_IDS = /** @type {InterestId[]} */ (Object.keys(INTERESTS));

/**
 * Pay `amount` drawing from accounts in order: moves money into cash with transfers where
 * cash is short, then spends from cash. Transfers are not spending; only the final expense is.
 * @param {number} amount
 * @param {('cash' | 'savings' | 'goal')[]} order
 * @param {Balances} b
 * @param {string} description
 * @param {SpendCategory} category
 * @returns {Draft[]}
 */
export function payFrom(amount, order, b, description, category) {
  /** @type {Draft[]} */
  const drafts = [];
  let remaining = Math.max(0, amount - b.cash);
  for (const acct of order) {
    if (acct === 'cash' || remaining <= 0) continue;
    const take = Math.min(b[acct], remaining);
    if (take > 0) {
      drafts.push({ type: 'transfer', from: acct, to: 'cash', amount: take, description: acct === 'goal' ? 'tx.fromGoal' : 'tx.fromSafety' });
      remaining -= take;
    }
  }
  drafts.push({ type: 'expense', from: 'cash', amount, category, description });
  return drafts;
}

/** @param {number} need @param {number} have */
const enough = (need, have) => (have >= need ? true : 'why.notEnoughCash');

/** @type {StoryEvent[]} */
export const EVENTS = [
  // ─────────────────────────────── Monday: The Plan ───────────────────────────────
  {
    id: 'mon_plan', day: 0, location: 'home', hotspot: 'desk', kind: 'budget',
    concepts: ['budgeting', 'transfer_vs_expense'],
    short: 'mon_plan.short', hint: 'mon_plan.hint',
    lines: [
      { who: 'narrator', key: 'mon_plan.l1' },
      { who: 'you', key: 'mon_plan.l2', mood: 'excited' },
      { who: 'akka', key: 'mon_plan.l3', mood: 'smug' },
      { who: 'akka', key: 'mon_plan.l4', mood: 'happy' },
    ],
    // The single 'plan' choice is filled in by the engine from the jar amounts the player sets.
    choices: [{ id: 'plan', label: 'mon_plan.lock', outcome: [] }],
    check: {
      key: 'mon_plan.check', options: ['mon_plan.check.a', 'mon_plan.check.b', 'mon_plan.check.c'], answer: 1,
      explain: 'mon_plan.check.explain', concept: 'transfer_vs_expense',
    },
  },

  // ─────────────────────────────── Tuesday: The Invite ───────────────────────────────
  {
    id: 'tue_invite', day: 1, location: 'hangout', hotspot: 'zoya', kind: 'choice',
    concepts: ['needs_wants', 'opportunity_cost'],
    short: 'tue_invite.short', hint: 'tue_invite.hint',
    lines: [
      { who: 'zoya', key: 'tue_invite.l1', mood: 'excited' },
      { who: 'arjun', key: 'tue_invite.l2', mood: 'neutral' },
      { who: 'you', key: 'tue_invite.l3', mood: 'neutral' },
    ],
    choices: [
      {
        id: 'all_in', label: 'tue_invite.c.all_in',
        effects: () => [{ type: 'expense', from: 'cash', amount: OUTING_FULL, category: 'want', description: 'tx.movie' }],
        when: (v) => enough(OUTING_FULL, v.balances.cash),
        flags: { outing: 'full' }, mood: 12, aura: 'explore:tue:all_in',
        outcome: [
          { who: 'zoya', key: 'tue_invite.o.all_in.1', mood: 'excited' },
          { who: 'narrator', key: 'tue_invite.o.all_in.2' },
        ],
        lesson: 'tue_invite.lesson.all_in',
      },
      {
        id: 'cheaper', label: 'tue_invite.c.cheaper',
        effects: () => [{ type: 'expense', from: 'cash', amount: OUTING_CHEAP, category: 'want', description: 'tx.chai' }],
        when: (v) => enough(OUTING_CHEAP, v.balances.cash),
        flags: { outing: 'cheap' }, mood: 9, aura: 'explore:tue:cheaper',
        evidence: [{ concept: 'opportunity_cost', correct: true }],
        outcome: [
          { who: 'zoya', key: 'tue_invite.o.cheaper.1', mood: 'neutral' },
          { who: 'arjun', key: 'tue_invite.o.cheaper.2', mood: 'happy' },
          { who: 'narrator', key: 'tue_invite.o.cheaper.3' },
        ],
        lesson: 'tue_invite.lesson.cheaper',
      },
      {
        id: 'skip', label: 'tue_invite.c.skip',
        flags: { outing: 'skip' }, mood: -4, aura: 'explore:tue:skip',
        outcome: [
          { who: 'zoya', key: 'tue_invite.o.skip.1', mood: 'sad' },
          { who: 'narrator', key: 'tue_invite.o.skip.2' },
        ],
        lesson: 'tue_invite.lesson.skip',
      },
    ],
  },

  // ─────────────────────────────── Wednesday: The Temptation ───────────────────────────────
  {
    id: 'wed_deal', day: 2, location: 'market', hotspot: 'shop', kind: 'shop',
    concepts: ['needs_wants', 'opportunity_cost'],
    short: 'wed_deal.short', hint: 'wed_deal.hint',
    lines: [
      { who: 'narrator', key: 'wed_deal.l1' },
      { who: 'raju', key: 'wed_deal.l2', mood: 'excited' },
      { who: 'you', key: 'wed_deal.l3', mood: 'excited' },
    ],
    choices: [
      {
        id: 'buy_deal', label: 'wed_deal.c.buy_deal',
        effects: () => [{ type: 'expense', from: 'cash', amount: DEAL_PRICE, category: 'want', description: 'tx.deal' }],
        when: (v) => enough(DEAL_PRICE, v.balances.cash),
        flags: { bought: 'deal' }, mood: 10, aura: 'explore:wed:buy_deal',
        outcome: [
          { who: 'raju', key: 'wed_deal.o.buy_deal.1', mood: 'happy' },
          { who: 'narrator', key: 'wed_deal.o.buy_deal.2' },
        ],
        lesson: 'wed_deal.lesson.buy_deal',
      },
      {
        id: 'buy_deal_goal', label: 'wed_deal.c.buy_deal_goal',
        effects: (v) => payFrom(DEAL_PRICE, ['goal'], v.balances, 'tx.deal', 'want'),
        when: (v) => (v.balances.cash >= DEAL_PRICE ? 'why.cashCovers' : v.balances.cash + v.balances.goal >= DEAL_PRICE ? true : 'why.notEnoughAtAll'),
        flags: { bought: 'deal', dippedGoal: true }, mood: 6, aura: 'explore:wed:buy_deal_goal',
        outcome: [
          { who: 'raju', key: 'wed_deal.o.buy_deal.1', mood: 'happy' },
          { who: 'akka', key: 'wed_deal.o.buy_deal_goal.2', mood: 'worried' },
        ],
        lesson: 'wed_deal.lesson.buy_deal_goal',
      },
      {
        id: 'buy_alt', label: 'wed_deal.c.buy_alt',
        effects: () => [{ type: 'expense', from: 'cash', amount: ALT_PRICE, category: 'want', description: 'tx.alt' }],
        when: (v) => enough(ALT_PRICE, v.balances.cash),
        flags: { bought: 'alt' }, mood: 6, aura: 'explore:wed:buy_alt',
        evidence: [{ concept: 'needs_wants', correct: true }],
        outcome: [
          { who: 'raju', key: 'wed_deal.o.buy_alt.1', mood: 'neutral' },
          { who: 'narrator', key: 'wed_deal.o.buy_alt.2' },
        ],
        lesson: 'wed_deal.lesson.buy_alt',
      },
      {
        id: 'wait', label: 'wed_deal.c.wait',
        flags: { bought: 'none', waited: true }, mood: 0, aura: 'explore:wed:wait',
        evidence: [{ concept: 'opportunity_cost', correct: true }],
        outcome: [
          { who: 'raju', key: 'wed_deal.o.wait.1', mood: 'smug' },
          { who: 'narrator', key: 'wed_deal.o.wait.2' },
        ],
        lesson: 'wed_deal.lesson.wait',
      },
    ],
  },

  // ─────────────────────────────── Thursday: The Plot Twist ───────────────────────────────
  {
    id: 'thu_sale', day: 3, location: 'home', hotspot: 'phone', kind: 'choice',
    showIf: (v) => v.flags.waited === true,
    concepts: ['opportunity_cost'],
    short: 'thu_sale.short', hint: 'thu_sale.hint',
    lines: [
      { who: 'narrator', key: 'thu_sale.l1' },
      { who: 'you', key: 'thu_sale.l2', mood: 'smug' },
    ],
    choices: [
      {
        id: 'skip', label: 'thu_sale.c.skip', memory: 'smart_wait', aura: 'memory:smart_wait',
        evidence: [{ concept: 'needs_wants', correct: true }],
        outcome: [{ who: 'akka', key: 'thu_sale.o.skip.1', mood: 'happy' }],
        lesson: 'thu_sale.lesson.skip',
      },
      {
        id: 'buy', label: 'thu_sale.c.buy',
        effects: () => [{ type: 'expense', from: 'cash', amount: DEAL_PRICE, category: 'want', description: 'tx.deal' }],
        when: (v) => enough(DEAL_PRICE, v.balances.cash),
        flags: { bought: 'deal' }, mood: 8,
        outcome: [{ who: 'narrator', key: 'thu_sale.o.buy.1' }],
        lesson: 'thu_sale.lesson.buy',
      },
    ],
  },
  {
    id: 'thu_twist', day: 3, location: 'home', hotspot: 'cycle', kind: 'choice',
    concepts: ['emergency_fund'],
    short: 'thu_twist.short', hint: 'thu_twist.hint',
    lines: [
      { who: 'narrator', key: 'thu_twist.l1' },
      { who: 'you', key: 'thu_twist.l2', mood: 'worried' },
      { who: 'narrator', key: 'thu_twist.l3' },
    ],
    choices: [
      {
        id: 'safety', label: 'thu_twist.c.safety',
        effects: (v) => payFrom(REPAIR, ['savings'], v.balances, 'tx.repair', 'need'),
        when: (v) => (v.balances.savings <= 0 ? 'why.noSafety' : v.balances.savings + v.balances.cash >= REPAIR ? true : 'why.notEnoughAtAll'),
        flags: { repair: 'safety' }, mood: 4, memory: 'safety_net', aura: 'memory:safety_net',
        evidence: [{ concept: 'emergency_fund', correct: true }],
        outcome: [
          { who: 'akka', key: 'thu_twist.o.safety.1', mood: 'happy' },
          { who: 'narrator', key: 'thu_twist.o.safety.2' },
        ],
        lesson: 'thu_twist.lesson.safety',
      },
      {
        id: 'cash', label: 'thu_twist.c.cash',
        effects: () => [{ type: 'expense', from: 'cash', amount: REPAIR, category: 'need', description: 'tx.repair' }],
        when: (v) => enough(REPAIR, v.balances.cash),
        flags: { repair: 'cash' }, mood: 2,
        evidence: [{ concept: 'emergency_fund', correct: true }],
        outcome: [{ who: 'narrator', key: 'thu_twist.o.cash.1' }],
        lesson: 'thu_twist.lesson.cash',
      },
      {
        id: 'goal', label: 'thu_twist.c.goal',
        effects: (v) => payFrom(REPAIR, ['goal', 'savings'], v.balances, 'tx.repair', 'need'),
        when: (v) => (v.balances.goal <= 0 ? 'why.goalEmpty' : v.balances.cash + v.balances.savings + v.balances.goal >= REPAIR ? true : 'why.notEnoughAtAll'),
        flags: { repair: 'goal', dippedGoal: true }, mood: -2,
        outcome: [
          { who: 'you', key: 'thu_twist.o.goal.1', mood: 'sad' },
          { who: 'akka', key: 'thu_twist.o.goal.2', mood: 'happy' },
        ],
        lesson: 'thu_twist.lesson.goal',
      },
      {
        id: 'borrow', label: 'thu_twist.c.borrow',
        effects: () => [
          { type: 'borrow', to: 'cash', amount: REPAIR, description: 'tx.borrow' },
          { type: 'expense', from: 'cash', amount: REPAIR, category: 'need', description: 'tx.repair' },
        ],
        flags: { repair: 'borrow', borrowed: true }, mood: 0, memory: 'akka_loan',
        outcome: [
          { who: 'akka', key: 'thu_twist.o.borrow.1', mood: 'smug' },
          { who: 'narrator', key: 'thu_twist.o.borrow.2' },
        ],
        lesson: 'thu_twist.lesson.borrow',
      },
      {
        id: 'postpone', label: 'thu_twist.c.postpone',
        effects: () => [{ type: 'expense', from: 'cash', amount: BUS_FARE, category: 'need', description: 'tx.bus' }],
        when: (v) => enough(BUS_FARE, v.balances.cash),
        flags: { repair: 'later', cycleBroken: true }, mood: -8,
        outcome: [{ who: 'narrator', key: 'thu_twist.o.postpone.1' }],
        lesson: 'thu_twist.lesson.postpone',
      },
    ],
  },

  // ─────────────────────────────── Friday: The Suspicious Message ───────────────────────────────
  {
    id: 'fri_scam', day: 4, location: 'home', hotspot: 'phone', kind: 'scam',
    concepts: ['scam_signs'],
    short: 'fri_scam.short', hint: 'fri_scam.hint',
    lines: [
      { who: 'narrator', key: 'fri_scam.l1' },
      { who: 'you', key: 'fri_scam.l2', mood: 'excited' },
    ],
    segments: [
      { id: 'sender', flag: true },
      { id: 'won', flag: true },
      { id: 'name', flag: false },
      { id: 'fee', flag: true },
      { id: 'timer', flag: true },
      { id: 'link', flag: true },
      { id: 'otp', flag: true },
    ],
    choices: [
      {
        id: 'pay', label: 'fri_scam.c.pay',
        effects: () => [{ type: 'loss', from: 'cash', amount: SCAM_FEE, description: 'tx.scamFee' }],
        when: (v) => enough(SCAM_FEE, v.balances.cash),
        flags: { scam: 'paid' }, mood: -6,
        evidence: [{ concept: 'scam_signs', correct: false }],
        outcome: [
          { who: 'narrator', key: 'fri_scam.o.pay.1' },
          { who: 'akka', key: 'fri_scam.o.pay.2', mood: 'worried' },
        ],
        lesson: 'fri_scam.lesson.pay',
      },
      {
        id: 'ask', label: 'fri_scam.c.ask',
        flags: { scam: 'checked' }, mood: 2, aura: 'safe:scam',
        evidence: [{ concept: 'scam_signs', correct: true }],
        outcome: [
          { who: 'akka', key: 'fri_scam.o.ask.1', mood: 'smug' },
          { who: 'akka', key: 'fri_scam.o.ask.2', mood: 'happy' },
        ],
        lesson: 'fri_scam.lesson.ask',
      },
      {
        id: 'report', label: 'fri_scam.c.report',
        flags: { scam: 'reported' }, mood: 4, aura: 'safe:scam',
        evidence: [{ concept: 'scam_signs', correct: true }],
        outcome: [
          { who: 'narrator', key: 'fri_scam.o.report.1' },
          { who: 'akka', key: 'fri_scam.o.report.2', mood: 'happy' },
        ],
        lesson: 'fri_scam.lesson.report',
      },
    ],
  },
  {
    id: 'fri_movie', day: 4, location: 'hangout', hotspot: 'zoya', kind: 'choice',
    showIf: (v) => v.flags.outing === 'full',
    concepts: ['needs_wants'],
    short: 'fri_movie.short', hint: 'fri_movie.hint',
    lines: [
      { who: 'zoya', key: 'fri_movie.l1', mood: 'excited' },
      { who: 'arjun', key: 'fri_movie.l2', mood: 'happy' },
    ],
    choices: [
      {
        id: 'combo', label: 'fri_movie.c.combo',
        effects: () => [{ type: 'expense', from: 'cash', amount: POPCORN, category: 'want', description: 'tx.popcorn' }],
        when: (v) => enough(POPCORN, v.balances.cash),
        mood: 6, memory: 'movie_night',
        outcome: [{ who: 'zoya', key: 'fri_movie.o.combo.1', mood: 'happy' }],
        lesson: 'fri_movie.lesson.combo',
      },
      {
        id: 'skip', label: 'fri_movie.c.skip', memory: 'movie_night',
        mood: 4, evidence: [{ concept: 'needs_wants', correct: true }],
        outcome: [{ who: 'arjun', key: 'fri_movie.o.skip.1', mood: 'happy' }],
        lesson: 'fri_movie.lesson.skip',
      },
    ],
  },
  {
    id: 'fri_chai', day: 4, location: 'hangout', hotspot: 'zoya', kind: 'choice',
    showIf: (v) => v.flags.outing === 'cheap',
    concepts: [],
    short: 'fri_chai.short', hint: 'fri_chai.hint',
    lines: [
      { who: 'narrator', key: 'fri_chai.l1' },
      { who: 'zoya', key: 'fri_chai.l2', mood: 'happy' },
      { who: 'arjun', key: 'fri_chai.l3', mood: 'smug' },
    ],
    choices: [
      {
        id: 'vibe', label: 'fri_chai.c.vibe', memory: 'chai_walk', mood: 8,
        outcome: [{ who: 'narrator', key: 'fri_chai.o.vibe.1' }],
        lesson: 'fri_chai.lesson.vibe',
      },
    ],
  },

  // ─────────────────────────────── Weekend: The Outcome ───────────────────────────────
  {
    id: 'wkd_gig', day: 5, location: 'market', hotspot: 'aunty', kind: 'choice',
    concepts: ['budgeting'],
    short: 'wkd_gig.short', hint: 'wkd_gig.hint',
    lines: [
      { who: 'aunty', key: 'wkd_gig.l1', mood: 'happy' },
      { who: 'you', key: 'wkd_gig.l2', mood: 'neutral' },
    ],
    choices: [
      {
        id: 'help_goal', label: 'wkd_gig.c.help_goal',
        effects: () => [{ type: 'income', to: 'goal', amount: GIG_PAY, description: 'tx.gig' }],
        flags: { gig: 'goal' }, mood: 2, memory: 'stall_hustle', aura: 'memory:stall_hustle',
        evidence: [{ concept: 'budgeting', correct: true }],
        outcome: [
          { who: 'aunty', key: 'wkd_gig.o.help.1', mood: 'happy' },
          { who: 'narrator', key: 'wkd_gig.o.help_goal.2' },
        ],
        lesson: 'wkd_gig.lesson.help_goal',
      },
      {
        id: 'help_cash', label: 'wkd_gig.c.help_cash',
        effects: () => [{ type: 'income', to: 'cash', amount: GIG_PAY, description: 'tx.gig' }],
        flags: { gig: 'cash' }, mood: 2, memory: 'stall_hustle', aura: 'memory:stall_hustle',
        outcome: [
          { who: 'aunty', key: 'wkd_gig.o.help.1', mood: 'happy' },
          { who: 'narrator', key: 'wkd_gig.o.help_cash.2' },
        ],
        lesson: 'wkd_gig.lesson.help_cash',
      },
      {
        id: 'rest', label: 'wkd_gig.c.rest',
        flags: { gig: 'rest' }, mood: 8,
        outcome: [{ who: 'aunty', key: 'wkd_gig.o.rest.1', mood: 'happy' }],
        lesson: 'wkd_gig.lesson.rest',
      },
    ],
  },
  {
    id: 'wkd_scam2', day: 5, location: 'home', hotspot: 'phone', kind: 'choice',
    showIf: (v) => v.flags.scam === 'paid',
    concepts: ['scam_signs'],
    short: 'wkd_scam2.short', hint: 'wkd_scam2.hint',
    lines: [
      { who: 'narrator', key: 'wkd_scam2.l1' },
      { who: 'you', key: 'wkd_scam2.l2', mood: 'worried' },
    ],
    choices: [
      {
        id: 'stop', label: 'wkd_scam2.c.stop', mood: 4, memory: 'scam_recovery', aura: 'safe:recover',
        flags: { scam: 'stopped' },
        evidence: [{ concept: 'scam_signs', correct: true }],
        outcome: [
          { who: 'akka', key: 'wkd_scam2.o.stop.1', mood: 'happy' },
          { who: 'narrator', key: 'wkd_scam2.o.stop.2' },
        ],
        lesson: 'wkd_scam2.lesson.stop',
      },
      {
        id: 'pay', label: 'wkd_scam2.c.pay',
        effects: () => [{ type: 'loss', from: 'cash', amount: SCAM_TAX, description: 'tx.scamTax' }],
        when: (v) => enough(SCAM_TAX, v.balances.cash),
        flags: { scam: 'paidTwice' }, mood: -10,
        evidence: [{ concept: 'scam_signs', correct: false }],
        outcome: [
          { who: 'narrator', key: 'wkd_scam2.o.pay.1' },
          { who: 'akka', key: 'wkd_scam2.o.pay.2', mood: 'worried' },
        ],
        lesson: 'wkd_scam2.lesson.pay',
      },
    ],
  },
  {
    id: 'wkd_arjun', day: 5, location: 'hangout', hotspot: 'arjun', kind: 'choice',
    showIf: (v) => v.flags.scamSpotted === true || v.flags.scam === 'checked' || v.flags.scam === 'reported',
    concepts: ['scam_signs'],
    short: 'wkd_arjun.short', hint: 'wkd_arjun.hint',
    lines: [
      { who: 'arjun', key: 'wkd_arjun.l1', mood: 'worried' },
      { who: 'arjun', key: 'wkd_arjun.l2', mood: 'excited' },
    ],
    choices: [
      {
        id: 'warn', label: 'wkd_arjun.c.warn', memory: 'helping_arjun', aura: 'memory:helping_arjun', mood: 6,
        evidence: [{ concept: 'scam_signs', correct: true }],
        outcome: [
          { who: 'arjun', key: 'wkd_arjun.o.warn.1', mood: 'happy' },
          { who: 'narrator', key: 'wkd_arjun.o.warn.2' },
        ],
        lesson: 'wkd_arjun.lesson.warn',
      },
    ],
  },
  {
    id: 'wkd_cycle', day: 5, location: 'home', hotspot: 'cycle', kind: 'choice',
    showIf: (v) => v.flags.cycleBroken === true,
    concepts: ['emergency_fund'],
    short: 'wkd_cycle.short', hint: 'wkd_cycle.hint',
    lines: [
      { who: 'narrator', key: 'wkd_cycle.l1' },
      { who: 'you', key: 'wkd_cycle.l2', mood: 'worried' },
    ],
    choices: [
      {
        id: 'safety', label: 'wkd_cycle.c.safety',
        effects: (v) => payFrom(REPAIR_LATE, ['savings'], v.balances, 'tx.repairLate', 'need'),
        when: (v) => (v.balances.savings <= 0 ? 'why.noSafety' : v.balances.savings + v.balances.cash >= REPAIR_LATE ? true : 'why.notEnoughAtAll'),
        flags: { cycleBroken: false }, mood: 6,
        outcome: [{ who: 'narrator', key: 'wkd_cycle.o.fixed.1' }],
        lesson: 'wkd_cycle.lesson',
      },
      {
        id: 'goal', label: 'wkd_cycle.c.goal',
        effects: (v) => payFrom(REPAIR_LATE, ['goal', 'savings'], v.balances, 'tx.repairLate', 'need'),
        when: (v) => (v.balances.goal <= 0 ? 'why.goalEmpty' : v.balances.cash + v.balances.savings + v.balances.goal >= REPAIR_LATE ? true : 'why.notEnoughAtAll'),
        flags: { cycleBroken: false, dippedGoal: true }, mood: 4,
        outcome: [{ who: 'narrator', key: 'wkd_cycle.o.fixed.1' }],
        lesson: 'wkd_cycle.lesson',
      },
      {
        id: 'still_later', label: 'wkd_cycle.c.later', mood: -6,
        outcome: [{ who: 'narrator', key: 'wkd_cycle.o.later.1' }],
        lesson: 'wkd_cycle.lesson.later',
      },
    ],
  },
  {
    id: 'wkd_repay', day: 5, location: 'home', hotspot: 'akka', kind: 'choice',
    showIf: (v) => v.balances.debt > 0,
    concepts: ['borrowing'],
    short: 'wkd_repay.short', hint: 'wkd_repay.hint',
    lines: [{ who: 'akka', key: 'wkd_repay.l1', mood: 'smug' }],
    choices: [
      {
        id: 'full', label: 'wkd_repay.c.full',
        effects: (v) => {
          /** @type {Draft[]} */
          const d = [];
          const short = Math.max(0, v.balances.debt - v.balances.cash);
          if (short > 0) d.push({ type: 'transfer', from: 'savings', to: 'cash', amount: Math.min(short, v.balances.savings), description: 'tx.fromSafety' });
          d.push({ type: 'repay', from: 'cash', amount: v.balances.debt, description: 'tx.repay' });
          return d;
        },
        when: (v) => (v.balances.cash + v.balances.savings >= v.balances.debt ? true : 'why.notEnoughAtAll'),
        mood: 6, memory: 'debt_free', aura: 'memory:debt_free',
        outcome: [{ who: 'akka', key: 'wkd_repay.o.full.1', mood: 'happy' }],
        lesson: 'wkd_repay.lesson.full',
      },
      {
        id: 'part', label: 'wkd_repay.c.part',
        effects: (v) => [{ type: 'repay', from: 'cash', amount: Math.min(v.balances.cash, v.balances.debt), description: 'tx.repay' }],
        when: (v) => (v.balances.cash <= 0 ? 'why.notEnoughCash' : v.balances.cash >= v.balances.debt ? 'why.canRepayAll' : true),
        mood: 2,
        outcome: [{ who: 'akka', key: 'wkd_repay.o.part.1', mood: 'happy' }],
        lesson: 'wkd_repay.lesson.part',
      },
      {
        id: 'later', label: 'wkd_repay.c.later', mood: -3,
        outcome: [{ who: 'akka', key: 'wkd_repay.o.later.1', mood: 'neutral' }],
        lesson: 'wkd_repay.lesson.later',
      },
    ],
  },
  {
    id: 'wkd_goal', day: 5, location: 'home', hotspot: 'goal', kind: 'goal',
    concepts: ['goal_saving'],
    short: 'wkd_goal.short', hint: 'wkd_goal.hint',
    lines: [
      { who: 'narrator', key: 'wkd_goal.l1' },
      { who: 'you', key: 'wkd_goal.l2', mood: 'excited' },
    ],
    choices: [
      {
        id: 'buy', label: 'wkd_goal.c.buy',
        effects: () => [{ type: 'expense', from: 'goal', amount: GOAL_COST, category: 'goal', description: 'tx.goal' }],
        when: (v) => (v.balances.goal >= GOAL_COST ? true : 'why.goalShort'),
        flags: { goalBought: true }, mood: 15, memory: 'goal_unlocked', aura: 'memory:goal_unlocked',
        evidence: [{ concept: 'goal_saving', correct: true }],
        outcome: [
          { who: 'you', key: 'wkd_goal.o.buy.1', mood: 'excited' },
          { who: 'akka', key: 'wkd_goal.o.buy.2', mood: 'happy' },
        ],
        lesson: 'wkd_goal.lesson.buy',
      },
      {
        id: 'top_up', label: 'wkd_goal.c.top_up',
        effects: (v) => {
          const need = GOAL_COST - v.balances.goal;
          /** @type {Draft[]} */
          const d = [];
          const fromCash = Math.min(v.balances.cash, need);
          if (fromCash > 0) d.push({ type: 'transfer', from: 'cash', to: 'goal', amount: fromCash, description: 'tx.toGoal' });
          if (need - fromCash > 0) d.push({ type: 'transfer', from: 'savings', to: 'goal', amount: need - fromCash, description: 'tx.toGoal' });
          d.push({ type: 'expense', from: 'goal', amount: GOAL_COST, category: 'goal', description: 'tx.goal' });
          return d;
        },
        when: (v) => (v.balances.goal >= GOAL_COST ? 'why.goalReady' : v.balances.goal + v.balances.cash + v.balances.savings >= GOAL_COST ? true : 'why.notEnoughAtAll'),
        flags: { goalBought: true, toppedUp: true }, mood: 12, memory: 'goal_unlocked', aura: 'memory:goal_unlocked',
        evidence: [{ concept: 'goal_saving', correct: true }],
        outcome: [
          { who: 'you', key: 'wkd_goal.o.buy.1', mood: 'excited' },
          { who: 'akka', key: 'wkd_goal.o.top_up.2', mood: 'happy' },
        ],
        lesson: 'wkd_goal.lesson.top_up',
      },
      {
        id: 'new_plan', label: 'wkd_goal.c.new_plan',
        when: (v) => (v.balances.goal >= GOAL_COST ? 'why.goalReady' : true),
        flags: { newPlan: true }, mood: 2, aura: 'recover:new_plan',
        evidence: [{ concept: 'goal_saving', correct: true }],
        outcome: [
          { who: 'akka', key: 'wkd_goal.o.new_plan.1', mood: 'happy' },
          { who: 'narrator', key: 'wkd_goal.o.new_plan.2' },
        ],
        lesson: 'wkd_goal.lesson.new_plan',
      },
    ],
  },
  {
    id: 'wkd_future', day: 5, location: 'home', hotspot: 'laptop', kind: 'snowball',
    concepts: ['investing_risk'],
    short: 'wkd_future.short', hint: 'wkd_future.hint',
    lines: [
      { who: 'akka', key: 'wkd_future.l1', mood: 'smug' },
      { who: 'akka', key: 'wkd_future.l2', mood: 'happy' },
      { who: 'you', key: 'wkd_future.l3', mood: 'neutral' },
    ],
    choices: [
      {
        id: 'safe', label: 'wkd_future.c.safe', memory: 'snowball', aura: 'memory:snowball',
        evidence: [{ concept: 'investing_risk', correct: true }],
        outcome: [{ who: 'akka', key: 'wkd_future.o.safe.1', mood: 'happy' }],
        lesson: 'wkd_future.lesson',
      },
      {
        id: 'hype', label: 'wkd_future.c.hype', memory: 'snowball',
        evidence: [{ concept: 'investing_risk', correct: false }],
        outcome: [{ who: 'akka', key: 'wkd_future.o.hype.1', mood: 'worried' }],
        lesson: 'wkd_future.lesson',
      },
      {
        id: 'fund', label: 'wkd_future.c.fund', memory: 'snowball',
        evidence: [{ concept: 'investing_risk', correct: true }],
        outcome: [{ who: 'akka', key: 'wkd_future.o.fund.1', mood: 'neutral' }],
        lesson: 'wkd_future.lesson',
      },
    ],
  },
];

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

/** Memories the player can collect across all their weeks. */
export const MEMORIES = ['first_plan', 'movie_night', 'chai_walk', 'smart_wait', 'safety_net', 'akka_loan', 'scam_radar', 'scam_recovery', 'helping_arjun', 'stall_hustle', 'debt_free', 'goal_unlocked', 'snowball'];

/** Concepts grouped into the four learning pillars. */
export const PILLARS = {
  plan: ['budgeting', 'transfer_vs_expense', 'needs_wants', 'opportunity_cost'],
  save: ['emergency_fund', 'goal_saving', 'borrowing'],
  invest: ['investing_risk'],
  safe: ['scam_signs'],
};

/**
 * Messages in the phone. Some are just life; some lead to a story event.
 * @typedef {Object} Message
 * @property {string} id
 * @property {number} day
 * @property {'zoya' | 'arjun' | 'akka' | 'mom' | 'class' | 'raju' | 'unknown'} thread
 * @property {string} key
 * @property {(v: StoryView) => boolean} [showIf]
 * @property {string} [event]   Opening this message starts or points to an event.
 */

/** @type {Message[]} */
export const MESSAGES = [
  { id: 'm_mon_mom', day: 0, thread: 'mom', key: 'msg.mon.mom' },
  { id: 'm_mon_class', day: 0, thread: 'class', key: 'msg.mon.class' },
  { id: 'm_mon_akka', day: 0, thread: 'akka', key: 'msg.mon.akka' },
  { id: 'm_tue_zoya', day: 1, thread: 'zoya', key: 'msg.tue.zoya' },
  { id: 'm_tue_arjun', day: 1, thread: 'arjun', key: 'msg.tue.arjun' },
  { id: 'm_wed_raju', day: 2, thread: 'raju', key: 'msg.wed.raju' },
  { id: 'm_wed_class', day: 2, thread: 'class', key: 'msg.wed.class' },
  { id: 'm_thu_raju', day: 3, thread: 'raju', key: 'msg.thu.raju', showIf: (v) => v.flags.waited === true, event: 'thu_sale' },
  { id: 'm_thu_mom', day: 3, thread: 'mom', key: 'msg.thu.mom' },
  { id: 'm_thu_zoya', day: 3, thread: 'zoya', key: 'msg.thu.zoya.deal', showIf: (v) => v.flags.bought === 'deal' },
  { id: 'm_fri_unknown', day: 4, thread: 'unknown', key: 'msg.fri.unknown', event: 'fri_scam' },
  { id: 'm_fri_zoya_full', day: 4, thread: 'zoya', key: 'msg.fri.zoya.full', showIf: (v) => v.flags.outing === 'full' },
  { id: 'm_fri_zoya_cheap', day: 4, thread: 'zoya', key: 'msg.fri.zoya.cheap', showIf: (v) => v.flags.outing === 'cheap' },
  { id: 'm_fri_arjun_skip', day: 4, thread: 'arjun', key: 'msg.fri.arjun.skip', showIf: (v) => v.flags.outing === 'skip' },
  { id: 'm_wkd_unknown', day: 5, thread: 'unknown', key: 'msg.wkd.unknown', showIf: (v) => v.flags.scam === 'paid', event: 'wkd_scam2' },
  { id: 'm_wkd_aunty', day: 5, thread: 'mom', key: 'msg.wkd.mom' },
  { id: 'm_wkd_arjun', day: 5, thread: 'arjun', key: 'msg.wkd.arjun', showIf: (v) => v.flags.scamSpotted === true || v.flags.scam === 'checked' || v.flags.scam === 'reported' },
];
