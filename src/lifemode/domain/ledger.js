// @ts-check
/**
 * The ledger is the single financial source of truth for a run.
 *
 * Balances are never stored. They are derived by folding the transaction list over the
 * opening balances, so a balance cannot drift away from the history that explains it.
 *
 * Accounts (all owned by the player, all real money in the simulation):
 *   cash    – money available to spend right now (wallet + UPI balance).
 *   savings – emergency / general savings. Moving money here is NOT spending.
 *   goal    – money set aside for the player's chosen goal. Goal progress = goal balance.
 * Liability:
 *   debt    – money owed to someone else (a family loan in this game). No interest.
 *
 * Definitions:
 *   totalAssets = cash + savings + goal          (each rupee counted exactly once)
 *   netWorth    = totalAssets − debt
 *
 * Transaction types and their only permitted effects:
 *   income   world → cash|savings|goal     assets +amount
 *   expense  cash|savings|goal → world     assets −amount   (a purchase; has a category)
 *   loss     cash|savings|goal → world     assets −amount   (fraud, damage; not a purchase)
 *   transfer owned → different owned       assets unchanged
 *   borrow   world → cash, debt +amount    assets +amount, netWorth unchanged
 *   repay    cash → world, debt −amount    assets −amount, netWorth unchanged
 *
 * Credit is modelled only through `borrow`; no account may ever go negative.
 */

/** @typedef {import('./money.js').Paise} Paise */
/** @typedef {'cash' | 'savings' | 'goal'} AccountId */
/** @typedef {'income' | 'expense' | 'loss' | 'transfer' | 'borrow' | 'repay'} TxType */
/** @typedef {'need' | 'want' | 'goal' | 'family' | 'learning'} SpendCategory */

/**
 * @typedef {Object} Balances
 * @property {Paise} cash
 * @property {Paise} savings
 * @property {Paise} goal
 * @property {Paise} debt
 */

/**
 * A transaction the caller wants to make. The ledger assigns id and sequence.
 * @typedef {Object} TxDraft
 * @property {TxType} type
 * @property {Paise} amount Always a positive integer; direction comes from from/to.
 * @property {AccountId} [from]
 * @property {AccountId} [to]
 * @property {SpendCategory} [category]
 * @property {string} description
 * @property {string} [scenarioId]
 * @property {string} [choiceId]
 */

/**
 * @typedef {TxDraft & { id: string, seq: number }} Transaction
 */

/**
 * @typedef {Object} Ledger
 * @property {Balances} opening
 * @property {Transaction[]} transactions
 * @property {number} nextSeq
 */

/** @type {readonly AccountId[]} */
export const ACCOUNTS = Object.freeze(['cash', 'savings', 'goal']);
/** @type {readonly TxType[]} */
export const TX_TYPES = Object.freeze(['income', 'expense', 'loss', 'transfer', 'borrow', 'repay']);
/** @type {readonly SpendCategory[]} */
export const CATEGORIES = Object.freeze(['need', 'want', 'goal', 'family', 'learning']);

/** Hard cap so a corrupted save or a loop cannot grow history without bound. */
export const MAX_TRANSACTIONS = 500;

export const ACCOUNT_LABELS = Object.freeze({ cash: 'Cash', savings: 'Savings', goal: 'Goal fund' });

/**
 * @param {Partial<Balances>} opening
 * @returns {Ledger}
 */
export function createLedger(opening) {
  const o = { cash: 0, savings: 0, goal: 0, debt: 0, ...opening };
  for (const k of /** @type {(keyof Balances)[]} */ (['cash', 'savings', 'goal', 'debt'])) {
    if (!Number.isSafeInteger(o[k]) || o[k] < 0) throw new Error(`Opening ${k} must be a non-negative integer of paise`);
  }
  return { opening: o, transactions: [], nextSeq: 1 };
}

/** @param {unknown} a @returns {a is AccountId} */
function isAccount(a) {
  return typeof a === 'string' && /** @type {readonly string[]} */ (ACCOUNTS).includes(a);
}

/**
 * Validate one draft against the balances it would be applied to.
 * Returns an error message or null.
 * @param {Balances} b
 * @param {TxDraft} tx
 * @returns {string | null}
 */
export function validateTx(b, tx) {
  if (!tx || typeof tx !== 'object') return 'Transaction is missing';
  if (!(/** @type {readonly string[]} */ (TX_TYPES).includes(tx.type))) return `Unknown transaction type "${String(tx.type)}"`;
  if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) return 'Amount must be a positive whole number of paise';
  if (typeof tx.description !== 'string' || !tx.description) return 'Transaction needs a description';
  switch (tx.type) {
    case 'income':
      if (!isAccount(tx.to) || tx.from !== undefined) return 'Income must go into one account';
      return null;
    case 'borrow':
      if (tx.to !== 'cash' || tx.from !== undefined) return 'Borrowed money arrives as cash';
      return null;
    case 'expense':
    case 'loss':
      if (!isAccount(tx.from) || tx.to !== undefined) return 'Spending must come from one account';
      if (tx.type === 'expense' && !(/** @type {readonly string[]} */ (CATEGORIES).includes(String(tx.category)))) return 'Expense needs a category';
      if (b[tx.from] < tx.amount) return `Not enough in ${ACCOUNT_LABELS[tx.from]}`;
      return null;
    case 'transfer':
      if (!isAccount(tx.from) || !isAccount(tx.to)) return 'Transfer needs a source and destination account';
      if (tx.from === tx.to) return 'Transfer source and destination must differ';
      if (b[tx.from] < tx.amount) return `Not enough in ${ACCOUNT_LABELS[tx.from]}`;
      return null;
    case 'repay':
      if (tx.from !== 'cash' || tx.to !== undefined) return 'Repayments are paid from cash';
      if (b.debt < tx.amount) return 'Cannot repay more than is owed';
      if (b.cash < tx.amount) return 'Not enough in Cash';
      return null;
    default:
      return 'Unknown transaction type';
  }
}

