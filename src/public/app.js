let progress = {};
let activeSection = null;
let activeJourney = null;
let messages = [];
let currentUser = null;

// Maps nav sections to AI journey IDs (profile sections handled separately)
const SECTION_JOURNEY_MAP = {
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

let profileData = {};

async function loadProfile() {
  try {
    profileData = await fetch('/api/profile').then(r => r.json());
  } catch {
    profileData = {};
  }
}

function showToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

function populateJobPreferencesForm() {
  const fields = ['target_role', 'seniority', 'industry', 'location', 'work_mode', 'salary', 'preferred_companies'];
  fields.forEach(f => {
    const el = document.querySelector(`[name="${f}"]`);
    if (el) el.value = profileData[f] ?? '';
  });
}

function populateCvForm() {
  const hasCv = !!(profileData.cv_text && profileData.cv_text.trim());
  document.getElementById('cvUploadZone').classList.toggle('hidden', hasCv);
  document.getElementById('cvFileInfo').classList.toggle('hidden', !hasCv);
  document.getElementById('downloadCvBtn').classList.toggle('hidden', !hasCv);
  if (hasCv) {
    document.getElementById('cvFileName').textContent = profileData.cv_filename || 'CV on file';
  }
  document.getElementById('analyseCvBtn').disabled = !hasCv;
  if (profileData.cv_analysis) {
    renderCvResults(profileData.cv_analysis);
  } else {
    document.getElementById('downloadCvAnalysisBtn').classList.add('hidden');
  }
}

function resetCvUploadZone() {
  document.getElementById('cvUploadZone').classList.remove('hidden');
  document.getElementById('cvFileInfo').classList.add('hidden');
  document.getElementById('cvUploadStatus').classList.add('hidden');
  document.getElementById('cvUploadError').classList.add('hidden');
  document.getElementById('downloadCvBtn').classList.add('hidden');
  document.getElementById('downloadCvAnalysisBtn').classList.add('hidden');
  document.getElementById('cvAnalysisResults').classList.add('hidden');
  document.getElementById('analyseCvBtn').disabled = true;
}

function uploadCv(file) {
  const statusEl   = document.getElementById('cvUploadStatus');
  const stepEl     = document.getElementById('cvUploadStep');
  const trackEl    = document.getElementById('uploadProgressTrack');
  const fillEl     = document.getElementById('uploadProgressFill');
  const errorEl    = document.getElementById('cvUploadError');
  const errorMsgEl = document.getElementById('cvUploadErrorMsg');
  const fileInfoEl = document.getElementById('cvFileInfo');

  document.getElementById('cvUploadZone').classList.add('hidden');
  errorEl.classList.add('hidden');
  statusEl.classList.remove('hidden');
  trackEl.classList.add('hidden');
  stepEl.textContent = 'Uploading…';

  let scanInterval = null;
  let scanPct = 0;

  function setFill(pct) { fillEl.style.width = pct + '%'; }

  function startScanBar() {
    trackEl.classList.remove('hidden');
    fillEl.style.transition = 'none';
    setFill(0);
    fillEl.getBoundingClientRect(); // force reflow
    fillEl.style.transition = 'width 0.4s ease';
    scanPct = 0;
    scanInterval = setInterval(() => {
      const gap = 92 - scanPct;
      if (gap <= 0) return;
      scanPct = Math.min(92, scanPct + Math.max(0.5, gap * 0.04));
      setFill(scanPct);
    }, 300);
  }

  function endScanBar(ok) {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    setFill(ok ? 100 : 0);
  }

  function showError(msg) {
    endScanBar(false);
    setTimeout(() => {
      statusEl.classList.add('hidden');
      document.getElementById('cvUploadZone').classList.remove('hidden');
      errorEl.classList.remove('hidden');
      errorMsgEl.textContent = msg;
    }, 300);
  }

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('loadend', () => {
    stepEl.textContent = 'Scanning for viruses…';
    startScanBar();
  });

  xhr.onload = () => {
    try {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status >= 400) { showError(data.error || 'Upload failed. Please try again.'); return; }

      endScanBar(true);
      setTimeout(() => {
        profileData.cv_text = data.cv_text;
        profileData.cv_filename = data.cv_filename || file.name;
        profileData.cv_analysis = undefined;
        statusEl.classList.add('hidden');
        fileInfoEl.classList.remove('hidden');
        document.getElementById('cvFileName').textContent = profileData.cv_filename;
        document.getElementById('downloadCvBtn').classList.remove('hidden');
        document.getElementById('analyseCvBtn').disabled = false;
        document.getElementById('cvAnalysisResults').classList.add('hidden');
        document.getElementById('downloadCvAnalysisBtn').classList.add('hidden');
        analyzeCvSection();
      }, 500);
    } catch {
      showError('Upload failed. Please try again.');
    }
  };

  xhr.onerror = () => showError('Upload failed. Please check your connection and try again.');

  const fd = new FormData();
  fd.append('cv_file', file);
  xhr.open('POST', '/api/profile/upload-cv');
  xhr.send(fd);
}

