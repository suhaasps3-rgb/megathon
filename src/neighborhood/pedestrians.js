/**
 * Pedestrians walk fixed sidewalk loops. Each route is a list of points; a walker moves
 * straight to the next point, pauses there, then continues. Movement is deterministic, so
 * the routes can be tested. A walker that would step into a building waits instead.
 */
import { BOUND } from './layout.js';
import { collides } from './movement.js';

export const WALKER_RADIUS = 0.35;

/** Routes are kept clear of buildings and trees; the test suite checks every loop. */
export const WALKER_ROUTES = Object.freeze([
  { id: 'home-walk', color: '#f472b6', speed: 1.1, pause: 2.5, points: [{ x: -12, z: 9 }, { x: -2, z: 9 }, { x: -2, z: 11 }, { x: -12, z: 11 }] },
  { id: 'plaza', color: '#60a5fa', speed: 0.9, pause: 3, points: [{ x: 0, z: -1.5 }, { x: 3.5, z: -1.5 }, { x: 3.5, z: -4 }, { x: 0, z: -4 }] },
  { id: 'park', color: '#34d399', speed: 1.2, pause: 2, points: [{ x: 7, z: 9 }, { x: 13, z: 9 }, { x: 13, z: 12 }, { x: 7, z: 12 }] },
  { id: 'chai-lane', color: '#fbbf24', speed: 1, pause: 1.5, points: [{ x: -6, z: 2 }, { x: -6, z: 0.4 }, { x: -9, z: 0.4 }, { x: -9, z: 2 }] },
]);

export function createWalker(route) {
  const p = route.points[0];
  return { index: 0, x: p.x, z: p.z, wait: 0, moving: false, heading: 0 };
}

/**
 * Advances one walker by `dt` seconds. Mutates and returns `w` so the scene can reuse one
 * object per walker without allocating each frame.
 */
export function stepWalker(w, route, dt, obstacles, bound = BOUND) {
  if (w.wait > 0) {
    w.wait = Math.max(0, w.wait - dt);
    w.moving = false;
    return w;
  }
  const n = route.points.length;
  const to = route.points[(w.index + 1) % n];
  const dx = to.x - w.x;
  const dz = to.z - w.z;
  const dist = Math.hypot(dx, dz);
  const step = route.speed * dt;
  w.moving = false;
  if (dist <= step) {
    w.x = to.x;
    w.z = to.z;
    w.index = (w.index + 1) % n;
    w.wait = route.pause;
    return w;
  }
  const nx = w.x + (dx / dist) * step;
  const nz = w.z + (dz / dist) * step;
  if (Math.abs(nx) > bound || Math.abs(nz) > bound || collides(nx, nz, obstacles, WALKER_RADIUS)) return w;
  w.x = nx;
  w.z = nz;
  w.heading = Math.atan2(dx, dz);
  w.moving = true;
  return w;
}
