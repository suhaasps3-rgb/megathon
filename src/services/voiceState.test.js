import { describe, it, expect } from 'vitest';
import { voiceState } from './voiceState.js';

describe('voiceState', () => {
  it('is idle by default', () => {
    expect(voiceState()).toBe('idle');
  });

  it('prioritises error, then listening, then thinking, then speaking', () => {
    expect(voiceState({ error: 'x', listening: true, processing: true, speaking: true })).toBe('error');
    expect(voiceState({ listening: true, processing: true, speaking: true })).toBe('listening');
    expect(voiceState({ processing: true, speaking: true })).toBe('thinking');
    expect(voiceState({ speaking: true })).toBe('speaking');
  });
});
