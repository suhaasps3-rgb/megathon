import { describe, it, expect } from 'vitest';
import { collides, moveWithCollision, nearestPoi } from './movement.js';
import { OBSTACLES, POIS, PLAYER_RADIUS } from './layout.js';

const wall = [{ x: 0, z: 0, hx: 1, hz: 1 }];

describe('collision', () => {
  it('blocks a circle that overlaps a box and allows one that clears it', () => {
    expect(collides(1.2, 0, wall, 0.45)).toBe(true);
    expect(collides(1.6, 0, wall, 0.45)).toBe(false);
  });

  it('slides along a wall when only one axis is blocked', () => {
    const next = moveWithCollision({ x: -2, z: 0.5 }, 3, 0.2, wall, 0.45, 15);
    expect(next.x).toBeCloseTo(-2, 5); // blocked on x
    expect(next.z).toBeCloseTo(0.7, 5); // free on z
  });

  it('never leaves the world bounds', () => {
    const next = moveWithCollision({ x: 14.9, z: 0 }, 5, 0, [], PLAYER_RADIUS, 15);
    expect(next.x).toBe(15);
  });

  it('keeps every point of interest reachable from open ground', () => {
    for (const p of POIS) {
      expect(collides(p.x, p.z, OBSTACLES, PLAYER_RADIUS)).toBe(false);
    }
  });
});

describe('nearestPoi', () => {
  it('returns the closest point in range and null outside it', () => {
    expect(nearestPoi({ x: 0.2, z: -6.9 }, POIS, 2.2).id).toBe('bank');
    expect(nearestPoi({ x: 0, z: 0 }, POIS, 2.2)).toBeNull();
  });
});
