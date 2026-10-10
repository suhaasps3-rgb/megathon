// @ts-check
/**
 * End-of-run report. Every number comes from the recorded ledger, decisions and evidence
 * of the run; nothing here is hardcoded demo data.
 */
import { balancesOf, summarize, totalAssets } from './ledger.js';
import { goalById } from './game.js';
import { levelOf, ACHIEVEMENTS } from './progression.js';
import { SCENARIO_BY_ID } from '../content/scenarios.js';
import { CONCEPTS, WORLDS } from '../content/concepts.js';
import { formatINR } from './money.js';

/**
 * @param {import('./game.js').GameState} gs
 */
export function buildReport(gs) {
  const run = gs.run;
  if (!run) return null;
  const start = run.ledger.opening;
  const end = balancesOf(run.ledger);
  const totals = summarize(run.ledger.transactions);
  const goal = goalById(run.goalId);
  const bought = run.flags.goalBought === true;
  const alternative = run.flags.goalAlternative === true;
  const goalPct = bought || alternative ? 100 : goal ? Math.min(100, Math.round((end.goal / goal.cost) * 100)) : 0;

  const decisions = run.decisions.map((d) => {
    const s = SCENARIO_BY_ID.get(d.scenarioId);
    const c = s?.choices.find((x) => x.id === d.choiceId);
    const before = balancesOf(run.ledger, d.seqStart);
    const after = balancesOf(run.ledger, d.seqEnd);
    return {
      scenarioId: d.scenarioId,
      chapter: d.chapter,
      scenario: s?.title ?? d.scenarioId,
      choice: c?.label ?? d.choiceId,
      title: d.outcome.title,
      learned: d.outcome.learned,
      assetsChange: totalAssets(after) - totalAssets(before),
      replayable: (s?.choices.length ?? 0) > 1,
    };
  });

  // Concept outcomes from this run's evidence: the latest piece of evidence decides.
  /** @type {Map<string, boolean>} */
  const latest = new Map();
  for (const e of run.evidence) latest.set(e.concept, e.correct);
  const demonstrated = [...latest].filter(([, ok]) => ok).map(([c]) => c);
  const practice = [...latest].filter(([, ok]) => !ok).map(([c]) => c);

  const badges = run.badges.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);

  /** @type {string[]} */
  const reflection = [];
  const saved = totals.toSavings + totals.toGoal - totals.fromSavings - totals.fromGoal;
  if (totals.toSavings + totals.toGoal > 0) {
    reflection.push(`You moved ${formatINR(totals.toSavings + totals.toGoal)} into savings and your goal fund. Those were transfers, so that money stayed yours.`);
  } else {
    reflection.push('You kept your money flexible this run. Next time, try moving a small amount to savings as soon as money arrives and see how it changes your options.');
  }
  if (run.flags.usedEmergencyFund) reflection.push('When the unexpected happened, your savings absorbed it. That is exactly what an emergency fund is for.');
  if (totals.losses > 0) reflection.push(`Scams and fraud cost you ${formatINR(totals.losses)} here. That happens to careful adults too. The warning signs you saw today are your best protection.`);
  else if (run.flags.scamAvoided) reflection.push('You kept your money safe from scams. Verifying through your own app is a habit worth keeping.');
  if (run.flags.borrowed && end.debt === 0) reflection.push('You borrowed in a tight moment and repaid it in full. Recovering from a setback is a real financial skill.');
  if (end.debt > 0) reflection.push(`You still owe ${formatINR(end.debt)}. A clear repayment date is the next step.`);
  if (goal) {
    if (bought) reflection.push(`You reached your goal: ${goal.label}.`);
    else if (alternative) reflection.push(`You chose a cheaper route to your goal (${goal.alt.label}) and kept the difference.`);
    else reflection.push(`Your goal fund reached ${goalPct}% of the ${goal.label}. Progress counts, even when the finish line moves to next month.`);
  }
  if (run.wellbeing >= 65) reflection.push('You also made room for things you enjoy. Balance is part of a healthy relationship with money.');
  else if (run.wellbeing < 45) reflection.push('Your wellbeing dipped this run. Saving matters, but so do friends, rest and small joys. A good plan includes both.');
  reflection.push('This was one fictional run. It doesn’t measure your real-world ability; it’s practice.');

  const recommendations = practice.slice(0, 3).map((c) => {
    const concept = CONCEPTS[c];
    const world = concept ? WORLDS[concept.world] : null;
    return { concept: c, name: concept?.name ?? c, world: world?.name ?? '', idea: concept?.idea ?? '' };
  });

  return {
    runNumber: run.number,
    character: run.character,
    complete: run.status === 'complete',
    start, end,
    startAssets: totalAssets(start), endAssets: totalAssets(end),
    startNet: totalAssets(start) - start.debt, endNet: totalAssets(end) - end.debt,
    totals, saved,
    goal: goal ? { label: goal.label, emoji: goal.emoji, cost: goal.cost, inFund: end.goal, pct: goalPct, bought, alternative } : null,
    wellbeing: run.wellbeing,
    decisions, demonstrated, practice, badges,
    xpGained: run.xpGained, level: levelOf(gs.profile.xp),
    reflection, recommendations,
    transactions: run.ledger.transactions,
  };
}
