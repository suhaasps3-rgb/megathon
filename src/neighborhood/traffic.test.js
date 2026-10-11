import { describe, it, expect } from 'vitest';
import { OBSTACLES } from './layout.js';
import { RING_LOOP, RING_HALF, ROAD_WIDTH, LAMPS } from './city.js';
import { LANE_OFFSET, laneLoop, loopLength, poseAt, createCar, stepCar } from './traffic.js';
import { collides } from './movement.js';

const onRing = (x, z) => {
  const band = ROAD_WIDTH / 2 + 0.2;
  const onX = Math.abs(Math.abs(x) - RING_HALF) <= band && Math.abs(z) <= RING_HALF + band;
  const onZ = Math.abs(Math.abs(z) - RING_HALF) <= band && Math.abs(x) <= RING_HALF + band;
  return onX || onZ;
};

describe('ring road traffic', () => {
  it('the loop is the ring perimeter', () => {
    expect(loopLength(RING_LOOP)).toBe(RING_HALF * 8);
  });

  it('a car in its lane keeps to the ring road for a full lap', () => {
    const car = createCar({ start: 13, speed: 7 });
    for (let f = 0; f < 60 * 120; f++) {
      stepCar(car, 1 / 60);
      const p = poseAt(RING_LOOP, car.s);
      expect(onRing(p.x, p.z), `${p.x.toFixed(2)},${p.z.toFixed(2)}`).toBe(true);
    }
  });

  it('a car is always exactly one lane-offset from the centre line, corners included', () => {
    const distToSegment = (p, a, b) => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
    };
    for (let s = 0; s < loopLength(laneLoop(RING_LOOP)); s += 0.7) {
      const p = poseAt(RING_LOOP, s);
      const nearest = Math.min(...RING_LOOP.map((a, i) => distToSegment(p, a, RING_LOOP[(i + 1) % 4])));
      expect(nearest).toBeCloseTo(LANE_OFFSET, 2);
    }
  });

  it('the path is continuous through each corner', () => {
    for (let s = 0; s < loopLength(laneLoop(RING_LOOP)); s += 0.05) {
      const a = poseAt(RING_LOOP, s);
      const b = poseAt(RING_LOOP, s + 0.05);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.06);
    }
  });

  it('returns to its starting pose after exactly one lap', () => {
    const a = poseAt(RING_LOOP, 10);
    const b = poseAt(RING_LOOP, 10 + loopLength(laneLoop(RING_LOOP)));
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.z).toBeCloseTo(a.z, 6);
  });

  it('heading points along the direction of travel', () => {
    // On the first edge the car drives in +x, so its forward vector is (1, 0).
    const p = poseAt(RING_LOOP, 5);
    expect(Math.sin(p.heading)).toBeCloseTo(1, 6);
    expect(Math.cos(p.heading)).toBeCloseTo(0, 6);
  });

  it('the ring never runs into a building', () => {
    for (let s = 0; s < loopLength(laneLoop(RING_LOOP)); s += 0.5) {
      const p = poseAt(RING_LOOP, s);
      expect(collides(p.x, p.z, OBSTACLES, 0.6)).toBe(false);
    }
  });

  it('lamps stand outside the carriageway', () => {
    for (const l of LAMPS) {
      expect(Math.max(Math.abs(l.x), Math.abs(l.z))).toBeGreaterThan(RING_HALF + ROAD_WIDTH / 2);
    }
  });
});
