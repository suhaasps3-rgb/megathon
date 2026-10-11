import { describe, it, expect } from 'vitest';
import { START } from './economy.js';
import { SHOPS, buyItem, findItem } from './shops.js';
import { OBSTACLES, POIS, BOUND } from './layout.js';
import { collides } from './movement.js';

const shop = SHOPS.grocery;

describe('buying', () => {
  it('spends the price, leaves the rest, and logs the purchase', () => {
    const r = buyItem({ ...START, cash: 500 }, 'grocery', 'milk');
    expect(r.ok).toBe(true);
    expect(r.state.cash).toBe(440);
    expect(r.state.log.at(-1)).toMatchObject({ action: 'shop-milk', cashBefore: 500, cashAfter: 440 });
  });

  it('refuses an item the player cannot afford and changes nothing', () => {
    const w = { ...START, cash: 500 };
    const r = buyItem(w, 'grocery', 'headphones');
    expect(r.ok).toBe(false);
    expect(r.state).toBe(w);
  });

  it('refuses an item that is not sold here', () => {
    expect(buyItem(START, 'grocery', 'yacht').ok).toBe(false);
    expect(buyItem(START, 'nowhere', 'milk').ok).toBe(false);
  });

  it('every item has a positive price and a kind', () => {
    for (const i of shop.items) {
      expect(i.price).toBeGreaterThan(0);
      expect(['need', 'want']).toContain(i.kind);
      expect(findItem('grocery', i.id)).toBe(i);
    }
  });
});

describe('the store in the world', () => {
  const store = OBSTACLES.find((o) => o.id === 'store');
  const poi = POIS.find((p) => p.id === 'store');

  it('has a building and a place to talk to it', () => {
    expect(store).toBeTruthy();
    expect(poi).toBeTruthy();
  });

  it('the player can stand at the counter without touching the building', () => {
    expect(collides(poi.x, poi.z, OBSTACLES, 0.45)).toBe(false);
  });

  it('the building stays inside the map', () => {
    expect(Math.abs(store.z) + store.hz).toBeLessThanOrEqual(BOUND);
    expect(Math.abs(store.x) + store.hx).toBeLessThanOrEqual(BOUND);
  });
});
