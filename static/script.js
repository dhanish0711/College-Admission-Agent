/* ════════════════════════════════════════════
   EduAdmit AI — Main Script
════════════════════════════════════════════ */

// ── State ──────────────────────────────────
let queryCount = 0;
let isTyping   = false;

// ── Element Refs ───────────────────────────
const chatBox     = document.getElementById('chatBox');
const chatEmpty   = document.getElementById('chatEmpty');
const userInput   = document.getElementById('userInput');
const sendBtn     = document.getElementById('sendBtn');
const clearBtn    = document.getElementById('clearBtn');
const queryCountEl= document.getElementById('queryCount');

// ── Tabs ───────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + target).classList.add('active');
  });
});

// ── Mobile Sidebar ─────────────────────────
const sidebar        = document.getElementById('sidebar');
const mobileMenuBtn  = document.getElementById('mobileMenuBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');

mobileMenuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('open');
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
});

// ── Format message text (basic markdown-ish) ──
function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:0.1em 0.4em;border-radius:4px;font-size:0.88em;">$1</code>')
    .replace(/\n/g, '<br>');
}

// ── Append message ─────────────────────────
function appendMessage(role, text) {
  // Hide empty state
  if (chatEmpty) chatEmpty.style.display = 'none';

  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const isUser = role === 'user';
  const isError = text.includes('CONNECTION_ERROR') || text.includes('TIMEOUT_ERROR') || text.includes('HTTP_ERROR') || text.includes('ERROR:');

  const wrapper = document.createElement('div');
  wrapper.className = `msg-wrapper ${isUser ? 'user' : ''}`;

  const avatar = document.createElement('div');
  avatar.className = `msg-avatar ${isUser ? 'user' : 'ai'}`;
  avatar.textContent = isUser ? '👤' : '🤖';

  const content = document.createElement('div');
  content.className = 'msg-content';

  const bubble = document.createElement('div');
  bubble.className = `msg-bubble ${isUser ? 'user' : isError ? 'error' : 'ai'}`;

  let displayText = text;
  if (isError) {
    displayText = text
      .replace('CONNECTION_ERROR: ', '🔌 Connection Error\n\n')
      .replace('TIMEOUT_ERROR: ', '⏳ Timeout\n\n')
      .replace('HTTP_ERROR: ', '❌ HTTP Error\n\n')
      .replace('ERROR: ', '❌ Error\n\n');
  }

  bubble.innerHTML = formatText(displayText);

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = now;

  content.appendChild(bubble);
  content.appendChild(timeEl);

  if (isUser) {
    wrapper.appendChild(content);
    wrapper.appendChild(avatar);
  } else {
    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
  }

  chatBox.appendChild(wrapper);
  scrollChat();
}

// ── Typing indicator ───────────────────────
function showTyping() {
  const wrapper = document.createElement('div');
  wrapper.className = 'typing-wrapper';
  wrapper.id = 'typingIndicator';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar ai';
  avatar.textContent = '🤖';

  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);
  scrollChat();
  isTyping = true;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
  isTyping = false;
}

function scrollChat() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ── Send message ───────────────────────────
async function sendMessage(text) {
  const msg = (text || userInput.value).trim();
  if (!msg || isTyping) return;

  // Clear input
  if (!text) userInput.value = '';

  // Switch to chat tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-chat').classList.add('active');
  document.getElementById('panel-chat').classList.add('active');

  // Append user message
  appendMessage('user', msg);

  // Disable controls
  sendBtn.disabled = true;
  userInput.disabled = true;
  showTyping();

  try {
    const resp = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });

    const data = await resp.json();
    hideTyping();
    appendMessage('assistant', data.response || 'No response received.');

    queryCount++;
    queryCountEl.textContent = queryCount;

  } catch (err) {
    hideTyping();
    appendMessage('assistant', 'CONNECTION_ERROR: Failed to reach the server. Please check your connection.');
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

// ── Event listeners ─────────────────────────
sendBtn.addEventListener('click', () => sendMessage());

userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// FAQ buttons
document.querySelectorAll('.faq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendMessage(btn.dataset.q);
    // Close sidebar on mobile
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  });
});

// Suggestion chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => sendMessage(chip.dataset.q));
});

// Clear chat
clearBtn.addEventListener('click', () => {
  // Remove all messages from chat box
  const msgs = chatBox.querySelectorAll('.msg-wrapper, .typing-wrapper');
  msgs.forEach(m => m.remove());

  // Show empty state again
  if (chatEmpty) chatEmpty.style.display = 'flex';

  queryCount = 0;
  queryCountEl.textContent = 0;

  // Reset session on server
  fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '__reset__' }),
  }).catch(() => {});
});

// ── Eligibility Checker ─────────────────────
const pctRange   = document.getElementById('pctRange');
const pctDisplay = document.getElementById('pctDisplay');
const checkBtn   = document.getElementById('checkEligBtn');
const eligResult = document.getElementById('eligResult');

pctRange.addEventListener('input', () => {
  pctDisplay.textContent = pctRange.value + '%';
});

checkBtn.addEventListener('click', async () => {
  const program  = document.getElementById('progSelect').value;
  const qual     = document.getElementById('qualSelect').value;
  const pct      = parseInt(pctRange.value);
  const entrance = Array.from(document.querySelectorAll('.cb-input:checked')).map(cb => cb.value);

  checkBtn.textContent = '⏳ Checking...';
  checkBtn.disabled = true;

  try {
    const resp = await fetch('/check-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program, qualification: qual, percentage: pct, entrance }),
    });
    const data = await resp.json();

    const statusText = { eligible: 'Eligible', not_eligible: 'Not Eligible', maybe: 'Conditionally Eligible' };

    const pointsHTML = (data.points || []).map(p => `<li>${p}</li>`).join('');

    eligResult.innerHTML = `
      <div class="elig-result">
        <div class="result-icon">${data.icon}</div>
        <div class="result-status ${data.status}">${statusText[data.status] || data.status}</div>
        <div class="result-title">${data.title}</div>
        <ul class="result-points">${pointsHTML}</ul>
        <div class="result-message">${data.message}</div>
      </div>
    `;
  } catch (err) {
    eligResult.innerHTML = `<div class="elig-result"><div class="result-icon">❌</div><div class="result-title">Error checking eligibility</div></div>`;
  } finally {
    checkBtn.textContent = '🔍 Check Eligibility';
    checkBtn.disabled = false;
  }
});

// ── Greeting on load ─────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Add greeting message from AI
  setTimeout(() => {
    const greetingAdded = sessionStorage.getItem('greetingAdded');
    if (!greetingAdded) {
      appendMessage('assistant',
        `👋 Hello! I'm your **College Admission AI Assistant**, powered by **IBM Granite** and LangFlow RAG.\n\nI can help you with:\n• 📚 Course information & selection\n• 💰 Fee structure & scholarships\n• 📅 Admission deadlines\n• ✅ Eligibility criteria\n• 📋 Application process\n\nWhat would you like to know today?`
      );
      sessionStorage.setItem('greetingAdded', 'true');
    }
  }, 300);
});
