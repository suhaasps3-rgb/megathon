/**
 * Side missions for the 3D neighborhood. Templates are data: each says when it is eligible
 * and what completes it. Generation reads the real wallet, so a player is never offered a
 * task that needs money they do not have. Pure functions only, so the rules are testable.
 */
import { REPAIR_COST } from './economy.js';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const SHIFT_PAY = 800;
const SIP_MONTHLY = 500;

export const TEMPLATES = Object.freeze({
  'build-reserve': {
    id: 'build-reserve',
    category: 'Savings and emergencies',
    title: `Build a ${inr(REPAIR_COST)} emergency reserve`,
    objective: `Move ${inr(REPAIR_COST)} from cash into savings at the ATM.`,
    where: 'bank',
    reward: 25,
    difficulty: 'Easy',
    minutes: 2,
    // Only offered when the player can afford it, so the task never asks for money they lack.
    eligible: (w) => w.savings < REPAIR_COST && w.cash >= REPAIR_COST,
  },
  'compare-prices': {
    id: 'compare-prices',
    category: 'Comparing prices and fees',
    title: 'Compare the bike with bus fare',
    objective: 'At Cycle Mart, compare the bike price with three months of bus fare.',
    where: 'cycle',
    reward: 15,
    difficulty: 'Easy',
    minutes: 2,
    eligible: () => true,
  },
  'earn-shift': {
    id: 'earn-shift',
    category: 'Income and work',
    title: 'Take a second shift',
    objective: `Ask Ravi for another delivery shift. It pays ${inr(SHIFT_PAY)}.`,
    where: 'ravi',
    reward: 20,
    difficulty: 'Easy',
    minutes: 3,
    eligible: () => true,
  },
  'repay-debt': {
    id: 'repay-debt',
    category: 'Banking, credit and debt',
    title: 'Pay down your debt',
    objective: 'Use cash at the ATM to repay part of what you owe.',
    where: 'bank',
    reward: 30,
    difficulty: 'Medium',
    minutes: 4,
    // Debt is urgent, so it is offered even to new players. Only when there is debt and cash to pay it with.
    urgent: true,
    eligible: (w) => w.debt > 0 && w.cash > 0,
  },
  'sip-simulation': {
    id: 'sip-simulation',
    category: 'Investing education',
    title: 'Simulate a monthly SIP',
    objective: `At the ATM, see what ${inr(SIP_MONTHLY)} a month could grow to over 5 years. No money moves.`,
    where: 'bank',
    reward: 20,
    difficulty: 'Medium',
    minutes: 4,
    eligible: () => true,
  },
  'cost-check': {
    id: 'cost-check',
    category: 'Budgeting and spending',
    title: 'Price check at the chai cart',
    objective: 'Talk to the Chaiwala and compare a daily habit with saving the same money.',
    where: 'chai',
    reward: 10,
    // Needs no money, so it is always available as a fallback when cash is low.
    eligible: () => true,
  },
});

/** Order of preference when more than one template fits. Debt comes first when there is some. */
const PRIORITY = ['repay-debt', 'build-reserve', 'earn-shift', 'compare-prices', 'sip-simulation', 'cost-check'];

/** The mission state on the wallet. Older saves without one read as empty. */
export function missionStateOf(w) {
  return {
    active: w.mission?.active ?? null,
    history: w.mission?.history ?? [],
    completed: w.mission?.completed ?? [],
    results: w.mission?.results ?? [],
  };
}

/**
 * Chooses the next template for this wallet. It skips the two most recent ones so the player
 * does not get the same task back to back, and falls back to a no-cost task when nothing else fits.
 */
export function chooseTemplate(w) {
  const { history } = missionStateOf(w);
  const recent = history.slice(-2);
  let eligible = PRIORITY.map((id) => TEMPLATES[id]).filter((t) => t.eligible(w));
  // Newer players get easy tasks first; harder ones unlock after three completed missions.
  if (missionStateOf(w).completed.length < 3) {
    const easy = eligible.filter((t) => t.difficulty === 'Easy' || t.urgent);
    if (easy.length) eligible = easy;
  }
  return eligible.find((t) => !recent.includes(t.id)) || eligible[0] || TEMPLATES['cost-check'];
}

