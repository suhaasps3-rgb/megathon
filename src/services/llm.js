// Browser side of the AI features. Every call goes through the server proxy at
// /api/gemini, which holds the Gemini key. If the server has no key or the call
// fails, these functions throw (or return a friendly reply) and the UI falls
// back to the offline lessons.

const ENDPOINT = '/api/gemini';

/** Resolves true when the server has a Gemini key configured. Never throws. */
export async function checkAiAvailable() {
  try {
    const response = await fetch(ENDPOINT, { method: 'GET' });
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
  });
  if (!response.ok) {
    throw new Error(response.status === 429 ? 'RATE_LIMIT' : `AI ${response.status}`);
  }
  const data = await response.json();
  return data.result;
}

export function generateDynamicScenario(profile, assessmentLevel) {
  return callTask('scenario', { profile, assessmentLevel });
}

export function assessUnderstanding(userAnswer) {
  return callTask('assess', { answer: userAnswer });
}

export async function parseVoiceAllocation(transcript, lang = 'en') {
  try {
    const result = await callTask('voice', { transcript, lang });
    if (!result || typeof result !== 'object') throw new Error('Empty AI response');
    return result;
  } catch (error) {
    console.error('Voice parsing failed:', error);
    return {
      actions: [],
      companionResponse: transcript
        ? `I heard you say: "${transcript}" — but my AI is taking a break right now. Please try again in a little while!`
        : `My AI is taking a break right now. Please try again in a little while!`,
    };
  }
}
