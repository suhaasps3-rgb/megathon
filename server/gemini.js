// Server-side Gemini proxy. The API key comes from the server environment
// (GEMINI_API_KEY) and never reaches the browser. The browser names a task and
// sends its inputs; prompts are built here, so the endpoint can't be used as an
// open Gemini relay.

const MODEL = 'gemini-3.6-flash';
const MAX_TEXT = 500;

const str = (value, fallback = '') =>
  (typeof value === 'string' ? value : fallback).slice(0, MAX_TEXT);

const LANGS = { en: 'English', hi: 'Hindi', te: 'Telugu' };

const tasks = {
  scenario({ profile = {}, assessmentLevel }) {
    const interests = Array.isArray(profile.interests) ? profile.interests.slice(0, 10).map((i) => str(i)) : [];
    const goal = profile.goal && typeof profile.goal === 'object' ? profile.goal : {};
    const cost = Number(goal.cost) > 0 ? Math.round(Number(goal.cost)) : 500;
    const label = str(goal.label) || 'a specific goal';
    const level = Math.min(10, Math.max(1, Number(assessmentLevel) || 1));
    return `
    You are PaisaPath, an adaptive financial literacy engine designed for Grade 11-12 students (16-17 years old) in Hyderabad, India.
    The user's interests: ${interests.join(', ')}.
    Their preferred learning style: ${str(profile.learningStyle)}.
    Their initial financial understanding level (1 to 10): ${level}.
    CRITICAL CONTEXT: The user is currently trying to save ₹${cost} to buy "${label}".

    Generate a highly engaging, interactive financial scenario tailored exactly to these preferences.
    CRITICAL: 
    1. Tone: Use a conversational, slightly casual "Hyderabadi English" tone (Hinglish/Telugu mix words like "Yaar", "Arre", "Bhai", "Lite le", "Kiraak") to make it relatable.
    2. Stakes: In Decision 1, actively taunt them with a temptation that specifically threatens their ability to save the ₹${cost} they need for their goal. Make it hurt!
    3. Visual Compounding: For each choice, calculate a "futureImpact" number (the 10-year compounded value if saved/invested at ~8% return). If they spend it or lose it, futureImpact is 0.
    4. The 3-Step Arc: You MUST generate exactly THREE (3) decisions that guide the 17-year-old through a full financial lifecycle. Choose concepts from this bank:
       - Decision 1 (Budget/Save): Needs vs. Wants, Delayed Gratification, Opportunity Cost, Subscription Traps.
       - Decision 2 (Invest/Grow): SIPs (Systematic Investment Plans), Index Mutual Funds, Diversification, Compound Interest (The 8th Wonder), Inflation Risk.
       - Decision 3 (Protect/Defend): Building an Emergency Fund, Credit Card Debt Traps (minimum balance trap), Instagram/Telegram Crypto Scams, Phishing.

    Return ONLY a valid JSON object matching this schema:
    {
      "theme": "A short theme name (e.g. The Sneaker Drop)",
      "setup": "The situation description. Mention they have ₹1000.",
      "decisions": [
        {
          "text": "Decision 1 (Budgeting/Saving temptation)",
          "choices": [
            {
              "text": "First option text",
              "cost": "number",
              "futureImpact": "number",
              "feedback": "Explanation of why this was good/bad",
              "concept": {
                "name": "Concept name (e.g. Opportunity Cost)",
                "description": "A clear, 1-2 sentence definition of the concept.",
                "example": "A real-world teenage example of this concept."
              },
              "isGood": boolean
            },
            {
              "text": "Second option text",
              "cost": "number",
              "futureImpact": "number",
              "feedback": "Explanation",
              "concept": {
                "name": "Concept name",
                "description": "Definition",
                "example": "Teenage example"
              },
              "isGood": boolean
            }
          ]
        },
        {
          "text": "Decision 2 (Investing)",
          "choices": [
            { "text": "...", "cost": 0, "futureImpact": 0, "feedback": "...", "conceptLearned": "...", "isGood": false },
            { "text": "...", "cost": 0, "futureImpact": 0, "feedback": "...", "conceptLearned": "...", "isGood": true }
          ]
        },
        {
          "text": "Decision 3 (Protection/Scams/Emergency Fund)",
          "choices": [
            { "text": "...", "cost": 0, "futureImpact": 0, "feedback": "...", "conceptLearned": "...", "isGood": false },
            { "text": "...", "cost": 0, "futureImpact": 0, "feedback": "...", "conceptLearned": "...", "isGood": true }
          ]
        }
      ]
    }
  `;
  },

  assess({ answer }) {
    return `
    A Grade 11 student was asked: "If you suddenly received ₹1000, how would you manage it?"
    Their answer: "${str(answer)}"

    Analyze their financial literacy based on this answer. 
    Return ONLY a valid JSON object:
    {
      "level": number (1 to 10, 1 being knows nothing/spends all immediately, 10 being mentions saving, investing, budgeting),
      "analysis": "A brief, encouraging 1-sentence feedback on their thought process."
    }
  `;
  },

  voice({ transcript, lang }) {
    const langName = LANGS[lang] || 'English';
    return `
    You are PaisaPath's Voice Companion, an advanced financial mentor for 16-17 year olds. You have a relaxed, slightly GenZ vibe (think older sibling who actually knows about money).
    
    LANGUAGE: You MUST respond entirely in ${langName}. All text in "companionResponse" must be in ${langName}.
    
    User's exact words: "${str(transcript)}"
    
    CRITICAL INSTRUCTIONS:
    1. STRICT INTENT PARSING: Distinguish between theoretical questions vs. actual transactions. 
       - If the user talks about investing (e.g., "I have 3000rs to invest in an SIP", "What is compounding?"), DO NOT extract this as an expense. Treat it as a mentor moment. Answer them directly with a highly educational, realistic, and engaging response (2-4 sentences). Explain the concepts clearly.
       - ONLY extract an "action" if the user explicitly states they just bought/spent money on a consumable item (e.g., "I just bought a burger for 100") or received pocket money.
    2. TONE: Be helpful, accurate, and drop some real financial knowledge. You can use words like "W", "L", "flex", or "vibes" sparingly if it fits natively.
    3. OFF-TOPIC QUESTIONS: If the question is clearly not about money or finance (e.g., celebrities, sports, movies), give a brief fun answer but ALWAYS end with a sentence nudging them back to financial advice. Example ending: "Anyway, got any money questions I can help you with?" or "But real talk — got any finance questions for me?"
    
    Return ONLY valid JSON matching this schema exactly (no markdown, no quotes):
    {
      "actions": [
        {
          "label": "string (A short 2-3 word description of the item/event)",
          "amount": number,
          "type": "income" | "expense"
        }
      ],
      "companionResponse": "Your engaging, mentor-like response to the user."
    }
  `;
  },
};

