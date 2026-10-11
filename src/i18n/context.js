import { createContext, useContext } from 'react';
import translations from '../data/translations';

/**
 * Carries the chosen language's strings to screens that are not handed `t` directly, such as
 * Life Mode and the 3D world. Without a provider the English strings are used.
 */
export const LangContext = createContext(translations.en);

export function useT() {
  return useContext(LangContext);
}
