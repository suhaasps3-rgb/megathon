import { describe, it, expect } from 'vitest';
import { START, payDelivery, buyBikeNow, saveInsteadOfBike, payRepair, startNewRun, record } from './economy.js';
import { analyseRun } from './analysis.js';

const run = (...steps) => steps.reduce((w, f) => f(w).state, START);

describe('decision log', () => {
  it('records each successful choice with its before and after amounts', () => {
    const w = run(payDelivery);
    expect(w.log).toHaveLength(1);
    expect(w.log[0]).toMatchObject({ action: 'deliver', cashBefore: 1000, cashAfter: 2800 });
  });

  it('does not log a refused choice', () => {
    const w = payDelivery({ ...START, step: 'bike' });
    expect(w.ok).toBe(false);
    expect(w.state.log).toBeUndefined();
  });

  it('keeps only the most recent 20 entries', () => {
    let w = START;
    for (let i = 0; i < 25; i++) w = record(w, { ...w, aura: w.aura + 1 }, 'x');
    expect(w.log).toHaveLength(20);
  });

  it('starting a new run resets money and bumps the run count', () => {
    const fresh = startNewRun({ ...START, runs: 2, step: 'done' });
    expect(fresh.step).toBe('deliver');
    expect(fresh.runs).toBe(3);
    expect(fresh.log).toBeUndefined();
  });
});

describe('analyseRun', () => {
  it('refuses to analyse a save that has no decision record', () => {
    const r = analyseRun({ ...START, step: 'done' });
    expect(r.available).toBe(false);
    expect(r.reason).toContain('no decision record');
  });

  it('says the mission is unfinished rather than guessing', () => {
    expect(analyseRun(run(payDelivery)).available).toBe(false);
  });

  it('marks saving and an emergency-fund repair as strengths', () => {
    const w = run(payDelivery, saveInsteadOfBike, (s) => payRepair({ ...s, savings: s.savings }, 'savings'));
    const r = analyseRun(w);
    expect(r.available).toBe(true);
    expect(r.dimensions.find((d) => d.id === 'goal').level).toBe('strong');
    expect(r.dimensions.find((d) => d.id === 'emergency').level).toBe('strong');
    expect(r.improvement).toBeNull();
    expect(r.counterfactual.simulated).toBe(true);
  });

  it('flags buying the bike and borrowing for the repair with a real interest cost', () => {
    const w = run(payDelivery, buyBikeNow, (s) => payRepair(s, 'cash'));
    const r = analyseRun(w);
    expect(r.dimensions.find((d) => d.id === 'goal').level).toBe('weak');
    expect(r.cashflow.borrowed).toBe(200); // ₹400 cash left after bike, repair costs ₹600
    expect(r.dimensions.find((d) => d.id === 'cost').level).toBe('weak');
    expect(r.counterfactual.title).toBe('If you had saved the money');
    expect(r.counterfactual.text).toContain('Simulated only');
    expect(r.cashflow.bikeSpend).toBe(2400);
  });
});
