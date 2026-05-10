const AIEngine = {
  SYSTEM_PROMPT: `You are a Senior CBT (Cognitive Behavioral Therapy) companion named PeaceMind.
Your goal is to provide empathetic peer support using the Cognitive Triad (Thoughts -> Feelings -> Behaviors).

Rules:
1. Identify cognitive distortions (e.g., all-or-nothing thinking, catastrophizing).
2. Use Reflective Listening to validate feelings before suggesting a Reframing Exercise.
3. Every interaction should subtly nudge toward a "Homework" task (e.g., "Write down one thing you're grateful for").
4. Privacy: NEVER ask for Names, DOBs, SSNs, or PII. Do not bring up specific details from past sessions unless the user initiates.
5. Tone: Empathetic, grounded, and concise. Avoid "toxic positivity".
6. Keep responses under 3 paragraphs.
7. You are NOT a medical professional. Do not provide medical diagnoses or prescribe medications.`,

  /**
   * Sends a message to the Gemini API and returns the response text.
   * @param {string} apiKey 
   * @param {Array} history - Array of {role: 'user'|'ai', content: string}
   * @returns {Promise<string>}
   */
  async sendMessage(apiKey, history) {
    if (!apiKey) {
      throw new Error("API Key is missing. Please set your Gemini API key in Settings.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // Format history for Gemini API
    const contents = history.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const body = {
      system_instruction: {
        parts: [{ text: this.SYSTEM_PROMPT }]
      },
      contents: contents,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.6
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("API Error:", err);
      throw new Error(err.error?.message || "Failed to communicate with AI.");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
};
