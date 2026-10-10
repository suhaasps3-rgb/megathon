// @ts-check
/**
 * Local, deterministic lesson content. Life Mode never needs an AI service to teach:
 * every concept has a one-line idea, a worked example (used as the simpler explanation
 * when a player shows a misconception) and an optional deeper read.
 */

/** @typedef {'wallet' | 'goal' | 'future' | 'scam'} WorldId */

/**
 * @typedef {Object} Concept
 * @property {string} id
 * @property {string} name
 * @property {WorldId} world
 * @property {string} idea      One or two sentences.
 * @property {string} example   A worked example with small numbers.
 * @property {string} deeper    Optional longer explanation.
 */

/** @type {Record<WorldId, { id: WorldId, name: string, tagline: string, emoji: string }>} */
export const WORLDS = {
  wallet: { id: 'wallet', name: 'Wallet Warrior', tagline: 'Budgeting and spending', emoji: '👛' },
  goal: { id: 'goal', name: 'Goal Guardian', tagline: 'Saving and resilience', emoji: '🛡️' },
  future: { id: 'future', name: 'Future Lab', tagline: 'Investing ideas, safely simulated', emoji: '🧪' },
  scam: { id: 'scam', name: 'Scam Detective', tagline: 'Digital money safety', emoji: '🕵️' },
};

