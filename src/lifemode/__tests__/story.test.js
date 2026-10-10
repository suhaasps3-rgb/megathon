import { describe, it, expect } from 'vitest';
import {
  newStoryState, beginWeek, choose, travel, endDay, rewind, currentEvent, presentChoices, dayEvents,
  balances, answerCheck, computeEnding, inbox, markRead, timeline, moneyStory, pillarProgress,
} from '../story/engine.js';
import { EVENTS, GOAL_COST, MEMORIES } from '../story/content.js';
import { auditLedger, totalAssets } from '../domain/ledger.js';
import { rupees as r } from '../domain/money.js';
import { loadStory, saveStory, STORY_KEY } from '../story/storage.js';
import { DICTS } from '../story/text.js';

function ok(res) {
  if (!res.ok) throw new Error(`Expected ok, got: ${res.error}`);
  return res.state;
}

function start(player = { name: 'Test', interest: 'music' }) {
  return ok(beginWeek(newStoryState(), player, 1));
}

/** Go to the current event's place (phone events happen anywhere) and choose. */
function act(gs, choiceId, extra) {
  const e = currentEvent(gs.run);
  if (!e) throw new Error('No current event');
  let s = gs;
  if (e.hotspot !== 'phone') s = ok(travel(s, e.location));
  return ok(choose(s, e.id, choiceId, extra));
}

/**
 * Play the whole week. `policy` maps event id → choice id, or an array in order of
 * preference; otherwise the first available choice is taken. Audits the ledger every step.
 */
function playWeek(policy = {}, { plan = { goal: 0, savings: 0 }, marked, pick } = {}) {
  let s = start();
  for (let guard = 0; guard < 60; guard += 1) {
    expect(auditLedger(s.run.ledger)).toEqual([]);
    if (s.run.status === 'ended') return s;
    const e = currentEvent(s.run);
    if (!e) { s = ok(endDay(s)); continue; }
    const avail = presentChoices(s.run, e.id).filter((c) => c.available).map((c) => c.choice.id);
    expect(avail.length).toBeGreaterThan(0);
    const pref = [policy[e.id]].flat().filter(Boolean);
    const id = pick ? pick(e, avail) : pref.find((p) => avail.includes(p)) ?? avail[0];
    s = act(s, id, e.kind === 'budget' ? plan : e.kind === 'scam' ? { marked: marked ?? [] } : undefined);
  }
  throw new Error('Week did not finish');
}

describe('story: Monday money', () => {
  it('pocket money arrives and the planned recharge goes out once', () => {
    const s = start();
    const b = balances(s.run);
    expect(b.cash).toBe(r(1200) - r(199));
    expect(b.goal).toBe(r(600));
    expect(s.run.ledger.transactions).toHaveLength(2);
  });

  it('moving money into jars is a transfer, not spending', () => {
    let s = start();
    const before = totalAssets(balances(s.run));
    s = act(s, 'plan', { goal: r(300), savings: r(200) });
    const b = balances(s.run);
    expect(totalAssets(b)).toBe(before);
    expect(b.cash).toBe(r(1001) - r(500));
    expect(b.savings).toBe(r(200));
    expect(b.goal).toBe(r(900));
    expect(s.run.memories).toContain('first_plan');
  });

  it('cannot move more than you have, or negative amounts', () => {
    const s = start();
    expect(choose(s, 'mon_plan', 'plan', { goal: r(900), savings: r(200) }).ok).toBe(false);
    expect(choose(s, 'mon_plan', 'plan', { goal: -100, savings: 0 }).ok).toBe(false);
    expect(choose(s, 'mon_plan', 'plan', { goal: 1.5, savings: 0 }).ok).toBe(false);
  });

  it('a decision applies once, even if sent twice', () => {
    let s = start();
    s = act(s, 'plan', { goal: r(100), savings: 0 });
    const again = choose(s, 'mon_plan', 'plan', { goal: r(100), savings: 0 });
    expect(again.ok && again.duplicate).toBe(true);
    expect(again.state).toBe(s);
  });

  it('the optional quick question counts once', () => {
    let s = act(start(), 'plan', { goal: 0, savings: r(100) });
    s = ok(answerCheck(s, 'mon_plan', 1));
    expect(s.run.checks.mon_plan.correct).toBe(true);
    const aura = s.profile.aura;
    const again = answerCheck(s, 'mon_plan', 0);
    expect(again.ok && again.duplicate).toBe(true);
    expect(again.state.profile.aura).toBe(aura);
  });
});

