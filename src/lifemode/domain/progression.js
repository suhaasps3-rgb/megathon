// @ts-check
/**
 * Progression domain: XP, levels and achievements. Separate from money and from mastery.
 *
 * Every reward is a *claim* with a unique key stored on the profile. A claim can be paid
 * once per profile, ever, so restarting a run, double-clicking, refreshing or replaying a
 * scenario cannot farm XP or badges.
 *
 * XP rules (key → amount):
 *   decide:<scenario>              20  first time a scenario is completed
 *   explore:<scenario>:<choice>     5  first time a particular option is chosen (rewards
 *                                      exploring alternatives in later runs, bounded)
 *   check:<scenario>               10  knowledge check correct on the first attempt
 *   chapter:<n>                    30  first time a chapter is completed
 *   run:first                      50  first completed run
 *   badge:<id>                     25  achievement unlocked
 * Levels: every 150 XP.
 */

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {string} rule   Plain-language trigger shown to players.
 * @property {(ctx: AchievementContext) => boolean} test
 */

/**
 * @typedef {Object} AchievementContext
 * @property {import('./game.js').Run} run
 * @property {import('./game.js').Profile} profile
 * @property {import('./ledger.js').Balances} balances
 * @property {ReturnType<typeof import('./ledger.js').summarize>} totals
 */

export const XP = Object.freeze({ decide: 20, explore: 5, check: 10, chapter: 30, runFirst: 50, badge: 25 });
export const XP_PER_LEVEL = 150;

const TITLES = ['Rookie', 'Planner', 'Saver', 'Strategist', 'Guardian', 'Navigator', 'Pathfinder'];

/** @param {number} xp */
export function levelOf(xp) {
  const level = Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
  return {
    level,
    title: TITLES[Math.min(level, TITLES.length) - 1],
    into: xp % XP_PER_LEVEL,
    needed: XP_PER_LEVEL,
  };
}

/**
 * @param {import('./game.js').Run} run
 * @param {string} scenarioId
 */
function decisionFor(run, scenarioId) {
  return run.decisions.find((d) => d.scenarioId === scenarioId);
}

/** @type {Achievement[]} */
export const ACHIEVEMENTS = [
  {
    id: 'first_save', name: 'Paid Yourself First', emoji: '🐷',
    rule: 'Move money into savings or your goal fund for the first time.',
    test: ({ totals }) => totals.toSavings + totals.toGoal > 0,
  },
  {
    id: 'emergency_ready', name: 'Emergency Ready', emoji: '🛟',
    rule: 'Handle an unexpected expense using your own savings instead of borrowing.',
    test: ({ run }) => run.flags.usedEmergencyFund === true,
  },
  {
    id: 'scam_spotter', name: 'Scam Spotter', emoji: '🔍',
    rule: 'Find the warning signs in a scam message and keep your money safe.',
    test: ({ run }) => {
      const d = decisionFor(run, 'kyc_sms');
      return !!d && d.inspection?.correct === true && run.flags.scamAvoided === true;
    },
  },
  {
    id: 'comeback', name: 'Comeback', emoji: '🔁',
    rule: 'Borrow during a tough moment, then repay it in full.',
    test: ({ run, balances }) => run.flags.borrowed === true && balances.debt === 0,
  },
  {
    id: 'goal_reached', name: 'Goal Reached', emoji: '🎯',
    rule: 'Buy your goal, or a smart cheaper alternative, with money you saved.',
    test: ({ run }) => run.flags.goalBought === true || run.flags.goalAlternative === true,
  },
  {
    id: 'balanced_life', name: 'Balanced Life', emoji: '⚖️',
    rule: 'Finish a run with wellbeing of 55 or more and some savings left.',
    test: ({ run, balances }) => run.status === 'complete' && run.wellbeing >= 55 && balances.savings > 0,
  },
  {
    id: 'curious_mind', name: 'Curious Mind', emoji: '📖',
    rule: 'Open three deeper explanations.',
    test: ({ profile }) => profile.explanationsOpened >= 3,
  },
  {
    id: 'lab_explorer', name: 'Lab Explorer', emoji: '🧪',
    rule: 'Run three different experiments in the Future Lab.',
    test: ({ profile }) => profile.labRuns >= 3,
  },
  {
    id: 'finisher', name: 'Full Journey', emoji: '🏁',
    rule: 'Complete all six chapters of a run.',
    test: ({ run }) => run.status === 'complete',
  },
];

/**
 * Pay a claim once. Returns the new profile and XP actually gained (0 if already claimed).
 * @param {import('./game.js').Profile} profile
 * @param {string} key
 * @param {number} amount
 */
export function claim(profile, key, amount) {
  if (profile.claims[key]) return { profile, gained: 0 };
  return { profile: { ...profile, xp: profile.xp + amount, claims: { ...profile.claims, [key]: true } }, gained: amount };
}

/**
 * Unlock any achievements whose rule now holds. Idempotent.
 * @param {AchievementContext} ctx
 * @returns {{ profile: import('./game.js').Profile, unlocked: Achievement[] }}
 */
export function evaluateAchievements(ctx) {
  let profile = ctx.profile;
  /** @type {Achievement[]} */
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (profile.achievements[a.id]) continue;
    if (!a.test({ ...ctx, profile })) continue;
    profile = { ...profile, achievements: { ...profile.achievements, [a.id]: { run: ctx.run.number } } };
    profile = claim(profile, `badge:${a.id}`, XP.badge).profile;
    unlocked.push(a);
  }
  return { profile, unlocked };
}
