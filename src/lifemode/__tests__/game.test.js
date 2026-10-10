import { describe, it, expect } from 'vitest';
import { newGame, startRun, advance, choose, presentChoices, answerCheck, recordExplanation, recordLabRun, supportFor, viewOf } from '../domain/game.js';
import { balancesOf, summarize, totalAssets } from '../domain/ledger.js';
import { levelFrom } from '../domain/learning.js';
import { replayChoice } from '../domain/replay.js';
import { buildReport } from '../domain/report.js';
import { simulate } from '../domain/futureLab.js';
import { rupees } from '../domain/money.js';
import { ok, begin, toSaturday, deepFreeze, playOut } from './helpers.js';

const SAVER = { start: 'course', saturday: 'save', allowance: 'goal_first', subscription: 'cancel', phone: 'use_savings', gig: 'accept_save', kyc_sms: 'report', plan: 'big', future_lab: 'keep_safe', festival: 'handmade', goal_day: 'buy' };
const SPENDER = { start: 'cycle', saturday: 'movie', allowance: 'flexible', subscription: 'keep', phone: 'borrow', gig: 'decline', repay: 'later', kyc_sms: 'share_otp', scam_recovery: 'report_fast', plan: 'none', future_lab: 'single_stock', festival: 'family', repay_final: 'full', goal_day: ['alternative', 'wait'] };
const ALL_FLAGS = ['greeting', 'urgency', 'link', 'otp'];

describe('mandatory ₹500 example through the game engine', () => {
  const expected = {
    movie: { cash: 200, savings: 0, assets: 200, expense: 300, toSavings: 0 },
    chai: { cash: 400, savings: 0, assets: 400, expense: 100, toSavings: 0 },
    save: { cash: 300, savings: 200, assets: 500, expense: 0, toSavings: 200 },
  };
  for (const [choiceId, e] of Object.entries(expected)) {
    it(`option ${choiceId}`, () => {
      const s0 = toSaturday();
      const b0 = balancesOf(s0.run.ledger);
      expect(b0).toEqual({ cash: rupees(500), savings: 0, goal: 0, debt: 0 });
      const txBefore = s0.run.ledger.transactions.length;
      const s1 = ok(choose(s0, 'saturday', choiceId));
      const b = balancesOf(s1.run.ledger);
      expect(b.cash).toBe(rupees(e.cash));
      expect(b.savings).toBe(rupees(e.savings));
      expect(totalAssets(b)).toBe(rupees(e.assets));
      const sum = summarize(s1.run.ledger.transactions);
      expect(sum.expenses).toBe(rupees(e.expense));
      expect(sum.toSavings).toBe(rupees(e.toSavings));
      // Exactly one state transition, one transaction, one decision.
      expect(s1.run.ledger.transactions.length - txBefore).toBe(1);
      expect(s1.run.decisions.filter((d) => d.scenarioId === 'saturday')).toHaveLength(1);
      // Report agrees with the ledger.
      const r = buildReport(s1);
      expect(r.endAssets).toBe(rupees(e.assets));
      expect(r.totals.expenses).toBe(rupees(e.expense));
      // Goal progress comes only from the goal account, so a savings transfer is not goal progress.
      expect(b.goal).toBe(0);
    });
  }
  it('the transfer is labelled as a transfer, not a purchase', () => {
    const s1 = ok(choose(toSaturday(), 'saturday', 'save'));
    const tx = s1.run.ledger.transactions.at(-1);
    expect(tx.type).toBe('transfer');
    expect(s1.run.decisions.at(-1).outcome.why).toMatch(/total stayed ₹500/);
  });
  it('previews match what the choice actually does', () => {
    const s0 = toSaturday();
    const save = presentChoices(s0).find((o) => o.choice.id === 'save');
    expect(save.preview).toEqual({ cash: -rupees(200), savings: rupees(200), goal: 0, debt: 0, assets: 0 });
  });
});

