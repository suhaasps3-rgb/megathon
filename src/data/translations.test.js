import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import translations, { fill } from './translations.js';

describe('translations', () => {
  it('has the same keys in every language', () => {
    const en = Object.keys(translations.en).sort();
    for (const lang of Object.keys(translations)) {
      expect(Object.keys(translations[lang]).sort()).toEqual(en);
    }
  });

  it('keeps the same placeholders in every language', () => {
    for (const [key, value] of Object.entries(translations.en)) {
      const want = (String(value).match(/\{\w+\}/g) || []).sort();
      for (const lang of ['hi', 'te']) {
        expect((String(translations[lang][key]).match(/\{\w+\}/g) || []).sort(), `${lang}.${key}`).toEqual(want);
      }
    }
  });
});

describe('translation source', () => {
  it('defines each key only once per language, so no later entry silently wins', () => {
    const src = readFileSync(new URL('./translations.js', import.meta.url), 'utf8');
    const blocks = src.split(/\n  (?:en|hi|te): \{/).slice(1);
    expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      const keys = [...block.matchAll(/^ {4}(\w+):/gm)].map((m) => m[1]);
      const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
      expect(dups).toEqual([]);
    }
  });
});

describe('fill', () => {
  it('replaces known placeholders and leaves unknown ones', () => {
    expect(fill('Step {n} of {total}', { n: 1, total: 3 })).toBe('Step 1 of 3');
    expect(fill('Hi {name}', {})).toBe('Hi {name}');
  });
});
