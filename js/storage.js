const StorageService = {
  KEYS: {
    API_KEY: 'peacemind_api_key',
    CHAT_HISTORY: 'peacemind_chat_history',
    MOOD_LOGS: 'peacemind_mood_logs',
    HOMEWORK: 'peacemind_homework_logs'
  },

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
  },

  // Specialized methods
  getChatHistory() {
    return this.get(this.KEYS.CHAT_HISTORY, []);
  },

  addChatMessage(role, content) {
    const history = this.getChatHistory();
    const message = { id: Date.now().toString(), role, content, timestamp: new Date().toISOString() };
    history.push(message);
    this.set(this.KEYS.CHAT_HISTORY, history);
    return message;
  },

  getMoodLogs() {
    return this.get(this.KEYS.MOOD_LOGS, []);
  },

  addMoodLog(mood, note) {
    const logs = this.getMoodLogs();
    const log = { id: Date.now().toString(), mood, note, timestamp: new Date().toISOString() };
    // Prepend to show newest first
    logs.unshift(log);
    this.set(this.KEYS.MOOD_LOGS, logs);
    return log;
  },

  getHomework() {
    return this.get(this.KEYS.HOMEWORK, []);
  },

  addHomework(situation, thought, reframe) {
    const hwList = this.getHomework();
    const hw = { id: Date.now().toString(), situation, thought, reframe, timestamp: new Date().toISOString() };
    hwList.unshift(hw);
    this.set(this.KEYS.HOMEWORK, hwList);
    return hw;
  },

  clearAllData() {
    localStorage.removeItem(this.KEYS.CHAT_HISTORY);
    localStorage.removeItem(this.KEYS.MOOD_LOGS);
    localStorage.removeItem(this.KEYS.HOMEWORK);
    // Deliberately keep API key
  }
};