describe('decision integrity', () => {
  it('is idempotent: choosing twice applies once', () => {
    const s0 = toSaturday();
    const s1 = ok(choose(s0, 'saturday', 'movie'));
    const again = choose(s1, 'saturday', 'movie');
    expect(again.ok && again.duplicate).toBe(true);
    expect(again.state).toBe(s1);
    const other = choose(s1, 'saturday', 'save');
    expect(other.ok && other.duplicate).toBe(true);
    expect(balancesOf(other.state.run.ledger).cash).toBe(rupees(200));
  });
  it('rejects stale, unknown or out-of-phase choices without changing state', () => {
    const s0 = deepFreeze(toSaturday());
    expect(choose(s0, 'phone', 'cash').ok).toBe(false);
    expect(choose(s0, 'saturday', 'nope').ok).toBe(false);
    const s1 = ok(choose(s0, 'saturday', 'chai'));
    expect(advance(s0).ok).toBe(false); // deciding: must choose first
    expect(s1.run.phase).toBe('feedback');
  });
  it('unaffordable choices are disabled with a reason and cannot be forced', () => {
    let s = toSaturday();
    s = ok(choose(s, 'saturday', 'movie'));
    s = ok(advance(s)); // allowance (+1500)
    s = ok(choose(s, 'allowance', 'flexible'));
    s = ok(advance(s));
    s = ok(choose(s, 'subscription', 'keep'));
    s = ok(advance(s)); s = ok(advance(s)); s = ok(advance(s)); // chapter 3 → phone
    expect(s.run.scenarioId).toBe('phone');
    const opts = presentChoices(s);
    const savings = opts.find((o) => o.choice.id === 'use_savings');
    expect(savings.available).toBe(false);
    expect(savings.reason).toMatch(/no savings/);
    expect(choose(s, 'phone', 'use_savings').ok).toBe(false);
    expect(opts.find((o) => o.choice.id === 'borrow').available).toBe(true); // always a path forward
  });
  it('losses are never previewed', () => {
    const s = playOut(begin(), SAVER, { onStep: () => {} });
    expect(s.run.status).toBe('complete');
    // Re-run up to the scam message and inspect previews.
    let t = begin();
    while (t.run.scenarioId !== 'kyc_sms' || t.run.phase !== 'deciding') {
      t = t.run.phase === 'deciding' ? ok(choose(t, t.run.scenarioId, presentChoices(t).find((o) => o.available).choice.id)) : ok(advance(t));
    }
    const share = presentChoices(t).find((o) => o.choice.id === 'share_otp');
    expect(share.preview).toBeNull();
  });
});

describe('full runs and branching', () => {
  it('a saver reaches the goal; every step keeps the ledger valid', () => {
    const s = playOut(begin(), SAVER, { marked: { kyc_sms: ALL_FLAGS } });
    expect(s.run.status).toBe('complete');
    expect(s.run.flags.goalBought).toBe(true);
    expect(s.profile.achievements.goal_reached).toBeDefined();
    expect(s.profile.achievements.emergency_ready).toBeDefined();
    expect(s.profile.achievements.scam_spotter).toBeDefined();
    // Subtle scam variant after showing scam skill.
    expect(s.run.visited).toContain('collect_request');
    expect(s.run.visited).not.toContain('fake_screenshot');
  });
  it('a spender takes different branches and can still recover', () => {
    const s = playOut(begin(), SPENDER);
    expect(s.run.status).toBe('complete');
    const v = s.run.visited;
    expect(v).toContain('repay');          // borrowed → repayment scenario appears
    expect(v).toContain('scam_recovery');  // scammed → recovery scenario
    expect(v).toContain('fake_screenshot'); // still learning → supportive variant
    expect(v).toContain('repay_final');
    expect(balancesOf(s.run.ledger).debt).toBe(0);
    expect(s.profile.achievements.comeback).toBeDefined();
    // Delayed consequence: the kept subscription renewed in chapter 5.
    expect(s.run.ledger.transactions.some((t) => t.description === 'Streaming subscription auto-renewed')).toBe(true);
  });
  it('postponing a repair returns later at a higher price', () => {
    const s = playOut(begin(), { ...SAVER, phone: 'wait' });
    expect(s.run.visited).toContain('phone_again');
    expect(s.run.ledger.transactions.some((t) => t.amount === rupees(1000) && t.description.includes('worse damage'))).toBe(true);
  });
  it('report values come from recorded state', () => {
    const s = playOut(begin(), SPENDER);
    const r = buildReport(s);
    const t = summarize(s.run.ledger.transactions);
    expect(r.totals).toEqual(t);
    expect(r.endAssets).toBe(totalAssets(balancesOf(s.run.ledger)));
    expect(r.startAssets + t.income + t.borrowed - t.expenses - t.losses - t.repaid).toBe(r.endAssets);
    expect(r.decisions).toHaveLength(s.run.decisions.length);
    expect(r.practice).toContain('otp_pin_safety');
    expect(r.reflection.at(-1)).toMatch(/fictional/);
  });
});

