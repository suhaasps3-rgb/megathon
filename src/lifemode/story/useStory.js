import { useCallback, useEffect, useRef, useState } from 'react';
import { loadStory, saveStory, clearStory } from './storage.js';
import { newStoryState } from './engine.js';

/**
 * React binding for the story engine. Holds the single authoritative StoryState and
 * applies pure engine functions to it; components never compute balances themselves.
 * Updates go through a functional setState, so rapid double taps hit the engine's
 * idempotency instead of applying twice.
 */
export function useStory() {
  const [store, setStore] = useState(() => {
    const { state, notice } = loadStory();
    return { gs: state, events: [], error: null, notice };
  });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!saveStory(store.gs)) setStore((s) => (s.notice ? s : { ...s, notice: 'save.failed' }));
  }, [store.gs]);

  /** Apply an engine function `(gs, ...args) => Result`. Returns the result. */
  const dispatch = useCallback((fn, ...args) => {
    let out = null;
    setStore((s) => {
      const res = fn(s.gs, ...args);
      out = res;
      if (!res.ok) return { ...s, error: res.error };
      if (res.state === s.gs) return s;
      return { ...s, gs: res.state, events: res.events.length ? [...s.events, ...res.events].slice(-20) : s.events, error: null };
    });
    return out;
  }, []);

  const consumeEvents = useCallback(() => setStore((s) => (s.events.length ? { ...s, events: [] } : s)), []);
  const dismiss = useCallback(() => setStore((s) => ({ ...s, notice: null, error: null })), []);
  const resetAll = useCallback(() => {
    clearStory();
    setStore({ gs: newStoryState(), events: [], error: null, notice: null });
  }, []);

  return { gs: store.gs, events: store.events, error: store.error, notice: store.notice, dispatch, consumeEvents, dismiss, resetAll };
}
