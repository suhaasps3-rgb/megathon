import { describe, it, expect } from 'vitest';
import { isPlayableScenario } from './scenarioShape.js';
import { scenarios } from '../data/scenarios.js';

const choice = (text, cost = 0) => ({ text, cost, feedback: 'f', isGood: true });
const good = { theme: 'T', setup: 'S', decisions: [{ text: 'Q', choices: [choice('a', 100), choice('b')] }] };

describe('isPlayableScenario', () => {
  it('accepts a complete scenario and every built-in one', () => {
    expect(isPlayableScenario(good)).toBe(true);
    for (const s of Object.values(scenarios)) expect(isPlayableScenario(s)).toBe(true);
  });

  it('rejects shapes the Game screen would crash on', () => {
    for (const bad of [
      null,
      'text',
      {},
      { decisions: [] },
      { decisions: 'three' },
      { decisions: [{ text: 'Q' }] },
      { decisions: [{ text: 'Q', choices: [choice('only one')] }] },
      { decisions: [{ text: '', choices: [choice('a'), choice('b')] }] },
      { decisions: [{ text: 'Q', choices: [choice('a'), { cost: 5 }] }] },
      { decisions: [{ text: 'Q', choices: [choice('a', 'lots'), choice('b')] }] },
    ]) {
      expect(isPlayableScenario(bad)).toBe(false);
    }
  });
});
