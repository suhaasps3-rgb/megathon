import { describe, it, expect } from 'vitest';
import { START, startNewRun, sanitize, REPAIR_COST } from './economy.js';
import {
  TEMPLATES, chooseTemplate, acceptMission, completeMission, depositToReserve, missionStateOf,
  repayDebt, takeShift, viewSipSimulation, sipGrowth,
} from './missions.js';

const wallet = (over = {}) => ({ ...START, step: 'done', ...over });

describe('mission generation', () => {
  it('offers a savings task when the player can afford one', () => {
    const w = wallet({ cash: 1000, savings: 0, debt: 0 });
    expect(chooseTemplate(w).id).toBe('build-reserve');
  });

  it('never offers a task that needs money the player does not have', () => {
    for (const cash of [0, 50, REPAIR_COST - 1]) {
      const t = chooseTemplate(wallet({ cash, savings: 0 }));
      expect(t.id).not.toBe('build-reserve');
      expect(t.eligible(wallet({ cash, savings: 0 }))).toBe(true);
    }
  });

  it('skips a savings task when the reserve is already full', () => {
    expect(chooseTemplate(wallet({ cash: 1000, savings: REPAIR_COST })).id).not.toBe('build-reserve');
  });

  it('offers debt repayment first when there is debt and cash', () => {
    expect(chooseTemplate(wallet({ cash: 500, debt: 200 })).id).toBe('repay-debt');
  });

  it('does not offer debt repayment when there is no cash to use', () => {
    expect(TEMPLATES['repay-debt'].eligible(wallet({ cash: 0, debt: 200 }))).toBe(false);
  });

  it('never offers the same task as the last two', () => {
    const history = ['build-reserve', 'earn-shift'];
    const w = wallet({ cash: 1000, savings: 0, mission: { active: null, history, completed: [] } });
    expect(history).not.toContain(chooseTemplate(w).id);
  });

  it('gives new players easy tasks first, but never hides urgent debt', () => {
    expect(chooseTemplate(wallet({ cash: 1000, debt: 0, savings: REPAIR_COST })).difficulty).toBe('Easy');
    expect(chooseTemplate(wallet({ cash: 1000, debt: 200 })).id).toBe('repay-debt');
  });

  it('unlocks harder tasks after three completions', () => {
    const veteran = wallet({ cash: 1000, debt: 200, mission: { active: null, history: [], completed: ['a', 'b', 'c'] } });
    expect(chooseTemplate(veteran).id).toBe('repay-debt');
  });
});

describe('new side missions', () => {
  it('keeps results across a save and load', () => {
    const a = acceptMission(wallet({ cash: 0 })).state;
    const done = completeMission(a, a.mission.active.templateId).state;
    expect(missionStateOf(done).results).toHaveLength(1);
  });

  it('a second shift pays into cash and completes', () => {
    const w = { ...wallet({ cash: 100 }), mission: { active: null, history: [], completed: [] } };
    const started = acceptMission({ ...w, mission: { ...w.mission, active: null } }).state;
    const forced = { ...started, mission: { ...started.mission, active: { ...started.mission.active, templateId: 'earn-shift' } } };
    const r = takeShift(forced);
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBe(100 + 800);
    expect(r.state.mission.results.at(-1)).toMatchObject({ before: { cash: 100 }, after: { cash: 900 } });
  });

  it('paying down debt uses cash and reduces the debt by the same amount', () => {
    const base = wallet({ cash: 300, debt: 500 });
    const w = { ...base, mission: { active: { id: 'repay-debt-1', templateId: 'repay-debt', title: 't', reward: 30, snapshot: { cash: 300, savings: 0, debt: 500 } }, history: [], completed: [] } };
    const r = repayDebt(w);
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBe(0);
    expect(r.state.debt).toBe(200);
    expect(r.state.aura).toBe(30);
  });

  it('the SIP simulation moves no money', () => {
    const w = { ...wallet({ cash: 900, savings: 100 }), mission: { active: { id: 's-1', templateId: 'sip-simulation', title: 't', reward: 20, snapshot: {} }, history: [], completed: [] } };
    const r = viewSipSimulation(w);
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBe(900);
    expect(r.state.savings).toBe(100);
    expect(r.message).toContain('Simulated only');
    expect(sipGrowth(500, 5)).toBeGreaterThan(36900);
  });
});

describe('accepting and completing', () => {
  it('keeps one active mission and ignores a second accept', () => {
    const first = acceptMission(wallet({ cash: 0 })).state;
    const again = acceptMission(first);
    expect(again.ok).toBe(false);
    expect(again.state.mission.active.id).toBe(first.mission.active.id);
  });

  it('pays the reward once, even if completed twice', () => {
    const w = acceptMission(wallet({ cash: 0 })).state;
    const id = w.mission.active.templateId;
    const once = completeMission(w, id);
    expect(once.ok).toBe(true);
    expect(once.state.aura).toBe(w.aura + TEMPLATES[id].reward);
    const twice = completeMission(once.state, id);
    expect(twice.ok).toBe(false);
    expect(twice.state.aura).toBe(once.state.aura);
  });

  it('refuses to complete a mission of another template', () => {
    const w = acceptMission(wallet({ cash: 0 })).state;
    expect(completeMission(w, 'build-reserve').ok).toBe(false);
  });

  it('records completed missions in history', () => {
    const w = acceptMission(wallet({ cash: 0 })).state;
    const done = completeMission(w, w.mission.active.templateId).state;
    expect(missionStateOf(done).history).toEqual([w.mission.active.templateId]);
    expect(missionStateOf(done).active).toBeNull();
  });
});

describe('savings mission', () => {
  it('moves the repair amount from cash to savings and completes', () => {
    const w = acceptMission(wallet({ cash: 1000, savings: 0 })).state;
    const r = depositToReserve(w);
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBe(1000 - REPAIR_COST);
    expect(r.state.savings).toBe(REPAIR_COST);
    expect(r.state.mission.active).toBeNull();
  });

  it('refuses the deposit when cash is short', () => {
    const w = { ...wallet({ cash: 100, savings: 0 }), mission: { active: { templateId: 'build-reserve', id: 'x', reward: 25, title: 't' }, history: [], completed: [] } };
    expect(depositToReserve(w).ok).toBe(false);
  });
});

describe('persistence', () => {
  it('keeps the mission field through a save and load', () => {
    const w = acceptMission(wallet({ cash: 0 })).state;
    expect(sanitize(JSON.parse(JSON.stringify(w))).mission.active.templateId).toBe(w.mission.active.templateId);
  });

  it('a new run clears the active mission but keeps history', () => {
    const a = acceptMission(wallet({ cash: 0 })).state;
    const w = completeMission(a, a.mission.active.templateId).state;
    const next = startNewRun({ ...w, mission: { ...w.mission, active: { id: 'y', templateId: 'cost-check' } } });
    expect(next.mission.active).toBeNull();
    expect(next.mission.history).toEqual(w.mission.history);
  });
});
