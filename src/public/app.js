let progress = {};
let activeSection = null;
let activeJourney = null;
let messages = [];
let currentUser = null;

// Maps nav sections to AI journey IDs
const SECTION_JOURNEY_MAP = {
  'job-preferences': 'getting-started',
  'cv-analysis': 'improve-cv',
  'linkedin-analysis': 'improve-linkedin',
  'quizzes': 'quizzes',
};

const PROFILE_SECTIONS = new Set(['job-preferences', 'cv-analysis', 'linkedin-analysis']);
const CANDIDATURE_SECTIONS = new Set(['my-candidatures']);

async function loadSession() {
  const data = await fetch('/api/session').then(r => r.json());
  progress = data.progress ?? {};
  currentUser = data.user ?? null;
  updateAuthUI();
}

function updateAuthUI() {
  const navUser = document.getElementById('navUser');
  const navSignIn = document.getElementById('navSignIn');

  if (currentUser) {
    navUser.classList.remove('hidden');
    navSignIn.classList.add('hidden');
    document.getElementById('navAvatar').src = currentUser.picture;
    document.getElementById('navAvatar').alt = currentUser.name;
    document.getElementById('navUserName').textContent = currentUser.name;
  } else {
    navUser.classList.add('hidden');
    navSignIn.classList.remove('hidden');
  }

  updateNavItems();
}

function updateNavItems() {
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    const section = item.dataset.section;
    const isActive = section === activeSection;
    item.classList.toggle('active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

function setGroupExpanded(groupId, expanded) {
  const toggle = document.querySelector(`[data-group="${groupId}"]`);
  const items = document.getElementById(`group-${groupId}`);
  if (!toggle || !items) return;
  toggle.setAttribute('aria-expanded', String(expanded));
  items.classList.toggle('expanded', expanded);
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

async function saveProgress(journeyId, status) {
  progress[journeyId] = status;
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journeyId, status }),
  });
}

function matchBadgeClass(pct) {
  if (pct === null || pct === undefined) return 'none';
  if (pct >= 75) return 'green';
  if (pct >= 50) return 'amber';
  return 'red';
}

function renderHome(data) {
  const { user, stats, candidatures } = data;

  const firstName = (user.name || '').split(' ')[0];
  document.getElementById('homeWelcome').textContent = `Welcome back, ${firstName}!`;

  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statInterviews').textContent = stats.interviews;
  document.getElementById('statOffers').textContent = stats.offers;
  document.getElementById('statAvgMatch').textContent =
    stats.avgMatch !== null ? `${stats.avgMatch}%` : '—';

  const list = document.getElementById('candidaturesList');
  const empty = document.getElementById('homeEmpty');

  // Remove existing candidature cards (keep empty state)
  list.querySelectorAll('.candidature-card').forEach(el => el.remove());

  if (candidatures.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    for (const c of candidatures) {
      const card = document.createElement('div');
      card.className = 'candidature-card';
      const badgeClass = matchBadgeClass(c.match_pct);
      const matchText = c.match_pct !== null ? `${c.match_pct}%` : 'N/A';
      const stage = c.current_stage || c.status || '—';
      card.innerHTML = `
        <div class="candidature-info">
          <div class="candidature-title">${c.job_title}</div>
          <div class="candidature-company">${c.company}</div>
          <div class="candidature-stage">${stage}</div>
        </div>
        <span class="match-badge ${badgeClass}">${matchText}</span>
      `;
      list.insertBefore(card, empty);
    }
  }
}