describe('rewards cannot be farmed', () => {
  it('restarting does not re-award first-time XP or badges', () => {
    const first = playOut(begin(), SAVER, { marked: { kyc_sms: ALL_FLAGS } });
    const xpAfterFirst = first.profile.xp;
    const badges = Object.keys(first.profile.achievements).length;
    const second = playOut(begin(first), SAVER, { marked: { kyc_sms: ALL_FLAGS } });
    expect(second.profile.xp).toBe(xpAfterFirst);
    expect(Object.keys(second.profile.achievements)).toHaveLength(badges);
    expect(second.run.xpGained).toBe(0);
    expect(second.profile.runsCompleted).toBe(2);
  });
  it('exploring a new option in a later run earns only the small exploration bonus', () => {
    const first = playOut(begin(), SAVER, { marked: { kyc_sms: ALL_FLAGS } });
    let s = toSaturday('course', first);
    const xp = s.profile.xp;
    s = ok(choose(s, 'saturday', 'chai'));
    expect(s.profile.xp - xp).toBe(5);
  });
  it('check XP is paid once, only for a correct first attempt; retries earn none', () => {
    let s = begin();
    s = ok(choose(s, 'start', 'course'));
    const xp = s.profile.xp;
    s = ok(answerCheck(s, 'start', 0)); // wrong
    expect(s.profile.xp).toBe(xp);
    s = ok(answerCheck(s, 'start', 1)); // retry, right
    expect(s.profile.xp).toBe(xp);
    expect(answerCheck(s, 'start', 1).duplicate).toBe(true);
  });
  it('lab experiments with identical settings count once', () => {
    let s = begin();
    s = ok(recordLabRun(s, 'a'));
    expect(recordLabRun(s, 'a').duplicate).toBe(true);
    s = ok(recordLabRun(s, 'b'));
    s = ok(recordLabRun(s, 'c'));
    expect(s.profile.achievements.lab_explorer).toBeDefined();
    s = ok(recordExplanation(ok(recordExplanation(ok(recordExplanation(s))))));
    expect(s.profile.achievements.curious_mind).toBeDefined();
  });
});

describe('Choice Replay', () => {
  it('compares outcomes without touching live state, XP or mastery', () => {
    let s = ok(choose(toSaturday(), 'saturday', 'movie'));
    deepFreeze(s); // any mutation would throw
    const json = JSON.stringify(s);
    const r = replayChoice(s, 'saturday', 'save');
    expect(r.ok).toBe(true);
    expect(r.actual.balances.cash).toBe(rupees(200));
    expect(r.actual.assets).toBe(rupees(200));
    expect(r.actual.spent).toBe(rupees(300));
    expect(r.hypothetical.balances).toEqual({ cash: rupees(300), savings: rupees(200), goal: 0, debt: 0 });
    expect(r.hypothetical.assets).toBe(rupees(500));
    expect(r.hypothetical.saved).toBe(rupees(200));
    expect(JSON.stringify(s)).toBe(json);
  });
  it('replays from the balances before the decision, even later in the run', () => {
    let s = toSaturday();
    s = ok(choose(s, 'saturday', 'movie'));
    s = ok(advance(s));
    s = ok(choose(s, 'allowance', 'balanced'));
    const r = replayChoice(s, 'saturday', 'chai');
    expect(r.before.cash).toBe(rupees(500));
    expect(r.hypothetical.balances.cash).toBe(rupees(400));
  });
  it('cannot replay an undecided scenario', () => {
    expect(replayChoice(toSaturday(), 'saturday', 'save').ok).toBe(false);
  });
});