/**
 * Pure: the balances after one already-validated transaction.
 * @param {Balances} b
 * @param {TxDraft} tx
 * @returns {Balances}
 */
export function applyToBalances(b, tx) {
  const n = { ...b };
  const a = tx.amount;
  switch (tx.type) {
    case 'income': n[/** @type {AccountId} */ (tx.to)] += a; break;
    case 'borrow': n.cash += a; n.debt += a; break;
    case 'expense':
    case 'loss': n[/** @type {AccountId} */ (tx.from)] -= a; break;
    case 'transfer': n[/** @type {AccountId} */ (tx.from)] -= a; n[/** @type {AccountId} */ (tx.to)] += a; break;
    case 'repay': n.cash -= a; n.debt -= a; break;
  }
  return n;
}

/**
 * Derive balances, optionally only from transactions with seq < `beforeSeq`.
 * @param {Ledger} ledger
 * @param {number} [beforeSeq]
 * @returns {Balances}
 */
export function balancesOf(ledger, beforeSeq = Infinity) {
  let b = { ...ledger.opening };
  for (const tx of ledger.transactions) {
    if (tx.seq >= beforeSeq) break;
    b = applyToBalances(b, tx);
  }
  return b;
}

/** @param {Balances} b */
export function totalAssets(b) {
  return b.cash + b.savings + b.goal;
}

/** @param {Balances} b */
export function netWorth(b) {
  return totalAssets(b) - b.debt;
}

/**
 * Atomically apply several drafts. Either every draft is valid in sequence and a new
 * ledger is returned, or nothing changes and the first error is returned.
 * @param {Ledger} ledger
 * @param {TxDraft[]} drafts
 * @returns {{ ok: true, ledger: Ledger, applied: Transaction[] } | { ok: false, error: string }}
 */
export function commit(ledger, drafts) {
  if (ledger.transactions.length + drafts.length > MAX_TRANSACTIONS) return { ok: false, error: 'Transaction history is full' };
  let b = balancesOf(ledger);
  let seq = ledger.nextSeq;
  /** @type {Transaction[]} */
  const applied = [];
  for (const d of drafts) {
    const err = validateTx(b, d);
    if (err) return { ok: false, error: err };
    b = applyToBalances(b, d);
    applied.push({ ...d, id: `tx-${seq}`, seq });
    seq += 1;
  }
  return {
    ok: true,
    ledger: { opening: ledger.opening, transactions: [...ledger.transactions, ...applied], nextSeq: seq },
    applied,
  };
}

/**
 * Totals for reporting, computed only from recorded transactions.
 * @param {Transaction[]} txs
 */
export function summarize(txs) {
  const s = {
    income: 0, expenses: 0, losses: 0, borrowed: 0, repaid: 0,
    toSavings: 0, toGoal: 0, fromSavings: 0, fromGoal: 0,
    /** @type {Record<SpendCategory, Paise>} */
    byCategory: { need: 0, want: 0, goal: 0, family: 0, learning: 0 },
  };
  for (const t of txs) {
    switch (t.type) {
      case 'income':
        s.income += t.amount;
        if (t.to === 'savings') s.toSavings += t.amount;
        if (t.to === 'goal') s.toGoal += t.amount;
        break;
      case 'expense':
        s.expenses += t.amount;
        s.byCategory[/** @type {SpendCategory} */ (t.category)] += t.amount;
        break;
      case 'loss': s.losses += t.amount; break;
      case 'borrow': s.borrowed += t.amount; break;
      case 'repay': s.repaid += t.amount; break;
      case 'transfer':
        if (t.to === 'savings') s.toSavings += t.amount;
        if (t.to === 'goal') s.toGoal += t.amount;
        if (t.from === 'savings') s.fromSavings += t.amount;
        if (t.from === 'goal') s.fromGoal += t.amount;
        break;
    }
  }
  return s;
}

/**
 * Full integrity check used on load and in tests. Returns a list of problems (empty = valid).
 * @param {unknown} ledger
 * @returns {string[]}
 */
export function auditLedger(ledger) {
  /** @type {string[]} */
  const problems = [];
  const l = /** @type {Ledger} */ (ledger);
  if (!l || typeof l !== 'object' || !l.opening || !Array.isArray(l.transactions)) return ['Ledger is malformed'];
  for (const k of ['cash', 'savings', 'goal', 'debt']) {
    const v = /** @type {Record<string, unknown>} */ (l.opening)[k];
    if (!Number.isSafeInteger(v) || /** @type {number} */ (v) < 0) problems.push(`Opening ${k} is invalid`);
  }
  if (problems.length) return problems;
  if (l.transactions.length > MAX_TRANSACTIONS) problems.push('Too many transactions');
  let b = { ...l.opening };
  let lastSeq = 0;
  const ids = new Set();
  for (const tx of l.transactions) {
    if (!tx || typeof tx.id !== 'string' || ids.has(tx.id)) { problems.push('Duplicate or missing transaction id'); break; }
    ids.add(tx.id);
    if (!Number.isSafeInteger(tx.seq) || tx.seq <= lastSeq) { problems.push('Transactions out of order'); break; }
    lastSeq = tx.seq;
    const err = validateTx(b, tx);
    if (err) { problems.push(`${tx.id}: ${err}`); break; }
    b = applyToBalances(b, tx);
  }
  if (!Number.isSafeInteger(l.nextSeq) || l.nextSeq <= lastSeq) problems.push('Sequence counter is behind history');
  return problems;
}
