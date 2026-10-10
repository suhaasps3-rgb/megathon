/**
 * Side missions for the 3D neighborhood. Templates are data: each says when it is eligible
 * and what completes it. Generation reads the real wallet, so a player is never offered a
 * task that needs money they do not have. Pure functions only, so the rules are testable.
 */
import { REPAIR_COST } from './economy.js';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const TEMPLATES = Object.freeze({
  'build-reserve': {
    id: 'build-reserve',
    category: 'Savings and emergencies',
    title: `Build a ${inr(REPAIR_COST)} emergency reserve`,
    objective: `Move ${inr(REPAIR_COST)} from cash into savings at the ATM.`,
    where: 'bank',
    reward: 25,
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

/** Order of preference when more than one template fits. */
const PRIORITY = ['build-reserve', 'compare-prices', 'cost-check'];

/** The mission state on the wallet. Older saves without one read as empty. */
export function missionStateOf(w) {
  return { active: w.mission?.active ?? null, history: w.mission?.history ?? [], completed: w.mission?.completed ?? [] };
}

/**
 * Chooses the next template for this wallet. It skips the two most recent ones so the player
 * does not get the same task back to back, and falls back to a no-cost task when nothing else fits.
 */
export function chooseTemplate(w) {
  const { history } = missionStateOf(w);
  const recent = history.slice(-2);
  const eligible = PRIORITY.map((id) => TEMPLATES[id]).filter((t) => t.eligible(w));
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
export function completeMission(w, templateId) {
  const m = missionStateOf(w);
  if (!m.active || m.active.templateId !== templateId) {
    return { ok: false, state: w, message: 'No matching mission is active.' };
  }
  const done = m.active;
  return {
    ok: true,
    state: {
      ...w,
      aura: w.aura + done.reward,
      mission: { active: null, history: [...m.history, done.templateId], completed: [...m.completed, done.id] },
    },
    message: `Mission complete: ${done.title}. +${done.reward} Aura.`,
  };
}

/** The ATM step of "build-reserve": move the repair amount from cash into savings, then complete. */
export function depositToReserve(w) {
  const m = missionStateOf(w);
  if (!m.active || m.active.templateId !== 'build-reserve') {
    return { ok: false, state: w, message: 'No savings mission is active.' };
  }
  if (w.cash < REPAIR_COST) return { ok: false, state: w, message: `You need ${inr(REPAIR_COST)} in cash to save.` };
  const moved = { ...w, cash: w.cash - REPAIR_COST, savings: w.savings + REPAIR_COST };
  const res = completeMission(moved, 'build-reserve');
  return { ...res, message: `Saved ${inr(REPAIR_COST)}. ${res.message}` };
}


