/* MindScope front-end logic: analyze, batch, history, theme, modal */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const COND = {};
  (window.CONDITIONS || []).forEach(c => COND[c.name] = c);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const icon = n => `/static/images/${(COND[n] || {}).slug || 'normal'}.svg`;
  const color = n => (COND[n] || {}).color || '#6366f1';
  const safeGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- Theme ---------- */
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('mh-theme', next); } catch (e) {}
  });

  /* ---------- Mobile menu / back to top ---------- */
  $('#menuBtn').addEventListener('click', () => $('#navLinks').classList.toggle('open'));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));
  const toTop = $('#toTop');
  window.addEventListener('scroll', () => { toTop.hidden = window.scrollY < 600; });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Scroll reveal + count-up ---------- */
  $$('.card, .section-head').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, t0 = performance.now();
    (function tick(t) {
      const p = Math.min((t - t0) / 1200, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });

  /* ---------- Tabs ---------- */
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.toggle('active', x === t));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + t.dataset.tab));
  }));

  /* ---------- API helper ---------- */
  async function api(body) {
    const r = await fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }
  const busy = (btn, on) => { btn.disabled = on; $('.spinner', btn).hidden = !on; $('.btn-label', btn).style.opacity = on ? .6 : 1; };
  const show = (el, msg) => { el.textContent = msg; el.hidden = !msg; };

  /* ---------- Single analysis ---------- */
  const input = $('#tweetInput'), counter = $('#counter');
  const updateCounter = () => {
    const v = input.value.trim();
    counter.textContent = `${v ? v.split(/\s+/).length : 0} words · ${input.value.length} / 2000`;
  };
  input.addEventListener('input', updateCounter);
  input.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyze(); });
  $$('.chip').forEach(c => c.addEventListener('click', () => { input.value = c.dataset.sample; updateCounter(); input.focus(); }));
  $('#clearBtn').addEventListener('click', () => { input.value = ''; updateCounter(); $('#result').innerHTML = ''; show($('#alert'), ''); input.focus(); });
  $('#analyzeBtn').addEventListener('click', analyze);

  async function analyze() {
    const text = input.value.trim(), btn = $('#analyzeBtn');
    show($('#alert'), '');
    if (!text) { show($('#alert'), '⚠ Please enter a tweet to analyze.'); return; }
    busy(btn, true);
    try {
      const r = await api({ text });
      renderResult(r);
      addHistory({ text, label: r.label, conf: r.confidence, time: Date.now() });
    } catch (e) { $('#result').innerHTML = ''; show($('#alert'), '⚠ ' + e.message); }
    busy(btn, false);
  }

  function renderResult(r) {
    const c = COND[r.label] || {}, acc = c.color || '#6366f1';
    const sorted = Object.entries(r.probabilities).sort((a, b) => b[1] - a[1]);
    const support = ['Suicidal', 'Depression'].includes(r.label);
    $('#result').innerHTML = `
      <div class="result-card" style="--accent:${acc}">
        <div class="result-top">
          <img src="${icon(r.label)}" alt="">
          <div class="result-title">
            <span class="eyebrow">🧐 Predicted mental health status</span>
            <h3>${esc(r.label)}</h3>
            <p>${esc(c.desc || '')}</p>
          </div>
          <div class="ring" style="--p:${r.confidence}"><b>${Math.round(r.confidence)}%</b><small>confidence</small></div>
        </div>
        ${r.confidence < 45 ? '<div class="low-conf">ℹ️ The model is not very sure about this one. Try a longer, more descriptive text.</div>' : ''}
        <div class="bars">
          ${sorted.map(([n, p], i) => `
            <div class="bar-row ${i === 0 ? 'top' : ''}">
              <span>${esc(n)}</span>
              <div class="bar-track"><div class="bar-fill" data-w="${p}" style="background:${color(n)}"></div></div>
              <span class="bar-val">${p.toFixed(1)}%</span>
            </div>`).join('')}
        </div>
        ${support ? `<div class="crisis">💜 <strong>If this feels personal, you matter and help is available.</strong> India: Tele-MANAS <a href="tel:14416">14416</a> (24/7, free) · Elsewhere: <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a>. In immediate danger, call your local emergency number.</div>` : ''}
        <div class="tips"><h4>💡 Helpful tips</h4><ul>${(c.tips || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div class="result-actions"><button class="btn btn-ghost btn-sm" id="copyBtn">Copy result</button></div>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.bar-fill').forEach(b => b.style.width = b.dataset.w + '%')));
    $('#copyBtn').addEventListener('click', e => {
      const txt = `Predicted status: ${r.label} (${r.confidence.toFixed(1)}% confidence)`;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => e.target.textContent = 'Copied ✓').catch(() => e.target.textContent = txt);
    });
    $('#result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- Batch ---------- */
  let lastBatch = [];
  $('#batchClear').addEventListener('click', () => { $('#batchInput').value = ''; $('#batchResult').innerHTML = ''; show($('#batchAlert'), ''); });
  $('#batchSample').addEventListener('click', () => {
    $('#batchInput').value = [
      'I feel so anxious and my heart is racing before the exam, I cannot stop worrying',
      'Had a lovely day out with friends, the weather was great and we laughed a lot',
      'So much work and so many deadlines, I am completely overwhelmed and burnt out',
      'I feel empty and hopeless, nothing matters anymore and I am tired of everything',
      'My mood swings from extreme highs where I feel unstoppable to crushing lows within days'
    ].join('\n');
  });
  $('#batchBtn').addEventListener('click', async () => {
    const lines = $('#batchInput').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 200), btn = $('#batchBtn');
    show($('#batchAlert'), '');
    if (!lines.length) { show($('#batchAlert'), '⚠ Please enter at least one tweet.'); return; }
    busy(btn, true);
    try {
      const { results } = await api({ texts: lines });
      lastBatch = results; renderBatch(results);
    } catch (e) { show($('#batchAlert'), '⚠ ' + e.message); }
    busy(btn, false);
  });

  function renderBatch(rs) {
    if (!rs.length) { $('#batchResult').innerHTML = '<div class="empty">No readable text found.</div>'; return; }
    const counts = {}; rs.forEach(r => counts[r.label] = (counts[r.label] || 0) + 1);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let acc = 0;
    const stops = entries.map(([n, c]) => { const s = acc; acc += c / rs.length * 100; return `${color(n)} ${s}% ${acc}%`; }).join(',');
    $('#batchResult').innerHTML = `
      <div class="batch-summary">
        <div class="donut" style="background:conic-gradient(${stops})"><b>${rs.length}<small>tweets</small></b></div>
        <div class="legend">${entries.map(([n, c]) => `<div><i style="background:${color(n)}"></i><strong>${esc(n)}</strong> — ${c} (${Math.round(c / rs.length * 100)}%)</div>`).join('')}</div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Tweet</th><th>Status</th><th>Confidence</th></tr></thead>
        <tbody>${rs.map((r, i) => `<tr><td>${i + 1}</td><td class="tweet">${esc(r.text)}</td>
          <td><span class="badge" style="--accent:${color(r.label)}"><img src="${icon(r.label)}" alt="">${esc(r.label)}</span></td>
          <td>${r.confidence.toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>
      <div class="actions" style="margin-top:14px"><button class="btn btn-ghost btn-sm" id="batchExport">Download CSV</button></div>`;
    $('#batchExport').addEventListener('click', () => download('batch_results.csv', toCSV([['tweet', 'status', 'confidence'], ...rs.map(r => [r.text, r.label, r.confidence])])));
  }

  /* ---------- History ---------- */
  let history = safeGet('mh-history', []);
  function addHistory(item) { history.unshift(item); history = history.slice(0, 20); safeSet('mh-history', history); renderHistory(); }
  function renderHistory() {
    const box = $('#historyList');
    if (!history.length) { box.innerHTML = '<div class="empty">No analyses yet. Your results will show up here.</div>'; return; }
    box.innerHTML = history.map((h, i) => `
      <div class="card history-item" style="--accent:${color(h.label)}">
        <img src="${icon(h.label)}" alt="">
        <div><p>${esc(h.text)}</p><small>${new Date(h.time).toLocaleString()}</small></div>
        <span class="badge" style="padding-left:11px">${esc(h.label)} · ${Math.round(h.conf)}%</span>
        <button class="del" data-i="${i}" aria-label="Delete">✕</button>
      </div>`).join('');
    $$('.del', box).forEach(b => b.addEventListener('click', () => { history.splice(+b.dataset.i, 1); safeSet('mh-history', history); renderHistory(); }));
  }
  $('#clearHistory').addEventListener('click', () => { if (history.length && confirm('Clear all saved history?')) { history = []; safeSet('mh-history', history); renderHistory(); } });
  $('#exportHistory').addEventListener('click', () => {
    if (!history.length) return;
    download('history.csv', toCSV([['time', 'tweet', 'status', 'confidence'], ...history.map(h => [new Date(h.time).toISOString(), h.text, h.label, h.conf])]));
  });
  renderHistory();

  /* ---------- CSV helpers ---------- */
  const toCSV = rows => rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------- Condition modal ---------- */
  const modal = $('#modal');
  $$('.cond-card').forEach(card => card.addEventListener('click', () => {
    const c = Object.values(COND).find(x => x.slug === card.dataset.slug);
    $('#modalBody').innerHTML = `<div style="--accent:${c.color}"><img src="${icon(c.name)}" alt=""><h3 id="modalTitle">${esc(c.name)}</h3><p>${esc(c.desc)}</p>
      <h4>Helpful tips</h4><ul>${c.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    modal.hidden = false;
  }));
  const closeModal = () => { modal.hidden = true; };
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();
