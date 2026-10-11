import { describe, it, expect } from 'vitest';
import { offlineAssessment } from './offlineAssessment.js';

describe('offlineAssessment', () => {
  it('reads saving or growing as a higher starting level', () => {
    expect(offlineAssessment('save', 'x').level).toBe(6);
    expect(offlineAssessment('grow', 'x').level).toBe(6);
  });

  it('reads spending first as a lower starting level', () => {
    expect(offlineAssessment('treat', 'x').level).toBe(3);
    expect(offlineAssessment('friends', 'x').level).toBe(3);
  });

  it('returns the text it was given, in the shape the app expects', () => {
    expect(offlineAssessment('save', 'hello')).toEqual({ level: 6, analysis: 'hello' });
  });
});
