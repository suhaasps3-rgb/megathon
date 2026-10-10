/**
 * Shops are data: a list of priced items. Buying is a pure rule on the wallet, like every other
 * money change, so the cash, the log and the mission state all stay in one place.
 */
import { record } from './economy.js';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const SHOPS = Object.freeze({
  grocery: {
    id: 'grocery',
    name: 'Corner Store',
    greeting: 'Hi! What do you need today? Everything has a price, so think about what you actually use.',
    items: [
      { id: 'milk', label: 'Milk (1 L)', price: 60, kind: 'need' },
      { id: 'notebook', label: 'Notebook', price: 45, kind: 'need' },
      { id: 'snack', label: 'Snack pack', price: 40, kind: 'want' },
      { id: 'headphones', label: 'Wireless headphones', price: 900, kind: 'want' },
    ],
  },
});

export function findItem(shopId, itemId) {
  return SHOPS[shopId]?.items.find((i) => i.id === itemId) || null;
}

/** Buys one item if the player has the cash. Refusals change nothing. */
export function buyItem(w, shopId, itemId) {
  const item = findItem(shopId, itemId);
  if (!item) return { ok: false, state: w, message: 'That item is not sold here.' };
  if (w.cash < item.price) return { ok: false, state: w, message: `You need ${inr(item.price)} in cash for ${item.label.toLowerCase()}.` };
  const next = { ...w, cash: w.cash - item.price };
  return {
    ok: true,
    state: record(w, next, `shop-${item.id}`),
    message: `Bought ${item.label.toLowerCase()} for ${inr(item.price)}. ${inr(next.cash)} cash left.`,
  };
}
