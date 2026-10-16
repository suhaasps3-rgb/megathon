// Browser side of the AI features. Every call goes through the server proxy at /api/gemini, which
// holds the Gemini key and builds the prompts. If the server has no key, or the call fails or
// takes too long, these functions throw (or return { failed: true }) and the UI falls back to the
// offline lessons instead of hanging.
const ENDPOINT = '/api/gemini';
// A little longer than the server's own 13s limit, so the server's answer (or error) arrives first.
const TIMEOUT_MS = 16000;

/** Resolves true when the server has a Gemini key configured. Never throws. */
export async function checkAiAvailable() {
  try {
    const response = await fetch(ENDPOINT, { method: 'GET', signal: AbortSignal.timeout(4000) });
    if (!response.ok) return false;
    const data = await response.json();
    return data.enabled === true;
  } catch {
    return false;
  }
}

async function callTask(task, input) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, input }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'RATE_LIMIT' : `AI ${response.status}`);
  const data = await response.json();
  if (!data || typeof data.result !== 'object' || data.result === null) throw new Error('Empty AI response');
  return data.result;
}

export function generateDynamicScenario(profile, assessmentLevel) {
  return callTask('scenario', { profile, assessmentLevel });
}

export function assessUnderstanding(userAnswer) {
  return callTask('assess', { answer: userAnswer });
}

/** Never throws. On any failure it returns { failed: true } and callers use the offline mentor. */
export async function parseVoiceAllocation(transcript, lang = 'en') {
  try {
    return await callTask('voice', { transcript, lang });
  } catch (error) {
    // The raw error stays in the console; callers fall back to the offline mentor.
    console.warn('Voice parsing failed, using offline mentor:', error);
    return { failed: true, actions: [] };
  }
}
