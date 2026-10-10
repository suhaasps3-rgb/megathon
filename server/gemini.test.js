import { describe, it, expect, vi } from 'vitest';
import { handleGemini } from './gemini.js';

const geminiReply = (obj) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
});

describe('gemini proxy', () => {
  it('reports whether a server key is configured', async () => {
    expect((await handleGemini({ method: 'GET', apiKey: '' })).json).toEqual({ enabled: false });
    expect((await handleGemini({ method: 'GET', apiKey: 'k' })).json).toEqual({ enabled: true });
  });

  it('refuses to call Gemini without a server key', async () => {
    const fetchImpl = vi.fn();
    const out = await handleGemini({ method: 'POST', body: { task: 'assess', input: {} }, apiKey: '', fetchImpl });
    expect(out.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('only runs known tasks, so it is not an open prompt relay', async () => {
    const fetchImpl = vi.fn();
    for (const task of ['raw', '__proto__', 'constructor', undefined]) {
      const out = await handleGemini({ method: 'POST', body: { task, input: {} }, apiKey: 'k', fetchImpl });
      expect(out.status).toBe(400);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends the key in a header, never in the URL, and returns parsed JSON', async () => {
    const fetchImpl = vi.fn(async () => geminiReply({ level: 7, analysis: 'Nice' }));
    const out = await handleGemini({ method: 'POST', body: { task: 'assess', input: { answer: 'save it' } }, apiKey: 'secret', fetchImpl });
    expect(out).toEqual({ status: 200, json: { result: { level: 7, analysis: 'Nice' } } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).not.toContain('secret');
    expect(init.headers['x-goog-api-key']).toBe('secret');
  });

  it('truncates long user input before it reaches the prompt', async () => {
    const fetchImpl = vi.fn(async () => geminiReply({ actions: [], companionResponse: 'hi' }));
    await handleGemini({ method: 'POST', body: { task: 'voice', input: { transcript: 'x'.repeat(5000) } }, apiKey: 'k', fetchImpl });
    const prompt = JSON.parse(fetchImpl.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).not.toContain('x'.repeat(501));
  });

  it('maps upstream failures to errors the client falls back on', async () => {
    const limited = await handleGemini({ method: 'POST', body: { task: 'assess' }, apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 429 }) });
    expect(limited.status).toBe(429);
    const down = await handleGemini({ method: 'POST', body: { task: 'assess' }, apiKey: 'k', fetchImpl: async () => { throw new Error('offline'); } });
    expect(down.status).toBe(502);
  });
});
