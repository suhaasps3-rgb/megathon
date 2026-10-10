// @ts-check
/**
 * Life Mode content: six chapters across the four worlds, written as data.
 *
 * Scenarios describe money changes as transaction drafts; the game engine validates and
 * commits them through the ledger. Content never edits balances directly. `when` returns
 * true or a plain-language reason the option is unavailable. Affordability is checked
 * automatically by dry-running a choice's transactions, so content cannot bypass it.
 */
import { rupees as r } from '../domain/money.js';

/** @typedef {import('../domain/ledger.js').TxDraft} TxDraft */
/** @typedef {import('../domain/ledger.js').Balances} Balances */
/** @typedef {import('./concepts.js').WorldId} WorldId */

/**
 * @typedef {Object} Goal
 * @property {string} id
 * @property {string} label
 * @property {string} emoji
 * @property {number} cost      Paise.
 * @property {string} why
 * @property {{ label: string, cost: number }} alt  A cheaper way to reach most of the same benefit.
 */

/**
 * What content may read about the player. Built by the engine; read-only.
 * @typedef {Object} View
 * @property {Balances} balances
 * @property {Goal | null} goal
 * @property {Record<string, boolean | number | string>} flags
 * @property {number} wellbeing
 * @property {(concept: string) => import('../domain/learning.js').MasteryLevel} mastery
 */

/** @typedef {Omit<TxDraft, 'scenarioId' | 'choiceId'>} EffectDraft */

/**
 * @typedef {Object} Outcome
 * @property {string} title
 * @property {string} why      Why the numbers changed the way they did.
 * @property {string} learned  The concept, in one or two sentences.
 * @property {string} [next]   What the player can do next.
 */

/**
 * @typedef {Object} Choice
 * @property {string} id
 * @property {string} label
 * @property {string | ((v: View) => string)} detail
 * @property {{ cost?: string, benefit?: string, risk?: string, goal?: string }} [tags]
 * @property {EffectDraft[] | ((v: View) => EffectDraft[])} [effects]
 * @property {number} [wellbeing]  Change to the 0–100 wellbeing meter.
 * @property {Record<string, boolean | number | string>} [setFlags]
 * @property {Goal} [setGoal]
 * @property {(v: View) => true | string} [when]
 * @property {{ concept: string, correct: boolean }[]} [evidence]
 * @property {Outcome | ((v: View) => Outcome)} outcome  Functions receive the view after the decision.
 */

/**
 * @typedef {Object} Check
 * @property {string} concept
 * @property {string} question
 * @property {{ text: string, correct?: boolean }[]} options
 * @property {string} explain
 */

/**
 * @typedef {Object} Inspectable
 * @property {string} sender
 * @property {string} channel
 * @property {{ id: string, text: string, flag: boolean, why: string }[]} segments
 */

/**
 * @typedef {Object} Scenario
 * @property {string} id
 * @property {number} chapter
 * @property {WorldId} world
 * @property {string} title
 * @property {string | ((v: View) => string)} narrative
 * @property {string[]} concepts       Concept tags; drive adaptive support.
 * @property {string} objective        Shown as the active objective.
 * @property {(v: View) => boolean} [showIf]
 * @property {{ effects: EffectDraft[] | ((v: View) => EffectDraft[]), note: string | ((v: View) => string) }} [entry]
 * @property {Choice[]} choices
 * @property {Check} [check]
 * @property {Inspectable} [inspect]
 * @property {boolean} [lab]           Shows the Future Lab sandbox before choosing.
 * @property {boolean} [endsRun]
 */

/** @type {Goal[]} */
export const GOALS = [
  {
    id: 'course', label: 'Online Python course with certificate', emoji: '💻', cost: r(1800),
    why: 'A real skill for college applications and small freelance projects later.',
    alt: { label: 'Free course videos plus the paid exam certificate', cost: r(600) },
  },
  {
    id: 'cycle', label: 'Second-hand cycle for the college commute', emoji: '🚲', cost: r(2400),
    why: 'Independence, and savings on auto fares every week.',
    alt: { label: 'Repair your cousin’s old cycle', cost: r(700) },
  },
  {
    id: 'tablet', label: 'Entry-level drawing tablet', emoji: '🎨', cost: r(2100),
    why: 'Turn your sketching into digital art you could one day sell.',
    alt: { label: 'A good sketchbook and pen set for now', cost: r(500) },
  },
];

/** @param {View} v */
const hasDebt = (v) => v.balances.debt > 0;

/**
 * Pay `amount` for a need, drawing from `order` accounts in turn (via transfers into cash
 * where needed) and then spending from cash. Used to model "use savings first".
 * @param {number} amount
 * @param {('savings' | 'goal')[]} order
 * @param {Balances} b
 * @param {string} description
 * @param {import('../domain/ledger.js').SpendCategory} category
 * @returns {EffectDraft[]}
 */
function payDrawingFrom(amount, order, b, description, category) {
  /** @type {EffectDraft[]} */
  const drafts = [];
  let remaining = amount;
  for (const acct of order) {
    const take = Math.min(b[acct], remaining);
    if (take > 0) {
      drafts.push({ type: 'transfer', from: acct, to: 'cash', amount: take, description: `Moved from ${acct === 'goal' ? 'goal fund' : 'savings'} to pay` });
      remaining -= take;
    }
  }
  drafts.push({ type: 'expense', from: 'cash', amount, category, description });
  return drafts;
}

const REPAIR = r(800);

