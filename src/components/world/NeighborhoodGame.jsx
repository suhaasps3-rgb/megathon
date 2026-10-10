import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import World from './World.jsx';
import ResultsPanel from './ResultsPanel.jsx';
import { analyseRun } from '../../neighborhood/analysis.js';
import { POIS } from '../../neighborhood/layout.js';
import {
  BIKE_PRICE, SAVE_AMOUNT, REPAIR_COST, CHAI_PRICE, DELIVERY_PAY,
  payDelivery, buyBikeNow, saveInsteadOfBike, payRepair, projectSavings, loadWallet, saveWallet,
  startNewRun, LOAN_RATE_YEARLY,
} from '../../neighborhood/economy.js';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space',
]);

const MISSION = {
  deliver: 'Find Ravi at Gully Market and take the delivery job.',
  bike: 'Decide about the bike at Cycle Mart.',
  repair: 'Your phone cracked. Go to the ATM.',
  done: 'Mission complete. Keep exploring, or head back to PaisaPath.',
};

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * What the player can do at each place right now. Each option names its consequence before
 * the player picks it, and its `run` is one of the pure rules in economy.js.
 */
function dialogFor(id, w) {
  if (id === 'ravi') {
    if (w.step !== 'deliver') {
      return { speaker: 'Ravi · Gully Market', lines: ['Thanks for the help, yaar. Check out the Cycle Mart next.'], options: [] };
    }
    return {
      speaker: 'Ravi · Gully Market',
      lines: ['Bhai, the tiffin run needs a rider. One hour of work, and I pay well.'],
      options: [{ label: 'Take the job', hint: `+${inr(DELIVERY_PAY)} cash`, run: payDelivery }],
    };
  }
  if (id === 'cycle') {
    if (w.step !== 'bike') {
      return { speaker: 'Cycle Mart', lines: [w.bikeOwned ? 'Enjoy the ride!' : 'The bike decision is already made.'], options: [] };
    }
    const canBuy = w.cash >= BIKE_PRICE;
    const canSave = w.cash >= SAVE_AMOUNT;
    return {
      speaker: 'Cycle Mart',
      lines: [`The bike costs ${inr(BIKE_PRICE)}. You have ${inr(w.cash)} in cash.`],
      options: [
        {
          label: 'Buy it now',
          hint: canBuy ? `Cash left ${inr(w.cash - BIKE_PRICE)}, savings stay at ₹0` : `You need ${inr(BIKE_PRICE)} in cash`,
          run: buyBikeNow,
          disabled: !canBuy,
        },
        {
          label: `Save ${inr(SAVE_AMOUNT)} instead`,
          hint: canSave
            ? `Savings could grow to about ${inr(projectSavings(SAVE_AMOUNT))} in 10 years at 8% a year (illustrative)`
            : `You need ${inr(SAVE_AMOUNT)} in cash to save`,
          run: saveInsteadOfBike,
          disabled: !canSave,
        },
      ],
    };
  }
  if (id === 'bank') {
    if (w.step !== 'repair') {
      return { speaker: 'ATM', lines: [`Savings ${inr(w.savings)}. Debt ${inr(w.debt)}.`], options: [] };
    }
    const canUseSavings = w.savings >= REPAIR_COST;
    const short = Math.max(0, REPAIR_COST - w.cash);
    return {
      speaker: 'ATM',
      lines: [`Your phone cracked. The repair costs ${inr(REPAIR_COST)}.`],
      options: [
        {
          label: 'Pay from savings',
          hint: canUseSavings ? `No debt. Savings left ${inr(w.savings - REPAIR_COST)}` : `Needs ${inr(REPAIR_COST)} saved`,
          run: (s) => payRepair(s, 'savings'),
          disabled: !canUseSavings,
        },
        {
          label: 'Pay from cash',
          hint: short > 0
            ? `You are short ${inr(short)}. That gap is borrowed at ${LOAN_RATE_YEARLY * 100}% a year`
            : `Cash left ${inr(w.cash - REPAIR_COST)}`,
          run: (s) => payRepair(s, 'cash'),
        },
      ],
    };
  }
  // The chai cart is a quick, optional lesson with no outcome.
  return {
    speaker: 'Chaiwala',
    lines: [`Chai is ${inr(CHAI_PRICE)}. Every day for a year that is ${inr(CHAI_PRICE * 365)}. Save that instead, and see what it can grow to.`],
    options: [],
  };
}

