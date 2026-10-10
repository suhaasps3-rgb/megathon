import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGame, saveGame, clearSave } from './persistence/storage.js';
import { newGame } from './domain/game.js';

/**
 * React binding for the Life Mode engine. Holds the single authoritative GameState and
 * applies pure domain functions to it. Components never compute balances themselves.
 *
 * Updates go through a functional setState, so two rapid clicks are applied to the latest
 * state in order; the engine's idempotency then turns the second one into a no-op.
 */
export function useLifeGame() {
  const [store, setStore] = useState(() => {
    const { state, notice } = loadGame();
    return { gs: state, events: [], error: null, notice };
  });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!saveGame(store.gs)) {
      setStore((s) => (s.notice ? s : { ...s, notice: 'Progress couldn’t be saved in this browser. You can keep playing, but it will reset when you leave.' }));
    }
  }, [store.gs]);

  /** Apply a domain function `(gs, ...args) => Result`. */
  const dispatch = useCallback((fn, ...args) => {
    setStore((s) => {
      const res = fn(s.gs, ...args);
      if (!res.ok) return { ...s, error: res.error };
      if (res.state === s.gs) return s;
      return { ...s, gs: res.state, events: res.events.length ? [...s.events, ...res.events].slice(-20) : s.events, error: null };
    });
  }, []);

  const consumeEvents = useCallback(() => setStore((s) => (s.events.length ? { ...s, events: [] } : s)), []);
  const dismissNotice = useCallback(() => setStore((s) => ({ ...s, notice: null, error: null })), []);
  const resetAll = useCallback(() => {
    clearSave();
    setStore({ gs: newGame(), events: [], error: null, notice: null });
  }, []);

  return { gs: store.gs, events: store.events, error: store.error, notice: store.notice, dispatch, consumeEvents, dismissNotice, resetAll };
}
