// @ts-check
/**
 * Text lookup for the story in English, Hindi and Telugu. Missing keys fall back to
 * English, then to the key itself, so a gap never crashes the game. `{name}` style
 * placeholders are filled from params; money params are paise and are formatted here.
 */
import en from './i18n/en.js';
import hi from './i18n/hi.js';
import te from './i18n/te.js';
import { formatINR } from '../domain/money.js';
import {
  INTERESTS, POCKET_MONEY, RECHARGE, GOAL_COST, OUTING_FULL, OUTING_CHEAP, POPCORN, DEAL_PRICE, DEAL_WAS,
  ALT_PRICE, REPAIR, REPAIR_LATE, BUS_FARE, GIG_PAY, SCAM_FEE, SCAM_TAX, STEP,
} from './content.js';

/** @typedef {'en' | 'hi' | 'te'} Lang */
/** @type {Record<Lang, Record<string, string>>} */
export const DICTS = { en, hi, te };

/** Params that are money (paise) and should be shown as ₹. */
const MONEY = new Set(['cash', 'savings', 'goal', 'debt', 'left', 'pocket', 'recharge', 'goalCost', 'outing', 'cheap', 'popcorn', 'deal', 'was', 'alt', 'repair', 'repairLate', 'bus', 'gig', 'fee', 'tax', 'step', 'have', 'cost', 'amount']);

/** Constant amounts every line can use. */
export const CONSTANTS = {
  pocket: POCKET_MONEY, recharge: RECHARGE, goalCost: GOAL_COST, outing: OUTING_FULL, cheap: OUTING_CHEAP,
  popcorn: POPCORN, deal: DEAL_PRICE, was: DEAL_WAS, alt: ALT_PRICE, repair: REPAIR, repairLate: REPAIR_LATE,
  bus: BUS_FARE, gig: GIG_PAY, fee: SCAM_FEE, tax: SCAM_TAX, step: STEP,
  feeNum: SCAM_FEE / 100, taxNum: SCAM_TAX / 100,
};

/**
 * @param {Lang} lang
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 */
export function tr(lang, key, params = {}) {
  const raw = DICTS[lang]?.[key] ?? en[/** @type {keyof typeof en} */ (key)] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in params)) return m;
    const v = params[k];
    return MONEY.has(k) && typeof v === 'number' ? formatINR(v) : String(v);
  });
}

/**
 * A translator bound to a language and to the run's standing params (item names, player
 * name, constants). Extra params per call override them.
 * @param {Lang} lang
 * @param {{ interest?: keyof typeof INTERESTS, name?: string } & Record<string, string | number | undefined>} [base]
 */
export function makeT(lang, base = {}) {
  const i = INTERESTS[base.interest ?? 'music'];
  /** @type {Record<string, string | number>} */
  const params = {
    ...CONSTANTS,
    goalItem: tr(lang, `item.${i.goal}`),
    dealItem: tr(lang, `item.${i.deal}`),
    altItem: tr(lang, `item.${i.alt}`),
    name: base.name || tr(lang, 'who.you'),
  };
  for (const [k, v] of Object.entries(base)) if (v !== undefined && k !== 'interest') params[k] = v;
  /** @param {string} key @param {Record<string, string | number>} [extra] */
  const t = (key, extra) => tr(lang, key, extra ? { ...params, ...extra } : params);
  return t;
}
