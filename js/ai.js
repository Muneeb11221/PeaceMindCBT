const AIEngine = {
  // Configuration
  CONFIG: {
    // Dynamically determine the API URL based on environment
    get URL() {
      const isProduction = window.location.hostname.includes('onrender.com');
      return isProduction ? 'https://peacemind-ai-cbt.onrender.com/ask-ai' : 'http://localhost:3001/ask-ai';
    },
    TIMEOUT_MS: 30000, // 30 second timeout
    MAX_HISTORY_LENGTH: 50 // Guard against oversized payloads
  },

  /**
   * Centralized AI communication handler with timeout and validation.
   * @param {Array} history - Array of {role: string, content: string}
   * @returns {Promise<string>}
   */
  async sendMessage(history) {
    if (!history || !Array.isArray(history) || history.length === 0) {
      throw new Error("Invalid conversation history.");
    }

    // 1. Validate & Clean Payload
    // Limit history size to prevent massive payloads
    const cleanHistory = history.slice(-this.CONFIG.MAX_HISTORY_LENGTH).map(msg => ({
      role: msg.role,
      content: msg.content.trim().substring(0, 2000) // Trim and cap message length
    }));

    // 2. Setup Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(this.CONFIG.URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ history: cleanHistory }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error("Too many requests. Please take a deep breath and wait a moment.");
        }

        const err = await response.json().catch(() => ({}));
        console.error("Server Error:", err);
        throw new Error(err.error || "Something went wrong. Please try again.");
      }

      const data = await response.json();
      return data.text;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error("The connection timed out. Please try again.");
      }

      throw error;
    }
  }
};
