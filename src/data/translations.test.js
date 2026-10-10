import { describe, it, expect } from 'vitest';
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

describe('fill', () => {
  it('replaces known placeholders and leaves unknown ones', () => {
    expect(fill('Step {n} of {total}', { n: 1, total: 3 })).toBe('Step 1 of 3');
    expect(fill('Hi {name}', {})).toBe('Hi {name}');
  });
});
