import { useCallback, useEffect, useState } from 'react';

/** Player preferences. Saved per browser; never required before playing. */
export const DEFAULT_SETTINGS = {
  focus: false,
  reduceMotion: false,
  sound: true,
  volume: 0.5,
  captions: true,
  textSize: 'n', // n | l | xl
  shortDialogue: false,
  autoHints: false,
};

const KEY = 'paisapath.settings';

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw);
    const out = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (typeof s[k] === typeof DEFAULT_SETTINGS[k]) out[k] = s[k];
    out.volume = Math.max(0, Math.min(1, out.volume));
    if (!['n', 'l', 'xl'].includes(out.textSize)) out.textSize = 'n';
    return out;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ }
  }, [settings]);
  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  return [settings, update];
}