describe('story: flow and places', () => {
  it('the day cannot end while something is still happening', () => {
    expect(endDay(start()).ok).toBe(false);
  });

  it('locations unlock as the week goes on', () => {
    let s = start();
    expect(travel(s, 'market').ok).toBe(false);
    s = act(s, 'plan', {});
    s = ok(endDay(s));
    expect(s.run.day).toBe(1);
    expect(travel(s, 'hangout').ok).toBe(true);
    expect(travel(s, 'market').ok).toBe(false);
  });

  it('events only happen at their place', () => {
    let s = act(start(), 'plan', {});
    s = ok(endDay(s));
    expect(choose(s, 'tue_invite', 'skip').ok).toBe(false);
    s = ok(travel(s, 'hangout'));
    expect(choose(s, 'tue_invite', 'skip').ok).toBe(true);
  });

  it('unaffordable choices explain why instead of failing silently', () => {
    let s = act(start(), 'plan', { goal: r(900), savings: 0 }); // cash ₹101
    s = ok(endDay(s));
    const c = presentChoices(s.run, 'tue_invite').find((x) => x.choice.id === 'all_in');
    expect(c.available).toBe(false);
    expect(c.reason).toBe('why.notEnoughCash');
  });
});

describe('story: earlier choices change later events', () => {
  it('Tuesday’s plan decides what Friday evening looks like', () => {
    const full = playWeek({ mon_plan: 'plan', tue_invite: 'all_in' });
    expect(full.run.done.fri_movie).toBeDefined();
    expect(full.run.done.fri_chai).toBeUndefined();
    const cheap = playWeek({ tue_invite: 'cheaper' });
    expect(cheap.run.done.fri_chai).toBeDefined();
    expect(cheap.run.done.fri_movie).toBeUndefined();
    const skip = playWeek({ tue_invite: 'skip' });
    expect(skip.run.done.fri_chai ?? skip.run.done.fri_movie).toBeUndefined();
  });

  it('waiting on the deal brings the "sale ends today… again" message', () => {
    const s = playWeek({ wed_deal: 'wait' });
    expect(s.run.done.thu_sale).toBeDefined();
    expect(playWeek({ wed_deal: 'buy_alt' }).run.done.thu_sale).toBeUndefined();
  });

  it('paying the scam fee leads to a second ask; spotting it lets you help Arjun', () => {
    const paid = playWeek({ tue_invite: 'skip', wed_deal: 'wait', thu_twist: 'cash', fri_scam: 'pay' });
    expect(paid.run.done.wkd_scam2).toBeDefined();
    expect(paid.run.done.wkd_arjun).toBeUndefined();
    expect(moneyStory(paid.run).lost).toBe(r(99));
    const safe = playWeek({ fri_scam: 'report' });
    expect(safe.run.done.wkd_scam2).toBeUndefined();
    expect(safe.run.done.wkd_arjun).toBeDefined();
  });

  it('marking the real warning signs counts as spotting the scam', () => {
    const s = playWeek({ tue_invite: 'skip', wed_deal: 'wait', thu_twist: 'cash', fri_scam: 'pay' }, { marked: ['sender', 'won', 'fee', 'timer', 'link', 'otp'] });
    expect(s.run.flags.scamSpotted).toBe(true);
    expect(s.run.memories).toContain('scam_radar');
  });

  it('borrowing on Thursday means a repayment on the weekend', () => {
    const s = playWeek({ tue_invite: 'skip', wed_deal: 'wait', thu_twist: 'borrow', wkd_repay: 'full' }, { plan: { goal: r(300), savings: 0 } });
    expect(s.run.done.wkd_repay?.choiceId).toBe('full');
    expect(balances(s.run).debt).toBe(0);
    expect(s.run.ending.traits).toContain('debt_free');
  });

  it('putting off the repair costs more later', () => {
    const s = playWeek({ tue_invite: 'skip', wed_deal: 'wait', thu_twist: 'postpone', wkd_cycle: ['safety', 'goal'] }, { plan: { goal: 0, savings: r(500) } });
    expect(s.run.done.wkd_cycle).toBeDefined();
    const repair = s.run.ledger.transactions.find((t) => t.description === 'tx.repairLate');
    expect(repair.amount).toBe(r(450));
  });

  it('a safety jar on Monday pays for Thursday without touching the goal', () => {
    const s = playWeek({ tue_invite: 'cheaper', wed_deal: 'wait', thu_twist: 'safety', wkd_gig: 'help_goal', wkd_goal: ['buy', 'top_up'] }, { plan: { goal: r(450), savings: r(350) } });
    expect(s.run.flags.repair).toBe('safety');
    expect(s.run.flags.goalBought).toBe(true);
    expect(s.run.ending.id).toBe('goal');
  });

  it('spending it all early leaves the goal out of reach this week', () => {
    const s = playWeek({ tue_invite: 'all_in', wed_deal: ['buy_deal', 'buy_deal_goal'], thu_twist: ['goal', 'borrow'], wkd_gig: 'rest', wkd_goal: 'new_plan' });
    expect(s.run.flags.goalBought).toBeUndefined();
    expect(s.run.ending.id).not.toBe('goal');
    expect(s.run.ending.weeksToGoal).toBeGreaterThan(0);
  });
});

