// @ts-check
/**
 * Money helpers. All amounts inside Life Mode are integer paise (₹1 = 100 paise).
 * Floats never enter the ledger; rupee values are converted at the edge with `rupees()`.
 */

/** @typedef {number} Paise Integer number of paise. */

/**
 * Convert a whole-rupee amount to paise.
 * @param {number} r
 * @returns {Paise}
 */
export function rupees(r) {
  if (!Number.isFinite(r)) throw new Error('rupees(): amount must be finite');
  return Math.round(r * 100);
}

/**
 * @param {unknown} v
 * @returns {v is Paise}
 */
export function isPaise(v) {
  return typeof v === 'number' && Number.isSafeInteger(v);
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/**
 * Format paise as an Indian rupee string, e.g. 150000 → "₹1,500".
 * @param {Paise} p
 * @param {{ sign?: boolean }} [opts]
 */
export function formatINR(p, opts = {}) {
  const abs = Math.abs(p);
  const body = '₹' + inr.format(abs / 100);
  if (p < 0) return '−' + body;
  if (opts.sign && p > 0) return '+' + body;
  return body;
}
