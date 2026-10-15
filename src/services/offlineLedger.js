/**
 * The mentor without AI. It does two things, both locally and deterministically:
 *  1. Logs money that actually moved: "spent 200 on pizza", "I got 500 from my aunt".
 *  2. Answers common money questions (buy vs save or SIP, budgeting, emergency funds, loans,
 *     scams) with an explanation that uses the player's own numbers.
 * Plans and questions ("should I buy a cycle for 1000?") are never logged as spending.
 * It educates and never recommends a specific product; simulated growth is always labelled.
 */
// Money taken from you is a loss even when the sentence says "got": "got scammed of 2000".
const LOSS = /\b(scam(?:med)?|fraud(?:ed)?|cheated|lost|stolen|robbed)\b/i;
// "I gave 200 to Ravi" is spending; "mom gave 500" is money received.
const EXPENSE = /\b(spent|spend|paid|pay|bought|buy|ordered|recharged|(?:i|we) gave)\b/i;
const INCOME = /\b(got|get|earned|earn|received|receive|won|gave|gift(?:ed)?)\b/i;
// "or" only makes a question when it offers an alternative, so "100 or so" is still a statement.
const HYPOTHETICAL = /\?|\b(should|shall|could|would|which|better|think|thinking|plan|planning|want to|wanna|have to|need to|going to|gonna|will|tomorrow|next|if|or(?!\s+(?:so|something|more|less)\b)|can i|is it)\b/i;

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100, a: 1, an: 1,
};
const SCALES = { hundred: 100, thousand: 1000, k: 1000, lakh: 100000, lakhs: 100000, lac: 100000 };

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Reads the first amount in a sentence: "1,200", "₹500", "2k", "1.5 lakh", "thousand rupees",
 * "two thousand", "five hundred". Returns null when there is no amount.
 */
export function parseAmount(text) {
  const t = String(text || '').toLowerCase();
  const digits = t.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)\s*(k|thousand|lakhs?|lac|hundred)?\b/);
  if (digits) {
    const base = Number(digits[1].replace(/,/g, ''));
    const scale = digits[2] ? SCALES[digits[2]] : 1;
    if (Number.isFinite(base) && base > 0) return Math.round(base * scale);
  }
  const words = t.match(/\b(?:(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|a|an)\s+)?(hundred|thousand|lakhs?|lac)\b/);
  if (words) {
    const lead = words[1] ? WORD_NUMBERS[words[1]] : 1;
    return lead * SCALES[words[2]];
  }
  return null;
}

const capitalise = (w) => w.charAt(0).toUpperCase() + w.slice(1);

function labelFrom(text, fallback) {
  const m = text.match(/\b(?:on|for|from)\s+(?:a |an |the |my )?([a-z][a-z ]{1,24})/i);
  if (m) return capitalise(m[1].trim().split(/\s+/).slice(0, 3).join(' '));
  // "bought a cycle for 1000": name the thing that was bought.
  const obj = text.match(/\b(?:bought|buy|paid for|got|ordered)\s+(?:a |an |the |my |some )?([a-z][a-z]{1,20})/i);
  if (obj) return capitalise(obj[1].toLowerCase());
  return /\brecharged\b/i.test(text) ? 'Recharge' : fallback;
}

export function parseOffline(text) {
  const actions = [];
  const all = String(text || '');
  // A question or a plan is not a transaction, so nothing is logged for it.
  if (HYPOTHETICAL.test(all)) return { actions };
  // Split on "and", commas and full stops so "spent 50 on chai and got 200" gives two actions.
  for (const part of all.split(/\band\b|,(?!\d)|\.(?!\d)/i)) {
    const amount = parseAmount(part);
    if (!amount) continue;
    if (LOSS.test(part) || EXPENSE.test(part)) actions.push({ type: 'expense', amount, label: labelFrom(part, 'Expense') });
    else if (INCOME.test(part)) actions.push({ type: 'income', amount, label: labelFrom(part, 'Income') });
  }
  return { actions };
}