function populateLinkedinForm() {
  const el = document.getElementById('linkedinUrl');
  if (el) el.value = profileData.linkedin_url ?? '';

  const statusEl = document.getElementById('cvLinkStatus');
  const btn = document.getElementById('analyseLinkedinBtn');
  const hasCv = !!(profileData.cv_text && profileData.cv_text.trim());

  statusEl.classList.remove('hidden', 'linked', 'missing');
  if (hasCv) {
    statusEl.classList.add('linked');
    statusEl.innerHTML = '✓ CV linked to your profile — recommendations will be personalised to your background.';
    btn.disabled = false;
  } else {
    statusEl.classList.add('missing');
    statusEl.innerHTML = '⚠ No CV uploaded yet. <a id="goToCvLink" href="#">Upload your CV in CV &amp; Analysis</a> first to get personalised recommendations.';
    btn.disabled = true;
    document.getElementById('goToCvLink').addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('cv-analysis');
    });
  }

  document.getElementById('linkedinAnalysisStatus').classList.add('hidden');
  if (profileData.linkedin_analysis) {
    renderLinkedinResults(profileData.linkedin_analysis);
  } else {
    document.getElementById('downloadLinkedinAnalysisBtn').classList.add('hidden');
  }
}

async function saveProfile(fields) {
  await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  await loadProfile();
}

function renderCvResults(data) {
  const panel = document.getElementById('cvAnalysisResults');
  if (!data || !panel) return;

  const skillsHtml = (data.skills ?? []).map(s => `<span class="skill-chip">${s}</span>`).join('');
  const expHtml = (data.experience ?? []).map(e => `<li>${e}</li>`).join('');
  const eduHtml = (data.education ?? []).map(e => `<li>${e}</li>`).join('');
  const gapsHtml = (data.gaps ?? []).map(g => `<li>${g}</li>`).join('');
  const atsHtml = (data.atsFeedback ?? []).map(a => `
    <div class="ats-item ${a.status}">
      <span class="ats-badge">${a.status}</span>
      <div class="ats-content">
        <span class="ats-item-label">${a.item}</span>
        ${a.suggestion ? `<span class="ats-item-suggestion">${a.suggestion}</span>` : ''}
      </div>
    </div>`).join('');

  panel.innerHTML = `
    <div class="results-section"><h3>Skills</h3><div class="skill-chips">${skillsHtml}</div></div>
    <div class="results-section"><h3>Experience</h3><ul class="results-list">${expHtml}</ul></div>
    <div class="results-section"><h3>Education</h3><ul class="results-list">${eduHtml}</ul></div>
    <div class="results-section"><h3>Profile Gaps</h3><ul class="results-list">${gapsHtml}</ul></div>
    <div class="results-section"><h3>ATS Feedback</h3><div class="ats-row">${atsHtml}</div></div>
  `;
  panel.classList.remove('hidden');
  document.getElementById('downloadCvAnalysisBtn').classList.remove('hidden');
}

function renderLinkedinResults(data) {
  const panel = document.getElementById('linkedinResults');
  if (!data || !panel) return;

  const noteHtml = data.note ? `<p class="analysis-note">${data.note}</p>` : '';
  const recsHtml = (data.recommendations ?? []).map(r => `
    <div class="recommendation-card">
      <div class="rec-header">
        <span class="rec-title">${r.title}</span>
        <span class="priority-badge ${r.priority}">${r.priority}</span>
      </div>
      <p class="rec-rationale">${r.rationale}</p>
    </div>`).join('');

  panel.innerHTML = noteHtml + recsHtml;
  panel.classList.remove('hidden');
  document.getElementById('downloadLinkedinAnalysisBtn').classList.remove('hidden');
}