export default function NeighborhoodGame({ onExit }) {
  const [wallet, setWallet] = useState(() => loadWallet());
  const [nearby, setNearby] = useState(null);
  const [dialog, setDialog] = useState(null); // place id while talking
  const [toast, setToast] = useState(null);
  const keys = useRef(new Set());
  const nearbyRef = useRef(null);
  const dialogRef = useRef(null);
  const resultsRef = useRef(false);
  nearbyRef.current = nearby;
  dialogRef.current = dialog;

  // Save every change. If the browser refuses storage, the game still works for this visit.
  useEffect(() => {
    if (!saveWallet(wallet)) setToast('Progress can’t be saved in this browser, so it will reset when you leave.');
  }, [wallet]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const down = (e) => {
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (!e.repeat && nearbyRef.current && !dialogRef.current && !resultsRef.current) setDialog(nearbyRef.current);
        return;
      }
      if (e.code === 'Escape') {
        setDialog(null);
        return;
      }
      if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
        keys.current.add(e.code);
      }
    };
    const up = (e) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  const press = (code) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      keys.current.add(code);
    },
    onPointerUp: () => keys.current.delete(code),
    onPointerLeave: () => keys.current.delete(code),
    onPointerCancel: () => keys.current.delete(code),
  });

  // The results panel opens once per finished run. Closing it is saved, so a refresh does not replay it.
  const showResults = wallet.step === 'done' && !wallet.resultsSeen;
  const analysis = useMemo(() => (showResults ? analyseRun(wallet) : null), [showResults, wallet]);
  resultsRef.current = Boolean(analysis);

  const closeResults = () => setWallet((w) => ({ ...w, resultsSeen: true }));
  const replay = () => setWallet((w) => startNewRun(w));

  const choose = (option) => {
    const res = option.run(wallet);
    if (res.ok) setWallet(res.state);
    setToast(res.message);
    setDialog(null);
  };

  const place = POIS.find((p) => p.id === dialog);
  const talk = dialog ? dialogFor(dialog, wallet) : null;
  const nearPlace = POIS.find((p) => p.id === nearby);

  return (
    <div className="mx-auto max-w-6xl px-3 pb-12 pt-4 md:px-6">
      <div className="relative h-[72vh] min-h-[480px] w-full overflow-hidden rounded-3xl border-4 border-white bg-sky-200 shadow-2xl">
        <World keys={keys} paused={dialog !== null || Boolean(analysis)} onNearby={setNearby} />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="pointer-events-auto max-w-xs rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Stat label="Cash" value={inr(wallet.cash)} />
              <Stat label="Savings" value={inr(wallet.savings)} />
              {wallet.debt > 0 && <Stat label="Debt" value={inr(wallet.debt)} tone="text-rose-600" />}
              <Stat label="Aura" value={wallet.aura} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-700">{MISSION[wallet.step]}</p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-xl bg-white/90 px-3 py-2 text-xs font-black text-slate-800 shadow-lg backdrop-blur hover:bg-white"
          >
            <ArrowLeft size={14} aria-hidden="true" /> PaisaPath
          </button>
        </div>

        {toast && (
          <div role="status" className="absolute left-1/2 top-28 w-[min(90%,28rem)] -translate-x-1/2 rounded-2xl bg-slate-900/90 px-4 py-2 text-center text-sm font-bold text-white shadow-lg">
            {toast}
          </div>
        )}

        {!dialog && nearPlace && (
          <div role="status" className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-slate-800 shadow-lg md:block">
            Press E to talk to {nearPlace.label}
          </div>
        )}

        {talk && (
          <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="world-dialog-speaker"
            className="absolute inset-x-3 bottom-3 rounded-2xl bg-white p-4 shadow-2xl md:left-1/2 md:right-auto md:w-[30rem] md:-translate-x-1/2"
          >
            <p id="world-dialog-speaker" className="text-xs font-black uppercase tracking-wider text-purple-700">
              {talk.speaker} · {place?.place}
            </p>
            {talk.lines.map((l) => (
              <p key={l} className="mt-1 text-base font-bold text-slate-900">{l}</p>
            ))}
            <div className="mt-3 grid gap-2">
              {talk.options.map((o, i) => (
                <button
                  key={o.label}
                  type="button"
                  disabled={o.disabled}
                  autoFocus={i === 0}
                  onClick={() => choose(o)}
                  className="rounded-xl border-2 border-purple-200 bg-purple-50 px-3 py-2 text-left hover:border-purple-500 disabled:opacity-50 disabled:hover:border-purple-200"
                >
                  <span className="block font-black text-purple-900">{o.label}</span>
                  <span className="block text-xs font-bold text-slate-700">{o.hint}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                {talk.options.length ? 'Not now' : 'Okay'}
              </button>
            </div>
          </div>
        )}

        {analysis && <ResultsPanel analysis={analysis} onExplore={closeResults} onReplay={replay} />}

        {!dialog && !analysis && (
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2 md:hidden" aria-label="Touch controls">
            <div className="grid grid-cols-3 gap-1 select-none touch-none">
              <span />
              <PadKey label="↑" {...press('KeyW')} />
              <span />
              <PadKey label="←" {...press('KeyA')} />
              <PadKey label="↓" {...press('KeyS')} />
              <PadKey label="→" {...press('KeyD')} />
            </div>
          </div>
        )}

        {!dialog && (
          <div className="absolute bottom-3 right-3 flex flex-col gap-2 md:hidden">
            <button type="button" {...press('Space')} className="touch-none select-none rounded-full bg-white/90 px-5 py-3 text-sm font-black shadow-lg">Jump</button>
            {nearPlace && (
              <button
                type="button"
                onClick={() => setDialog(nearPlace.id)}
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-900 shadow-lg"
              >
                Talk
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs font-bold text-slate-600">
        Move with WASD or arrow keys · Shift to run · Space to jump · E to talk · Esc to close
      </p>
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div>
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-black ${tone}`}>{value}</span>
    </div>
  );
}

function PadKey({ label, ...handlers }) {
  return (
    <button type="button" {...handlers} aria-label={`Move ${label}`} className="touch-none select-none rounded-xl bg-white/90 px-4 py-3 text-lg font-black shadow-lg">
      {label}
    </button>
  );
}
