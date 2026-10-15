import { describe, it, expect } from 'vitest';
import { parseOffline, offlineReply, parseAmount, answerQuestion, topicOf, sipValue } from './offlineLedger.js';

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
    expect(offlineReply([], 1000, 'who won the cricket match')).toContain('offline mode');
  });

  it('answers the buy-a-cycle-or-SIP question with the player\'s own number', () => {
    const q = 'I have to buy a cycle for thousand rupees or I can invest this amount in an sip what do you think is better';
    const reply = offlineReply(parseOffline(q).actions, 1000, q);
    expect(reply).toContain('cycle');
    expect(reply).toContain('SIP');
    expect(reply).toContain('₹1,000');
    expect(reply).toContain('Simulated only');
    expect(reply).not.toContain('I can log money');
  });
});

describe('questions are not transactions', () => {
  it('does not log a plan or question as spending', () => {
    expect(parseOffline('should I buy a cycle for 1000?').actions).toEqual([]);
    expect(parseOffline('I have to buy a cycle for thousand rupees or invest in a sip').actions).toEqual([]);
  });

  it('still logs a statement of what happened', () => {
    expect(parseOffline('I bought a cycle for 1000').actions).toEqual([{ type: 'expense', amount: 1000, label: 'Cycle' }]);
  });

  it('does not log a future plan', () => {
    expect(parseOffline('will spend 300 tomorrow').actions).toEqual([]);
  });

  it('treats "or so" as an estimate, not an alternative', () => {
    expect(parseOffline('spent 100 or so on chai').actions).toEqual([{ type: 'expense', amount: 100, label: 'Chai' }]);
  });
});

describe('money in and out', () => {
  it('logs being scammed as a loss, not income', () => {
    expect(parseOffline('got scammed of 2000 on OLX').actions).toEqual([{ type: 'expense', amount: 2000, label: 'OLX' }]);
  });

  it('reads "gave" as money received', () => {
    const { actions } = parseOffline('mom gave 500 for books, spent 450');
    expect(actions.map((a) => [a.type, a.amount])).toEqual([['income', 500], ['expense', 450]]);
  });

  it('logs orders and recharges as expenses', () => {
    expect(parseOffline('ordered biryani for 250').actions).toEqual([{ type: 'expense', amount: 250, label: 'Biryani' }]);
    expect(parseOffline('recharged 199').actions).toEqual([{ type: 'expense', amount: 199, label: 'Recharge' }]);
  });
});

describe('parseAmount', () => {
  it('reads digits, shorthand and words', () => {
    expect(parseAmount('₹1,200')).toBe(1200);
    expect(parseAmount('2k')).toBe(2000);
    expect(parseAmount('1.5 lakh')).toBe(150000);
    expect(parseAmount('thousand rupees')).toBe(1000);
    expect(parseAmount('two thousand')).toBe(2000);
    expect(parseAmount('five hundred')).toBe(500);
    expect(parseAmount('no money here')).toBeNull();
  });
});

describe('answerQuestion', () => {
  it('covers the core topics with labelled simulations', () => {
    expect(topicOf('what is a sip')).toBe('sip');
    expect(answerQuestion('what is a sip', 1000)).toContain('Simulated only');
    expect(topicOf('someone asked for my OTP')).toBe('scam');
    expect(topicOf('how do I budget my pocket money')).toBe('budget');
    expect(topicOf('is a credit card loan bad')).toBe('borrow');
    expect(answerQuestion('tell me about cricket', 1000)).toBeNull();
  });

  it('computes SIP growth correctly', () => {
    // ₹500 a month for 5 years at 8%: about ₹36,983 (start-of-month contributions).
    expect(Math.round(sipValue(500, 5))).toBeGreaterThan(36900);
    expect(Math.round(sipValue(500, 5))).toBeLessThan(37100);
  });
});
