const StorageService = {
  KEYS: {
    CHAT_HISTORY: 'peacemind_chat_history',
    MOOD_LOGS: 'peacemind_mood_logs',
    HOMEWORK: 'peacemind_homework_logs'
  },

  // Rolling limits
  LIMITS: {
    CHAT: 100,
    MOOD: 100,
    HOMEWORK: 50
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

  /**
   * Truncates an array to the specified limit, keeping the newest items.
   * @param {Array} arr - The array to truncate
   * @param {number} limit - Maximum number of items
   * @param {boolean} append - True if new items are pushed (oldest at index 0), 
   *                           False if unshifted (newest at index 0).
   */
  truncate(arr, limit, append = true) {
    if (arr.length <= limit) return arr;
    if (append) {
      // Keep last N items
      return arr.slice(-limit);
    } else {
      // Keep first N items (since unshifted)
      return arr.slice(0, limit);
    }
  },

  // Specialized methods
  getChatHistory() {
    return this.get(this.KEYS.CHAT_HISTORY, []);
  },

  addChatMessage(role, content) {
    let history = this.getChatHistory();
    const message = { id: Date.now().toString(), role, content, timestamp: new Date().toISOString() };
    history.push(message);
    
    // Apply rolling limit
    history = this.truncate(history, this.LIMITS.CHAT, true);
    
    this.set(this.KEYS.CHAT_HISTORY, history);
    return message;
  },

  getMoodLogs() {
    return this.get(this.KEYS.MOOD_LOGS, []);
  },

  addMoodLog(mood, note) {
    let logs = this.getMoodLogs();
    const log = { id: Date.now().toString(), mood, note, timestamp: new Date().toISOString() };
    // Prepend to show newest first
    logs.unshift(log);
    
    // Apply rolling limit
    logs = this.truncate(logs, this.LIMITS.MOOD, false);
    
    this.set(this.KEYS.MOOD_LOGS, logs);
    return log;
  },

  getHomework() {
    return this.get(this.KEYS.HOMEWORK, []);
  },

  addHomework(situation, thought, reframe) {
    let hwList = this.getHomework();
    const hw = { id: Date.now().toString(), situation, thought, reframe, timestamp: new Date().toISOString() };
    hwList.unshift(hw);
    
    // Apply rolling limit
    hwList = this.truncate(hwList, this.LIMITS.HOMEWORK, false);
    
    this.set(this.KEYS.HOMEWORK, hwList);
    return hw;
  },

  clearAllData() {
    localStorage.removeItem(this.KEYS.CHAT_HISTORY);
    localStorage.removeItem(this.KEYS.MOOD_LOGS);
    localStorage.removeItem(this.KEYS.HOMEWORK);
  }
};
