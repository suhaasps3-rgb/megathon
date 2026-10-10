import { describe, it, expect } from 'vitest';
import { loadGame, saveGame, STORAGE_KEY, SAVE_VERSION } from '../persistence/storage.js';
import { choose, advance } from '../domain/game.js';
import { balancesOf } from '../domain/ledger.js';
import { rupees } from '../domain/money.js';
import { ok, toSaturday, playOut, begin } from './helpers.js';

function memoryStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

describe('persistence', () => {
  it('round-trips a run mid-decision and after a decision', () => {
    const store = memoryStore();
    const s0 = toSaturday();
    saveGame(s0, store);
    expect(loadGame(store)).toEqual({ state: s0, notice: null });
    const s1 = ok(choose(s0, 'saturday', 'save'));
    saveGame(s1, store);
    const { state } = loadGame(store);
    expect(state).toEqual(s1);
    // "Refresh" during feedback, then the same click again: nothing is applied twice.
    const again = choose(state, 'saturday', 'save');
    expect(again.duplicate).toBe(true);
    expect(balancesOf(again.state.run.ledger)).toEqual({ cash: rupees(300), savings: rupees(200), goal: 0, debt: 0 });
  });
  it('a completed run reloads as complete with its report data', () => {
    const store = memoryStore();
    const s = playOut(begin(), {});
    saveGame(s, store);
    const { state } = loadGame(store);
    expect(state.run.status).toBe('complete');
    expect(advance(state).ok).toBe(false);
  });
  it('handles empty, corrupted and old-version saves', () => {
    expect(loadGame(memoryStore()).notice).toBeNull();
    expect(loadGame(memoryStore({ [STORAGE_KEY]: '{not json' })).notice).toMatch(/damaged/);
    expect(loadGame(memoryStore({ [STORAGE_KEY]: JSON.stringify({ version: 0 }) })).notice).toMatch(/older version/);
    expect(loadGame(memoryStore({ [STORAGE_KEY]: JSON.stringify({ version: SAVE_VERSION, profile: { xp: -5 } }) })).notice).toMatch(/damaged/);
    expect(loadGame(null).notice).toMatch(/can’t be saved/);
  });
  it('drops a tampered run but keeps the profile', () => {
    const store = memoryStore();
    const s = ok(choose(toSaturday(), 'saturday', 'movie'));
    saveGame(s, store);
    const data = JSON.parse(store.m.get(STORAGE_KEY));
    data.run.ledger.transactions[0].amount = rupees(9000); // would overdraw cash
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    const { state, notice } = loadGame(store);
    expect(state.run).toBeNull();
    expect(state.profile.xp).toBe(s.profile.xp);
    expect(notice).toMatch(/couldn’t be restored/);
  });
  it('rejects a save claiming a pending decision that was already made', () => {
    const store = memoryStore();
    const s = ok(choose(toSaturday(), 'saturday', 'movie'));
    const bad = { ...s, run: { ...s.run, phase: 'deciding' } };
    saveGame(bad, store);
    expect(loadGame(store).state.run).toBeNull();
  });
  it('survives a store that throws', () => {
    const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() {} };
    expect(loadGame(throwing).notice).toMatch(/couldn’t be read/);
    expect(saveGame(begin(), throwing)).toBe(false);
  });
});