/** @type {Scenario[]} */
export const SCENARIOS = [
  // ───────────────────────── Chapter 1 — Your Starting Point ─────────────────────────
  {
    id: 'start', chapter: 1, world: 'wallet', title: 'Your new life',
    objective: 'Pick a goal worth working towards',
    concepts: ['goal_planning', 'transfer_vs_expense'],
    narrative:
      'You are 16, in Class 11 in Hyderabad. Your family gives you ₹1,500 pocket money a month over UPI, and right now you have ₹500 in your account. ' +
      'Everything here is fictional money in a simulation, so experiment freely. First: what are you working towards?',
    choices: GOALS.map((g) => ({
      id: g.id,
      label: `${g.emoji} ${g.label}`,
      detail: g.why,
      tags: { cost: `Target ₹${(g.cost / 100).toLocaleString('en-IN')}` },
      setGoal: g,
      outcome: {
        title: 'Goal set',
        why: 'Nothing was spent. A goal gives your rupees a destination, which makes later choices easier to weigh.',
        learned: 'A goal becomes real when it has a price and a plan. You’ll build the plan as you go.',
      },
    })),
    check: {
      concept: 'transfer_vs_expense',
      question: 'Quick warm-up: you have ₹500 and move ₹200 into your savings. How much money do you own now?',
      options: [{ text: '₹300, because ₹200 is gone' }, { text: '₹500, split between cash and savings', correct: true }, { text: '₹700' }],
      explain: 'Moving money into savings is a transfer, not spending. Cash ₹300 + savings ₹200 = ₹500.',
    },
  },

  // ───────────────────────── Chapter 2 — Everyday Decisions ─────────────────────────
  {
    id: 'saturday', chapter: 2, world: 'wallet', title: 'Saturday plans',
    objective: 'Decide what to do with your ₹500 this weekend',
    concepts: ['opportunity_cost', 'transfer_vs_expense', 'needs_wants'],
    narrative: 'Your friends are heading to the mall on Saturday. A movie with popcorn is about ₹300. Some of them are just getting chai and walking at Necklace Road for about ₹100. You also keep thinking about your goal.',
    choices: [
      {
        id: 'movie', label: 'Movie and popcorn with everyone', detail: 'The full plan with the whole group.',
        tags: { cost: '₹300', benefit: 'A great evening with friends', goal: 'No progress this week' },
        effects: [{ type: 'expense', from: 'cash', amount: r(300), category: 'want', description: 'Movie and popcorn with friends' }],
        wellbeing: 12,
        outcome: {
          title: 'A fun evening, ₹300 spent',
          why: 'You paid ₹300 for something you enjoyed. That money left your account, so your total went down by ₹300.',
          learned: 'Spending on fun is a fair choice. Its opportunity cost here is ₹300 that could have gone to your goal.',
        },
      },
      {
        id: 'chai', label: 'Chai and a walk instead', detail: 'Still see everyone, spend less.',
        tags: { cost: '₹100', benefit: 'Time with friends', goal: 'Keeps ₹400 available' },
        effects: [{ type: 'expense', from: 'cash', amount: r(100), category: 'want', description: 'Chai and snacks at Necklace Road' }],
        wellbeing: 8,
        outcome: {
          title: 'Good time, small spend',
          why: 'You spent ₹100 on a want. ₹400 is still in your cash.',
          learned: 'There is often a cheaper version of a plan that keeps most of the fun.',
        },
      },
      {
        id: 'save', label: 'Skip this week and move ₹200 to savings', detail: 'Stay home, start your savings.',
        tags: { cost: '₹0 spent', benefit: 'Savings start growing', risk: 'You miss the outing' },
        effects: [{ type: 'transfer', from: 'cash', to: 'savings', amount: r(200), description: 'Moved to savings' }],
        wellbeing: -3,
        outcome: {
          title: '₹200 moved to savings',
          why: 'Your cash fell by ₹200 and your savings rose by ₹200. Nothing was spent, so your total stayed ₹500.',
          learned: 'A transfer moves your own money between pockets. It is not an expense.',
        },
      },
    ],
    check: {
      concept: 'transfer_vs_expense',
      question: 'Which of these lowers the total money you own?',
      options: [{ text: 'Moving ₹200 from cash to savings' }, { text: 'Spending ₹200 on a movie', correct: true }, { text: 'Moving ₹200 from savings back to cash' }],
      explain: 'Only spending (or losing money) lowers your total. Moving money between your own accounts keeps it the same.',
    },
  },
  {
    id: 'allowance', chapter: 2, world: 'wallet', title: 'Pocket money day',
    objective: 'Give this month’s money a plan',
    concepts: ['budgeting', 'needs_wants'],
    entry: {
      effects: [{ type: 'income', to: 'cash', amount: r(1500), description: 'Monthly pocket money (UPI)' }],
      note: '₹1,500 pocket money arrived in your account.',
    },
    narrative: 'Your phone’s ₹299 monthly recharge is due. You need it for class WhatsApp groups and online homework. How will you plan the rest of the month?',
    choices: [
      {
        id: 'goal_first', label: 'Goal-first plan', detail: 'Recharge, then ₹700 straight into your goal fund.',
        tags: { cost: '₹299 recharge', goal: '+₹700 to goal', risk: 'Less cash for surprises' },
        effects: [
          { type: 'expense', from: 'cash', amount: r(299), category: 'need', description: 'Mobile recharge' },
          { type: 'transfer', from: 'cash', to: 'goal', amount: r(700), description: 'Moved to goal fund' },
        ],
        evidence: [{ concept: 'budgeting', correct: true }],
        outcome: {
          title: 'Need covered, goal funded',
          why: 'The recharge was an expense of ₹299. The ₹700 moved into your goal fund is still your money, now set aside.',
          learned: 'Paying yourself first, right when money arrives, is the easiest way to make progress.',
        },
      },
      {
        id: 'balanced', label: 'Balanced plan', detail: 'Recharge, ₹300 to savings, ₹400 to your goal.',
        tags: { cost: '₹299 recharge', goal: '+₹400 to goal', benefit: '+₹300 safety net' },
        effects: [
          { type: 'expense', from: 'cash', amount: r(299), category: 'need', description: 'Mobile recharge' },
          { type: 'transfer', from: 'cash', to: 'savings', amount: r(300), description: 'Moved to savings' },
          { type: 'transfer', from: 'cash', to: 'goal', amount: r(400), description: 'Moved to goal fund' },
        ],
        evidence: [{ concept: 'budgeting', correct: true }],
        outcome: {
          title: 'Every rupee has a job',
          why: 'One expense (₹299) and two transfers. Your total only fell by the recharge.',
          learned: 'Splitting between a safety net and a goal protects you from surprises without stopping progress.',
        },
      },
      {
        id: 'flexible', label: 'Keep it flexible', detail: 'Pay the recharge and keep the rest as cash.',
        tags: { cost: '₹299 recharge', benefit: 'Maximum freedom', risk: 'Easy to spend without noticing' },
        effects: [{ type: 'expense', from: 'cash', amount: r(299), category: 'need', description: 'Mobile recharge' }],
        wellbeing: 3,
        outcome: {
          title: 'Need covered, rest unplanned',
          why: 'Only the ₹299 recharge was spent. Everything else is still cash.',
          learned: 'Flexible cash is useful, but unplanned money tends to disappear in small amounts. A plan doesn’t have to be strict to work.',
        },
      },
      {
        id: 'skip_recharge', label: 'Skip the recharge, use home Wi-Fi', detail: 'Save ₹299 this month.',
        tags: { cost: '₹0', risk: 'Offline at school and on the bus' },
        wellbeing: -6,
        evidence: [{ concept: 'needs_wants', correct: false }],
        outcome: {
          title: 'Money kept, but a need went unmet',
          why: 'No money moved. But you missed a homework update in the class group and had to borrow a friend’s phone twice.',
          learned: 'Cutting a real need to save money can cost you in other ways. Needs come first; wants are where to trim.',
        },
      },
    ],
  },
  {
    id: 'subscription', chapter: 2, world: 'wallet', title: 'The auto-renewal',
    objective: 'Decide whether a subscription is worth it',
    concepts: ['recurring_expenses', 'opportunity_cost'],
    narrative: 'A ₹149/month streaming subscription you signed up for during a free trial is about to auto-renew via UPI AutoPay. You watched it twice last month.',
    choices: [
      {
        id: 'keep', label: 'Keep it', detail: 'You like having it around.',
        tags: { cost: '₹149 every month', benefit: 'Shows on demand' },
        effects: [{ type: 'expense', from: 'cash', amount: r(149), category: 'want', description: 'Streaming subscription' }],
        wellbeing: 3, setFlags: { subscriptionKept: true },
        outcome: {
          title: 'Subscription renewed',
          why: '₹149 was spent, and it will renew again next month unless you cancel.',
          learned: 'Recurring costs are easy to forget. ₹149 a month is ₹1,788 a year.',
        },
      },
      {
        id: 'share', label: 'Share a family plan with your cousin', detail: 'Split the cost.',
        tags: { cost: '₹49 one-time share', benefit: 'Keep watching for less' },
        effects: [{ type: 'expense', from: 'cash', amount: r(49), category: 'want', description: 'Share of family streaming plan' }],
        wellbeing: 3,
        evidence: [{ concept: 'recurring_expenses', correct: true }],
        outcome: {
          title: 'Same shows, lower cost',
          why: 'You spent ₹49 instead of ₹149 and cancelled your own AutoPay.',
          learned: 'Sharing or downgrading is a middle path between keeping and cancelling.',
        },
      },
      {
        id: 'cancel', label: 'Cancel the AutoPay', detail: 'Two shows a month isn’t worth ₹149 to you.',
        tags: { cost: '₹0', risk: 'Fewer shows' },
        evidence: [{ concept: 'recurring_expenses', correct: true }],
        outcome: {
          title: 'AutoPay cancelled',
          why: 'Nothing was spent and nothing will renew.',
          learned: 'Checking your UPI AutoPay mandates now and then stops money leaking out quietly.',
        },
      },
    ],
    check: {
      concept: 'recurring_expenses',
      question: 'Which of these is a recurring expense?',
      options: [{ text: 'A monthly music subscription', correct: true }, { text: 'A one-time movie ticket' }, { text: 'Moving money into savings' }],
      explain: 'A recurring expense repeats automatically, usually monthly, until you stop it.',
    },
  },

  // ───────────────────────── Chapter 3 — The Unexpected ─────────────────────────
  {
    id: 'phone', chapter: 3, world: 'goal', title: 'Cracked screen',
    objective: 'Handle an unexpected ₹800 repair',
    concepts: ['emergency_fund', 'borrowing'],
    narrative: (v) =>
      `Your phone slips off the bus seat. The screen cracks and touch stops working in one corner. The repair shop quotes ₹800. ` +
      (v.balances.savings > 0
        ? `You have ${fmt(v.balances.savings)} in savings for exactly this kind of moment.`
        : 'You don’t have savings yet, so this will need another plan.'),
    choices: [
      {
        id: 'use_savings', label: 'Use savings first, then cash', detail: 'This is what an emergency fund is for.',
        tags: { cost: '₹800', benefit: 'Goal fund untouched', risk: 'Savings need rebuilding' },
        when: (v) => (v.balances.savings > 0 ? true : 'You have no savings yet'),
        effects: (v) => payDrawingFrom(REPAIR, ['savings'], v.balances, 'Phone screen repair', 'need'),
        setFlags: { usedEmergencyFund: true },
        evidence: [{ concept: 'emergency_fund', correct: true }],
        outcome: {
          title: 'Fixed without borrowing',
          why: 'Money moved from savings to cash (a transfer), then ₹800 was spent on the repair.',
          learned: 'Your savings absorbed the shock, so your goal and your relationships stayed untouched.',
        },
      },
      {
        id: 'cash', label: 'Pay from cash', detail: 'Use what’s in your wallet.',
        tags: { cost: '₹800', risk: 'Less cash for the rest of the month' },
        effects: [{ type: 'expense', from: 'cash', amount: REPAIR, category: 'need', description: 'Phone screen repair' }],
        outcome: {
          title: 'Repair paid from cash',
          why: 'Your cash dropped by ₹800.',
          learned: 'Unplanned cash can cover surprises, but it means less for the rest of the month.',
        },
      },
      {
        id: 'goal_fund', label: 'Take it from your goal fund', detail: 'Delay the goal to fix the phone.',
        tags: { cost: '₹800', goal: 'Goal pushed back' },
        when: (v) => (v.balances.goal > 0 ? true : 'Your goal fund is empty'),
        effects: (v) => payDrawingFrom(REPAIR, ['goal'], v.balances, 'Phone screen repair', 'need'),
        outcome: {
          title: 'Phone fixed, goal delayed',
          why: 'Money moved from your goal fund to cash, then paid for the repair.',
          learned: 'Without an emergency fund, surprises often come out of your goals. That’s why the two are kept separate.',
        },
      },
      {
        id: 'borrow', label: 'Borrow ₹800 from your elder sister', detail: 'She says pay her back when you can.',
        tags: { cost: '₹0 now, ₹800 owed', risk: 'A debt to repay' },
        effects: [
          { type: 'borrow', to: 'cash', amount: REPAIR, description: 'Borrowed from elder sister' },
          { type: 'expense', from: 'cash', amount: REPAIR, category: 'need', description: 'Phone screen repair' },
        ],
        setFlags: { borrowed: true },
        outcome: {
          title: 'Fixed with a family loan',
          why: 'Borrowing added ₹800 cash and ₹800 debt, then the repair spent the cash. You now owe ₹800.',
          learned: 'Borrowing solves today’s problem by moving it to the future. Having a repayment plan is what makes it responsible.',
          next: 'You’ll get a chance to repay soon.',
        },
      },
      {
        id: 'wait', label: 'Live with the crack for now', detail: 'It mostly works…',
        tags: { cost: '₹0 now', risk: 'It may get worse' },
        wellbeing: -8, setFlags: { phoneCracked: true },
        outcome: {
          title: 'Repair postponed',
          why: 'No money moved, but the problem is still there.',
          learned: 'Delaying a needed repair can be sensible when cash is tight, but problems can grow. Keep an eye on it.',
        },
      },
    ],
  },
  {
    id: 'gig', chapter: 3, world: 'goal', title: 'A weekend opportunity',
    objective: 'Weigh a chance to earn',
    concepts: ['goal_planning', 'opportunity_cost'],
    narrative: 'Your school’s fest committee needs posters designed and offers ₹800 for four evenings of work. Your unit test is next week.',
    choices: [
      {
        id: 'accept_save', label: 'Take it, and move half to your goal right away', detail: 'Earn and pay yourself first.',
        tags: { benefit: '+₹800 earned', goal: '+₹400 to goal', risk: 'Tired before the test' },
        effects: [
          { type: 'income', to: 'cash', amount: r(800), description: 'Poster design for school fest' },
          { type: 'transfer', from: 'cash', to: 'goal', amount: r(400), description: 'Moved to goal fund' },
        ],
        wellbeing: -3, setFlags: { earnedGig: true },
        evidence: [{ concept: 'goal_planning', correct: true }],
        outcome: {
          title: 'First income, half saved',
          why: '₹800 income arrived, then ₹400 moved to your goal fund. Your total rose by ₹800.',
          learned: 'Moving part of new income straight to a goal stops it blending into everyday spending.',
        },
      },
      {
        id: 'accept', label: 'Take it and keep the money as cash', detail: 'Decide later what to do with it.',
        tags: { benefit: '+₹800 earned', risk: 'Tired before the test' },
        effects: [{ type: 'income', to: 'cash', amount: r(800), description: 'Poster design for school fest' }],
        wellbeing: -3, setFlags: { earnedGig: true },
        outcome: {
          title: '₹800 earned',
          why: 'Your cash rose by ₹800 from income.',
          learned: 'Extra income gives you options. Deciding its job early helps it go further.',
        },
      },
      {
        id: 'decline', label: 'Decline and focus on your test', detail: 'Your studies are also an investment.',
        tags: { cost: '₹0', benefit: 'Rested and prepared' },
        wellbeing: 4,
        outcome: {
          title: 'Focused on your test',
          why: 'No money changed.',
          learned: 'Turning down money can be the right call. Time and energy are resources too, and that is a real opportunity cost.',
        },
      },
    ],
  },
  {
    id: 'repay', chapter: 3, world: 'goal', title: 'Paying back your sister',
    objective: 'Make a repayment plan',
    concepts: ['borrowing'],
    showIf: hasDebt,
    narrative: (v) => `You owe your sister ${fmt(v.balances.debt)}. You have ${fmt(v.balances.cash)} in cash.`,
    choices: [
      {
        id: 'full', label: 'Repay it all now', detail: 'Clear the debt.',
        tags: { cost: 'Full amount' },
        effects: (v) => [{ type: 'repay', from: 'cash', amount: v.balances.debt, description: 'Repaid elder sister' }],
        evidence: [{ concept: 'borrowing', correct: true }],
        outcome: { title: 'Debt cleared', why: 'Cash went down and your debt went to zero by the same amount, so your net worth didn’t change.', learned: 'Repaying debt doesn’t make you poorer; it removes what you owed.' },
      },
      {
        id: 'half', label: 'Repay half now, half next month', detail: 'Keep some cash buffer.',
        tags: { cost: 'Half now' },
        when: (v) => (v.balances.debt >= r(2) ? true : 'The debt is too small to split'),
        effects: (v) => [{ type: 'repay', from: 'cash', amount: Math.floor(v.balances.debt / 2), description: 'Partly repaid elder sister' }],
        evidence: [{ concept: 'borrowing', correct: true }],
        outcome: { title: 'Halfway there', why: 'Half the debt was repaid from cash.', learned: 'A repayment plan you can actually keep is better than a promise you can’t.', next: 'You can repay the rest later.' },
      },
      {
        id: 'later', label: 'Ask for more time', detail: 'Your sister agrees, but it’s on your mind.',
        tags: { cost: '₹0 now' }, wellbeing: -3,
        outcome: { title: 'Repayment delayed', why: 'No money moved. You still owe the full amount.', learned: 'Being honest about timing keeps trust. Just make sure “later” has a date.', next: 'You’ll get another chance to repay before the run ends.' },
      },
    ],
  },

  // ───────────────────────── Chapter 4 — Protect Your Money ─────────────────────────
  {
    id: 'kyc_sms', chapter: 4, world: 'scam', title: 'An urgent message',
    objective: 'Inspect the message, then decide what to do',
    concepts: ['scam_signs', 'otp_pin_safety'],
    narrative: 'This SMS arrives on the phone linked to your UPI account. Tap anything that looks suspicious, then choose what to do.',
    inspect: {
      sender: '+91 98480 61423', channel: 'SMS',
      segments: [
        { id: 'greeting', text: 'Dear Customer,', flag: true, why: 'Your real bank uses your name. Generic greetings are common in mass scam messages.' },
        { id: 'bank', text: 'your Deccan Bank UPI', flag: false, why: 'Naming a bank is not suspicious by itself; scammers copy real names, so check everything else.' },
        { id: 'urgency', text: 'will be BLOCKED TODAY.', flag: true, why: 'Panic and deadlines stop you from thinking. Banks don’t block accounts by SMS threat.' },
        { id: 'link', text: 'Update KYC at deccanbank-kyc-verify.in', flag: true, why: 'This is not the bank’s official website. Lookalike domains are a classic phishing trick.' },
        { id: 'otp', text: 'and share the OTP with our executive.', flag: true, why: 'No genuine bank, app or person will ever ask for your OTP. This alone proves it’s a scam.' },
      ],
    },
    choices: [
      {
        id: 'share_otp', label: 'Reply with the OTP so the account stays open', detail: 'It says it’s urgent.',
        tags: { risk: 'Handing over the key to your money' },
        effects: (v) => lossUpTo(v, r(1000), 'Money taken after sharing OTP'),
        setFlags: { scammed: true }, wellbeing: -10,
        evidence: [{ concept: 'otp_pin_safety', correct: false }],
        outcome: (v) => ({
          title: 'The OTP let someone take your money',
          why: `The “executive” used your OTP to approve payments. In this simulation ${fmt(Number(v.flags.scamLossPaise ?? 0))} was taken from your cash (the most a scam can take here is ₹1,000).`,
          learned: 'An OTP is a key, not a verification code for them. Nobody genuine will ever ask for it. This happens to careful adults too; what matters is what you do next.',
          next: 'Next you’ll decide how to respond to the fraud.',
        }),
      },
      {
        id: 'click', label: 'Open the link to check', detail: 'Just looking can’t hurt?',
        tags: { risk: 'Fake site may capture your details' },
        effects: (v) => lossUpTo(v, r(500), 'Money taken via fake KYC page'),
        setFlags: { scammed: true }, wellbeing: -8,
        evidence: [{ concept: 'scam_signs', correct: false }],
        outcome: {
          title: 'The fake page captured your details',
          why: 'The page looked real and asked for your UPI details “to verify”. In this simulation up to ₹500 was taken.',
          learned: 'Links in unexpected messages are the main way phishing works. Open your bank’s official app yourself instead.',
          next: 'Next you’ll decide how to respond.',
        },
      },
      {
        id: 'verify', label: 'Ignore the link and check in the official bank app', detail: 'Verify through a channel you trust.',
        tags: { benefit: 'Money stays safe' },
        setFlags: { scamAvoided: true },
        evidence: [{ concept: 'scam_signs', correct: true }, { concept: 'fraud_response', correct: true }],
        outcome: {
          title: 'Scam avoided',
          why: 'Your official app showed no KYC issue. No money moved.',
          learned: 'Verify using a channel you choose (the app, or the number on your card), never the one in the message.',
        },
      },
      {
        id: 'report', label: 'Block the number and report it', detail: 'Report on cybercrime.gov.in and tell a family member.',
        tags: { benefit: 'Money safe, others warned' },
        setFlags: { scamAvoided: true },
        evidence: [{ concept: 'scam_signs', correct: true }, { concept: 'fraud_response', correct: true }],
        outcome: {
          title: 'Blocked and reported',
          why: 'No money moved. Your report helps stop the number reaching others.',
          learned: 'Reporting attempts, not only losses, helps protect your whole community.',
        },
      },
    ],
    check: {
      concept: 'otp_pin_safety',
      question: 'Who is it safe to share an OTP with?',
      options: [{ text: 'A bank employee who calls you' }, { text: 'Nobody', correct: true }, { text: 'A customer-care number from a Google search' }],
      explain: 'Nobody. OTPs and PINs are only for you to type into your own app.',
    },
  },
  {
    id: 'scam_recovery', chapter: 4, world: 'scam', title: 'After the fraud',
    objective: 'Respond to the fraud',
    concepts: ['fraud_response'],
    showIf: (v) => v.flags.scammed === true && v.flags.scamLossPaise !== undefined && Number(v.flags.scamLossPaise) > 0,
    narrative: (v) => `You lost ${fmt(Number(v.flags.scamLossPaise))}. It feels awful, and it is not your fault that someone targeted you. What now?`,
    choices: [
      {
        id: 'report_fast', label: 'Call 1930 and tell a parent right away', detail: 'Also report at cybercrime.gov.in and inform the bank.',
        tags: { benefit: 'Best chance of recovery' },
        effects: (v) => {
          const back = Math.floor(Number(v.flags.scamLossPaise) / 2);
          return back > 0 ? [{ type: 'income', to: 'cash', amount: back, description: 'Recovered after fast fraud report' }] : [];
        },
        wellbeing: 6,
        evidence: [{ concept: 'fraud_response', correct: true }],
        outcome: {
          title: 'Reported quickly, half recovered',
          why: 'In this simulation the bank froze part of the money before it moved on, so half came back to your cash.',
          learned: 'Recovery is never guaranteed in real life, but reporting within the first hour gives the best chance.',
        },
      },
      {
        id: 'stay_quiet', label: 'Keep it to yourself', detail: 'It’s embarrassing.',
        wellbeing: -4,
        evidence: [{ concept: 'fraud_response', correct: false }],
        outcome: {
          title: 'Nothing recovered',
          why: 'No report was made, so there was no chance to freeze the money.',
          learned: 'There’s no shame in being targeted. Telling someone fast is what gives you options. Call 1930 next time.',
        },
      },
    ],
  },
  {
    id: 'collect_request', chapter: 4, world: 'scam', title: 'Selling your old textbooks',
    objective: 'Get paid safely',
    concepts: ['otp_pin_safety', 'scam_signs'],
    // Harder variant: shown to players who already spot obvious scams.
    showIf: (v) => ['practicing', 'confident'].includes(v.mastery('scam_signs')),
    narrative: 'You listed your Class 10 textbooks online for ₹400. A buyer replies quickly: “Bro I’ve sent a UPI collect request of ₹400 so you can receive it. Just approve with your PIN 👍”. Their profile looks normal.',
    choices: [
      {
        id: 'approve', label: 'Approve the request with your PIN', detail: 'Looks like a normal payment.',
        tags: { risk: 'PIN sends money' },
        effects: (v) => lossUpTo(v, r(400), 'Approved a collect request (money sent)'),
        wellbeing: -6,
        evidence: [{ concept: 'otp_pin_safety', correct: false }],
        outcome: {
          title: 'The request took money from you',
          why: 'Approving a collect request with your PIN sends money. Up to ₹400 left your cash instead of arriving.',
          learned: 'You never need a PIN to receive money. A PIN prompt always means money is leaving you.',
        },
      },
      {
        id: 'decline', label: 'Decline and ask them to pay to your UPI ID', detail: 'Then check your app before handing over the books.',
        tags: { benefit: 'Safe sale' },
        effects: [{ type: 'income', to: 'cash', amount: r(400), description: 'Sold textbooks to a classmate’s sibling' }],
        setFlags: { scamAvoided: true },
        evidence: [{ concept: 'otp_pin_safety', correct: true }],
        outcome: {
          title: 'Safe sale',
          why: 'The first buyer vanished. A classmate’s sibling paid ₹400 to your UPI ID, and you checked your app before handing over the books.',
          learned: 'Receiving money never needs your PIN. Check your own app, not a message, before you hand anything over.',
        },
      },
    ],
  },
  {
    id: 'fake_screenshot', chapter: 4, world: 'scam', title: 'Selling your old textbooks',
    objective: 'Get paid safely',
    concepts: ['scam_signs', 'otp_pin_safety'],
    // Supportive variant: obvious warning signs, for players still learning.
    showIf: (v) => !['practicing', 'confident'].includes(v.mastery('scam_signs')),
    narrative: 'You listed your Class 10 textbooks online for ₹400. A buyer sends a screenshot saying “₹1,400 paid ✅” and writes: “Sorry, sent ₹1,000 extra by mistake!! Please refund ₹1,000 fast, my mom will scold me 🙏”. Tip: screenshots are easy to edit.',
    choices: [
      {
        id: 'refund', label: 'Refund the ₹1,000', detail: 'They seem stressed.',
        tags: { risk: 'Sending money based on a picture' },
        effects: (v) => lossUpTo(v, r(1000), '“Refund” sent to fake buyer'),
        wellbeing: -6,
        evidence: [{ concept: 'scam_signs', correct: false }],
        outcome: {
          title: 'There was no extra payment',
          why: 'No money had arrived. The “refund” was your own money. Up to ₹1,000 left your cash.',
          learned: 'Always check your own bank or UPI app. A screenshot proves nothing.',
        },
      },
      {
        id: 'check_app', label: 'Open your UPI app and check first', detail: 'Trust your app, not the picture.',
        tags: { benefit: 'Safe sale' },
        effects: [{ type: 'income', to: 'cash', amount: r(400), description: 'Sold textbooks to a classmate’s sibling' }],
        setFlags: { scamAvoided: true },
        evidence: [{ concept: 'scam_signs', correct: true }],
        outcome: {
          title: 'Fake screenshot spotted',
          why: 'Your app showed nothing received, so you blocked them. A classmate’s sibling bought the books for ₹400 instead.',
          learned: 'Urgency plus an “accidental overpayment” is a common pattern. Your own app is the only proof.',
        },
      },
    ],
  },

  // ───────────────────────── Chapter 5 — Build Your Future ─────────────────────────
  {
    id: 'plan', chapter: 5, world: 'goal', title: 'Planning your goal',
    objective: 'Choose a monthly plan for your goal',
    concepts: ['goal_planning', 'budgeting'],
    entry: {
      effects: (v) => {
        /** @type {EffectDraft[]} */
        const e = [{ type: 'income', to: 'cash', amount: r(1500), description: 'Monthly pocket money (UPI)' }];
        if (v.flags.subscriptionKept) e.push({ type: 'expense', from: 'cash', amount: r(149), category: 'want', description: 'Streaming subscription auto-renewed' });
        return e;
      },
      note: (v) => '₹1,500 pocket money arrived.' + (v.flags.subscriptionKept ? ' Your streaming subscription also auto-renewed for ₹149.' : ''),
    },
    narrative: (v) => {
      if (!v.goal) return 'A new month. How much will you set aside?';
      const left = Math.max(0, v.goal.cost - v.balances.goal);
      return left === 0
        ? `A new month. Your goal fund already covers the ${v.goal.label}. You could build your safety net instead.`
        : `A new month. Your ${v.goal.label} costs ${fmt(v.goal.cost)} and your goal fund has ${fmt(v.balances.goal)}, so ${fmt(left)} to go.`;
    },
    choices: [
      {
        id: 'big', label: 'Move ₹1,000 to your goal fund', detail: 'Go for it this month.',
        tags: { goal: '+₹1,000 to goal', risk: 'Tight month' },
        effects: [{ type: 'transfer', from: 'cash', to: 'goal', amount: r(1000), description: 'Moved to goal fund' }],
        wellbeing: -2,
        evidence: [{ concept: 'goal_planning', correct: true }],
        outcome: { title: 'Big step forward', why: '₹1,000 moved from cash to your goal fund. Your total didn’t change.', learned: 'Bigger monthly amounts shorten the timeline; just leave enough for your needs.' },
      },
      {
        id: 'split', label: '₹500 to goal, ₹300 to savings', detail: 'Steady progress plus a safety net.',
        tags: { goal: '+₹500 to goal', benefit: '+₹300 savings' },
        effects: [
          { type: 'transfer', from: 'cash', to: 'goal', amount: r(500), description: 'Moved to goal fund' },
          { type: 'transfer', from: 'cash', to: 'savings', amount: r(300), description: 'Moved to savings' },
        ],
        evidence: [{ concept: 'goal_planning', correct: true }],
        outcome: { title: 'Balanced progress', why: 'Two transfers: ₹500 to your goal fund and ₹300 to savings. Nothing was spent.', learned: 'Rebuilding your safety net alongside your goal keeps the next surprise from undoing your progress.' },
      },
      {
        id: 'none', label: 'Keep it all as cash this month', detail: 'Stay flexible.',
        tags: { benefit: 'Flexibility', goal: 'No progress' }, wellbeing: 3,
        outcome: { title: 'Cash kept', why: 'No money moved.', learned: 'Flexibility has value, but goals without a monthly amount tend to drift.' },
      },
    ],
  },
  {
    id: 'phone_again', chapter: 5, world: 'goal', title: 'The crack spread',
    objective: 'Deal with a problem you postponed',
    concepts: ['emergency_fund', 'borrowing'],
    showIf: (v) => v.flags.phoneCracked === true,
    narrative: 'The crack has spread and the screen flickers. The repair now costs ₹1,000 instead of ₹800.',
    choices: [
      {
        id: 'use_savings', label: 'Use savings first, then cash', detail: '',
        when: (v) => (v.balances.savings > 0 ? true : 'You have no savings yet'),
        effects: (v) => payDrawingFrom(r(1000), ['savings'], v.balances, 'Phone screen repair (worse damage)', 'need'),
        setFlags: { phoneCracked: false },
        evidence: [{ concept: 'emergency_fund', correct: true }],
        outcome: { title: 'Fixed at last', why: 'Savings moved to cash, then ₹1,000 was spent.', learned: 'Waiting cost ₹200 extra. Sometimes delaying a repair makes it more expensive.' },
      },
      {
        id: 'cash', label: 'Pay from cash', detail: '',
        effects: [{ type: 'expense', from: 'cash', amount: r(1000), category: 'need', description: 'Phone screen repair (worse damage)' }],
        setFlags: { phoneCracked: false },
        outcome: { title: 'Fixed at last', why: '₹1,000 was spent from cash.', learned: 'Waiting cost ₹200 extra. Sometimes delaying a repair makes it more expensive.' },
      },
      {
        id: 'borrow', label: 'Borrow ₹1,000 from your sister', detail: '',
        effects: [
          { type: 'borrow', to: 'cash', amount: r(1000), description: 'Borrowed from elder sister' },
          { type: 'expense', from: 'cash', amount: r(1000), category: 'need', description: 'Phone screen repair (worse damage)' },
        ],
        setFlags: { phoneCracked: false, borrowed: true },
        outcome: { title: 'Fixed with a loan', why: 'You borrowed ₹1,000 and spent it on the repair. You owe more now.', learned: 'Postponing plus borrowing doubled the impact. An emergency fund breaks that chain.' },
      },
    ],
  },
  {
    id: 'future_lab', chapter: 5, world: 'future', title: 'Future Lab',
    objective: 'Explore risk, time and diversification, then decide where short-term money belongs',
    concepts: ['liquidity', 'risk_return', 'diversification', 'time_compounding', 'inflation'],
    lab: true,
    narrative: 'Your cousin who works in Bengaluru shows you the Future Lab: a sandbox with simulated markets. Try different mixes and time periods. Nothing here uses your money, and the numbers are assumptions, not predictions. Then answer her question: your goal money will be needed within 3 months. Where should it sit?',
    choices: [
      {
        id: 'keep_safe', label: 'Keep it in my goal fund and savings', detail: 'I need it soon, so stability matters most.',
        evidence: [{ concept: 'liquidity', correct: true }],
        outcome: { title: 'Right tool for the timeline', why: 'Your money stays where it is. Nothing changed.', learned: 'Short-term money should be safe and easy to reach. Investing suits money you won’t need for years.' },
      },
      {
        id: 'single_stock', label: 'Put it in one company’s shares a friend is excited about', detail: 'It went up 40% last year.',
        evidence: [{ concept: 'liquidity', correct: false }, { concept: 'risk_return', correct: false }],
        outcome: { title: 'A risky fit for a 3-month need', why: 'This was a thought experiment, so your balances are unchanged. In the lab, single shares often fell 20% or more within months.', learned: 'Past gains don’t predict future ones. One company plus a short timeline means you might not have the money when you need it.' },
      },
      {
        id: 'index', label: 'Put it in a diversified index fund', detail: 'Spreading risk sounds safer.',
        evidence: [{ concept: 'liquidity', correct: false }, { concept: 'diversification', correct: true }],
        outcome: { title: 'Diversified, but the timeline is too short', why: 'Thought experiment only; your balances are unchanged. Diversification reduces risk but the whole market can still dip over 3 months.', learned: 'Good instinct about spreading risk. The missing piece is time: diversification works best over many years.' },
      },
    ],
    check: {
      concept: 'risk_return',
      question: 'Over 10 years in the lab, which option has the widest range of possible outcomes?',
      options: [{ text: 'Savings account' }, { text: 'Diversified index fund' }, { text: 'A single company’s shares', correct: true }],
      explain: 'Concentrated risk swings the most, both up and down. That is why diversification exists.',
    },
  },

  // ───────────────────────── Chapter 6 — Your Financial Future ─────────────────────────
  {
    id: 'festival', chapter: 6, world: 'wallet', title: 'Festival season',
    objective: 'Balance family, fun, your goal and safety',
    concepts: ['needs_wants', 'scam_signs', 'opportunity_cost'],
    narrative: (v) =>
      'It’s Dasara week. Your family is buying gifts for relatives and asks if you’d like to chip in ₹300. ' +
      (v.mastery('scam_signs') === 'confident'
        ? 'Meanwhile an Instagram shop with a “verified” badge and thousands of followers offers last year’s phone model at 85% off with a ₹999 UPI booking amount.'
        : 'Meanwhile an Instagram ad shouts: “MEGA FESTIVE SALE! iPhone at 90% OFF!! Book with ₹999 UPI, TODAY ONLY!!”'),
    choices: [
      {
        id: 'family', label: 'Chip in ₹300 and ignore the ad', detail: 'Family first, and the deal is too good to be true.',
        tags: { cost: '₹300', benefit: 'Part of the celebration' },
        effects: [{ type: 'expense', from: 'cash', amount: r(300), category: 'family', description: 'Festival gifts for relatives' }],
        wellbeing: 8,
        evidence: [{ concept: 'scam_signs', correct: true }],
        outcome: { title: 'A good festival', why: '₹300 spent on family gifts. You didn’t pay the booking amount.', learned: 'Spending on people you care about is a valid priority. Huge discounts plus an advance payment is a classic scam pattern.' },
      },
      {
        id: 'handmade', label: 'Make a handmade gift (₹80 materials)', detail: 'Personal, and easier on your goal.',
        tags: { cost: '₹80', benefit: 'Thoughtful gift' },
        effects: [{ type: 'expense', from: 'cash', amount: r(80), category: 'family', description: 'Materials for handmade gift' }],
        wellbeing: 7,
        evidence: [{ concept: 'scam_signs', correct: true }],
        outcome: { title: 'Thoughtful and affordable', why: '₹80 was spent on materials.', learned: 'Generosity doesn’t need a big budget.' },
      },
      {
        id: 'both', label: 'Chip in ₹300 and book the phone for ₹999', detail: 'What a deal!',
        tags: { cost: '₹1,299', risk: 'Advance payment to an unknown seller' },
        effects: [
          { type: 'expense', from: 'cash', amount: r(300), category: 'family', description: 'Festival gifts for relatives' },
          { type: 'loss', from: 'cash', amount: r(999), description: 'Booking paid to fake festive sale' },
        ],
        wellbeing: -4,
        evidence: [{ concept: 'scam_signs', correct: false }],
        outcome: { title: 'The phone never arrived', why: '₹300 went to gifts. The ₹999 booking was a loss: the shop disappeared.', learned: 'Big discounts, urgency and payment before delivery to an unknown seller are warning signs, even with a “verified” look.' },
      },
      {
        id: 'skip', label: 'Skip gifts this year, explain to your family', detail: 'Protect your goal.',
        tags: { cost: '₹0', risk: 'Feels a bit left out' }, wellbeing: -4,
        outcome: { title: 'Goal protected', why: 'No money moved.', learned: 'Saying no can be fine when you explain why. Families usually respect a plan.' },
      },
    ],
  },
  {
    id: 'repay_final', chapter: 6, world: 'goal', title: 'Settling up',
    objective: 'Repay what you owe',
    concepts: ['borrowing'],
    showIf: hasDebt,
    narrative: (v) => `You still owe your sister ${fmt(v.balances.debt)}. You have ${fmt(v.balances.cash)} cash and ${fmt(v.balances.savings)} in savings.`,
    choices: [
      {
        id: 'full', label: 'Repay it all from cash', detail: '',
        effects: (v) => [{ type: 'repay', from: 'cash', amount: v.balances.debt, description: 'Repaid elder sister' }],
        evidence: [{ concept: 'borrowing', correct: true }],
        outcome: { title: 'Debt cleared', why: 'Cash and debt both fell by the same amount, so your net worth didn’t change.', learned: 'Clearing a debt frees your future money.' },
      },
      {
        id: 'savings', label: 'Use savings to help repay', detail: 'Move savings to cash, then repay.',
        when: (v) => (v.balances.savings > 0 ? true : 'You have no savings'),
        effects: (v) => {
          const fromSavings = Math.min(v.balances.savings, v.balances.debt);
          /** @type {EffectDraft[]} */
          const e = [{ type: 'transfer', from: 'savings', to: 'cash', amount: fromSavings, description: 'Moved from savings to repay' }];
          const pay = Math.min(v.balances.debt, v.balances.cash + fromSavings);
          if (pay > 0) e.push({ type: 'repay', from: 'cash', amount: pay, description: 'Repaid elder sister' });
          return e;
        },
        evidence: [{ concept: 'borrowing', correct: true }],
        outcome: { title: 'Debt reduced', why: 'Savings moved to cash, then repaid the debt.', learned: 'Using savings to clear debt can be sensible; just rebuild the safety net afterwards.' },
      },
      {
        id: 'partial', label: 'Repay what you can from cash', detail: 'Keep chipping away at it.',
        when: (v) => (v.balances.cash > 0 && v.balances.cash < v.balances.debt ? true : v.balances.cash === 0 ? 'You have no cash right now' : 'You can repay it all instead'),
        effects: (v) => [{ type: 'repay', from: 'cash', amount: Math.min(v.balances.cash, v.balances.debt), description: 'Partly repaid elder sister' }],
        evidence: [{ concept: 'borrowing', correct: true }],
        outcome: { title: 'Debt reduced', why: 'Your cash and your debt both fell by the same amount.', learned: 'Partial repayments still count. Every rupee repaid is one less owed.' },
      },
      {
        id: 'later', label: 'Agree a date next month', detail: '', wellbeing: -2,
        outcome: { title: 'Still owed', why: 'No money moved.', learned: 'A clear repayment date keeps trust. Your report will show this as unfinished.' },
      },
    ],
  },
  {
    id: 'goal_day', chapter: 6, world: 'goal', title: 'Decision day',
    objective: 'Decide what to do about your goal',
    concepts: ['goal_planning', 'emergency_fund', 'opportunity_cost'],
    endsRun: true,
    narrative: (v) => {
      if (!v.goal) return 'The month ends.';
      return `The ${v.goal.label} costs ${fmt(v.goal.cost)}. Goal fund: ${fmt(v.balances.goal)}. Savings: ${fmt(v.balances.savings)}. Cash: ${fmt(v.balances.cash)}.`;
    },
    choices: [
      {
        id: 'buy', label: 'Buy it with your goal fund', detail: 'This is what you saved for.',
        when: (v) => (v.goal && v.balances.goal >= v.goal.cost ? true : 'Your goal fund doesn’t cover it yet'),
        effects: (v) => goalPurchase(v, v.goal ? v.goal.cost : 0, ['goal']),
        setFlags: { goalBought: true }, wellbeing: 12,
        evidence: [{ concept: 'goal_planning', correct: true }],
        outcome: { title: 'Goal reached!', why: 'The price was paid from your goal fund. Your savings and cash are untouched.', learned: 'Planned saving turned an idea into something real, without touching your safety net.' },
      },
      {
        id: 'top_up', label: 'Top up from cash, then savings, and buy it', detail: 'Use everything you need.',
        when: (v) => {
          if (!v.goal) return 'No goal set';
          if (v.balances.goal >= v.goal.cost) return 'Your goal fund already covers it';
          return totalAssetsOf(v) >= v.goal.cost ? true : 'You don’t have enough across all accounts yet';
        },
        effects: (v) => goalPurchase(v, v.goal ? v.goal.cost : 0, ['goal', 'cash', 'savings']),
        setFlags: { goalBought: true }, wellbeing: 9,
        evidence: [{ concept: 'emergency_fund', correct: false }],
        outcome: (v) => ({
          title: 'Goal reached, safety net thinner',
          why: `You moved money from your other accounts into the goal fund and paid. Your savings are now ${fmt(v.balances.savings)}.`,
          learned: 'Reaching a goal by emptying your emergency fund works, but the next surprise will hit harder. Rebuild savings next.',
        }),
      },
      {
        id: 'alternative', label: 'Choose the cheaper option', detail: (v) => (v.goal ? `${v.goal.alt.label} for ${fmt(v.goal.alt.cost)}.` : ''),
        when: (v) => (v.goal && totalAssetsOf(v) >= v.goal.alt.cost ? true : 'Not enough money yet, even for the cheaper option'),
        effects: (v) => goalPurchase(v, v.goal ? v.goal.alt.cost : 0, ['goal', 'cash', 'savings']),
        setFlags: { goalAlternative: true }, wellbeing: 7,
        evidence: [{ concept: 'opportunity_cost', correct: true }],
        outcome: (v) => ({
          title: 'Smart alternative',
          why: `You paid ${v.goal ? fmt(v.goal.alt.cost) : ''} for a cheaper route to most of the same benefit. The rest stays yours.`,
          learned: 'Goals can be adjusted. Getting most of the benefit for much less is often the wisest trade.',
        }),
      },
      {
        id: 'wait', label: 'Wait another month and keep building', detail: 'Keep your savings intact.',
        wellbeing: -2,
        outcome: { title: 'Still building', why: 'No money moved. Your goal fund keeps its balance for next month.', learned: 'Patience is a strategy, not a failure. Your plan just has one more month on it.' },
      },
    ],
  },
];

