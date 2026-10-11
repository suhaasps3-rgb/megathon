// Free-tier Gemini keys allow only a few requests per minute per model, and busy models
// return 503. Each model has its own quota, so on a 429/503 we move to the next one.
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash'];
const RETRYABLE = new Set([404, 429, 500, 503]);

// Thinking models can return thought parts first; keep only the answer text.
function answerText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textParts = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('');
  if (textParts) return textParts;
  return parts.map((p) => p.text || '').join('');
}

async function callGemini(apiKey, prompt) {
  let lastResponse;
  for (const model of GEMINI_MODELS) {
    lastResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    if (lastResponse.ok || !RETRYABLE.has(lastResponse.status)) break;
  }
  return lastResponse;
}

export async function generateDynamicScenario(apiKey, profile, assessmentLevel) {
  const prompt = `
    You are PaisaPath, an adaptive financial literacy engine designed for Grade 11-12 students (16-17 years old) in Hyderabad, India.
    The user's interests: ${profile.interests.join(', ')}.
    Their preferred learning style: ${profile.learningStyle}.
    Their initial financial understanding level (1 to 10): ${assessmentLevel}.
    CRITICAL CONTEXT: The user is currently trying to save ₹${profile.goal?.cost || 500} to buy "${profile.goal?.label || 'a specific goal'}".

    Generate a highly engaging, interactive financial scenario tailored exactly to these preferences.
    CRITICAL: 
    1. Tone: Use a conversational, slightly casual "Hyderabadi English" tone (Hinglish/Telugu mix words like "Yaar", "Arre", "Bhai", "Lite le", "Kiraak") to make it relatable.
    2. Stakes: In Decision 1, actively taunt them with a temptation that specifically threatens their ability to save the ₹${profile.goal?.cost || 500} they need for their goal. Make it hurt!
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

  const response = await callGemini(apiKey, prompt);

  if (!response.ok) {
    throw new Error('Failed to generate scenario. Check API Key.');
  }

  const data = await response.json();
  try {
    return JSON.parse(answerText(data));
  } catch (e) {
    throw new Error("Failed to parse LLM response");
  }
}

export async function assessUnderstanding(apiKey, userAnswer) {
  const prompt = `
    A Grade 11 student was asked: "If you suddenly received ₹1000, how would you manage it?"
    Their answer: "${userAnswer}"

    Analyze their financial literacy based on this answer. 
    Return ONLY a valid JSON object:
    {
      "level": number (1 to 10, 1 being knows nothing/spends all immediately, 10 being mentions saving, investing, budgeting),
      "analysis": "A brief, encouraging 1-sentence feedback on their thought process."
    }
  `;

  const response = await callGemini(apiKey, prompt);

  if (!response.ok) {
    throw new Error('Failed to assess understanding. Check API Key.');
  }

  const data = await response.json();
  try {
    return JSON.parse(answerText(data));
  } catch (e) {
    throw new Error("Failed to parse LLM response");
  }
}

export async function parseVoiceAllocation(apiKey, transcript, lang = 'en') {
  const langName = { en: 'English', hi: 'Hindi', te: 'Telugu' }[lang] || 'English';
  
  const prompt = `
    You are PaisaPath's Voice Companion, an advanced financial mentor for 16-17 year olds. You have a relaxed, slightly GenZ vibe (think older sibling who actually knows about money).
    
    LANGUAGE: You MUST respond entirely in ${langName}. All text in "companionResponse" must be in ${langName}.
    
    User's exact words: "${transcript}"
    
    CRITICAL INSTRUCTIONS:
    1. STRICT INTENT PARSING: Distinguish between theoretical questions vs. actual transactions. 
       - If the user talks about investing (e.g., "I have 3000rs to invest in an SIP", "What is compounding?"), DO NOT extract this as an expense. Treat it as a mentor moment. Answer them directly with a highly educational, realistic, and engaging response (2-4 sentences). Explain the concepts clearly.
       - ONLY extract an "action" if the user explicitly states they just bought/spent money on a consumable item (e.g., "I just bought a burger for 100") or received pocket money.
    2. DIRECT ANSWER & RELEVANCE: Directly reference the user's specific question or keywords in your very first sentence (e.g., if asked "is a credit card free money?", immediately answer "No, a credit card is definitely not free money!"). Prove you heard every word they said before explaining why. Be helpful, accurate, and drop real financial knowledge.
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

  try {
    const response = await callGemini(apiKey, prompt);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      const errorText = await response.text();
      throw new Error(`API ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Invalid response structure from Gemini: " + JSON.stringify(data));
    }
    
    let rawText = answerText(data);
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(rawText);
  } catch (error) {
    console.error('Voice parsing failed:', error);
    
    const isNetworkError = 
      error.message === "RATE_LIMIT" || 
      error.message?.includes("429") ||
      error.message?.includes("503") ||
      error.message?.includes("UNAVAILABLE") ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError");

    if (isNetworkError) {
      return { 
        failed: true,
        actions: [], 
        companionResponse: transcript 
          ? `I heard you say: "${transcript}" — but my AI is temporarily overloaded. Please wait 30 seconds and try again!`
          : `My AI is temporarily overloaded. Please wait 30 seconds and try again!`
      };
    }

    return { 
      failed: true,
      actions: [], 
      companionResponse: `Error: ${error.message}` 
    };
  }
}