/** @type {Record<string, Concept>} */
export const CONCEPTS = {
  needs_wants: {
    id: 'needs_wants', name: 'Needs, wants and priorities', world: 'wallet',
    idea: 'Needs keep your life running (food, travel to school, a working phone for class). Wants make life better. Both matter; the skill is deciding the order.',
    example: 'A ₹299 recharge you need for school groups comes before a ₹200 game skin. That doesn’t make the skin bad; it means it waits until the need is covered.',
    deeper: 'The same item can be a need for one person and a want for another. A cycle is a need if it is your only way to college, and a want if you also have a free bus pass. Ask: what happens if I don’t buy this?',
  },
  opportunity_cost: {
    id: 'opportunity_cost', name: 'Opportunity cost', world: 'wallet',
    idea: 'Every rupee can only be used once. The real cost of a choice includes what you gave up to make it.',
    example: 'Spending ₹300 on a movie means that ₹300 is not in your goal fund. If your goal is ₹1,800, that is one-sixth of it.',
    deeper: 'Opportunity cost is not a reason to never spend. A movie with friends can be worth more to you than ₹300 of progress. The point is to see the trade clearly before you make it.',
  },
  budgeting: {
    id: 'budgeting', name: 'Budget planning', world: 'wallet',
    idea: 'A budget gives every rupee a job before the month starts: needs first, then savings and goals, then fun.',
    example: 'With ₹1,500: ₹299 recharge, ₹400 goal fund, ₹300 savings leaves ₹501 to enjoy without guilt.',
    deeper: 'Cash you have is not the same as cash you are free to spend. Money already planned for a bill or goal is “spoken for”, even while it sits in your wallet.',
  },
  recurring_expenses: {
    id: 'recurring_expenses', name: 'Recurring expenses', world: 'wallet',
    idea: 'Subscriptions and auto-renewals repeat every month until you stop them. Small amounts add up quietly.',
    example: '₹149 a month is ₹1,788 a year, close to the price of an online course.',
    deeper: 'Check auto-pay mandates in your UPI app every few months. Keep subscriptions you actually use and value; cancel the ones that renew out of habit.',
  },
  transfer_vs_expense: {
    id: 'transfer_vs_expense', name: 'Transfers are not spending', world: 'goal',
    idea: 'Moving money from cash into savings is a transfer. It is still your money, so your total does not go down.',
    example: 'You have ₹500 cash. You move ₹200 to savings. Now: cash ₹300 + savings ₹200 = ₹500 total. Spending ₹200 instead would leave ₹300 total.',
    deeper: 'Think of two pockets. Moving a note from your left pocket to your right pocket doesn’t make you poorer. Only spending, losses or giving money away reduce what you own.',
  },
  emergency_fund: {
    id: 'emergency_fund', name: 'Emergency fund', world: 'goal',
    idea: 'An emergency fund is savings kept for surprises, so a broken phone or a medical bill doesn’t wreck your plans or push you into borrowing.',
    example: 'With ₹600 saved, a ₹600 repair is a small bump. With ₹0 saved, the same repair means borrowing or giving up your goal.',
    deeper: 'Adults often aim for three to six months of expenses. For a student, even a few hundred rupees that you don’t touch for fun is a strong start.',
  },
  goal_planning: {
    id: 'goal_planning', name: 'Goal planning and timelines', world: 'goal',
    idea: 'A goal becomes a plan when it has a price, a date and a monthly amount.',
    example: 'Goal ₹1,800, already saved ₹600. At ₹400 a month you need 3 months; at ₹200 a month, 6 months.',
    deeper: 'Money for a goal you need soon should stay somewhere safe and easy to access. Longer goals can tolerate more ups and downs.',
  },
  borrowing: {
    id: 'borrowing', name: 'Borrowing responsibly', world: 'goal',
    idea: 'Borrowing lets you handle something now and pay later. The key questions are: how much, from whom, and how will you repay it?',
    example: 'Borrowing ₹600 from your sister gives you ₹600 cash but also a ₹600 debt. Your net worth is unchanged until you spend it.',
    deeper: 'Loans from apps or credit cards usually charge interest, which can grow fast. Family loans may be interest-free but still carry trust. In this game, borrowing has no interest but must be repaid.',
  },
  risk_return: {
    id: 'risk_return', name: 'Risk and return', world: 'future',
    idea: 'Options that might grow more usually swing more. Higher possible return comes with a higher chance of losing money.',
    example: 'A savings account grows slowly but steadily. A single company’s share can double or halve. Neither outcome is guaranteed.',
    deeper: 'Simulated numbers in this game are assumptions for learning, not predictions. Real investments can lose value, and past returns don’t promise future ones.',
  },
  time_compounding: {
    id: 'time_compounding', name: 'Time and compounding', world: 'future',
    idea: 'Compounding means growth earns growth. Time does most of the work, which is why starting early matters more than starting big.',
    example: '₹1,000 growing at an assumed 8% a year becomes about ₹1,080 after 1 year, ₹1,469 after 5, and ₹2,159 after 10.',
    deeper: 'The same maths works against you with debt: interest on unpaid interest grows the amount owed.',
  },
  diversification: {
    id: 'diversification', name: 'Diversification', world: 'future',
    idea: 'Spreading money across many things means one bad outcome hurts less. It lowers risk; it does not remove it.',
    example: 'If one company in a fund of 50 falls 40%, the fund only falls a little. If all your money was in that one company, you lose 40%.',
    deeper: 'Index funds spread money across many companies. Even so, the whole market can fall together, especially over short periods.',
  },
  liquidity: {
    id: 'liquidity', name: 'Liquidity and time horizon', world: 'future',
    idea: 'Money you need soon should be easy to access and unlikely to drop in value. Investing suits money you won’t need for years.',
    example: 'Course fees due in 3 months belong in savings. A market dip right before the deadline could leave you short.',
    deeper: 'Saving protects money; investing tries to grow it over long periods while accepting ups and downs.',
  },
  inflation: {
    id: 'inflation', name: 'Inflation', world: 'future',
    idea: 'Prices tend to rise over time, so the same rupees buy a little less each year.',
    example: 'If prices rise 5% a year, a ₹200 movie ticket costs about ₹256 in five years.',
    deeper: 'Cash kept for many years slowly loses buying power. That is one reason people invest long-term money, accepting some risk.',
  },
  scam_signs: {
    id: 'scam_signs', name: 'Spotting scam warning signs', world: 'scam',
    idea: 'Scams usually combine urgency, a request for secret codes or money, and something that doesn’t match (odd links, personal numbers, offers too good to be true).',
    example: '“Your account will be blocked today, click bank-kyc-update.in” has three signs: panic, pressure and a fake website address.',
    deeper: 'Banks and UPI apps never ask for your OTP, PIN or password by call, SMS or chat. Verify using the official app or the number printed on your card, never the one in the message.',
  },
  otp_pin_safety: {
    id: 'otp_pin_safety', name: 'OTP and UPI PIN safety', world: 'scam',
    idea: 'An OTP or UPI PIN is a key to your money. Nobody genuine will ever ask for it. You only enter your PIN to send money, never to receive it.',
    example: 'A “collect request” that asks for your PIN so you can “receive ₹600” is actually a request to take ₹600 from you.',
    deeper: 'Never share screens, install remote-access apps, or read out codes to callers, even if they know your name or account details.',
  },
  fraud_response: {
    id: 'fraud_response', name: 'What to do after fraud', world: 'scam',
    idea: 'Act fast and without shame: tell a trusted adult, call the 1930 cyber-fraud helpline, report at cybercrime.gov.in, and inform the bank.',
    example: 'Reporting within the first hour gives banks the best chance to freeze money before it moves further.',
    deeper: 'Being tricked is not a personal failure; scammers are professionals. Reporting helps protect others too.',
  },
};

/** @param {string} id */
export function conceptName(id) {
  return CONCEPTS[id]?.name ?? id;
}
