import { describe, it, expect } from 'vitest';
import {
  START, sanitize, payDelivery, buyBikeNow, saveInsteadOfBike, payRepair, projectSavings, monthlyInterest,
  DELIVERY_PAY, BIKE_PRICE, REPAIR_COST,
} from './economy.js';

const afterDelivery = () => payDelivery(START).state;

describe('sanitize', () => {
  it('returns START for missing or malformed saves', () => {
    expect(sanitize(null)).toEqual(START);
    expect(sanitize({ cash: -5, savings: 0, debt: 0, aura: 0, bikeOwned: false, step: 'bike' })).toEqual(START);
    expect(sanitize({ cash: 1, savings: 0, debt: 0, aura: 0, bikeOwned: false, step: 'nope' })).toEqual(START);
  });

  it('keeps a valid save', () => {
    const s = { ...START, cash: 300, step: 'repair' };
    expect(sanitize(s)).toEqual(s);
  });
});

describe('delivery job', () => {
  it('pays once and moves to the bike decision', () => {
    const r = payDelivery(START);
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBe(START.cash + DELIVERY_PAY);
    expect(r.state.step).toBe('bike');
    expect(payDelivery(r.state).ok).toBe(false);
  });
});

describe('bike decision', () => {
  it('buying now spends cash and leaves no savings', () => {
    const r = buyBikeNow(afterDelivery());
    expect(r.ok).toBe(true);
    expect(r.state.bikeOwned).toBe(true);
    expect(r.state.cash).toBe(1000 + DELIVERY_PAY - BIKE_PRICE);
    expect(r.state.savings).toBe(0);
  });

  it('refuses the bike when cash is short', () => {
    const r = buyBikeNow({ ...START, step: 'bike', cash: BIKE_PRICE - 1 });
    expect(r.ok).toBe(false);
    expect(r.state.bikeOwned).toBe(false);
  });

  it('saving instead moves money into savings and skips the bike', () => {
    const r = saveInsteadOfBike(afterDelivery());
    expect(r.ok).toBe(true);
    expect(r.state.savings).toBe(2000);
    expect(r.state.bikeOwned).toBe(false);
    expect(r.state.aura).toBeGreaterThan(0);
  });
});

describe('phone repair consequence', () => {
  it('pays from savings without debt when savings cover it', () => {
    const base = { ...START, step: 'repair', savings: 2000, cash: 0 };
    const r = payRepair(base, 'savings');
    expect(r.ok).toBe(true);
    expect(r.state.savings).toBe(2000 - REPAIR_COST);
    expect(r.state.debt).toBe(0);
  });

  it('borrows the shortfall when paying from short cash', () => {
    const base = { ...START, step: 'repair', savings: 0, cash: 400 };
    const r = payRepair(base, 'cash');
    expect(r.state.cash).toBe(0);
    expect(r.state.debt).toBe(REPAIR_COST - 400);
    expect(r.message).toContain('₹');
  });

  it('refuses savings payment when savings are too small', () => {
    const r = payRepair({ ...START, step: 'repair', savings: 100 }, 'savings');
    expect(r.ok).toBe(false);
  });
});

describe('illustrative maths', () => {
  it('compounds a lump sum over 10 years at 8%', () => {
    expect(projectSavings(2000, 10, 0.08)).toBe(4318);
  });

  it('computes a monthly interest figure', () => {
    expect(monthlyInterest(1200, 0.36)).toBe(36);
  });
});
