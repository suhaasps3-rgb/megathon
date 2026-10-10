/**
 * Money rules for the 3D neighborhood. Pure functions only: each takes a wallet and returns
 * { ok, state, message }, so the scene only renders state and never does arithmetic itself.
 * Every successful choice is appended to `state.log`, so the results screen analyses what
 * the player actually did rather than a generic summary.
 */

export const STORAGE_KEY = 'paisapath.neighborhood.v1';

export const DELIVERY_PAY = 1800;
export const BIKE_PRICE = 2400;
export const SAVE_AMOUNT = 2000;
export const REPAIR_COST = 600;
/** Illustrative only: a credit-card style rate, used to show what borrowing costs. */
export const LOAN_RATE_YEARLY = 0.36;
/** Illustrative only: a long-run growth assumption, never a guaranteed return. */
export const GROWTH_RATE_YEARLY = 0.08;
export const CHAI_PRICE = 10;
const MAX_LOG = 20;

export const START = Object.freeze({
  cash: 1000,
  savings: 0,
  debt: 0,
  aura: 0,
  bikeOwned: false,
  step: 'deliver', // deliver -> bike -> repair -> done
});

const isCount = (n) => Number.isFinite(n) && n >= 0;

/** Returns a valid wallet, falling back to START for anything missing or malformed. */
export function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return { ...START };
  const steps = ['deliver', 'bike', 'repair', 'done'];
  const ok = isCount(raw.cash) && isCount(raw.savings) && isCount(raw.debt) && isCount(raw.aura)
    && typeof raw.bikeOwned === 'boolean' && steps.includes(raw.step);
  return ok ? { ...raw } : { ...START };
}

/** Compound growth of a lump sum over `years`, rounded to whole rupees. */
export function projectSavings(amount, years = 10, rate = GROWTH_RATE_YEARLY) {
  return Math.round(amount * (1 + rate) ** years);
}

export function monthlyInterest(principal, rate = LOAN_RATE_YEARLY) {
  return Math.round((principal * rate) / 12);
}

/**
 * Appends one decision to the log, keeping the most recent MAX_LOG. `before` is the wallet
 * the choice started from, so the analysis can show exactly what it changed.
 */
export function record(before, after, action) {
  const entry = {
    action,
    step: before.step,
    cashBefore: before.cash,
    cashAfter: after.cash,
    savingsBefore: before.savings,
    savingsAfter: after.savings,
    debtBefore: before.debt,
    debtAfter: after.debt,
  };
  const log = [...(before.log || []), entry].slice(-MAX_LOG);
  return { ...after, log };
}

export function payDelivery(s) {
  if (s.step !== 'deliver') return { ok: false, state: s, message: 'Ravi has no more work for you today.' };
  const next = { ...s, cash: s.cash + DELIVERY_PAY, aura: s.aura + 50, step: 'bike' };
  return {
    ok: true,
    state: record(s, next, 'deliver'),
    message: `Ravi paid ₹${DELIVERY_PAY.toLocaleString('en-IN')} for the delivery run.`,
  };
}

export function buyBikeNow(s) {
  if (s.step !== 'bike') return { ok: false, state: s, message: 'The bike decision is already made.' };
  if (s.cash < BIKE_PRICE) return { ok: false, state: s, message: `You need ₹${BIKE_PRICE} in cash for the bike.` };
  const next = { ...s, cash: s.cash - BIKE_PRICE, bikeOwned: true, aura: s.aura + 10, step: 'repair' };
  return {
    ok: true,
    state: record(s, next, 'buy-bike'),
    message: `Bike bought. ₹${s.cash - BIKE_PRICE} cash left and no savings.`,
  };
}

export function saveInsteadOfBike(s) {
  if (s.step !== 'bike') return { ok: false, state: s, message: 'The bike decision is already made.' };
  if (s.cash < SAVE_AMOUNT) return { ok: false, state: s, message: `You need ₹${SAVE_AMOUNT} in cash to save.` };
  const next = { ...s, cash: s.cash - SAVE_AMOUNT, savings: s.savings + SAVE_AMOUNT, aura: s.aura + 40, step: 'repair' };
  return {
    ok: true,
    state: record(s, next, 'save-instead'),
    message: `Saved ₹${SAVE_AMOUNT.toLocaleString('en-IN')}. The bike can wait.`,
  };
}

/**
 * Pay the phone repair from savings (no debt) or from cash. Paying from cash when cash is
 * short borrows the gap, and the monthly interest is shown to the player.
 */
export function payRepair(s, source) {
  if (s.step !== 'repair') return { ok: false, state: s, message: 'Nothing to repair right now.' };
  if (source === 'savings') {
    if (s.savings < REPAIR_COST) return { ok: false, state: s, message: 'Savings are too small for this.' };
    const next = { ...s, savings: s.savings - REPAIR_COST, aura: s.aura + 30, step: 'done' };
    return {
      ok: true,
      state: record(s, next, 'repair-savings'),
      message: `Repaired from savings. Your emergency fund absorbed it.`,
    };
  }
  if (s.cash >= REPAIR_COST) {
    const next = { ...s, cash: s.cash - REPAIR_COST, aura: s.aura + 20, step: 'done' };
    return {
      ok: true,
      state: record(s, next, 'repair-cash'),
      message: `Repaired from cash. ₹${s.cash - REPAIR_COST} cash left.`,
    };
  }
  const shortfall = REPAIR_COST - s.cash;
  const next = { ...s, cash: 0, debt: s.debt + shortfall, aura: s.aura, step: 'done' };
  return {
    ok: true,
    state: record(s, next, 'repair-borrow'),
    message: `Short by ₹${shortfall}. Borrowed it at ${LOAN_RATE_YEARLY * 100}% a year, about ₹${monthlyInterest(shortfall)} a month.`,
  };
}

/** A fresh run that keeps the run count, so replaying is an explicit, single reset. */
export function startNewRun(s) {
  return { ...START, runs: (s.runs || 0) + 1 };
}

/** Reads the saved wallet. Storage can be blocked or hold junk, so any failure yields START. */
export function loadWallet(store = globalThis.localStorage) {
  try {
    return sanitize(JSON.parse(store.getItem(STORAGE_KEY)));
  } catch {
    return { ...START };
  }
}

/** Writes the wallet. Returns false when the browser refuses storage, so the game keeps running. */
export function saveWallet(s, store = globalThis.localStorage) {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
