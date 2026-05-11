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

  // Setup Initial State
  initApp();

  function initApp() {
    // Render Data
    renderChatHistory();
    renderMoodHistory();
    renderHomework();

    checkInitialGreeting();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }

  async function checkInitialGreeting() {
    const history = StorageService.getChatHistory();
    if (history.length === 0) {
      sendBtn.disabled = true;
      try {
        const loadingId = 'loading-' + Date.now();
        const loadingHTML = `<div id="${loadingId}" class="message ai">Thinking...</div>`;
        chatHistoryEl.insertAdjacentHTML('beforeend', loadingHTML);
        scrollToBottom();

        const promptHistory = [{ role: 'user', content: 'Generate a professional therapist greeting and an initial intake question' }];
        const aiResponse = await AIEngine.sendMessage(promptHistory);

        document.getElementById(loadingId)?.remove();

        const aiMsg = StorageService.addChatMessage('ai', aiResponse);
        appendMessage(aiMsg);
      } catch (error) {
        document.getElementById('loading-' + Date.now())?.remove();
        console.error("Failed to generate initial greeting:", error);
      } finally {
        sendBtn.disabled = false;
      }
    }
  }

  // Navigation
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      navBtns.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active', 'hidden'));
      views.forEach(v => v.classList.add('hidden'));

      // Add active to clicked
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.remove('hidden');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'view-chat') {
        scrollToBottom();
      }
    });
  });

  // Settings Modal
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

  // SOS Modal
  sosBtn.addEventListener('click', () => sosModal.classList.remove('hidden'));
  closeSosBtn.addEventListener('click', () => sosModal.classList.add('hidden'));

  // Chat Logic
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    chatInput.style.height = 'auto'; // reset textarea height
    sendBtn.disabled = true;

    // Add user message to UI & storage
    const userMsg = StorageService.addChatMessage('user', text);
    appendMessage(userMsg);

    // Safety Check
    if (SafetyEngine.isCrisis(text)) {
      const sysMsg = StorageService.addChatMessage('system', SafetyEngine.CRISIS_MESSAGE);
      appendMessage(sysMsg);
      sendBtn.disabled = false;
      return;
    }

    // Call AI
    try {
      // Show loading placeholder
      const loadingId = 'loading-' + Date.now();
      const loadingHTML = `<div id="${loadingId}" class="message ai">Thinking...</div>`;
      chatHistoryEl.insertAdjacentHTML('beforeend', loadingHTML);
      scrollToBottom();

      const history = StorageService.getChatHistory(); // includes the user message just sent
      const aiResponse = await AIEngine.sendMessage(history);

      // Remove loading
      document.getElementById(loadingId).remove();

      // Add AI response
      const aiMsg = StorageService.addChatMessage('ai', aiResponse);
      appendMessage(aiMsg);
    } catch (error) {
      document.getElementById('loading-' + Date.now())?.remove();
      const err = StorageService.addChatMessage('system', 'Error: ' + error.message);
      appendMessage(err);
    } finally {
      sendBtn.disabled = false;
      chatInput.focus();
    }
  });

  // Handle Enter to send, Shift+Enter for new line
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      // On mobile devices (touch pointer or small screen), we preserve native 
      // Enter-for-newline behavior as Shift+Enter is less accessible.
      const isMobile = window.matchMedia("(max-width: 768px)").matches || 
                       window.matchMedia("(pointer: coarse)").matches;
      
      if (!isMobile) {
        const text = this.value.trim();
        if (text) {
          e.preventDefault();
          chatForm.requestSubmit();
        } else {
          // Prevent default to avoid unnecessary newlines when sending empty text
          e.preventDefault();
        }
      }
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  function renderChatHistory() {
    chatHistoryEl.innerHTML = '';
    const history = StorageService.getChatHistory();
    history.forEach(appendMessage);
    scrollToBottom();
  }

  function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;

    // Convert markdown-style newlines and basic bold to HTML for simple rendering
    let htmlContent = msg.content
      .replace(/\\n/g, '<br>')
      .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');

    div.innerHTML = htmlContent;
    chatHistoryEl.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }, 50);
  }

  // Mood Logic
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
    const note = moodNote.value.trim();
    StorageService.addMoodLog(currentMood, note);

    // Reset
    currentMood = null;
    moodBtns.forEach(b => b.classList.remove('selected'));
    moodNote.value = '';

    renderMoodHistory();
  });

  function renderMoodHistory() {
    moodListEl.innerHTML = '';
    const logs = StorageService.getMoodLogs();
    if (logs.length === 0) {
      moodListEl.innerHTML = '<p class="subtitle text-center">No moods logged yet.</p>';
      return;
    }

    logs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleString();
      const div = document.createElement('div');
      div.className = 'log-card';
      div.innerHTML = `
        <div class="date">${date}</div>
        <h4>Mood: ${log.mood}</h4>
        ${log.note ? `<p>${log.note}</p>` : ''}
      `;
      moodListEl.appendChild(div);
    });
  }

  // Homework Logic
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

    // Reset
    hwSituation.value = '';
    hwThought.value = '';
    hwReframe.value = '';

    renderHomework();
  });

  function renderHomework() {
    homeworkListEl.innerHTML = '';
    const hwList = StorageService.getHomework();
    if (hwList.length === 0) {
      homeworkListEl.innerHTML = '<p class="subtitle text-center">No homework completed yet.</p>';
      return;
    }

    hwList.forEach(hw => {
      const date = new Date(hw.timestamp).toLocaleString();
      const div = document.createElement('div');
      div.className = 'log-card';
      div.innerHTML = `
        <div class="date">${date}</div>
        <h4>Situation</h4><p>${hw.situation}</p><br/>
        <h4>Automatic Thought</h4><p>${hw.thought}</p><br/>
        <h4>Reframe</h4><p>${hw.reframe}</p>
      `;
      homeworkListEl.appendChild(div);
    });
  }

});
