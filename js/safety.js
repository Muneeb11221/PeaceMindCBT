const SafetyEngine = {
  // Common terms that indicate immediate crisis
  CRISIS_KEYWORDS: [
    'suicide', 'kill myself', 'want to die', 'end my life', 'harm myself',
    'hurt myself', 'cut myself', 'don\'t want to live', 'better off dead',
    'kill someone', 'hurt someone', 'murder', 'end myself', 'end it all',
    'ending it', 'poison myself', 'overdose', 'goodbye world', 'hang myself'
  ],

  CRISIS_MESSAGE: "I am deeply concerned about your safety. Please reach out for help immediately. You can contact Umang Pakistan at 0311-7786264, Rozan at 0304-111-1741, or call the National Emergency Service at 1122.",

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