/** Simulated value of a lump sum after `years` at `rate` a year. */
const lumpSum = (amount, years, rate = 0.08) => amount * (1 + rate) ** years;

/** Simulated value of a monthly SIP after `years`, contributions at the start of each month. */
export function sipValue(monthly, years, rate = 0.08) {
  const r = rate / 12;
  const n = years * 12;
  return monthly * (((1 + r) ** n - 1) / r) * (1 + r);
}

const ITEMS = /\b(cycle|bicycle|bike|phone|mobile|laptop|shoes|headphones|earphones|watch|console|game|clothes|dress|scooty|scooter)\b/i;

/** Picks the topic a question is about, most specific first. */
export function topicOf(text) {
  const t = String(text || '').toLowerCase();
  const wantsBuy = /\b(buy|purchase|get|spend)\b/.test(t) || ITEMS.test(t);
  const wantsGrow = /\b(sip|invest|investing|investment|mutual fund|save|saving|savings|fd|fixed deposit)\b/.test(t);
  if (/\b(otp|pin|scam|fraud|lottery|kyc|phishing|fake|link)\b/.test(t)) return 'scam';
  if (wantsBuy && wantsGrow) return 'buy-vs-grow';
  if (/\b(loan|emi|credit card|borrow|debt|interest rate|bnpl|pay later)\b/.test(t)) return 'borrow';
  if (/\b(crypto|bitcoin|stock|stocks|share market|trading|options)\b/.test(t)) return 'markets';
  if (/\b(sip|mutual fund|compound|compounding|invest|investing|investment)\b/.test(t)) return 'sip';
  if (/\b(emergency|unexpected|rainy day)\b/.test(t)) return 'emergency';
  if (/\b(budget|budgeting|pocket money|allowance|50.?30.?20|manage my money|monthly)\b/.test(t)) return 'budget';
  if (/\b(save|saving|savings|goal)\b/.test(t)) return 'save';
  if (wantsBuy) return 'buy';
  return null;
}

/**
 * A mentor answer built from the question and its numbers. Returns null when the question is
 * outside what the offline mentor knows, so the caller can say so honestly.
 */