/**
 * Handle one proxy request. Framework-agnostic: callers pass the parsed
 * method/body and get back a status and JSON payload.
 *   GET            -> { enabled }  (is a server key configured?)
 *   POST {task, input} -> { result } parsed JSON from Gemini
 */
export async function handleGemini({ method, body, apiKey, fetchImpl = fetch }) {
  if (method === 'GET') return { status: 200, json: { enabled: Boolean(apiKey) } };
  if (method !== 'POST') return { status: 405, json: { error: 'method_not_allowed' } };
  if (!apiKey) return { status: 503, json: { error: 'ai_not_configured' } };

  const build = body && Object.hasOwn(tasks, body.task) ? tasks[body.task] : null;
  if (!build) return { status: 400, json: { error: 'unknown_task' } };

  const prompt = build(body.input && typeof body.input === 'object' ? body.input : {});
  let response;
  try {
    response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );
  } catch {
    return { status: 502, json: { error: 'upstream_unreachable' } };
  }

  if (!response.ok) {
    return { status: response.status === 429 ? 429 : 502, json: { error: 'upstream_error', upstreamStatus: response.status } };
  }

  try {
    const data = await response.json();
    const raw = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim());
    return { status: 200, json: { result } };
  } catch {
    return { status: 502, json: { error: 'bad_upstream_response' } };
  }
}

/** Node (req, res) adapter used by the Vite dev/preview middleware and api/gemini.js. */
export async function nodeHandler(req, res, apiKey) {
  let body = req.body;
  if (req.method === 'POST' && body === undefined) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 20_000) break;
    }
    try { body = JSON.parse(raw); } catch { body = null; }
  } else if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const { status, json } = await handleGemini({ method: req.method, body, apiKey });
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(json));
}