/** Chapter order. Each chapter lists scenario ids; `showIf` decides whether one appears. */
export const CHAPTERS = [
  { n: 1, title: 'Your Starting Point', world: /** @type {WorldId} */ ('wallet'), blurb: 'Meet your life and choose what you’re working towards.', scenarios: ['start'] },
  { n: 2, title: 'Everyday Decisions', world: /** @type {WorldId} */ ('wallet'), blurb: 'Weekends, pocket money and the small stuff that adds up.', scenarios: ['saturday', 'allowance', 'subscription'] },
  { n: 3, title: 'The Unexpected', world: /** @type {WorldId} */ ('goal'), blurb: 'Surprises test whether your plan can bend without breaking.', scenarios: ['phone', 'gig', 'repay'] },
  { n: 4, title: 'Protect Your Money', world: /** @type {WorldId} */ ('scam'), blurb: 'Scammers target everyone. Learn the signs.', scenarios: ['kyc_sms', 'scam_recovery', 'collect_request', 'fake_screenshot'] },
  { n: 5, title: 'Build Your Future', world: /** @type {WorldId} */ ('future'), blurb: 'Plans, timelines and how time changes money.', scenarios: ['plan', 'phone_again', 'future_lab'] },
  { n: 6, title: 'Your Financial Future', world: /** @type {WorldId} */ ('goal'), blurb: 'Bring it all together.', scenarios: ['festival', 'repay_final', 'goal_day'] },
];