async function analyzeCvSection() {
  const btn = document.getElementById('analyseCvBtn');
  const panel = document.getElementById('cvAnalysisResults');
  const statusEl = document.getElementById('cvAnalysisStatus');
  const fillEl = document.getElementById('analysisProgressFill');
  const stepEl = document.getElementById('cvAnalysisStep');

  btn.disabled = true;
  panel.classList.add('hidden');
  document.getElementById('downloadCvAnalysisBtn').classList.add('hidden');
  statusEl.classList.remove('hidden');

  const steps = ['Analysing your CV with AI…', 'Extracting skills and experience…', 'Checking ATS compatibility…', 'Building your report…'];
  let stepIdx = 0;
  let pct = 0;
  fillEl.style.transition = 'none';
  fillEl.style.width = '0%';
  fillEl.getBoundingClientRect();
  fillEl.style.transition = 'width 0.5s ease';
  stepEl.textContent = steps[0];

  const stepTimer = setInterval(() => {
    if (stepIdx < steps.length - 1) stepEl.textContent = steps[++stepIdx];
  }, 4000);

  const fillTimer = setInterval(() => {
    const gap = 90 - pct;
    if (gap <= 0) return;
    pct = Math.min(90, pct + Math.max(0.4, gap * 0.035));
    fillEl.style.width = pct + '%';
  }, 400);

  try {
    const data = await fetch('/api/profile/analyze-cv', { method: 'POST' }).then(r => r.json());
    clearInterval(stepTimer);
    clearInterval(fillTimer);

    if (data.error) {
      fillEl.style.width = '0%';
      statusEl.classList.add('hidden');
      alert(data.error);
      btn.disabled = false;
      return;
    }

    fillEl.style.width = '100%';
    setTimeout(() => {
      statusEl.classList.add('hidden');
      profileData.cv_analysis = data;
      renderCvResults(data);
      btn.disabled = false;
    }, 500);
  } catch {
    clearInterval(stepTimer);
    clearInterval(fillTimer);
    fillEl.style.width = '0%';
    statusEl.classList.add('hidden');
    alert('CV analysis failed. Please try again.');
    btn.disabled = false;
  }
}

async function analyzeLinkedinSection() {
  const btn = document.getElementById('analyseLinkedinBtn');
  const panel = document.getElementById('linkedinResults');
  const statusEl = document.getElementById('linkedinAnalysisStatus');
  const fillEl = document.getElementById('linkedinProgressFill');
  const stepEl = document.getElementById('linkedinAnalysisStep');

  btn.disabled = true;
  panel.classList.add('hidden');
  document.getElementById('downloadLinkedinAnalysisBtn').classList.add('hidden');
  statusEl.classList.remove('hidden');

  const steps = ['Analysing your LinkedIn profile…', 'Comparing with your CV…', 'Identifying optimisation opportunities…', 'Building your recommendations…'];
  let stepIdx = 0, pct = 0;
  fillEl.style.transition = 'none';
  fillEl.style.width = '0%';
  fillEl.getBoundingClientRect();
  fillEl.style.transition = 'width 0.5s ease';
  stepEl.textContent = steps[0];

  const stepTimer = setInterval(() => {
    if (stepIdx < steps.length - 1) stepEl.textContent = steps[++stepIdx];
  }, 4000);

  const fillTimer = setInterval(() => {
    const gap = 90 - pct;
    if (gap <= 0) return;
    pct = Math.min(90, pct + Math.max(0.4, gap * 0.035));
    fillEl.style.width = pct + '%';
  }, 400);

  try {
    const data = await fetch('/api/profile/analyze-linkedin', { method: 'POST' }).then(r => r.json());
    clearInterval(stepTimer);
    clearInterval(fillTimer);

    if (data.error) {
      fillEl.style.width = '0%';
      statusEl.classList.add('hidden');
      alert(data.error);
      btn.disabled = false;
      return;
    }

    fillEl.style.width = '100%';
    setTimeout(() => {
      statusEl.classList.add('hidden');
      profileData.linkedin_analysis = data;
      renderLinkedinResults(data);
      btn.disabled = false;
    }, 500);
  } catch {
    clearInterval(stepTimer);
    clearInterval(fillTimer);
    fillEl.style.width = '0%';
    statusEl.classList.add('hidden');
    alert('LinkedIn analysis failed. Please try again.');
    btn.disabled = false;
  }
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
  document.getElementById('jobPreferencesSection').classList.add('hidden');
  document.getElementById('cvAnalysisSection').classList.add('hidden');
  document.getElementById('linkedinSection').classList.add('hidden');
  document.getElementById('myCandidaturesSection').classList.add('hidden');
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

  // Profile sections
  const PROFILE_SECTION_IDS = {
    'job-preferences': 'jobPreferencesSection',
    'cv-analysis': 'cvAnalysisSection',
    'linkedin-analysis': 'linkedinSection',
    'my-candidatures': 'myCandidaturesSection',
  };

  if (section in PROFILE_SECTION_IDS) {
    if (!currentUser) {
      chatWindow.classList.add('visible');
      addBubble('model', 'Please **sign in with Google** to get started.');
      return;
    }
    const sectionId = PROFILE_SECTION_IDS[section];
    const sectionEl = document.getElementById(sectionId);
    sectionEl.classList.remove('hidden');
    if (section === 'my-candidatures') {
      showCandView('candListView');
      await loadCandidatures();
      return;
    }
    await loadProfile();
    if (section === 'job-preferences') populateJobPreferencesForm();
    if (section === 'cv-analysis') populateCvForm();
    if (section === 'linkedin-analysis') populateLinkedinForm();
    return;
  }

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

// Job Preferences form
document.getElementById('jobPreferencesForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await saveProfile(data);
  showToast('jobPrefToast');
});