describe('story: ending, rewind and rewards', () => {
  it('the ending and review come from the recorded week', () => {
    const s = playWeek({ tue_invite: 'cheaper' }, { plan: { goal: r(200), savings: r(200) } });
    expect(s.run.status).toBe('ended');
    expect(s.run.ending).toEqual(computeEnding(s.run));
    const t = timeline(s.run);
    expect(t.map((x) => x.eventId)).toEqual(s.run.order);
    const ms = moneyStory(s.run);
    const b = balances(s.run);
    // Everything received is either still owned or went out as needs, wants, the goal, losses or repayments.
    expect(ms.received + r(600)).toBe(totalAssets(b) + ms.needs + ms.wants + ms.goalSpent + ms.lost + ms.repaid);
    expect(s.profile.seasonUnlocked).toBe(true);
    expect(s.profile.endings).toContain(s.run.ending.id);
  });

  it('rewinding restores that morning’s money but keeps memories and Aura', () => {
    let s = playWeek({ tue_invite: 'all_in' });
    const aura = s.profile.aura;
    const mems = s.profile.memories.length;
    s = ok(rewind(s, 1));
    expect(s.run.day).toBe(1);
    expect(s.run.status).toBe('playing');
    expect(s.run.done.tue_invite).toBeUndefined();
    expect(currentEvent(s.run).id).toBe('tue_invite');
    expect(s.profile.aura).toBe(aura);
    expect(s.profile.memories.length).toBe(mems);
    expect(rewind(s, 4).ok).toBe(false);
  });

  it('replaying the same path cannot farm Aura', () => {
    let s = playWeek();
    const aura = s.profile.aura;
    s = ok(rewind(s, 0));
    let guard = 0;
    while (s.run.status !== 'ended' && guard++ < 60) {
      const e = currentEvent(s.run);
      if (!e) { s = ok(endDay(s)); continue; }
      const first = presentChoices(s.run, e.id).find((c) => c.available).choice.id;
      s = act(s, first, e.kind === 'budget' ? { goal: 0, savings: 0 } : e.kind === 'scam' ? { marked: [] } : undefined);
    }
    expect(s.profile.aura).toBe(aura);
  });

  it('messages arrive by day and can be marked read', () => {
    let s = start();
    expect(inbox(s.run).every((m) => m.day === 0)).toBe(true);
    s = ok(markRead(s, ['m_mon_mom', 'nope']));
    expect(s.run.read).toEqual(['m_mon_mom']);
  });

  it('every pillar can be experienced in one week', () => {
    const s = playWeek({ wkd_future: 'safe' }, { plan: { goal: r(100), savings: r(100) } });
    const p = pillarProgress(s.profile);
    expect(Object.values(p).every((l) => l !== 'new')).toBe(true);
  });
});