/** @type {Map<string, Scenario>} */
export const SCENARIO_BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]));

// ── helpers used by content ──

/** @param {number} p */
function fmt(p) {
  return '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** @param {View} v */
function totalAssetsOf(v) {
  return v.balances.cash + v.balances.savings + v.balances.goal;
}

/**
 * A fraud loss takes what it can, up to a cap. No transaction is created if cash is empty.
 * @param {View} v @param {number} cap @param {string} description
 * @returns {EffectDraft[]}
 */
function lossUpTo(v, cap, description) {
  const amount = Math.min(cap, v.balances.cash);
  return amount > 0 ? [{ type: 'loss', from: 'cash', amount, description }] : [];
}

/**
 * Pay for the goal from the goal fund, topping up from other accounts in order.
 * @param {View} v @param {number} price @param {('goal' | 'cash' | 'savings')[]} order
 * @returns {EffectDraft[]}
 */
function goalPurchase(v, price, order) {
  /** @type {EffectDraft[]} */
  const drafts = [];
  let toFind = price - Math.min(price, v.balances.goal);
  for (const acct of order) {
    if (acct === 'goal' || toFind <= 0) continue;
    const take = Math.min(v.balances[acct], toFind);
    if (take > 0) {
      drafts.push({ type: 'transfer', from: acct, to: 'goal', amount: take, description: `Topped up goal fund from ${acct}` });
      toFind -= take;
    }
  }
  drafts.push({ type: 'expense', from: 'goal', amount: price, category: 'goal', description: v.goal ? `Bought: ${price === v.goal.cost ? v.goal.label : v.goal.alt.label}` : 'Goal purchase' });
  return drafts;
}
