import { describe, it, expect } from 'vitest';
import { parseOffline, offlineReply } from './offlineLedger.js';

describe('parseOffline', () => {
  it('reads a simple expense with a label', () => {
    expect(parseOffline('I spent 200 on pizza').actions).toEqual([{ type: 'expense', amount: 200, label: 'Pizza' }]);
  });

  it('reads income and rupee symbols', () => {
    expect(parseOffline('got ₹500 from my aunt').actions).toEqual([{ type: 'income', amount: 500, label: 'Aunt' }]);
  });

  it('splits two actions joined by "and"', () => {
    const { actions } = parseOffline('spent 50 on chai and earned 1,200 for tutoring');
    expect(actions.map((a) => [a.type, a.amount])).toEqual([['expense', 50], ['income', 1200]]);
  });

  it('ignores questions with no money action', () => {
    expect(parseOffline('what is a SIP?').actions).toEqual([]);
    expect(parseOffline('').actions).toEqual([]);
  });
});

describe('offlineReply', () => {
  it('summarises actions with the new balance', () => {
    expect(offlineReply([{ type: 'expense', amount: 200, label: 'Pizza' }], 800)).toBe('Logged: spent ₹200 (pizza). Your balance is ₹800.');
  });

  it('gives an example when nothing was understood', () => {
    expect(offlineReply([], 1000)).toContain('I spent 120 on lunch');
  });
});
