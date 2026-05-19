let messages = [];

function addBubble(role, text) {
  const window = document.getElementById('chatWindow');
  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  window.appendChild(bubble);
  window.scrollTop = window.scrollHeight;
  return bubble;
}

function setLoading(on) {
  document.getElementById('sendBtn').disabled = on;
  document.getElementById('messageInput').disabled = on;
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text) return;

  addBubble('user', text);
  messages.push({ role: 'user', content: text });
  input.value = '';

  setLoading(true);
  const typing = addBubble('model typing', '...');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
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
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    typing.remove();
    addBubble('model', data.reply);
    messages.push({ role: 'model', content: data.reply });
  } catch {
    typing.remove();
    addBubble('model', 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});

// Auto-greet on load
(async () => {
  setLoading(true);
  const typing = addBubble('model typing', '...');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    const data = await res.json();
    typing.remove();
    addBubble('model', data.reply);
    messages.push({ role: 'model', content: data.reply });
  } catch {
    typing.remove();
    addBubble('model', 'Hi! I am Workita, your AI job companion. What is your name?');
  } finally {
    setLoading(false);
  }
})();
