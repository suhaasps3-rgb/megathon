// @ts-check
/**
 * Future Lab: a simplified, clearly hypothetical model of saving vs investing.
 *
 * Nothing here touches the ledger. Returns come from a seeded pseudo-random generator so
 * the same settings always produce the same chart (explainable, testable), and every
 * "market" is an assumption chosen to illustrate a concept, not a forecast.
 *
 * Assumed yearly behaviour (mean, volatility):
 *   savings   3.5%, no volatility           (bank savings account style)
 *   index     9%,   ±15% yearly swings      (a broad, diversified basket)
 *   single    11%,  ±40% yearly swings      (one company; can fall a long way)
 * Inflation is assumed at 5% a year.
 */

export const ASSETS = /** @type {const} */ ({
  savings: { label: 'Savings account', mean: 0.035, vol: 0 },
  index: { label: 'Diversified index fund', mean: 0.09, vol: 0.15 },
  single: { label: 'One company’s shares', mean: 0.11, vol: 0.4 },
});
export const INFLATION = 0.05;

/** @typedef {keyof typeof ASSETS} LabAsset */

/** Mulberry32: tiny deterministic PRNG. @param {number} seed */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roughly normal via the sum of uniforms. @param {() => number} r */
function gauss(r) {
  let s = 0;
  for (let i = 0; i < 6; i += 1) s += r();
  return (s - 3) / Math.sqrt(0.5);
}

/**
 * Simulate many hypothetical paths for an allocation and report the spread.
 * Works in whole rupees for display; this is a teaching model, not the ledger.
 * @param {{ savings: number, index: number, single: number }} pct  Percentages summing to 100.
 * @param {number} years 1–15
 * @param {number} start Starting amount in rupees.
 * @param {number} [paths]
 */
export function simulate(pct, years, start = 10000, paths = 200) {
  const total = pct.savings + pct.index + pct.single;
  if (total !== 100) throw new Error('Allocation must add up to 100%');
  const y = Math.max(1, Math.min(15, Math.round(years)));
  /** @type {number[]} */
  const finals = [];
  /** @type {number[][]} */
  const sample = [];
  for (let p = 0; p < paths; p += 1) {
    const r = rng(1000 + p);
    /** @type {Record<LabAsset, number>} */
    const v = {
      savings: (start * pct.savings) / 100,
      index: (start * pct.index) / 100,
      single: (start * pct.single) / 100,
    };
    const path = [start];
    for (let t = 0; t < y; t += 1) {
      // One market shock per year shared by both risky assets: diversification doesn't
      // protect against the whole market falling.
      const market = gauss(r);
      const own = gauss(r);
      v.savings *= 1 + ASSETS.savings.mean;
      v.index *= Math.max(0.3, 1 + ASSETS.index.mean + ASSETS.index.vol * market);
      v.single *= Math.max(0.05, 1 + ASSETS.single.mean + ASSETS.single.vol * (0.5 * market + 0.87 * own));
      path.push(v.savings + v.index + v.single);
    }
    finals.push(path[path.length - 1]);
    if (p < 5) sample.push(path.map(Math.round));
  }
  finals.sort((a, b) => a - b);
  const q = (/** @type {number} */ f) => Math.round(finals[Math.min(finals.length - 1, Math.floor(f * finals.length))]);
  const lossChance = Math.round((finals.filter((f) => f < start).length / finals.length) * 100);
  return {
    years: y,
    start,
    worst: q(0.05),
    typical: q(0.5),
    best: q(0.95),
    lossChance,
    // What the starting amount needs to be worth just to keep up with prices.
    inflationTarget: Math.round(start * Math.pow(1 + INFLATION, y)),
    sample,
  };
}

/** Compound growth for the concept card: amount × (1 + rate)^years, rounded to rupees. */
/** @param {number} amount @param {number} rate @param {number} years */
export function compound(amount, rate, years) {
  return Math.round(amount * Math.pow(1 + rate, years));
}
