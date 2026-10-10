import { levelOf } from '../lifemode/domain/progression.js';
import { loadWallet } from '../neighborhood/economy.js';

/**
 * Must match STORAGE_KEY in src/lifemode/persistence/storage.js. It is repeated here so the
 * home screen can show Life Mode progress without loading all of Life Mode's content.
 */
export const LIFE_SAVE_KEY = 'paisapath.lifeMode';

const WORLD_STEP = { deliver: 1, bike: 2, repair: 3 };

/** Real saved progress for the home screen. Never throws; blocked storage reads as empty. */
export function readProgress(store = globalThis.localStorage) {
  let life = null;
  try {
    const raw = JSON.parse(store.getItem(LIFE_SAVE_KEY));
    if (raw && raw.profile && Number.isFinite(raw.profile.xp)) {
      life = {
        level: levelOf(raw.profile.xp).level,
        runsCompleted: Number(raw.profile.runsCompleted) || 0,
        inProgress: Boolean(raw.run) && raw.run.phase !== 'complete',
      };
    }
  } catch {
    life = null;
  }
  const w = loadWallet(store);
  const world = {
    started: w.step !== 'deliver',
    done: w.step === 'done',
    step: WORLD_STEP[w.step] ?? 3,
    cash: w.cash,
  };
  return { life, world };
}
