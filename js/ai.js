const AIEngine = {
  /**
   * Sends a message to the backend server and returns the response text.
   * @param {Array} history - Array of {role: 'user'|'ai', content: string}
   * @returns {Promise<string>}
   */
  async sendMessage(history) {
    const url = 'http://localhost:3000/ask-ai';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ history })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Server Error:", err);
      throw new Error(err.error || "Failed to communicate with the Secret Agent.");
    }

    const data = await response.json();
    return data.text;
  }
};
