import { describe, it, expect } from 'vitest';
import { START, startNewRun, sanitize, REPAIR_COST } from './economy.js';
import {
  chooseTemplate, acceptMission, completeMission, depositToReserve, missionStateOf,
} from './missions.js';

const wallet = (over = {}) => ({ ...START, step: 'done', ...over });

describe('mission generation', () => {
  it('offers a savings task when the player can afford one', () => {
    expect(chooseTemplate(wallet({ cash: 1000, savings: 0 })).id).toBe('build-reserve');
  });

  it('never asks for money the player does not have', () => {
    expect(chooseTemplate(wallet({ cash: REPAIR_COST - 1, savings: 0 })).id).toBe('cost-check');
  });

  it('skips a savings task when the reserve is already full', () => {
    expect(chooseTemplate(wallet({ cash: 1000, savings: REPAIR_COST })).id).toBe('cost-check');
  });

  it('does not offer the same task twice in a row', () => {
    const w = wallet({ cash: 1000, savings: 0, mission: { active: null, history: ['build-reserve'], completed: [] } });
    expect(chooseTemplate(w).id).toBe('cost-check');
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
    const once = completeMission(w, 'cost-check');
    expect(once.ok).toBe(true);
    expect(once.state.aura).toBe(w.aura + 10);
    const twice = completeMission(once.state, 'cost-check');
    expect(twice.ok).toBe(false);
    expect(twice.state.aura).toBe(once.state.aura);
  });

  it('refuses to complete a mission of another template', () => {
    const w = acceptMission(wallet({ cash: 0 })).state;
    expect(completeMission(w, 'build-reserve').ok).toBe(false);
  });

  it('records completed missions in history', () => {
    const done = completeMission(acceptMission(wallet({ cash: 0 })).state, 'cost-check').state;
    expect(missionStateOf(done).history).toEqual(['cost-check']);
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
    expect(sanitize(JSON.parse(JSON.stringify(w))).mission.active.templateId).toBe('cost-check');
  });

  it('a new run clears the active mission but keeps history', () => {
    const w = completeMission(acceptMission(wallet({ cash: 0 })).state, 'cost-check').state;
    const next = startNewRun({ ...w, mission: { ...w.mission, active: { id: 'y', templateId: 'cost-check' } } });
    expect(next.mission.active).toBeNull();
    expect(next.mission.history).toEqual(['cost-check']);
  });
});
