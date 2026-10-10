/**
 * Understands simple money sentences without AI, so the mentor and Audio Mode still work
 * offline. Examples: "spent 200 on pizza", "I got 500 from my aunt", "paid ₹80 for a bus".
 * Returns the same `{ actions }` shape as the AI parser.
 */
const EXPENSE = /\b(spent|spend|paid|pay|bought|buy|lost)\b/i;
const INCOME = /\b(got|get|earned|earn|received|receive|won|gift(?:ed)?)\b/i;
const AMOUNT = /(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\s*(?:rupees|rs))?/i;

function labelFrom(text, fallback) {
  const m = text.match(/\b(?:on|for|from)\s+(?:a |an |the |my )?([a-z][a-z ]{1,24})/i);
  if (!m) return fallback;
  const words = m[1].trim().split(/\s+/).slice(0, 3).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function parseOffline(text) {
  const actions = [];
  // Split on "and", commas and full stops so "spent 50 on chai and got 200" gives two actions.
  for (const part of String(text || '').split(/\band\b|,(?!\d)|\.(?!\d)/i)) {
    const amt = part.match(AMOUNT);
    if (!amt) continue;
    const amount = Number(amt[1].replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (EXPENSE.test(part)) actions.push({ type: 'expense', amount, label: labelFrom(part, 'Expense') });
    else if (INCOME.test(part)) actions.push({ type: 'income', amount, label: labelFrom(part, 'Income') });
  }
  return { actions };
}

/** A short spoken or written reply for offline actions. */
export function offlineReply(actions, balance) {
  if (!actions.length) {
    return 'I can log money while offline. Try "I spent 120 on lunch" or "I got 500 from my aunt".';
  }
  const parts = actions.map((a) => `${a.type === 'expense' ? 'spent' : 'got'} ₹${a.amount}${a.label && !['Expense', 'Income'].includes(a.label) ? ` (${a.label.toLowerCase()})` : ''}`);
  return `Logged: ${parts.join(', ')}. Your balance is ₹${balance}.`;
}
