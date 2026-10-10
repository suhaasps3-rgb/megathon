// @ts-check
/**
 * Choice Replay: "what if I had chosen differently?"
 *
 * Works on an isolated ledger built from the balances just before the real decision.
 * It returns plain numbers and text; it never returns a GameState, so there is no way for
 * a hypothetical result to be saved, award XP, add evidence or unlock anything.
 */
import { balancesOf, totalAssets, summarize } from './ledger.js';
import { evaluateChoice, viewOf, choiceDetail } from './game.js';
import { SCENARIO_BY_ID } from '../content/scenarios.js';

/** @typedef {import('./ledger.js').Balances} Balances */

/**
 * @typedef {Object} ReplaySide
 * @property {string} choiceId
 * @property {string} label
 * @property {Balances} balances
 * @property {number} assets
 * @property {number} spent       Expenses + losses + repayments in this decision.
 * @property {number} saved       Transfers into savings or goal in this decision.
 * @property {string} [title]
 * @property {string} [learned]
 */

/**
 * @param {import('./game.js').GameState} gs
 * @param {string} scenarioId
 * @param {string} altChoiceId
 * @returns {{ ok: true, before: Balances, actual: ReplaySide, hypothetical: ReplaySide } | { ok: false, error: string }}
 */
export function replayChoice(gs, scenarioId, altChoiceId) {
  const run = gs.run;
  if (!run) return { ok: false, error: 'No run to replay' };
  const d = run.decisions.find((x) => x.scenarioId === scenarioId);
  const s = SCENARIO_BY_ID.get(scenarioId);
  if (!d || !s) return { ok: false, error: 'You haven’t made that decision yet' };
  const alt = s.choices.find((c) => c.id === altChoiceId);
  const real = s.choices.find((c) => c.id === d.choiceId);
  if (!alt || !real) return { ok: false, error: 'Unknown option' };

  const before = balancesOf(run.ledger, d.seqStart);
  const actualAfter = balancesOf(run.ledger, d.seqEnd);
  const actualTx = run.ledger.transactions.filter((t) => t.seq >= d.seqStart && t.seq < d.seqEnd);

  const ev = evaluateChoice(gs.profile, run, s, alt, before);
  if (!ev.available) return { ok: false, error: `That option wasn’t available then: ${ev.reason}` };
  const hypoView = viewOf(gs.profile, run, ev.after);
  const hypoOutcome = typeof alt.outcome === 'function' ? alt.outcome(hypoView) : alt.outcome;

  return {
    ok: true,
    before,
    actual: side(real.id, real.label, actualAfter, actualTx, d.outcome.title, d.outcome.learned),
    hypothetical: side(alt.id, alt.label || choiceDetail(alt, hypoView), ev.after, ev.applied, hypoOutcome.title, hypoOutcome.learned),
  };
}

/**
 * @param {string} choiceId @param {string} label @param {Balances} b
 * @param {import('./ledger.js').Transaction[]} txs @param {string} title @param {string} learned
 * @returns {ReplaySide}
 */
function side(choiceId, label, b, txs, title, learned) {
  const t = summarize(txs);
  return {
    choiceId, label, balances: b, assets: totalAssets(b),
    spent: t.expenses + t.losses + t.repaid,
    saved: txs.filter((x) => x.type === 'transfer' && (x.to === 'savings' || x.to === 'goal')).reduce((n, x) => n + x.amount, 0),
    title, learned,
  };
}