describe('adaptive learning', () => {
  it('a misconception triggers extra support; later correct answers reduce it', () => {
    let s = begin();
    s = ok(choose(s, 'start', 'course'));
    s = ok(answerCheck(s, 'start', 0)); // thinks a transfer loses money
    expect(supportFor(s.profile, 'transfer_vs_expense')).toBe('extra');
    expect(levelFrom(s.profile.mastery.transfer_vs_expense)).toBe('learning');
    s = ok(answerCheck(s, 'start', 1)); // corrected on retry
    expect(supportFor(s.profile, 'transfer_vs_expense')).toBe('standard');
    s = ok(advance(ok(advance(ok(advance(s))))));
    s = ok(choose(s, 'saturday', 'save'));
    s = ok(answerCheck(s, 'saturday', 1)); // applied correctly later
    expect(levelFrom(s.profile.mastery.transfer_vs_expense)).toBe('confident');
    expect(supportFor(s.profile, 'transfer_vs_expense')).toBe('brief');
  });
  it('mastery and XP are separate', () => {
    let s = begin();
    s = ok(choose(s, 'start', 'course'));
    const xp = s.profile.xp;
    s = ok(answerCheck(s, 'start', 0));
    expect(s.profile.xp).toBe(xp); // a wrong answer costs nothing and earns nothing
    expect(s.profile.mastery.transfer_vs_expense).toHaveLength(1);
    // Neutral trade-off decisions earn XP but no mastery evidence.
    let t = toSaturday();
    const ev = Object.values(t.profile.mastery).flat().length;
    t = ok(choose(t, 'saturday', 'movie'));
    expect(Object.values(t.profile.mastery).flat().length).toBe(ev);
    expect(t.profile.xp).toBeGreaterThan(0);
  });
  it('scam variant adapts to demonstrated skill', () => {
    const skilled = playOut(begin(), { kyc_sms: 'report' }, { marked: { kyc_sms: ALL_FLAGS } });
    expect(skilled.run.visited).toContain('collect_request');
    let levelOnEntry = null;
    const learning = playOut(begin(), { kyc_sms: 'click' }, {
      marked: { kyc_sms: ['bank'] },
      onStep: (st) => { if (st.run.scenarioId === 'fake_screenshot' && st.run.phase === 'deciding') levelOnEntry = viewOf(st.profile, st.run).mastery('scam_signs'); },
    });
    expect(learning.run.visited).toContain('fake_screenshot');
    expect(levelOnEntry).toBe('learning');
  });
  it('the inspection grade is recorded with the decision', () => {
    const s = playOut(begin(), { kyc_sms: 'report' }, { marked: { kyc_sms: ['greeting', 'urgency', 'link', 'otp'] } });
    const d = s.run.decisions.find((x) => x.scenarioId === 'kyc_sms');
    expect(d.inspection).toMatchObject({ found: 4, total: 4, falsePositives: 0, correct: true });
  });
});

describe('Future Lab model', () => {
  it('is deterministic and shows concentrated risk spreading wider', () => {
    const a = simulate({ savings: 0, index: 0, single: 100 }, 10);
    const b = simulate({ savings: 0, index: 0, single: 100 }, 10);
    expect(a).toEqual(b);
    const idx = simulate({ savings: 0, index: 100, single: 0 }, 10);
    const sav = simulate({ savings: 100, index: 0, single: 0 }, 10);
    expect(a.best - a.worst).toBeGreaterThan(idx.best - idx.worst);
    expect(sav.best).toBe(sav.worst);
    expect(() => simulate({ savings: 50, index: 0, single: 0 }, 5)).toThrow();
  });
});

describe('new run state', () => {
  it('starts with ₹500 cash, nothing else, and no rewards', () => {
    const s = ok(startRun(newGame(), { name: '  Asha  ' }, 1));
    expect(s.run.character.name).toBe('Asha');
    expect(balancesOf(s.run.ledger)).toEqual({ cash: rupees(500), savings: 0, goal: 0, debt: 0 });
    expect(s.run.phase).toBe('intro');
    expect(s.profile.xp).toBe(0);
  });
});

describe('recovery after heavy losses', () => {
  it('a player who loses money to every scam can still partially repay and finish', () => {
    const s = playOut(begin(), { ...SPENDER, festival: 'both', repay_final: ['full', 'partial'] });
    expect(s.run.status).toBe('complete');
    const repaid = summarize(s.run.ledger.transactions).repaid;
    expect(repaid).toBeGreaterThan(0);
    const r = buildReport(s);
    expect(r.reflection.join(' ')).toMatch(/still owe|repaid/);
  });
});
