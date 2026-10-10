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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate scenario. Check API Key.');
  }

  const data = await response.json();
  try {
    return JSON.parse(data.candidates[0].content.parts[0].text);
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to assess understanding. Check API Key.');
  }

  const data = await response.json();
  try {
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) {
    throw new Error("Failed to parse LLM response");
  }
}

export async function parseVoiceAllocation(apiKey, transcript) {
  const prompt = `
    You are PaisaPath's Voice Companion, an advanced financial mentor for 16-17 year olds. You have a relaxed, slightly GenZ vibe (think older sibling who actually knows about money).
    
    User's exact words: "${transcript}"
    
    CRITICAL INSTRUCTIONS:
    1. STRICT INTENT PARSING: Distinguish between theoretical questions vs. actual transactions. 
       - If the user talks about investing (e.g., "I have 3000rs to invest in an SIP", "What is compounding?"), DO NOT extract this as an expense. Treat it as a mentor moment. Answer them directly with a highly educational, realistic, and engaging response (2-4 sentences). Explain the concepts clearly.
       - ONLY extract an "action" if the user explicitly states they just bought/spent money on a consumable item (e.g., "I just bought a burger for 100") or received pocket money.
    2. TONE: Be helpful, accurate, and drop some real financial knowledge. You can use words like "W", "L", "flex", or "vibes" sparingly if it fits natively, but focus heavily on giving a genuinely excellent, relevant answer to what they just said. Do NOT redirect them to a game or scenario.
    
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    
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
    
    let rawText = data.candidates[0].content.parts[0].text;
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
      const tLower = transcript.toLowerCase();
      
      if (tLower.includes("sip") || tLower.includes("mutual fund") || tLower.includes("invest") || tLower.includes("compound")) {
        return {
          actions: [],
          companionResponse: "That's a massive W question! Investing in an SIP (Systematic Investment Plan) means putting a fixed amount — even just ₹500 — into a mutual fund every month automatically. Over 10-15 years, compounding turns that into serious wealth. Start small, stay consistent!"
        };
      }

      if (tLower.includes("budget") || tLower.includes("save") || tLower.includes("saving")) {
        return {
          actions: [],
          companionResponse: "The golden rule is the 50-30-20 split: 50% of your income on needs, 30% on wants, and 20% straight into savings or investments. Even at your age, building this habit early is a total W for your future self."
        };
      }

      if (tLower.includes("stock") || tLower.includes("share") || tLower.includes("equity")) {
        return {
          actions: [],
          companionResponse: "Stocks mean you own a tiny piece of a company. When the company grows, so does your investment. But stocks are volatile — they go up and down. For beginners, index funds or mutual funds are a safer way to get started than picking individual stocks."
        };
      }

      if (tLower.includes("inflation")) {
        return {
          actions: [],
          companionResponse: "Inflation is basically money losing value over time. If inflation is 6% and your savings account gives you 3%, you're actually getting poorer even while your balance grows. That's why investing your money to beat inflation is so critical."
        };
      }

      // Generic transaction fallback
      const nums = transcript.match(/\d+/g);
      const amount = nums ? parseInt(nums[0]) : 0;
      const isIncome = tLower.includes("got") || tLower.includes("received") || tLower.includes("gave");
      
      if (amount > 0) {
        return { 
          actions: [{ label: isIncome ? "Income" : "Expense", amount, type: isIncome ? 'income' : 'expense' }], 
          companionResponse: `Got it! I've recorded ${isIncome ? 'an income' : 'an expense'} of ₹${amount} in your ledger. Your updated balance is shown on the right.` 
        };
      }

      return { 
        actions: [], 
        companionResponse: "I'm listening! Try asking me about SIPs, budgeting, stocks, or just tell me what you spent money on today." 
      };
    }

    return { 
      actions: [], 
      companionResponse: `Error: ${error.message}` 
    };
  }
}