// CV upload
document.getElementById('cvFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) uploadCv(file);
});

const cvZone = document.getElementById('cvUploadZone');
cvZone.addEventListener('dragover', e => { e.preventDefault(); cvZone.classList.add('dragover'); });
cvZone.addEventListener('dragleave', () => cvZone.classList.remove('dragover'));
cvZone.addEventListener('drop', e => {
  e.preventDefault();
  cvZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) uploadCv(file);
});

document.getElementById('cvReplaceBtn').addEventListener('click', resetCvUploadZone);
document.getElementById('cvRetryBtn').addEventListener('click', resetCvUploadZone);
document.getElementById('analyseCvBtn').addEventListener('click', analyzeCvSection);

// LinkedIn form
document.getElementById('linkedinForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await saveProfile(data);
  showToast('linkedinToast');
});

document.getElementById('analyseLinkedinBtn').addEventListener('click', analyzeLinkedinSection);

// ── Candidatures ──────────────────────────────────────────────

let candEditId = null;
let candCurrentData = null;

function showCandView(id) {
  ['candListView', 'candFormView', 'candResultsView'].forEach(v => {
    document.getElementById(v).classList.toggle('hidden', v !== id);
  });
}

async function loadCandidatures() {
  try {
    const data = await fetch('/api/candidatures').then(r => r.json());
    renderCandidatureList(data.candidatures || []);
  } catch {
    renderCandidatureList([]);
  }
}

