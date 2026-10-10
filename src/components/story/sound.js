/**
 * Tiny synthesized sound effects (Web Audio, no files to download). Every sound has a
 * text caption so nothing is conveyed by audio alone.
 */
let ctx = null;

function audio() {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const SOUNDS = {
  coin: [[880, 0, 0.08], [1320, 0.07, 0.12]],
  spend: [[520, 0, 0.07], [390, 0.06, 0.1]],
  ping: [[1046, 0, 0.09], [1568, 0.1, 0.12]],
  win: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.14], [1046, 0.32, 0.28]],
  oops: [[330, 0, 0.14], [247, 0.13, 0.22]],
  step: [[200, 0, 0.05], [180, 0.12, 0.05]],
};

/** Play a sound by name at volume 0–1. Returns false if audio isn't available. */
export function play(name, volume) {
  const notes = SOUNDS[name];
  const a = audio();
  if (!notes || !a || volume <= 0) return false;
  const now = a.currentTime;
  for (const [freq, at, dur] of notes) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = name === 'oops' ? 'triangle' : 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(0.18 * volume, now + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    o.connect(g).connect(a.destination);
    o.start(now + at);
    o.stop(now + at + dur + 0.02);
  }
  return true;
}
