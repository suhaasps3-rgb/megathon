import React, { useState } from 'react';
import { useT } from '../../i18n/context';
import { fill } from '../../data/translations';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Wallet, PiggyBank, Target, Coins, Heart, History, X, Sparkles } from 'lucide-react';
import { balancesOf, totalAssets } from '../../lifemode/domain/ledger.js';
import { goalById, runProgress } from '../../lifemode/domain/game.js';
import { levelOf } from '../../lifemode/domain/progression.js';
import { CHAPTERS } from '../../lifemode/content/scenarios.js';
import { formatINR } from '../../lifemode/domain/money.js';
import Room from './Room.jsx';
import { btn, focusRing, Money } from './ui.jsx';

function Tile({ icon: Icon, label, value, tone, hint }) {
  const T = useT();
  const reduce = useReducedMotion();
  return (
    <div className={`rounded-2xl border p-3 ${tone}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-80">
        <Icon size={14} aria-hidden="true" /> {label}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={value}
          initial={reduce ? false : { y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 8, opacity: 0 }}
          className="mt-1 text-xl font-black tabular-nums"
        >
          {formatINR(value)}
        </motion.div>
      </AnimatePresence>
      {hint && <div className="text-xs opacity-75">{hint}</div>}
    </div>
  );
}

export default function Hud({ gs }) {
  const T = useT();
  const run = gs.run;
  const [showLedger, setShowLedger] = useState(false);
  if (!run) return null;
  const b = balancesOf(run.ledger);
  const goal = goalById(run.goalId);
  const goalPct = run.flags.goalBought ? 100 : goal ? Math.min(100, Math.floor((b.goal / goal.cost) * 100)) : 0;
  const lvl = levelOf(gs.profile.xp);
  const prog = runProgress(run);

  return (
    <aside aria-label={T.lmGlance} className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <Room
          avatar={run.character.avatar}
          savings={b.savings}
          goalPct={goalPct}
          goalEmoji={goal?.emoji}
          wellbeing={run.wellbeing}
          chapterIndex={run.chapterIndex}
          badges={Object.keys(gs.profile.achievements)}
          goalBought={run.flags.goalBought === true}
          level={lvl.level}
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <div>
            <p className="font-black text-slate-800">{run.character.name}</p>
            <p className="text-xs font-bold text-purple-700">Level {lvl.level} · {lvl.title}</p>
          </div>
          <div className="w-36" aria-label={`${lvl.into} of ${lvl.needed} Aura Points to next level`} role="img">
            <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>{T.lmAura}</span><span>{gs.profile.xp}</span></div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" aria-live="off">
        <Tile icon={Wallet} label={T.lmCash} value={b.cash} tone="border-slate-200 bg-white text-slate-800" hint={T.lmFreeSpend} />
        <Tile icon={PiggyBank} label={T.lmSavings} value={b.savings} tone="border-teal-200 bg-teal-50 text-teal-900" hint={T.lmEmergency} />
        <Tile icon={Target} label={T.lmGoalFund} value={b.goal} tone="border-purple-200 bg-purple-50 text-purple-900" hint={goal ? fill(T.lmOf, { amount: formatINR(goal.cost) }) : T.lmNoGoal} />
        {b.debt > 0
          ? <Tile icon={Coins} label={T.lmOwe} value={b.debt} tone="border-amber-300 bg-amber-50 text-amber-900" hint={T.lmFamilyLoan} />
          : <Tile icon={Sparkles} label={T.lmTotal} value={totalAssets(b)} tone="border-slate-200 bg-slate-50 text-slate-800" hint={T.lmTotalHint} />}
      </div>

      {goal && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between text-sm font-bold text-slate-700">
            <span><span aria-hidden="true">{goal.emoji}</span> {goal.label}</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-slate-100" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} aria-label={T.lmGoalProgress}>
            <motion.div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-teal-500" initial={false} animate={{ width: `${goalPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{goalPct}% · goal progress counts only money in your goal fund</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><Heart size={14} aria-hidden="true" /> {T.lmWellbeing}</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-400 transition-all" style={{ width: `${run.wellbeing}%` }} /></div>
            <span className="text-sm font-black tabular-nums text-slate-700">{run.wellbeing}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{T.lmJourney}</div>
          <ol className="mt-2 flex gap-1" aria-label={`Chapter progress: ${prog.done} of ${prog.total} complete`}>
            {CHAPTERS.map((c, i) => (
              <li key={c.n} title={c.title} className={`h-2 flex-1 rounded-full ${i < prog.done ? 'bg-teal-500' : i === run.chapterIndex ? 'bg-purple-400' : 'bg-slate-200'}`} />
            ))}
          </ol>
        </div>
      </div>

      <button type="button" className={`${btn.secondary} ${focusRing} w-full`} onClick={() => setShowLedger(true)} aria-haspopup="dialog">
        <History size={18} aria-hidden="true" /> Transaction history ({run.ledger.transactions.length})
      </button>
      {showLedger && <LedgerDialog txs={run.ledger.transactions} opening={run.ledger.opening} onClose={() => setShowLedger(false)} />}
    </aside>
  );
}

const TYPE_LABEL = { income: 'Income', expense: 'Spent', loss: 'Lost', transfer: 'Transfer', borrow: 'Borrowed', repay: 'Repaid' };
const ACCT = { cash: 'Cash', savings: 'Savings', goal: 'Goal fund' };

export function TxRow({ tx }) {
  const sign = tx.type === 'income' || tx.type === 'borrow' ? 1 : tx.type === 'transfer' ? 0 : -1;
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-bold text-slate-800">{tx.description}</p>
        <p className="text-xs text-slate-500">
          {TYPE_LABEL[tx.type]}
          {tx.type === 'transfer' ? ` · ${ACCT[tx.from]} → ${ACCT[tx.to]}` : tx.from ? ` · from ${ACCT[tx.from]}` : tx.to ? ` · to ${ACCT[tx.to]}` : ''}
          {tx.category ? ` · ${tx.category}` : ''}
        </p>
      </div>
      <span className={`shrink-0 text-sm font-black tabular-nums ${sign > 0 ? 'text-teal-700' : sign < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
        {sign > 0 ? '+' : sign < 0 ? '−' : '⇄ '}{formatINR(tx.amount)}
      </span>
    </li>
  );
}

function LedgerDialog({ txs, opening, onClose }) {
  const T = useT();
  const ref = React.useRef(null);
  React.useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="ledger-title" tabIndex={-1} ref={ref}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl outline-none sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 id="ledger-title" className="text-lg font-black text-slate-800">{T.lmHistory}</h2>
          <button type="button" onClick={onClose} className={`${btn.ghost} ${focusRing}`} aria-label={T.lmCloseHistory}><X size={20} aria-hidden="true" /></button>
        </div>
        <p className="text-sm text-slate-500">{fill(T.lmHistNote, { cash: formatINR(opening.cash) })}</p>
        {txs.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500">{T.lmNoTx}</p>
        ) : (
          <ol className="mt-3 divide-y divide-slate-100">
            {[...txs].reverse().map((t) => <TxRow key={t.id} tx={t} />)}
          </ol>
        )}
      </div>
    </div>
  );
}