/** Builds a mission instance from a template and a snapshot of the wallet it was offered in. */
export function buildInstance(w) {
  const t = chooseTemplate(w);
  const { history, completed } = missionStateOf(w);
  return {
    id: `${t.id}-${completed.length + 1}`,
    templateId: t.id,
    category: t.category,
    title: t.title,
    objective: t.objective,
    where: t.where,
    reward: t.reward,
    difficulty: t.difficulty,
    minutes: t.minutes,
    snapshot: { cash: w.cash, savings: w.savings, debt: w.debt },
    offeredAfter: history.length,
    status: 'active',
  };
}

/** Starts a mission. Only one can be active, so accepting again changes nothing. */
export function acceptMission(w) {
  const m = missionStateOf(w);
  if (m.active) return { ok: false, state: w, message: `You already have a mission: ${m.active.title}.` };
  const active = buildInstance(w);
  return {
    ok: true,
    state: { ...w, mission: { ...m, active } },
    message: `New mission: ${active.title}.`,
  };
}

/**
 * Completes the active mission of this template. The active slot is cleared in the same step
 * that pays the reward, so a second completion finds nothing active and pays nothing.
 */
export function completeMission(w, templateId, changes = {}) {
  const m = missionStateOf(w);
  if (!m.active || m.active.templateId !== templateId) {
    return { ok: false, state: w, message: 'No matching mission is active.' };
  }
  const done = m.active;
  const after = { ...w, ...changes, aura: (w.aura || 0) + done.reward };
  // The result records the real before and after amounts, so the board can show what happened.
  const result = {
    id: done.id,
    templateId: done.templateId,
    before: done.snapshot,
    after: { cash: after.cash, savings: after.savings, debt: after.debt },
    reward: done.reward,
  };
  return {
    ok: true,
    state: {
      ...after,
      mission: {
        active: null,
        history: [...m.history, done.templateId],
        completed: [...m.completed, done.id],
        results: [...(m.results || []), result].slice(-10),
      },
    },
    message: `Mission complete: ${done.title}. +${done.reward} Aura.`,
  };
}

/** Repay as much of the debt as cash allows, up to what is owed, then complete. */
export function repayDebt(w) {
  const m = missionStateOf(w);
  if (!m.active || m.active.templateId !== 'repay-debt') return { ok: false, state: w, message: 'No debt mission is active.' };
  const pay = Math.min(w.cash, w.debt);
  if (pay <= 0) return { ok: false, state: w, message: 'You need cash and debt for this.' };
  const res = completeMission(w, 'repay-debt', { cash: w.cash - pay, debt: w.debt - pay });
  return { ...res, message: `Repaid ${inr(pay)}. ${res.message}` };
}

/** Second shift with Ravi: income is paid into cash, then the mission completes. */
export function takeShift(w) {
  const m = missionStateOf(w);
  if (!m.active || m.active.templateId !== 'earn-shift') return { ok: false, state: w, message: 'No shift mission is active.' };
  const res = completeMission(w, 'earn-shift', { cash: w.cash + SHIFT_PAY });
  return { ...res, message: `Earned ${inr(SHIFT_PAY)}. ${res.message}` };
}

/** Investing simulation at the ATM. Nothing is paid or taken; the mission completes after viewing. */
export function viewSipSimulation(w) {
  const m = missionStateOf(w);
  if (!m.active || m.active.templateId !== 'sip-simulation') return { ok: false, state: w, message: 'No simulation is active.' };
  const invested = SIP_MONTHLY * 60;
  const grown = Math.round(sipGrowth(SIP_MONTHLY, 5));
  const res = completeMission(w, 'sip-simulation');
  return { ...res, message: `Simulated only: ${inr(invested)} put in becomes about ${inr(grown)} at 8% a year. Returns are not guaranteed.` };
}

/** Future value of a monthly contribution (start of each month), simulated at 8% a year. */
export function sipGrowth(monthly, years, rate = 0.08) {
  const r = rate / 12;
  const n = years * 12;
  return monthly * (((1 + r) ** n - 1) / r) * (1 + r);
}

/** The ATM step of "build-reserve": move the repair amount from cash into savings, then complete. */
export function depositToReserve(w) {
  const m = missionStateOf(w);
  if (!m.active || m.active.templateId !== 'build-reserve') {
    return { ok: false, state: w, message: 'No savings mission is active.' };
  }
  if (w.cash < REPAIR_COST) return { ok: false, state: w, message: `You need ${inr(REPAIR_COST)} in cash to save.` };
  const res = completeMission(w, 'build-reserve', { cash: w.cash - REPAIR_COST, savings: w.savings + REPAIR_COST });
  return { ...res, message: `Saved ${inr(REPAIR_COST)}. ${res.message}` };
}


