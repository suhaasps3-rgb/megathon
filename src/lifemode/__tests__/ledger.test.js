import { describe, it, expect } from 'vitest';
import { createLedger, commit, balancesOf, totalAssets, netWorth, summarize, auditLedger, validateTx } from '../domain/ledger.js';
import { rupees, formatINR } from '../domain/money.js';

const L500 = () => createLedger({ cash: rupees(500) });

describe('money', () => {
  it('stores whole paise and formats rupees', () => {
    expect(rupees(500)).toBe(50000);
    expect(rupees(0.1) + rupees(0.2)).toBe(rupees(0.3));
    expect(formatINR(150000)).toBe('₹1,500');
    expect(formatINR(-29900)).toBe('−₹299');
    expect(formatINR(80000, { sign: true })).toBe('+₹800');
  });
});

describe('mandatory ₹500 example (ledger level)', () => {
  const cases = [
    { name: 'A: spend ₹300', drafts: [{ type: 'expense', from: 'cash', amount: rupees(300), category: 'want', description: 'x' }], cash: 200, savings: 0, assets: 200, expense: 300, transfer: 0 },
    { name: 'B: spend ₹100', drafts: [{ type: 'expense', from: 'cash', amount: rupees(100), category: 'want', description: 'x' }], cash: 400, savings: 0, assets: 400, expense: 100, transfer: 0 },
    { name: 'C: transfer ₹200', drafts: [{ type: 'transfer', from: 'cash', to: 'savings', amount: rupees(200), description: 'x' }], cash: 300, savings: 200, assets: 500, expense: 0, transfer: 200 },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const res = commit(L500(), c.drafts);
      expect(res.ok).toBe(true);
      const b = balancesOf(res.ledger);
      expect(b.cash).toBe(rupees(c.cash));
      expect(b.savings).toBe(rupees(c.savings));
      expect(totalAssets(b)).toBe(rupees(c.assets));
      const s = summarize(res.ledger.transactions);
      expect(s.expenses).toBe(rupees(c.expense));
      expect(s.toSavings).toBe(rupees(c.transfer));
      expect(res.ledger.transactions).toHaveLength(1);
    });
  }
});

describe('validation', () => {
  const b = { cash: rupees(500), savings: 0, goal: 0, debt: 0 };
  it.each([0, -100, 1.5, NaN, Infinity, '100'])('rejects amount %s', (amount) => {
    expect(validateTx(b, { type: 'expense', from: 'cash', amount, category: 'want', description: 'x' })).toMatch(/positive/);
  });
  it('rejects overspending and over-transfer', () => {
    expect(validateTx(b, { type: 'expense', from: 'cash', amount: rupees(501), category: 'want', description: 'x' })).toMatch(/Not enough/);
    expect(validateTx(b, { type: 'transfer', from: 'savings', to: 'cash', amount: 1, description: 'x' })).toMatch(/Not enough/);
  });
  it('rejects malformed transfers and unknown accounts', () => {
    expect(validateTx(b, { type: 'transfer', from: 'cash', to: 'cash', amount: 1, description: 'x' })).toMatch(/differ/);
    expect(validateTx(b, { type: 'transfer', from: 'cash', to: 'bank', amount: 1, description: 'x' })).toMatch(/source and destination/);
    expect(validateTx(b, { type: 'expense', from: 'cash', amount: 1, description: 'x' })).toMatch(/category/);
    expect(validateTx(b, { type: 'mint', to: 'cash', amount: 1, description: 'x' })).toMatch(/Unknown/);
    expect(validateTx(b, { type: 'income', to: 'cash', amount: 1, description: '' })).toMatch(/description/);
  });
  it('rejects repaying more than owed', () => {
    expect(validateTx({ ...b, debt: rupees(100) }, { type: 'repay', from: 'cash', amount: rupees(200), description: 'x' })).toMatch(/more than is owed/);
  });
});

describe('atomicity and invariants', () => {
  it('a failing batch changes nothing', () => {
    const l = L500();
    const res = commit(l, [
      { type: 'transfer', from: 'cash', to: 'savings', amount: rupees(400), description: 'ok' },
      { type: 'expense', from: 'cash', amount: rupees(200), category: 'want', description: 'fails' },
    ]);
    expect(res.ok).toBe(false);
    expect(l.transactions).toHaveLength(0);
    expect(balancesOf(l).cash).toBe(rupees(500));
  });
  it('transfers never change total assets; borrowing/repaying never change net worth', () => {
    let l = L500();
    const step = (d) => {
      const before = balancesOf(l);
      const r = commit(l, [d]);
      expect(r.ok).toBe(true);
      l = r.ledger;
      return [before, balancesOf(l)];
    };
    let [a, b] = step({ type: 'transfer', from: 'cash', to: 'goal', amount: rupees(250), description: 't' });
    expect(totalAssets(b)).toBe(totalAssets(a));
    [a, b] = step({ type: 'borrow', to: 'cash', amount: rupees(800), description: 'b' });
    expect(netWorth(b)).toBe(netWorth(a));
    expect(totalAssets(b) - totalAssets(a)).toBe(rupees(800));
    [a, b] = step({ type: 'repay', from: 'cash', amount: rupees(800), description: 'r' });
    expect(netWorth(b)).toBe(netWorth(a));
    expect(b.debt).toBe(0);
    [a, b] = step({ type: 'income', to: 'cash', amount: rupees(1500), description: 'i' });
    expect(totalAssets(b) - totalAssets(a)).toBe(rupees(1500));
    [a, b] = step({ type: 'loss', from: 'cash', amount: rupees(100), description: 'l' });
    expect(totalAssets(a) - totalAssets(b)).toBe(rupees(100));
    expect(auditLedger(l)).toEqual([]);
  });
  it('balances at any point are reproducible from history', () => {
    const r = commit(L500(), [
      { type: 'expense', from: 'cash', amount: rupees(100), category: 'want', description: 'a' },
      { type: 'transfer', from: 'cash', to: 'savings', amount: rupees(100), description: 'b' },
    ]);
    expect(balancesOf(r.ledger, 2)).toEqual({ cash: rupees(400), savings: 0, goal: 0, debt: 0 });
    expect(balancesOf(r.ledger)).toEqual({ cash: rupees(300), savings: rupees(100), goal: 0, debt: 0 });
  });
  it('audit catches tampered or duplicated history', () => {
    const r = commit(L500(), [{ type: 'expense', from: 'cash', amount: rupees(100), category: 'want', description: 'a' }]);
    const tampered = { ...r.ledger, transactions: [{ ...r.ledger.transactions[0], amount: rupees(900) }] };
    expect(auditLedger(tampered).length).toBeGreaterThan(0);
    const dup = { ...r.ledger, transactions: [r.ledger.transactions[0], r.ledger.transactions[0]] };
    expect(auditLedger(dup).length).toBeGreaterThan(0);
    expect(auditLedger({ nope: true })).toEqual(['Ledger is malformed']);
  });
});
