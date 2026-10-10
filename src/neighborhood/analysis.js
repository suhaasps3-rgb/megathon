import {
  START, BIKE_PRICE, SAVE_AMOUNT, REPAIR_COST, LOAN_RATE_YEARLY, GROWTH_RATE_YEARLY,
  projectSavings, monthlyInterest,
} from './economy.js';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Turns the recorded decisions of a finished run into a plain-language analysis. It never
 * invents a choice: if the log is missing or empty, it says so instead of guessing.
 * Every number is either a real amount from the log or a labelled simulation.
 */
export function analyseRun(wallet) {
  const log = Array.isArray(wallet?.log) ? wallet.log : [];
  if (wallet?.step !== 'done' || log.length === 0) {
    return { available: false, reason: wallet?.step === 'done' ? 'This save has no decision record, so no analysis can be shown. Start a new run to get one.' : 'Finish the mission to see your analysis.' };
  }

  const find = (...actions) => log.find((e) => actions.includes(e.action));
  const bike = find('buy-bike', 'save-instead');
  const repair = find('repair-savings', 'repair-cash', 'repair-borrow');
  const delivery = find('deliver');

  const income = delivery ? delivery.cashAfter - delivery.cashBefore : 0;
  const bikeSpend = bike?.action === 'buy-bike' ? BIKE_PRICE : 0;
  const savedAmount = bike?.action === 'save-instead' ? SAVE_AMOUNT : 0;
  const repairSpend = repair ? REPAIR_COST : 0;
  const borrowed = repair?.action === 'repair-borrow' ? wallet.debt : 0;

  const dimensions = [];

  if (bike) {
    const saved = bike.action === 'save-instead';
    dimensions.push({
      id: 'goal',
      label: 'Saving toward a goal',
      level: saved ? 'strong' : 'weak',
      explain: saved
        ? `You moved ${inr(SAVE_AMOUNT)} into savings instead of spending it on the bike, so that money keeps working for a future goal.`
        : `You spent ${inr(BIKE_PRICE)} on the bike, which left your savings at ₹0. Nothing is set aside for the next goal.`,
      evidence: `Bike decision: ${saved ? 'save-instead' : 'buy-bike'} (cash ${inr(bike.cashBefore)} → ${inr(bike.cashAfter)}).`,
    });
  }

  if (repair) {
    const level = repair.action === 'repair-savings' ? 'strong' : repair.action === 'repair-cash' ? 'partial' : 'weak';
    dimensions.push({
      id: 'emergency',
      label: 'Emergency preparedness',
      level,
      explain: level === 'strong'
        ? 'When the phone cracked you paid from savings, so the emergency fund absorbed a surprise without debt.'
        : level === 'partial'
          ? 'You paid from cash. It worked, but it left no cushion for a second surprise. Savings would have covered it more safely.'
          : `You had too little cash and borrowed ${inr(borrowed)}. The gap now costs interest every month.`,
      evidence: `Repair decision: ${repair.action} (savings ${inr(repair.savingsBefore)}, cash ${inr(repair.cashBefore)}).`,
    });
  }

  const costLevel = borrowed > 0 ? 'weak' : 'strong';
  dimensions.push({
    id: 'cost',
    label: 'Cost awareness',
    level: costLevel,
    explain: borrowed > 0
      ? `Borrowing ${inr(borrowed)} at ${LOAN_RATE_YEARLY * 100}% a year costs about ${inr(monthlyInterest(borrowed))} a month in interest. That is money lost to the cost of borrowing.`
      : 'You avoided borrowing, so no interest was added to your costs this run.',
    evidence: borrowed > 0 ? `Debt after repair: ${inr(wallet.debt)}.` : 'No debt was taken on.',
  });

  const counterfactual = bike ? counterfactualFor(bike, savedAmount) : null;

  const strengths = dimensions.filter((d) => d.level === 'strong');
  const weak = dimensions.filter((d) => d.level === 'weak');
  const partial = dimensions.filter((d) => d.level === 'partial');
  const improvement = weak[0] || partial[0] || null;

  return {
    available: true,
    objective: 'Get to a working bike and keep an emergency buffer after a phone repair.',
    cashflow: {
      startCash: START.cash,
      income,
      bikeSpend,
      savedAmount,
      repairSpend,
      borrowed,
      endCash: wallet.cash,
      endSavings: wallet.savings,
      endDebt: wallet.debt,
    },
    decisions: log.map((e) => ({ action: e.action, cashBefore: e.cashBefore, cashAfter: e.cashAfter, savingsAfter: e.savingsAfter, debtAfter: e.debtAfter })),
    dimensions,
    counterfactual,
    strength: strengths[0] || null,
    improvement,
    recommendation: recommendationFor(improvement, dimensions),
    principle: 'An emergency fund turns an unexpected bill into an inconvenience instead of a debt. Savings you set aside early also have time to grow, though growth is never guaranteed.',
  };
}

function counterfactualFor(bike, savedAmount) {
  if (savedAmount) {
    return {
      simulated: true,
      title: 'If you had bought the bike',
      text: `You would have a bike now, but no savings. The ${inr(SAVE_AMOUNT)} would be gone rather than growing toward a goal.`,
    };
  }
  const future = projectSavings(SAVE_AMOUNT, 10);
  return {
    simulated: true,
    title: 'If you had saved the money',
    text: `Simulated only: ${inr(SAVE_AMOUNT)} growing at ${GROWTH_RATE_YEARLY * 100}% a year could reach about ${inr(future)} in 10 years. Returns are not guaranteed and can be lower or negative.`,
  };
}

function recommendationFor(improvement, dimensions) {
  if (!improvement) return 'Keep this habit going. Next, try a goal that needs several months of saving.';
  if (improvement.id === 'emergency') return 'Next, try a mission where you build an emergency buffer before an unexpected bill arrives.';
  if (improvement.id === 'goal') return 'Next, try a saving goal where you compare two plans for the same money.';
  return 'Next, try a mission on the cost of borrowing before you need to borrow.';
}
