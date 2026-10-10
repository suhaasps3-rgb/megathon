import { BOUND } from './layout.js';

/** True when a circle of radius `r` at (x, z) overlaps any box. */
export function collides(x, z, obstacles, r) {
  return obstacles.some((o) => Math.abs(x - o.x) < o.hx + r && Math.abs(z - o.z) < o.hz + r);
}

/**
 * Moves one step on each axis separately, so the player slides along walls instead of
 * sticking to them. Stays inside the square bounds.
 */
export function moveWithCollision(pos, dx, dz, obstacles, r, bound = BOUND) {
  const clamp = (v) => Math.max(-bound, Math.min(bound, v));
  let { x, z } = pos;
  const nx = clamp(x + dx);
  if (!collides(nx, z, obstacles, r)) x = nx;
  const nz = clamp(z + dz);
  if (!collides(x, nz, obstacles, r)) z = nz;
  return { x, z };
}

/** The nearest point of interest within `range`, or null. */
export function nearestPoi(pos, pois, range) {
  let best = null;
  let bestDist = range;
  for (const p of pois) {
    const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    if (d <= bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}
