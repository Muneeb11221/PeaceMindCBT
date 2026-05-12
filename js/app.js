document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather Icons
  feather.replace();

  // Elements
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const clearDataBtn = document.getElementById('clear-data-btn');

  const sosBtn = document.getElementById('sos-btn');
  const sosModal = document.getElementById('sos-modal');
  const closeSosBtn = document.getElementById('close-sos-btn');

  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatHistoryEl = document.getElementById('chat-history');
  const sendBtn = document.getElementById('send-btn');

  const moodBtns = document.querySelectorAll('.mood-btn');
  const moodNote = document.getElementById('mood-note');
  const saveMoodBtn = document.getElementById('save-mood-btn');
  const moodListEl = document.getElementById('mood-list');

  const homeworkForm = document.getElementById('homework-form');
  const hwSituation = document.getElementById('hw-situation');
  const hwThought = document.getElementById('hw-thought');
  const hwReframe = document.getElementById('hw-reframe');
  const homeworkListEl = document.getElementById('homework-list');

  let currentMood = null;

  // ======================================================================
  // SAFE RENDERING UTILITIES
  // ======================================================================

  function stripHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  function safeMarkdown(text) {
    if (!text) return '';
    let safe = stripHTML(text);
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  function createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;

    if (msg.role === 'ai') {
      div.innerHTML = safeMarkdown(msg.content);
    } else if (msg.role === 'system') {
      // System messages might contain buttons (like Retry)
      div.innerHTML = msg.content;
    } else {
      div.textContent = msg.content;
    }

    return div;
  }

  /**
   * Creates the animated loading indicator element.
   */
  function createLoadingIndicator(id) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message ai';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    div.appendChild(indicator);
    return div;
  }

  // ======================================================================
  // APP INITIALIZATION
  // ======================================================================

  initApp();

  function initApp() {
    renderChatHistory();
    renderMoodHistory();
    renderHomework();
    checkInitialGreeting();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('SW registration failed: ', err);
        });
      });
    }
  }

  async function checkInitialGreeting() {
    const history = StorageService.getChatHistory();
    if (history.length === 0) {
      handleSendMessage([{ role: 'user', content: 'Generate a professional therapist greeting and an initial intake question' }], true);
    }
  }

  // ======================================================================
  // NAVIGATION
  // ======================================================================

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active', 'hidden'));
      views.forEach(v => v.classList.add('hidden'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const targetView = document.getElementById(targetId);
      targetView.classList.remove('hidden');
      targetView.classList.add('active');

      if (targetId === 'view-chat') {
        scrollToBottom();
      }
    });
  });

  // ======================================================================
  // MODALS
  // ======================================================================

  settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

  clearDataBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all history? This cannot be undone.")) {
      StorageService.clearAllData();
      renderChatHistory();
      renderMoodHistory();
      renderHomework();
      settingsModal.classList.add('hidden');
      checkInitialGreeting();
    }
  });

  sosBtn.addEventListener('click', () => sosModal.classList.remove('hidden'));
  closeSosBtn.addEventListener('click', () => sosModal.classList.add('hidden'));

  // ======================================================================
  // CHAT LOGIC
  // ======================================================================

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    const userMsg = StorageService.addChatMessage('user', text);
    appendMessage(userMsg);

    if (SafetyEngine.isCrisis(text)) {
      const sysMsg = StorageService.addChatMessage('system', SafetyEngine.CRISIS_MESSAGE);
      appendMessage(sysMsg);
      sendBtn.disabled = false;
      return;
    }

    handleSendMessage(StorageService.getChatHistory());
  });

  /**
   * Main AI communication handler with error recovery.
   */
  async function handleSendMessage(history, isInitial = false) {
    const loadingId = 'loading-' + Date.now();
    sendBtn.disabled = true;

    try {
      const loadingEl = createLoadingIndicator(loadingId);
      chatHistoryEl.appendChild(loadingEl);
      scrollToBottom();

      const aiResponse = await AIEngine.sendMessage(history);

      document.getElementById(loadingId)?.remove();

      const aiMsg = StorageService.addChatMessage('ai', aiResponse);
      appendMessage(aiMsg);
    } catch (error) {
      document.getElementById(loadingId)?.remove();
      
      const errorText = navigator.onLine ? 
        'Something went wrong. Please check your connection and try again.' : 
        'You appear to be offline. Please reconnect to continue.';
      
      const sysMsg = {
        role: 'system',
        content: `${errorText} <button class="retry-btn" id="retry-${loadingId}">Retry</button>`
      };
      
      appendMessage(sysMsg);

      // Add event listener for the retry button
      document.getElementById(`retry-${loadingId}`)?.addEventListener('click', (e) => {
        e.target.parentElement.remove(); // Remove error message
        handleSendMessage(history, isInitial);
      });
    } finally {
      if (!isInitial) {
        sendBtn.disabled = false;
        chatInput.focus();
      } else {
        sendBtn.disabled = false;
      }
    }
  }

  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      const isMobile = window.matchMedia("(max-width: 768px)").matches || 
                       window.matchMedia("(pointer: coarse)").matches;
      if (!isMobile) {
        const text = this.value.trim();
        if (text) {
          e.preventDefault();
          chatForm.requestSubmit();
        } else {
          e.preventDefault();
        }
      }
    }
  });

  chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  function renderChatHistory() {
    chatHistoryEl.innerHTML = '';
    StorageService.getChatHistory().forEach(appendMessage);
    scrollToBottom();
  }

  function appendMessage(msg) {
    const el = createMessageElement(msg);
    chatHistoryEl.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }, 50);
  }

  // ======================================================================
  // MOOD LOGIC
  // ======================================================================

  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentMood = btn.getAttribute('data-mood');
    });
  });

  saveMoodBtn.addEventListener('click', () => {
    if (!currentMood) {
      alert('Please select a mood emoji.');
      return;
    }
    StorageService.addMoodLog(currentMood, moodNote.value.trim());
    currentMood = null;
    moodBtns.forEach(b => b.classList.remove('selected'));
    moodNote.value = '';
    renderMoodHistory();
  });

  function renderMoodHistory() {
    moodListEl.innerHTML = '';
    const logs = StorageService.getMoodLogs();
    if (logs.length === 0) {
      const p = document.createElement('p');
      p.className = 'subtitle text-center';
      p.textContent = 'No moods logged yet.';
      moodListEl.appendChild(p);
      return;
    }

    logs.forEach(log => {
      const div = document.createElement('div');
      div.className = 'log-card';
      div.innerHTML = `
        <div class="date">${new Date(log.timestamp).toLocaleString()}</div>
        <h4>Mood: ${stripHTML(log.mood)}</h4>
        ${log.note ? `<p>${stripHTML(log.note)}</p>` : ''}
      `;
      moodListEl.appendChild(div);
    });
  }

  // ======================================================================
  // HOMEWORK LOGIC
  // ======================================================================

  homeworkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const situation = hwSituation.value.trim();
    const thought = hwThought.value.trim();
    const reframe = hwReframe.value.trim();

    if (!situation || !thought || !reframe) {
      alert('Please fill out all fields.');
      return;
    }

    StorageService.addHomework(situation, thought, reframe);
    hwSituation.value = '';
    hwThought.value = '';
    hwReframe.value = '';
    renderHomework();
  });

  function renderHomework() {
    homeworkListEl.innerHTML = '';
    const hwList = StorageService.getHomework();
    if (hwList.length === 0) {
      const p = document.createElement('p');
      p.className = 'subtitle text-center';
      p.textContent = 'No homework completed yet.';
      homeworkListEl.appendChild(p);
      return;
    }

    hwList.forEach(hw => {
      const div = document.createElement('div');
      div.className = 'log-card';
      div.innerHTML = `
        <div class="date">${new Date(hw.timestamp).toLocaleString()}</div>
        <h4>Situation</h4><p>${stripHTML(hw.situation)}</p><br/>
        <h4>Automatic Thought</h4><p>${stripHTML(hw.thought)}</p><br/>
        <h4>Reframe</h4><p>${stripHTML(hw.reframe)}</p>
      `;
      homeworkListEl.appendChild(div);
    });
  }

});
