import { describe, it, expect } from 'vitest';
import { OBSTACLES, BOUND, POIS } from './layout.js';
import { collides } from './movement.js';
import { WALKER_ROUTES, WALKER_RADIUS, createWalker, stepWalker } from './pedestrians.js';

const FRAME = 1 / 60;

describe('pedestrian routes', () => {
  for (const route of WALKER_ROUTES) {
    it(`${route.id} walks two full loops without touching a building`, () => {
      const w = createWalker(route);
      let moved = 0;
      let prev = { x: w.x, z: w.z };
      for (let f = 0; f < 60 * 120 * 2; f++) {
        stepWalker(w, route, FRAME, OBSTACLES);
        expect(collides(w.x, w.z, OBSTACLES, WALKER_RADIUS)).toBe(false);
        expect(Math.abs(w.x)).toBeLessThanOrEqual(BOUND);
        expect(Math.abs(w.z)).toBeLessThanOrEqual(BOUND);
        moved += Math.hypot(w.x - prev.x, w.z - prev.z);
        prev = { x: w.x, z: w.z };
      }
      expect(moved).toBeGreaterThan(20);
    });
  }

  it('every waypoint is clear of obstacles', () => {
    for (const route of WALKER_ROUTES) {
      for (const p of route.points) expect(collides(p.x, p.z, OBSTACLES, WALKER_RADIUS)).toBe(false);
    }
  });

  it('routes do not stand on a place the player talks to', () => {
    for (const route of WALKER_ROUTES) {
      for (const p of route.points) {
        for (const poi of POIS) expect(Math.hypot(p.x - poi.x, p.z - poi.z)).toBeGreaterThan(1);
      }
    }
  });

  it('a walker pauses at each waypoint', () => {
    const route = WALKER_ROUTES[0];
    const w = createWalker(route);
    for (let f = 0; f < 60 * 30; f++) {
      stepWalker(w, route, FRAME, OBSTACLES);
      if (w.wait > 0) {
        expect(w.moving).toBe(false);
        return;
      }
    }
    throw new Error('walker never paused');
  });
});
