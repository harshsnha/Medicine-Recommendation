(function initTheme() {
  const saved = localStorage.getItem('medrec-theme');
  document.documentElement.setAttribute('data-theme', saved || 'dark');
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('medrec-theme', next);
});

function buildDNA(container, rungCount) {
  if (!container) return;
  container.innerHTML = '';
  const R = 44;            // helix radius (px)
  const spacing = 18;      // vertical gap between rungs
  const angleStep = 42;    // degrees rotated per rung
  const totalHeight = rungCount * spacing;

  for (let i = 0; i < rungCount; i++) {
    const angle = i * angleStep;
    const y = i * spacing - totalHeight / 2;
    const rung = document.createElement('div');
    rung.className = 'dna-rung';
    rung.style.width = (R * 2) + 'px';
    rung.style.marginLeft = -R + 'px';
    rung.style.transform = `translateY(${y}px) rotateY(${angle}deg)`;

    const bar = document.createElement('div');
    bar.className = 'bar';
    const dotA = document.createElement('div');
    dotA.className = 'dna-dot a';
    const dotB = document.createElement('div');
    dotB.className = 'dna-dot b';

    rung.appendChild(bar);
    rung.appendChild(dotA);
    rung.appendChild(dotB);
    container.appendChild(rung);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  buildDNA(document.getElementById('hero-dna'), 16);
  buildDNA(document.getElementById('loader-dna'), 10);
});

/* ---------------- Scroll reveal ---------------- */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ---------------- Symptom hex chips ---------------- */
function addTag(el, val) {
  const inp = document.getElementById('symptom-input');
  const cur = inp.value.trim();
  if (el.classList.contains('active')) {
    el.classList.remove('active');
    inp.value = cur.split(',').map(s => s.trim()).filter(s => s && s !== val).join(', ');
    return;
  }
  el.classList.add('active');
  inp.value = cur ? cur + ', ' + val : val;
}

/* ---------------- Voice / dictate input ---------------- */
let recognition = null, listening = false;
function toggleVoice() {
  const btn = document.getElementById('voice-btn');
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showFlash('Speech recognition not supported in this browser');
    return;
  }
  if (listening) { recognition.stop(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';
  recognition.onstart = () => {
    listening = true;
    btn.classList.add('listening');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="9" y="9" width="6" height="6"/></svg> Listening…`;
  };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const inp = document.getElementById('symptom-input');
    inp.value = inp.value ? inp.value + ', ' + text : text;
  };
  recognition.onend = () => {
    listening = false;
    btn.classList.remove('listening');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Dictate symptoms`;
  };
  recognition.start();
}

/* ---------------- Predict form ---------------- */
function submitForm() {
  const val = document.getElementById('symptom-input').value.trim();
  if (!val) { showFlash('Please enter at least one symptom'); return; }
  document.getElementById('hidden-symptoms').value = val;
  document.getElementById('loader').classList.add('show');
  document.getElementById('predict-form').submit();
}

/* ---------------- Diagnosis web tab switching ---------------- */
function switchTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.web-lines line').forEach(l => l.classList.remove('lit'));

  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector(`.node[data-tab="${name}"]`).classList.add('active');
  const line = document.getElementById('line-' + name);
  if (line) line.classList.add('lit');
}

function showFlash(msg) {
  const f = document.getElementById('flash');
  f.textContent = msg; f.classList.add('show');
  setTimeout(() => f.classList.remove('show'), 3000);
}

/* ---------------- Render prediction results ---------------- */
function renderResults(data) {
  document.getElementById('results-heading').style.display = '';
  document.getElementById('results-sub').style.display = '';
  document.getElementById('pre-result-empty').style.display = 'none';
  document.getElementById('diagnosis-web').style.display = '';
  document.getElementById('panel-wrap').style.display = '';

  if (data.predicted_disease) {
    document.getElementById('disease-name').textContent = data.predicted_disease;
  }
  if (data.dis_des) document.getElementById('desc-text').textContent = data.dis_des;

  if (data.my_precautions) renderGrid('precaution-grid', data.my_precautions, '🛡');
  if (data.medications)    renderGrid('meds-grid', data.medications, '💊');
  if (data.workout)        renderGrid('workouts-grid', data.workout, '🏃');
  if (data.my_diet)        renderGrid('diets-grid', data.my_diet, '🥗');

  switchTab('disease');
  setTimeout(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth' }), 200);
}

function renderGrid(gridId, items, icon) {
  const g = document.getElementById(gridId);
  g.innerHTML = '';
  const arr = Array.isArray(items) ? items : [items];
  arr.forEach((item, idx) => {
    const s = String(item).trim();
    if (!s || s === 'nan') return;
    const card = document.createElement('div');
    card.className = 'mini-card';
    card.style.animationDelay = (idx * 0.06) + 's';
    card.innerHTML = `<div class="r-card-icon">${icon}</div><div class="r-card-title">${s}</div>`;
    g.appendChild(card);
  });
}

/* ---------------- Boot ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  if (window.__RESULT__) renderResults(window.__RESULT__);
});