export function answerQuestion(text, balance) {
  const amount = parseAmount(text);
  const item = (String(text || '').match(ITEMS) || [])[1]?.toLowerCase() || 'it';
  const a = amount ? inr(amount) : null;

  switch (topicOf(text)) {
    case 'buy-vs-grow': {
      const fare = 30;
      const payback = amount ? Math.ceil(amount / fare) : null;
      return [
        `Good question, and the answer depends on what the ${item} does for you.`,
        item === 'cycle' || item === 'bicycle' || item === 'bike'
          ? `If you'd ride it daily instead of paying about ${inr(fare)} a day for a bus or auto, it pays for itself${payback ? ` in roughly ${payback} days` : ''}. That's a need, and buying it can be the smart move.`
          : `If you need it for school or daily use, buying it can be the right call. If it's mostly a want, waiting a month costs you nothing.`,
        a
          ? `A SIP means investing a fixed amount in a mutual fund every month. Simulated only: ${a} growing at 8% a year could become about ${inr(lumpSum(amount, 5))} in 5 years, but funds can also fall and nothing is guaranteed.`
          : 'A SIP means investing a fixed amount in a mutual fund every month. It can grow over years, but funds can also fall and nothing is guaranteed.',
        'Under 18, a parent has to be the guardian on any investment.',
        'You can also do both: buy what you truly need, then start a small monthly SIP from future pocket money.',
      ].join(' ');
    }
    case 'sip': {
      const monthly = amount && amount <= 20000 ? amount : 500;
      return [
        `A SIP (systematic investment plan) puts a fixed amount, say ${inr(monthly)}, into a mutual fund every month.`,
        `Simulated only: ${inr(monthly)} a month for 5 years is ${inr(monthly * 60)} put in, and at 8% a year it could grow to about ${inr(sipValue(monthly, 5))}. That growth on top of growth is compounding.`,
        'Real returns go up and down, some years are negative, and nothing is guaranteed. Starting early and staying consistent matters more than the amount.',
        'Under 18, a parent has to be the guardian on the investment.',
      ].join(' ');
    }
    case 'emergency':
      return [
        'An emergency fund is money kept aside only for surprises, like a broken phone or a doctor visit.',
        `A good first target is one month of your spending${balance ? `; even ${inr(Math.round(balance * 0.2))} (20% of your ${inr(balance)}) is a start` : ''}.`,
        'Keep it somewhere easy to reach, not invested in something that can fall. It turns a surprise bill into an inconvenience instead of a loan.',
      ].join(' ');
    case 'budget': {
      const base = amount || balance || 1000;
      return [
        `One simple way to split ${inr(base)}: about 50% for needs (${inr(base * 0.5)}), 30% for wants (${inr(base * 0.3)}), and 20% to save (${inr(base * 0.2)}).`,
        'Pay the savings part first, as soon as money arrives, so it actually happens.',
        'Tell me what you spend, like "I spent 120 on lunch", and I will track it in your ledger.',
      ].join(' ');
    }
    case 'save':
      return [
        a ? `To save ${a}, split it into small steps: ${inr(amount / 10)} a week gets you there in 10 weeks.` : 'Pick one goal with a price and a date. That makes saving real.',
        'Move the money as soon as you get pocket money, not at the end of the month when it is gone.',
        'Keeping short-term savings safe matters more than chasing returns.',
      ].join(' ');
    case 'buy':
      return [
        `Before buying${a ? ` for ${a}` : ''}, ask: do I need it or want it, and would I still want it in a week?`,
        'Compare the price in two places and check for extra costs like delivery or repairs.',
        'If it would use more than half of what you have, think about saving for part of it first.',
      ].join(' ');
    case 'borrow': {
      const p = amount || 1000;
      return [
        `Borrowing costs interest. At 36% a year, typical for a credit card, ${inr(p)} costs about ${inr((p * 0.36) / 12)} every month you don't pay it back.`,
        '"Pay later" and EMIs feel cheap because they are split up, but late fees and interest add up fast.',
        'A small emergency fund is the best way to avoid needing a loan for surprises.',
      ].join(' ');
    }
    case 'markets':
      return [
        'Stocks and crypto can swing a lot, up or down, in days. Some people lose money they needed.',
        'Spreading money across many companies, for example through a diversified fund, lowers the risk of one bad pick.',
        'Only invest money you will not need for years, never borrowed money, and never because someone online promises returns.',
      ].join(' ');
    case 'scam':
      return [
        'Never share an OTP, UPI PIN or password with anyone, even someone claiming to be from a bank.',
        'You never need to enter your UPI PIN to receive money; a PIN request means money is leaving your account.',
        'Lottery wins, urgent KYC updates and too-good-to-be-true offers are classic scams. When unsure, stop and ask a parent.',
      ].join(' ');
    default:
      return null;
  }
}

/** A short spoken or written reply. `text` is the player's own words, used to answer questions. */
export function offlineReply(actions, balance, text = '') {
  if (!actions.length) {
    const answer = answerQuestion(text, balance);
    if (answer) return answer;
    return 'I am in offline mode, so I can explain saving, budgeting, SIPs, emergency funds, loans and scams, or log money you spent or got. Try "should I buy a cycle or start a SIP?" or "I spent 120 on lunch".';
  }
  const parts = actions.map((a) => `${a.type === 'expense' ? 'spent' : 'got'} ₹${a.amount}${a.label && !['Expense', 'Income'].includes(a.label) ? ` (${a.label.toLowerCase()})` : ''}`);
  return `Logged: ${parts.join(', ')}. Your balance is ₹${balance}.`;
}