async function navigateTo(section) {
  const placeholder = document.getElementById('chatPlaceholder');
  const chatWindow = document.getElementById('chatWindow');
  const inputArea = document.getElementById('inputArea');
  const uploadRow = document.getElementById('uploadRow');
  const homeSection = document.getElementById('homeSection');

  placeholder.classList.add('hidden');
  homeSection.classList.add('hidden');
  chatWindow.classList.remove('visible');
  chatWindow.innerHTML = '';
  inputArea.classList.remove('visible');
  activeJourney = null;

  // Close mobile drawer
  document.body.classList.remove('nav-open');

  activeSection = section;
  updateNavItems();

  // Auto-expand parent groups
  if (PROFILE_SECTIONS.has(section)) setGroupExpanded('profile', true);
  if (CANDIDATURE_SECTIONS.has(section) || section.startsWith('candidature')) setGroupExpanded('candidatures', true);

  if (section === 'home') {
    homeSection.classList.remove('hidden');
    const signInState = document.getElementById('homeSignIn');
    const dashboard = document.getElementById('homeDashboard');

    if (!currentUser) {
      signInState.classList.remove('hidden');
      dashboard.classList.add('hidden');
      return;
    }

    signInState.classList.add('hidden');
    dashboard.classList.remove('hidden');

    try {
      const data = await fetch('/api/home').then(r => r.json());
      renderHome(data);
    } catch {
      homeSection.classList.add('hidden');
      chatWindow.classList.add('visible');
      addBubble('model', 'Failed to load Home. Please try again.');
    }
    return;
  }

  if (!currentUser) {
    chatWindow.classList.add('visible');
    addBubble('model', 'Please **sign in with Google** to get started.');
    return;
  }

  chatWindow.classList.add('visible');

  const journeyId = SECTION_JOURNEY_MAP[section];

  if (!journeyId) {
    const labels = {
      'my-candidatures': 'My Candidatures',
      closing: 'Closing',
      glossary: 'Glossary',
    };
    const name = labels[section] || section;
    addBubble('model', `**${name}** is coming soon. Stay tuned!`);
    return;
  }

  if (journeyId !== 'getting-started' && progress['getting-started'] !== 'completed') {
    addBubble('model', 'Please complete **Job Preferences** first to provide us with the necessary information about your background and preferences.');
    return;
  }

  activeJourney = journeyId;
  messages = [];
  inputArea.classList.add('visible');
  uploadRow.classList.toggle('hidden', journeyId !== 'getting-started');
  document.getElementById('uploadStatus').textContent = '';

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

// Nav item clicks
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.section);
  });
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateTo(item.dataset.section);
    }
  });
});

// Collapsible group toggles
document.querySelectorAll('.nav-group-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const group = toggle.dataset.group;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setGroupExpanded(group, !expanded);
  });
});

// Hamburger toggle
document.getElementById('navHamburger').addEventListener('click', () => {
  document.body.classList.toggle('nav-open');
});

// Backdrop closes mobile drawer
document.getElementById('navBackdrop').addEventListener('click', () => {
  document.body.classList.remove('nav-open');
});

function initCookieConsent() {
  const banner = document.getElementById('cookieBanner');
  const stored = localStorage.getItem('workita_cookie_consent');

  if (!stored) {
    banner.classList.remove('hidden');
  }

  document.getElementById('cookieAccept').addEventListener('click', () => {
    localStorage.setItem('workita_cookie_consent', 'accepted');
    banner.classList.add('hidden');
  });

  document.getElementById('cookieDecline').addEventListener('click', () => {
    localStorage.setItem('workita_cookie_consent', 'declined');
    banner.classList.add('hidden');
  });

  document.getElementById('cookieSettingsLink').addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('workita_cookie_consent');
    banner.classList.remove('hidden');
  });
}

// Quick-action buttons on the Home section
document.getElementById('qaNewCandidature').addEventListener('click', () => navigateTo('my-candidatures'));
document.getElementById('qaFirstCandidature').addEventListener('click', () => navigateTo('my-candidatures'));
document.getElementById('qaUpdateProfile').addEventListener('click', () => navigateTo('job-preferences'));
document.getElementById('qaPracticeQuizzes').addEventListener('click', () => navigateTo('quizzes'));

async function init() {
  await loadSession();
  navigateTo('home');
}

init();
initCookieConsent();
