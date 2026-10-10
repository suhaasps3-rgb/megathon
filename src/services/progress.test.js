import { describe, it, expect } from 'vitest';
import { readProgress, LIFE_SAVE_KEY } from './progress.js';
import { STORAGE_KEY } from '../lifemode/persistence/storage.js';
import { STORAGE_KEY as WORLD_KEY } from '../neighborhood/economy.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem() {} });

describe('readProgress', () => {
  it('uses the same save key as Life Mode', () => {
    expect(LIFE_SAVE_KEY).toBe(STORAGE_KEY);
  });

  it('reports nothing started on a fresh browser', () => {
    const p = readProgress(memory());
    expect(p.life).toBeNull();
    expect(p.world).toEqual({ started: false, done: false, step: 1, cash: 1000 });
  });

  it('reads Life Mode level and an unfinished run', () => {
    const save = { version: 1, profile: { xp: 250, runsCompleted: 1 }, run: { phase: 'deciding' } };
    const p = readProgress(memory({ [LIFE_SAVE_KEY]: JSON.stringify(save) }));
    expect(p.life.inProgress).toBe(true);
    expect(p.life.runsCompleted).toBe(1);
    expect(p.life.level).toBeGreaterThanOrEqual(1);
  });

  it('reads the 3D world mission step and cash', () => {
    const w = { cash: 800, savings: 2000, debt: 0, aura: 90, bikeOwned: false, step: 'repair' };
    const p = readProgress(memory({ [WORLD_KEY]: JSON.stringify(w) }));
    expect(p.world).toEqual({ started: true, done: false, step: 3, cash: 800 });
  });

  it('survives storage that throws', () => {
    const broken = { getItem() { throw new Error('blocked'); } };
    expect(readProgress(broken).life).toBeNull();
  });
});
