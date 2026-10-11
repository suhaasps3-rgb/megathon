import { describe, it, expect } from 'vitest';
import { personaOf } from './persona';

const good = { choice: { isGood: true } };
const bad = { choice: { isGood: false } };

describe('personaOf', () => {
  it('calls heavy spenders spenders and penalises the score', () => {
    const p = personaOf({ wallet: 300, history: [bad, bad, bad], futureWealth: 0, goalCost: 500 });
    expect(p.id).toBe('spender');
    expect(p.spent).toBe(700);
    expect(p.goalReached).toBe(false);
  });
  it('flags idle cash', () => {
    expect(personaOf({ wallet: 1000, history: [good], futureWealth: 100 }).id).toBe('mattress');
  });
  it('rewards money put to work', () => {
    const p = personaOf({ wallet: 800, history: [good, good, good], futureWealth: 2000, goalCost: 500 });
    expect(p.id).toBe('stealth');
    expect(p.goalReached).toBe(true);
    expect(p.score).toBeGreaterThan(5000);
  });
  it('falls back to balanced and never goes negative', () => {
    expect(personaOf({ wallet: 700, history: [bad], futureWealth: 100 }).id).toBe('balanced');
    expect(personaOf({ wallet: 100, history: [bad, bad, bad, bad, bad, bad, bad, bad], futureWealth: 0 }).score).toBe(0);
  });
  it('has no goal outcome when there is no goal', () => {
    expect(personaOf({ wallet: 900, history: [] }).goalReached).toBeNull();
  });
});
