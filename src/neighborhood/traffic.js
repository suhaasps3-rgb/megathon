/**
 * Cars drive a closed loop of waypoints in their own lane. Movement is deterministic and does
 * not depend on the scene, so the lane and speed rules are tested. Cars are visual: they do not
 * block the player, and the player is not hit by them.
 */
import { RING_LOOP } from './city.js';

/** Metres from the road's centre line to a car's centre, toward the right-hand lane. */
export const LANE_OFFSET = 0.8;

export function loopLength(loop = RING_LOOP) {
  let total = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}

/**
 * The lane the cars follow: each corner is pushed to the right-hand side by a mitred offset, so
 * the path stays continuous at the turns instead of jumping by up to a metre.
 */
export function laneLoop(loop, lane = LANE_OFFSET) {
  const n = loop.length;
  return loop.map((p, i) => {
    const prev = loop[(i - 1 + n) % n];
    const next = loop[(i + 1) % n];
    const l1 = Math.hypot(p.x - prev.x, p.z - prev.z);
    const l2 = Math.hypot(next.x - p.x, next.z - p.z);
    const u1 = { x: (p.x - prev.x) / l1, z: (p.z - prev.z) / l1 };
    const u2 = { x: (next.x - p.x) / l2, z: (next.z - p.z) / l2 };
    const n1 = { x: -u1.z, z: u1.x };
    const n2 = { x: -u2.z, z: u2.x };
    const k = lane / (1 + n1.x * n2.x + n1.z * n2.z);
    return { x: p.x + (n1.x + n2.x) * k, z: p.z + (n1.z + n2.z) * k };
  });
}

/** A car at distance `s` along the loop: position in its lane and heading (rotation about y). */
export function poseAt(loop, s, lane = LANE_OFFSET) {
  const path = laneLoop(loop, lane);
  const total = loopLength(path);
  let d = ((s % total) + total) % total;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (d <= len) {
      const ux = (b.x - a.x) / len;
      const uz = (b.z - a.z) / len;
      return { x: a.x + ux * d, z: a.z + uz * d, heading: Math.atan2(ux, uz) };
    }
    d -= len;
  }
  return { x: path[0].x, z: path[0].z, heading: 0 };
}

export function createCar({ start = 0, speed = 7 } = {}) {
  return { s: start, speed };
}

/** Advances the car by `dt` seconds. Mutates and returns `car`. */
export function stepCar(car, dt) {
  car.s += car.speed * dt;
  return car;
}
