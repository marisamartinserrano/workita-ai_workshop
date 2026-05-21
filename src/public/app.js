let progress = {};
let activeJourney = null;
let messages = [];
let currentUser = null;

async function loadSession() {
  const data = await fetch('/api/session').then(r => r.json());
  progress = data.progress ?? {};
  currentUser = data.user ?? null;
  updateAuthUI();
  updateJourneyButtons();
}

function updateAuthUI() {
  const signInArea = document.getElementById('signInArea');
  const userInfo = document.getElementById('userInfo');

  if (currentUser) {
    signInArea.classList.add('hidden');
    userInfo.classList.remove('hidden');
    document.getElementById('userAvatar').src = currentUser.picture;
    document.getElementById('userAvatar').alt = currentUser.name;
    document.getElementById('userName').textContent = currentUser.name;
  } else {
    signInArea.classList.remove('hidden');
    userInfo.classList.add('hidden');
  }
}

async function saveProgress(journeyId, status) {
  progress[journeyId] = status;
  updateJourneyButtons();
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journeyId, status }),
  });
}

function isGettingStartedDone() {
  return progress['getting-started'] === 'completed';
}

function updateJourneyButtons() {
  document.querySelectorAll('.journey-btn').forEach(btn => {
    const id = btn.dataset.journey;
    btn.classList.remove('active', 'completed', 'gated');

    if (!currentUser) {
      btn.classList.add('gated');
      btn.title = 'Sign in to get started';
      return;
    }

    if (id === activeJourney) btn.classList.add('active');
    if (progress[id] === 'completed') btn.classList.add('completed');
    if (id !== 'getting-started' && !isGettingStartedDone()) {
      btn.classList.add('gated');
      btn.title = 'Complete Getting Started first';
    } else {
      btn.title = btn.dataset.tooltip || '';
    }
  });
}

function addBubble(role, text) {
  const chatWindow = document.getElementById('chatWindow');
  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;

  if (role === 'user') {
    bubble.textContent = text;
  } else {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    bubble.innerHTML = escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

function setLoading(on) {
  document.getElementById('sendBtn').disabled = on;
  document.getElementById('messageInput').disabled = on;
}

async function callChat(msgs) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: msgs, journey: activeJourney }),
  });
  return res.json();
}

async function startJourney(journeyId) {
  const placeholder = document.getElementById('chatPlaceholder');
  const chatWindow = document.getElementById('chatWindow');
  const inputArea = document.getElementById('inputArea');
  const uploadRow = document.getElementById('uploadRow');

  placeholder.classList.add('hidden');
  chatWindow.classList.add('visible');
  chatWindow.innerHTML = '';

  if (!currentUser) {
    inputArea.classList.remove('visible');
    addBubble('model', 'Please **sign in with Google** to start this journey.');
    return;
  }

  activeJourney = journeyId;
  messages = [];

  inputArea.classList.add('visible');
  uploadRow.classList.toggle('hidden', journeyId !== 'getting-started');
  document.getElementById('uploadStatus').textContent = '';

  updateJourneyButtons();

  if (journeyId !== 'getting-started' && !isGettingStartedDone()) {
    addBubble('model', 'Please complete the **Getting Started** journey first to provide us with the necessary information about your background and preferences.');
    return;
  }

  const existing = await fetch(`/api/messages?journey=${journeyId}`).then(r => r.json());

  if (existing.messages && existing.messages.length > 0) {
    for (const msg of existing.messages) {
      addBubble(msg.role, msg.content);
    }
    messages = existing.messages;
  } else {
    if (progress[journeyId] !== 'completed') {
      await saveProgress(journeyId, 'in-progress');
    }

    setLoading(true);
    const typing = addBubble('model typing', '...');
    try {
      const data = await callChat([]);
      typing.remove();
      addBubble('model', data.reply);
      messages.push({ role: 'model', content: data.reply });
    } catch {
      typing.remove();
      addBubble('model', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text || !activeJourney) return;

  addBubble('user', text);
  messages.push({ role: 'user', content: text });
  input.value = '';

  setLoading(true);
  const typing = addBubble('model typing', '...');

  try {
    const data = await callChat(messages);
    typing.remove();
    addBubble('model', data.reply);
    messages.push({ role: 'model', content: data.reply });
  } catch {
    typing.remove();
    addBubble('model', 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);

document.getElementById('messageInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

document.getElementById('cvUpload').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  document.getElementById('uploadStatus').textContent = `Uploading ${file.name}...`;
  setLoading(true);

  const formData = new FormData();
  formData.append('cv', file);
  await fetch('/api/upload', { method: 'POST', body: formData });

  document.getElementById('uploadStatus').textContent = `✓ ${file.name}`;

  const uploadMsg = `I have uploaded my CV: ${file.name}`;
  addBubble('user', uploadMsg);
  messages.push({ role: 'user', content: uploadMsg });

  const typing = addBubble('model typing', '...');

  try {
    const data = await callChat(messages);
    typing.remove();
    addBubble('model', data.reply);
    messages.push({ role: 'model', content: data.reply });

    if (activeJourney === 'getting-started') {
      await saveProgress('getting-started', 'completed');
    }
  } catch {
    typing.remove();
    addBubble('model', 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});

document.querySelectorAll('.journey-btn').forEach(btn => {
  btn.addEventListener('click', () => startJourney(btn.dataset.journey));
});

loadSession();
