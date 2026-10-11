/**
 * Control maths for the 3D neighborhood. Pure functions only, so the rules that feel
 * "right" (camera-relative movement, look sensitivity, dead zones) are tested without a GPU.
 *
 * Convention: yaw 0 means the camera sits behind the player on +z, looking toward −z. Positive
 * yaw swings the camera to the player's right. Pitch is the camera's elevation angle in radians.
 */

export const CONTROLS_KEY = 'paisapath.neighborhood.controls.v1';
export const DEFAULT_PITCH = 0.45;
export const MIN_PITCH = 0.15;
export const MAX_PITCH = 1.1;
const LOOK_SPEED = 0.006; // radians per pixel of drag at sensitivity 1
const STICK_DEAD_ZONE = 0.15;

export const DEFAULT_CONTROLS = Object.freeze({ sensitivity: 1, invertY: false });

/** Clamps saved preferences to safe ranges. Anything malformed falls back to the defaults. */
export function sanitizeControls(raw) {
  const sensitivity = Number(raw?.sensitivity);
  return {
    sensitivity: Number.isFinite(sensitivity) ? Math.min(2, Math.max(0.5, sensitivity)) : DEFAULT_CONTROLS.sensitivity,
    invertY: typeof raw?.invertY === 'boolean' ? raw.invertY : DEFAULT_CONTROLS.invertY,
  };
}

/** Reads preferences. Blocked or corrupt storage yields the defaults and never throws. */
export function loadControls(store = globalThis.localStorage) {
  try {
    return sanitizeControls(JSON.parse(store.getItem(CONTROLS_KEY)));
  } catch {
    return { ...DEFAULT_CONTROLS };
  }
}

/** Saves preferences. Returns false when the browser refuses storage. */
export function saveControls(c, store = globalThis.localStorage) {
  try {
    store.setItem(CONTROLS_KEY, JSON.stringify(sanitizeControls(c)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Turns an input (ix: right is +1, iz: back toward the camera is +1) into a world-space
 * direction relative to where the camera looks. At yaw 0 this is the plain WASD mapping.
 */
export function cameraRelativeMove(ix, iz, yaw) {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  return {
    x: ix * c + iz * s,
    z: -ix * s + iz * c,
  };
}

/** Applies a mouse or touch drag to the camera. Dragging right swings the view right. */
export function applyLook(look, dx, dy, settings) {
  const k = LOOK_SPEED * settings.sensitivity;
  const pitchSign = settings.invertY ? -1 : 1;
  return {
    yaw: look.yaw - dx * k,
    pitch: Math.min(MAX_PITCH, Math.max(MIN_PITCH, look.pitch + dy * k * pitchSign)),
  };
}

/**
 * Converts a touch position relative to the stick centre into a vector no longer than 1,
 * with a dead zone so a resting thumb does not drift the player.
 */
export function stickVector(dx, dy, radius) {
  if (radius <= 0) return { x: 0, y: 0 };
  let x = dx / radius;
  let y = dy / radius;
  let mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
    mag = 1;
  }
  if (mag < STICK_DEAD_ZONE) return { x: 0, y: 0 };
  // Rescale so output grows from 0 at the edge of the dead zone up to 1 at the rim.
  const out = (mag - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE);
  return { x: x * out, y: y * out };
}

/** Keyboard input as a vector: each axis is −1, 0 or +1, and diagonals are normalised. */
export function keyboardVector(has) {
  const ix = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0);
  const iz = (has('KeyS', 'ArrowDown') ? 1 : 0) - (has('KeyW', 'ArrowUp') ? 1 : 0);
  const len = Math.hypot(ix, iz) || 1;
  return { x: ix / len, y: iz / len };
}