describe('story: any path stays consistent', () => {
  it('random weeks never break the ledger and always offer a way forward', () => {
    let seed = 7;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const endings = new Set();
    for (let i = 0; i < 300; i += 1) {
      const cash = r(1001);
      const g = Math.floor(rand() * 21) * r(50);
      const sv = Math.floor(rand() * 21) * r(50);
      const plan = g + sv <= cash ? { goal: g, savings: sv } : { goal: 0, savings: 0 };
      const s = playWeek({}, { plan, pick: (_e, avail) => avail[Math.floor(rand() * avail.length)] });
      const b = balances(s.run);
      for (const k of ['cash', 'savings', 'goal', 'debt']) expect(b[k]).toBeGreaterThanOrEqual(0);
      endings.add(s.run.ending.id);
    }
    expect(endings.size).toBeGreaterThanOrEqual(2);
  });

  it('content references are valid', () => {
    const ids = new Set(EVENTS.map((e) => e.id));
    expect(ids.size).toBe(EVENTS.length);
    for (const e of EVENTS) {
      expect(e.choices.length).toBeGreaterThan(0);
      for (const c of e.choices) if (c.memory) expect(MEMORIES).toContain(c.memory);
    }
    expect(GOAL_COST).toBe(r(1500));
    expect(dayEvents(start().run).map((e) => e.id)).toEqual(['mon_plan']);
  });
});

describe('story: saving', () => {
  const mem = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
  };

  it('round-trips a week in progress', () => {
    const store = mem();
    const s = act(start(), 'plan', { goal: r(100), savings: r(100) });
    expect(saveStory(s, store)).toBe(true);
    const { state, notice } = loadStory(store);
    expect(notice).toBeNull();
    expect(state).toEqual(s);
  });

  it('drops a tampered run but keeps the profile', () => {
    const store = mem();
    const s = act(start(), 'plan', { goal: r(100), savings: 0 });
    const data = { version: 1, profile: s.profile, run: { ...s.run, ledger: { ...s.run.ledger, opening: { ...s.run.ledger.opening, cash: -5 } } } };
    store.setItem(STORY_KEY, JSON.stringify(data));
    const { state, notice } = loadStory(store);
    expect(state.run).toBeNull();
    expect(state.profile).toEqual(s.profile);
    expect(notice).toBe('save.runReset');
  });

  it('starts fresh on garbage', () => {
    const store = mem();
    store.setItem(STORY_KEY, '{not json');
    expect(loadStory(store).state.run).toBeNull();
  });
});

describe('translations', () => {
  const holes = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const lang of ['hi', 'te']) {
    it(`${lang} has every English key with the same placeholders`, () => {
      const missing = Object.keys(DICTS.en).filter((k) => !(k in DICTS[lang]));
      expect(missing).toEqual([]);
      const extra = Object.keys(DICTS[lang]).filter((k) => !(k in DICTS.en));
      expect(extra).toEqual([]);
      const mismatched = Object.keys(DICTS.en).filter((k) => holes(DICTS.en[k]) !== holes(DICTS[lang][k]));
      expect(mismatched).toEqual([]);
    });
  }
});
