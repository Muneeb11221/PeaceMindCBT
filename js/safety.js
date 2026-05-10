const SafetyEngine = {
  // Common terms that indicate immediate crisis
  CRISIS_KEYWORDS: [
    'suicide', 'kill myself', 'want to die', 'end my life', 'harm myself',
    'hurt myself', 'cut myself', 'don\'t want to live', 'better off dead',
    'kill someone', 'hurt someone', 'murder'
  ],

  CRISIS_MESSAGE: "I am concerned about your safety. Please contact the 988 Suicide & Crisis Lifeline or go to the nearest Emergency Room immediately. You can call or text 988 in the US.",

  /**
   * Checks a message for crisis keywords.
   * @param {string} message - The user's input message.
   * @returns {boolean} - True if a crisis keyword is found.
   */
  isCrisis(message) {
    if (!message) return false;
    const lowerMessage = message.toLowerCase();
    return this.CRISIS_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  }
};
