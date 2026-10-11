export const STARTING_WALLET = 1000;

/**
 * Turns a finished Learn run into a money style and a score. Pure so the rules can be tested.
 * The vault figure is a simulation (about 8% a year), never a real return.
 */
export function personaOf({ wallet, history = [], futureWealth = 0, goalCost = 0 }) {
  const spent = STARTING_WALLET - wallet;
  let score = 1000;
  for (const h of history) score += h.choice?.isGood ? 500 : -300;
  if (goalCost > 0 && wallet >= goalCost) score += 2000;
  if (futureWealth > 1000) score += 1500;

  let id;
  if (spent > 600) { id = 'spender'; score -= 1000; }
  else if (spent === 0 && futureWealth < 200) { id = 'mattress'; }
  else if (futureWealth > 500) { id = 'stealth'; score += 1000; }
  else id = 'balanced';

  return { id, score: Math.max(0, score), spent, goalReached: goalCost > 0 ? wallet >= goalCost : null };
}