function renderCandidatureList(candidatures) {
  const list = document.getElementById('candList');
  const empty = document.getElementById('candListEmpty');
  list.innerHTML = '';
  if (!candidatures || candidatures.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  candidatures.forEach(c => {
    const card = document.createElement('div');
    card.className = 'cand-list-card';
    card.style.cursor = 'pointer';
    const pct = c.match_pct;
    const badgeClass = pct >= 75 ? 'green' : pct >= 50 ? 'amber' : pct !== null ? 'red' : 'none';
    const matchText = pct !== null ? `${pct}%` : 'N/A';
    const stage = c.current_stage || c.status || '—';
    card.innerHTML = `
      <div class="cand-card-info">
        <div class="cand-card-role">${c.job_title}</div>
        <div class="cand-card-company">${c.company}</div>
        <div class="cand-card-stage">${stage}</div>
      </div>
      <div class="cand-card-right">
        <span class="match-badge ${badgeClass}">${matchText}</span>
        <div class="cand-card-actions">
          <button class="cand-card-action-btn" data-action="edit">Edit</button>
          <button class="cand-card-action-btn del" data-action="delete">Delete</button>
        </div>
      </div>`;
    card.addEventListener('click', e => {
      if (e.target.closest('.cand-card-actions')) return;
      viewCandidature(c.id);
    });
    card.querySelector('[data-action="edit"]').addEventListener('click', e => {
      e.stopPropagation();
      startEditCandidature(c);
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', e => {
      e.stopPropagation();
      deleteCandidature(c.id);
    });
    list.appendChild(card);
  });
}

async function viewCandidature(id) {
  try {
    const data = await fetch(`/api/candidatures/${id}`).then(r => r.json());
    if (data.error) { alert(data.error); return; }
    renderCandidatureResults(data);
    showCandView('candResultsView');
  } catch {
    alert('Failed to load candidature. Please try again.');
  }
}

async function deleteCandidature(id) {
  if (!confirm('Delete this candidature? This cannot be undone.')) return;
  try {
    await fetch(`/api/candidatures/${id}`, { method: 'DELETE' });
    if (candCurrentData?.id === id) candCurrentData = null;
    showCandView('candListView');
    await loadCandidatures();
  } catch {
    alert('Failed to delete. Please try again.');
  }
}

function startEditCandidature(candidature) {
  candEditId = candidature.id;
  const form = document.getElementById('candForm');
  form.job_url.value           = candidature.job_url       || '';
  form.company.value           = candidature.company       || '';
  form.job_title.value         = candidature.job_title     || '';
  form.seniority.value         = candidature.seniority     || '';
  form.location.value          = candidature.location      || '';
  form.work_mode.value         = candidature.work_mode     || '';
  form.industry.value          = candidature.industry      || '';
  form.labels.value            = (candidature.labels || []).join(', ');
  form.status.value            = candidature.status        || 'Applied';
  form.additional_info.value   = candidature.additional_info || '';
  document.getElementById('candSubmitBtn').textContent = 'Update';
  showCandView('candFormView');
}

async function updateCandidature(form) {
  const submitBtn = document.getElementById('candSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';
  try {
    const body = {};
    ['company', 'job_title', 'job_url', 'seniority', 'location', 'work_mode', 'industry', 'labels', 'status', 'additional_info']
      .forEach(f => { body[f] = form[f]?.value ?? ''; });
    const data = await fetch(`/api/candidatures/${candEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
    if (data.error) { alert(data.error); return; }
    candEditId = null;
    form.reset();
    submitBtn.textContent = 'Analyse & Save';
    renderCandidatureResults(data);
    showCandView('candResultsView');
  } catch {
    alert('Failed to update. Please try again.');
  } finally {
    submitBtn.disabled = false;
    if (candEditId) submitBtn.textContent = 'Update';
  }
}

async function submitCandidature(e) {
  e.preventDefault();
  if (candEditId) { await updateCandidature(e.target); return; }
  const form = e.target;
  const jobUrl = form.job_url.value.trim();
  if (!jobUrl) { alert('Please enter a job posting URL.'); return; }

  const statusEl = document.getElementById('candAnalysisStatus');
  const fillEl = document.getElementById('candProgressFill');
  const stepEl = document.getElementById('candAnalysisStep');
  const submitBtn = document.getElementById('candSubmitBtn');

  submitBtn.disabled = true;
  statusEl.classList.remove('hidden');

  const steps = ['Fetching job description…', 'Analysing company and role…', 'Matching against your profile…', 'Building recommendations…'];
  let stepIdx = 0, pct = 0;
  fillEl.style.transition = 'none';
  fillEl.style.width = '0%';
  fillEl.getBoundingClientRect();
  fillEl.style.transition = 'width 0.5s ease';
  stepEl.textContent = steps[0];

  const stepTimer = setInterval(() => { if (stepIdx < steps.length - 1) stepEl.textContent = steps[++stepIdx]; }, 4000);
  const fillTimer = setInterval(() => {
    const gap = 90 - pct;
    if (gap <= 0) return;
    pct = Math.min(90, pct + Math.max(0.4, gap * 0.035));
    fillEl.style.width = pct + '%';
  }, 400);

  try {
    const body = { job_url: jobUrl };
    ['company', 'job_title', 'seniority', 'location', 'work_mode', 'industry', 'labels', 'status', 'additional_info'].forEach(f => {
      const val = form[f]?.value?.trim();
      if (val) body[f] = val;
    });

    const data = await fetch('/api/candidatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());

    clearInterval(stepTimer);
    clearInterval(fillTimer);

    if (data.error) {
      fillEl.style.width = '0%';
      statusEl.classList.add('hidden');
      alert(data.error);
      submitBtn.disabled = false;
      return;
    }

    fillEl.style.width = '100%';
    setTimeout(() => {
      statusEl.classList.add('hidden');
      form.reset();
      submitBtn.disabled = false;
      renderCandidatureResults(data);
      showCandView('candResultsView');
    }, 500);
  } catch {
    clearInterval(stepTimer);
    clearInterval(fillTimer);
    fillEl.style.width = '0%';
    statusEl.classList.add('hidden');
    alert('Analysis failed. Please try again.');
    submitBtn.disabled = false;
  }
}

function renderCandidatureResults(data) {
  const { analysis, hasProfile } = data;
  candCurrentData = data;

  // Download link
  document.getElementById('candDownloadReportBtn').href = `/api/candidatures/${data.id}/download`;

  // Match hero — use DB match_pct (already stored), fall back to analysis if fresh from POST
  const pct = data.match_pct ?? analysis.matchPct;
  const matchPctEl = document.getElementById('candMatchPct');
  const circleEl = document.getElementById('candMatchCircle');
  if (pct !== null && pct !== undefined) {
    matchPctEl.textContent = pct + '%';
    circleEl.className = 'match-circle match-circle-' + (pct >= 75 ? 'green' : pct >= 50 ? 'amber' : 'red');
  } else {
    matchPctEl.textContent = 'N/A';
    circleEl.className = 'match-circle match-circle-none';
  }

  // Use DB fields (always accurate, even after edit)
  document.getElementById('candResultTitle').textContent = `${data.job_title} at ${data.company}`;
  const meta = [data.seniority || analysis.role.seniority, data.location || analysis.role.location, data.work_mode || analysis.role.workMode].filter(Boolean).join(' · ');
  document.getElementById('candResultMeta').textContent = meta;

  // No-profile banner
  const banner = document.getElementById('candNoProfileBanner');
  banner.classList.toggle('hidden', !!hasProfile);

  // Result panels
  const panels = document.getElementById('candResultPanels');
  panels.innerHTML = '';

  panels.appendChild(makeAnalysisCard('Company Overview', `
    <p><strong>${analysis.company.name}</strong> — ${analysis.company.summary}</p>
    <p class="card-meta">Industry: ${analysis.company.industry} · ${analysis.company.financialHealth}</p>
    ${analysis.company.recentNews && analysis.company.recentNews !== 'Not available' ? `<p class="card-meta">Recent: ${analysis.company.recentNews}</p>` : ''}
  `));

  const skillChips = (analysis.role.skills || []).map(s => `<span class="skill-chip">${s}</span>`).join('');
  panels.appendChild(makeAnalysisCard('Role Requirements', `
    <div class="skill-chips">${skillChips}</div>
    <div class="role-meta-row">
      <span><span class="role-meta-label">Experience</span><span class="role-meta-value">${analysis.role.experienceLevel || '—'}</span></span>
      <span><span class="role-meta-label">Salary</span><span class="role-meta-value">${analysis.role.salary || 'Not specified'}</span></span>
    </div>
  `));

  if (hasProfile && analysis.strengths?.length) panels.appendChild(makeAnalysisCard('Your Strengths', bulletList(analysis.strengths)));
  if (hasProfile && analysis.gaps?.length) panels.appendChild(makeAnalysisCard('Gaps to Address', bulletList(analysis.gaps)));
  if (hasProfile && analysis.differentiators?.length) panels.appendChild(makeAnalysisCard('Key Differentiators', bulletList(analysis.differentiators)));

  if (analysis.atsKeywords?.length) {
    const rows = analysis.atsKeywords.map(k =>
      `<tr><td class="ats-kw-keyword">${k.keyword}</td><td class="ats-kw-tip">${k.tip}</td></tr>`).join('');
    panels.appendChild(makeAnalysisCard('ATS Keywords', `
      <table class="ats-kw-table">
        <thead><tr><th>Keyword</th><th>How to use it</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`));
  }

  if (analysis.cvRecommendations?.length) panels.appendChild(makeAnalysisCard('CV Recommendations', bulletList(analysis.cvRecommendations)));
  if (analysis.linkedinRecommendations?.length) panels.appendChild(makeAnalysisCard('LinkedIn Recommendations', bulletList(analysis.linkedinRecommendations)));

  if (analysis.networkingGuidance?.length) {
    const card = makeAnalysisCard('Networking Guidance', bulletList(analysis.networkingGuidance));
    card.classList.add('networking-card');
    panels.appendChild(card);
  }

  document.getElementById('candTrackBtn').dataset.candidatureId = data.id;
}

function makeAnalysisCard(title, bodyHtml) {
  const card = document.createElement('div');
  card.className = 'analysis-card';
  card.innerHTML = `<h3 class="analysis-card-title">${title}</h3><div class="analysis-card-body">${bodyHtml}</div>`;
  return card;
}

function bulletList(items) {
  return `<ul class="results-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

async function prefillCandidatureForm(url) {
  const statusEl = document.getElementById('candPrefillStatus');
  const fillEl = document.getElementById('candPrefillFill');
  const stepEl = document.getElementById('candPrefillStep');

  statusEl.classList.remove('hidden');
  fillEl.style.transition = 'none';
  fillEl.style.width = '0%';
  fillEl.getBoundingClientRect();
  fillEl.style.transition = 'width 0.5s ease';
  stepEl.textContent = 'Fetching job description…';

  let pct = 0;
  const fillTimer = setInterval(() => {
    const gap = 90 - pct;
    if (gap <= 0) return;
    pct = Math.min(90, pct + Math.max(1, gap * 0.07));
    fillEl.style.width = pct + '%';
  }, 300);

  try {
    stepEl.textContent = 'Extracting job details with AI…';
    const data = await fetch('/api/candidatures/prefill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_url: url }),
    }).then(r => r.json());

    clearInterval(fillTimer);

    if (data.error) {
      fillEl.style.width = '0%';
      statusEl.classList.add('hidden');
      return;
    }

    const form = document.getElementById('candForm');
    if (data.company    && !form.company.value)        form.company.value    = data.company;
    if (data.job_title  && !form.job_title.value)      form.job_title.value  = data.job_title;
    if (data.location   && !form.location.value)       form.location.value   = data.location;
    if (data.industry   && !form.industry.value)       form.industry.value   = data.industry;
    if (data.seniority) {
      const opts = Array.from(form.seniority.options);
      const match = opts.find(o => o.value.toLowerCase() === data.seniority.toLowerCase());
      if (match && !form.seniority.value) form.seniority.value = match.value;
    }
    if (data.work_mode) {
      const opts = Array.from(form.work_mode.options);
      const match = opts.find(o => o.value.toLowerCase() === data.work_mode.toLowerCase());
      if (match && !form.work_mode.value) form.work_mode.value = match.value;
    }

    fillEl.style.width = '100%';
    stepEl.textContent = '✓ Form prefilled by AI — review and adjust if needed';
    setTimeout(() => statusEl.classList.add('hidden'), 3000);
  } catch {
    clearInterval(fillTimer);
    fillEl.style.width = '0%';
    statusEl.classList.add('hidden');
  }
}

// Candidature event listeners
document.getElementById('newCandBtn').addEventListener('click', () => {
  candEditId = null;
  document.getElementById('candForm').reset();
  document.getElementById('candSubmitBtn').textContent = 'Analyse & Save';
  showCandView('candFormView');
});
document.getElementById('candCancelBtn').addEventListener('click', () => {
  if (candEditId) {
    candEditId = null;
    document.getElementById('candSubmitBtn').textContent = 'Analyse & Save';
    showCandView('candResultsView');
  } else {
    showCandView('candListView');
  }
});
document.getElementById('candBackToListBtn').addEventListener('click', async () => {
  showCandView('candListView');
  await loadCandidatures();
});
document.getElementById('candBannerDismiss').addEventListener('click', () => {
  document.getElementById('candNoProfileBanner').classList.add('hidden');
});
document.getElementById('candForm').addEventListener('submit', submitCandidature);

let candPrefillTimer = null;
document.getElementById('candJobUrl').addEventListener('input', () => {
  clearTimeout(candPrefillTimer);
  const url = document.getElementById('candJobUrl').value.trim();
  if (!url.startsWith('http')) return;
  candPrefillTimer = setTimeout(() => prefillCandidatureForm(url), 1200);
});
document.getElementById('candEditBtn').addEventListener('click', () => {
  if (candCurrentData) startEditCandidature(candCurrentData);
});
document.getElementById('candDeleteBtn').addEventListener('click', () => {
  if (candCurrentData) deleteCandidature(candCurrentData.id);
});
document.getElementById('candTrackBtn').addEventListener('click', () => {
  addBubble('model', '**Selection Process tracker** is coming soon. Stay tuned!');
  navigateTo('home');
});

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
