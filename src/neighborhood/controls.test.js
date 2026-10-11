import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONTROLS, sanitizeControls, loadControls, saveControls, cameraRelativeMove, applyLook,
  stickVector, keyboardVector, MIN_PITCH, MAX_PITCH,
} from './controls.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const near = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('preferences', () => {
  it('clamps sensitivity and rejects bad types', () => {
    expect(sanitizeControls({ sensitivity: 9, invertY: 'yes' })).toEqual({ sensitivity: 2, invertY: false });
    expect(sanitizeControls({ sensitivity: -1, invertY: true })).toEqual({ sensitivity: 0.5, invertY: true });
    expect(sanitizeControls(null)).toEqual(DEFAULT_CONTROLS);
  });

  it('round-trips through storage and survives junk', () => {
    const store = memory();
    expect(saveControls({ sensitivity: 1.5, invertY: true }, store)).toBe(true);
    expect(loadControls(store)).toEqual({ sensitivity: 1.5, invertY: true });
    store.setItem('paisapath.neighborhood.controls.v1', '{bad json');
    expect(loadControls(store)).toEqual(DEFAULT_CONTROLS);
  });

  it('reports refused storage instead of throwing', () => {
    const broken = { setItem: () => { throw new Error('quota'); }, getItem: () => { throw new Error('denied'); } };
    expect(saveControls(DEFAULT_CONTROLS, broken)).toBe(false);
    expect(loadControls(broken)).toEqual(DEFAULT_CONTROLS);
  });
});

describe('camera-relative movement', () => {
  it('matches plain WASD when the camera faces its default direction', () => {
    expect(cameraRelativeMove(0, -1, 0)).toEqual({ x: 0, z: -1 }); // W walks away from the camera
    expect(cameraRelativeMove(1, 0, 0)).toEqual({ x: 1, z: 0 }); // D walks right
  });

  it('turns with the camera so W always goes where the view points', () => {
    const forward = cameraRelativeMove(0, -1, Math.PI / 2);
    near(forward.x, -1);
    near(forward.z, 0);
  });

  it('keeps movement length unchanged after rotation', () => {
    const m = cameraRelativeMove(0.6, -0.8, 1.234);
    near(Math.hypot(m.x, m.z), 1);
  });
});

describe('look', () => {
  const base = { yaw: 0, pitch: 0.45 };
  it('dragging right turns the view right, scaled by sensitivity', () => {
    const a = applyLook(base, 100, 0, { sensitivity: 1, invertY: false });
    const b = applyLook(base, 100, 0, { sensitivity: 2, invertY: false });
    expect(a.yaw).toBeLessThan(0);
    expect(Math.abs(b.yaw)).toBeCloseTo(Math.abs(a.yaw) * 2);
  });

  it('inverts vertical look only when asked, and keeps pitch in range', () => {
    expect(applyLook(base, 0, 50, { sensitivity: 1, invertY: false }).pitch).toBeGreaterThan(base.pitch);
    expect(applyLook(base, 0, 50, { sensitivity: 1, invertY: true }).pitch).toBeLessThan(base.pitch);
    expect(applyLook(base, 0, 100000, { sensitivity: 1, invertY: false }).pitch).toBe(MAX_PITCH);
    expect(applyLook(base, 0, -100000, { sensitivity: 1, invertY: false }).pitch).toBe(MIN_PITCH);
  });
});

describe('joystick', () => {
  it('ignores a resting thumb inside the dead zone', () => {
    expect(stickVector(5, 5, 100)).toEqual({ x: 0, y: 0 });
  });

  it('is full strength at the rim and never longer than 1', () => {
    const edge = stickVector(0, 100, 100);
    near(edge.y, 1);
    const beyond = stickVector(0, 400, 100);
    near(beyond.y, 1);
    near(beyond.x, 0);
  });

  it('grows smoothly from zero just outside the dead zone', () => {
    const just = stickVector(0, 16, 100);
    expect(just.y).toBeGreaterThan(0);
    expect(just.y).toBeLessThan(0.05);
  });
});

describe('keyboard', () => {
  it('normalises diagonals so they are not faster', () => {
    const held = new Set(['KeyW', 'KeyD']);
    const v = keyboardVector((...codes) => codes.some((c) => held.has(c)));
    near(Math.hypot(v.x, v.y), 1);
  });

  it('is zero with no keys', () => {
    expect(keyboardVector(() => false)).toEqual({ x: 0, y: 0 });
  });
});
