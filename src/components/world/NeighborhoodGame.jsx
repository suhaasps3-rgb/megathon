import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, LogOut } from 'lucide-react';
import World from './World.jsx';
import ResultsPanel from './ResultsPanel.jsx';
import { acceptMission, completeMission, depositToReserve, TEMPLATES } from '../../neighborhood/missions.js';
import { analyseRun } from '../../neighborhood/analysis.js';
import {
  DEFAULT_PITCH, DEFAULT_CONTROLS, loadControls, saveControls, applyLook, stickVector,
} from '../../neighborhood/controls.js';
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
function baseDialogFor(id, w) {
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

/** Extra choices that a side mission adds at a place. They use the same pure rules as the rest. */
function missionOptionsFor(id, w) {
  const active = w.mission?.active;
  if (!active) return [];
  if (id === 'bank' && active.templateId === 'build-reserve') {
    return [{
      label: `Deposit ${inr(REPAIR_COST)} into savings`,
      hint: w.cash >= REPAIR_COST ? `Cash left ${inr(w.cash - REPAIR_COST)}. Completes the mission.` : `You need ${inr(REPAIR_COST)} in cash`,
      run: depositToReserve,
      disabled: w.cash < REPAIR_COST,
    }];
  }
  if (id === 'chai' && active.templateId === 'cost-check') {
    return [{
      label: 'Compare a daily chai with saving it',
      hint: `Chai every day is ${inr(CHAI_PRICE * 365)} a year. Completes the mission.`,
      run: (x) => completeMission(x, 'cost-check'),
    }];
  }
  return [];
}

function dialogFor(id, w) {
  const d = baseDialogFor(id, w);
  const extra = missionOptionsFor(id, w);
  return extra.length ? { ...d, options: [...d.options, ...extra] } : d;
}

export default function NeighborhoodGame({ onExit }) {
  const [wallet, setWallet] = useState(() => loadWallet());
  const [nearby, setNearby] = useState(null);
  const [dialog, setDialog] = useState(null); // place id while talking
  const [toast, setToast] = useState(null);
  // One shared input object: the scene reads it every frame, and every control writes to it.
  const input = useRef({ keys: new Set(), stick: { x: 0, y: 0 }, look: { yaw: 0, pitch: DEFAULT_PITCH } });
  const [controls, setControls] = useState(() => loadControls());
  const [menuOpen, setMenuOpen] = useState(false);
  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  const lookDrag = useRef(null);
  const nearbyRef = useRef(null);
  const dialogRef = useRef(null);
  const resultsRef = useRef(false);
  const menuRef = useRef(false);
  nearbyRef.current = nearby;
  dialogRef.current = dialog;
  menuRef.current = menuOpen;

  // Save every change. If the browser refuses storage, the game still works for this visit.
  useEffect(() => {
    if (!saveWallet(wallet)) setToast('Progress can’t be saved in this browser, so it will reset when you leave.');
  }, [wallet]);

  useEffect(() => {
    saveControls(controls);
  }, [controls]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const down = (e) => {
      // Typing in a field (for example a future chat box) must never move the character.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (!e.repeat && nearbyRef.current && !dialogRef.current && !resultsRef.current && !menuRef.current) setDialog(nearbyRef.current);
        return;
      }
      if (e.code === 'Escape') {
        // Esc closes a conversation first, then toggles the pause menu. It never fires behind the results.
        if (dialogRef.current) setDialog(null);
        else if (!resultsRef.current) setMenuOpen((m) => !m);
        return;
      }
      if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
        input.current.keys.add(e.code);
      }
    };
    const up = (e) => input.current.keys.delete(e.code);
    const clear = () => {
      input.current.keys.clear();
      input.current.stick = { x: 0, y: 0 };
    };
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
      input.current.keys.add(code);
    },
    onPointerUp: () => input.current.keys.delete(code),
    onPointerLeave: () => input.current.keys.delete(code),
    onPointerCancel: () => input.current.keys.delete(code),
  });

  // Drag on the scene to look around. Only drags that start on the canvas count, so buttons and
  // panels laid over the scene never spin the camera.
  const blocked = () => Boolean(dialogRef.current || menuRef.current || resultsRef.current);
  const onLookDown = (e) => {
    if (e.target.tagName !== 'CANVAS' || blocked()) return;
    lookDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onLookMove = (e) => {
    const g = lookDrag.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    g.x = e.clientX;
    g.y = e.clientY;
    input.current.look = applyLook(input.current.look, dx, dy, controlsRef.current);
  };
  const onLookUp = (e) => {
    if (lookDrag.current?.id === e.pointerId) lookDrag.current = null;
  };

  // The results panel opens once per finished run. Closing it is saved, so a refresh does not replay it.
  const showResults = wallet.step === 'done' && !wallet.resultsSeen;
  const analysis = useMemo(() => (showResults ? analyseRun(wallet) : null), [showResults, wallet]);
  resultsRef.current = Boolean(analysis);

  const closeResults = () => setWallet((w) => ({ ...w, resultsSeen: true }));
  const getMission = () => {
    const r = acceptMission(wallet);
    if (r.ok) setWallet(r.state);
    setToast(r.message);
  };
  const resume = () => setMenuOpen(false);
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
      <div
        className="relative h-[72vh] min-h-[480px] w-full touch-none overflow-hidden rounded-3xl border-4 border-white bg-sky-200 shadow-2xl"
        onPointerDown={onLookDown}
        onPointerMove={onLookMove}
        onPointerUp={onLookUp}
        onPointerCancel={onLookUp}
      >
        <World inputRef={input} paused={dialog !== null || Boolean(analysis) || menuOpen} onNearby={setNearby} />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="pointer-events-auto max-w-xs rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Stat label="Cash" value={inr(wallet.cash)} />
              <Stat label="Savings" value={inr(wallet.savings)} />
              {wallet.debt > 0 && <Stat label="Debt" value={inr(wallet.debt)} tone="text-rose-600" />}
              <Stat label="Aura" value={wallet.aura} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-700">{MISSION[wallet.step]}</p>
            <MissionCard mission={wallet.mission?.active} onGet={getMission} />
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

        {menuOpen && !analysis && (
          <PauseMenu
            controls={controls}
            onChange={setControls}
            onResume={resume}
            onExit={onExit}
          />
        )}

        {!dialog && !analysis && !menuOpen && (
          <div className="absolute bottom-3 left-3 md:hidden">
            <Stick inputRef={input} />
          </div>
        )}

        {!dialog && !analysis && !menuOpen && (
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
        Move with WASD or arrows · Drag to look · Shift to run · Space to jump · E to talk · Esc to pause
      </p>
    </div>
  );
}

/** Side mission board: shows the one active side mission, or offers a new one. */
function MissionCard({ mission, onGet }) {
  if (!mission) {
    return (
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
        <span className="text-xs font-bold text-slate-600">No side mission</span>
        <button type="button" onClick={onGet} className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-black text-white">Get one</button>
      </div>
    );
  }
  const place = POIS.find((p) => p.id === TEMPLATES[mission.templateId]?.where);
  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">{mission.category} · +{mission.reward} Aura</p>
      <p className="text-xs font-black text-slate-900">{mission.title}</p>
      <p className="text-xs text-slate-700">{mission.objective}{place ? ` Go to ${place.label}.` : ''}</p>
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

/** Virtual joystick for touch screens. It reports a vector, so diagonals and partial tilt work. */
function Stick({ inputRef }) {
  const base = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (e) => {
    if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
    const r = base.current.getBoundingClientRect();
    const radius = r.width / 2;
    const v = stickVector(e.clientX - (r.left + radius), e.clientY - (r.top + radius), radius);
    inputRef.current.stick = v;
    setKnob({ x: v.x * radius * 0.6, y: v.y * radius * 0.6 });
  };
  const release = (e) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    inputRef.current.stick = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
  };
  return (
    <div
      ref={base}
      role="img"
      aria-label="Move joystick. Drag to walk."
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
      className="relative h-36 w-36 touch-none select-none rounded-full border-2 border-white/80 bg-white/40 shadow-lg backdrop-blur"
    >
      <span
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-xl"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        aria-hidden="true"
      />
    </div>
  );
}

const CONTROL_GUIDE = [
  ['Move', 'WASD or arrow keys, or the joystick on touch'],
  ['Look around', 'Drag on the scene'],
  ['Run', 'Hold Shift'],
  ['Jump', 'Space, or the Jump button'],
  ['Talk', 'Stand near someone and press E, or the Talk button'],
  ['Pause', 'Esc'],
];

/** Pause menu: resume, adjust look settings, see the controls, or leave the neighbourhood. */
function PauseMenu({ controls, onChange, onResume, onExit }) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="pause-title"
      className="absolute inset-3 z-10 flex flex-col gap-4 overflow-y-auto rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur md:inset-x-auto md:left-1/2 md:top-6 md:w-[30rem] md:-translate-x-1/2"
    >
      <h2 id="pause-title" className="text-2xl font-black text-ink-900">Paused</h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onResume} className="btn-primary"><Play size={16} aria-hidden="true" /> Resume</button>
        <button type="button" onClick={onExit} className="btn-secondary"><LogOut size={16} aria-hidden="true" /> Back to PaisaPath</button>
      </div>

      <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-black text-ink-900">Look settings</legend>
        <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-800">
          Sensitivity
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={controls.sensitivity}
            onChange={(e) => onChange({ ...controls, sensitivity: Number(e.target.value) })}
            className="w-40 accent-purple-600"
          />
          <span className="w-10 text-right tabular-nums">{controls.sensitivity.toFixed(1)}×</span>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-800">
          Invert vertical look
          <input
            type="checkbox"
            checked={controls.invertY}
            onChange={(e) => onChange({ ...controls, invertY: e.target.checked })}
            className="h-5 w-5 accent-purple-600"
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_CONTROLS })}
          className="justify-self-start text-xs font-black text-purple-700 underline"
        >
          Reset to defaults
        </button>
      </fieldset>

      <dl className="grid gap-2 text-sm">
        {CONTROL_GUIDE.map(([action, how]) => (
          <div key={action} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <dt className="w-28 shrink-0 font-black text-slate-900">{action}</dt>
            <dd className="text-slate-700">{how}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-2 text-xs text-slate-500"><Pause size={12} aria-hidden="true" /> The world is paused while this menu is open.</p>
    </div>
  );
}
