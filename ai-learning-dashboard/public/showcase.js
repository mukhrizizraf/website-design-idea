// AI Skill Shelf: renders window.SKILL_DATA (from skills.js) as an interactive showcase.
(() => {
  'use strict';
  const D = window.SKILL_DATA;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (!D) { $('#grid').innerHTML = '<p class="empty"><strong>Skills could not load.</strong>Keep skills.js next to this page.</p>'; return; }

  const cats = Object.fromEntries(D.categories.map(c => [c.id, c]));
  const size = s => (s.members ? s.members.length : 1);              // a pack counts every skill inside it
  const total = D.skills.reduce((n, s) => n + size(s), 0);
  const state = { cat: 'all', level: 'all', q: '' };
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

  // ---------- helpers ----------
  const levelChip = l => `<span class="chip ${l}"><i class="dot"></i>${esc(D.levels[l].label)}</span>`;
  const srcName = s => D.sources[s.src]?.name || 'Unknown';
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); }
    catch { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch {} a.remove(); }
    toast(done);
  }
  const pageUrl = () => location.href.split('#')[0];
  function matches(s) {
    if (state.cat !== 'all' && s.cat !== state.cat) return false;
    if (state.level !== 'all' && s.level !== state.level) return false;
    if (!state.q) return true;
    const hay = [s.title, s.id, s.what, ...(s.useFor || []), cats[s.cat]?.label, ...(s.members || []).flat()].join(' ').toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
  }

  // ---------- greeting ----------
  const h = new Date().getHours();
  $('#greeting').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  // ---------- sidebar categories ----------
  function renderNav() {
    const items = [{ id: 'all', label: 'All skills', icon: '🗂️', n: D.skills.length },
      ...D.categories.map(c => ({ ...c, n: D.skills.filter(s => s.cat === c.id).length }))];
    $('#cat-nav').innerHTML = items.map(c => `<button class="nav-btn" type="button" data-cat="${c.id}" aria-current="${state.cat === c.id}"><span class="ic" aria-hidden="true">${c.icon}</span>${esc(c.label)}<span class="n">${c.n}</span></button>`).join('');
  }

  // ---------- KPI tiles ----------
  function renderKpis() {
    const packs = D.skills.filter(s => s.members).length;
    const easy = D.skills.filter(s => s.level === 'easy').length;
    const linked = new Set(D.skills.filter(s => D.sources[s.src]?.url).map(s => s.src)).size;
    const tiles = [
      ['📚', 'Skills collected', total, `${D.skills.length} cards`],
      ['🌱', 'Easy to start', easy, 'no tech needed'],
      ['📦', 'Skill packs', packs, 'several skills in one'],
      ['🐙', 'GitHub sources', linked, 'linked on each card']
    ];
    $('#kpis').innerHTML = tiles.map(([ic, label, n, note]) => `<div class="kpi glass-card"><div class="k-top"><span>${label}</span><span class="k-ic" aria-hidden="true">${ic}</span></div><strong>${n}</strong><span class="chip">${note}</span></div>`).join('');
  }

  // ---------- level filter ----------
  function renderLevels() {
    const opts = [['all', 'All levels'], ...Object.entries(D.levels).map(([k, v]) => [k, v.label])];
    $('#levels').innerHTML = opts.map(([k, label]) => `<button type="button" data-level="${k}" aria-pressed="${state.level === k}" title="${esc(D.levels[k]?.hint || 'Show every skill')}">${label}</button>`).join('');
  }

  // ---------- cards ----------
  function card(s, i) {
    return `<button class="card" type="button" data-skill="${s.id}" style="--i:${i}">
      <span class="c-top"><span class="c-ic" aria-hidden="true">${s.icon}</span>${s.members ? `<span class="chip blue">📦 ${s.members.length} skills</span>` : s.builtIn ? '<span class="chip blue">Built in</span>' : ''}</span>
      <h3>${esc(s.title)}</h3>
      <span class="c-slug">${s.members ? 'skill pack' : '/' + esc(s.id)}</span>
      <p>${esc(s.what)}</p>
      <span class="c-foot">${levelChip(s.level)}<span class="chip">${cats[s.cat].icon} ${esc(cats[s.cat].label)}</span></span>
    </button>`;
  }
  function renderGrid() {
    const list = D.skills.filter(matches);
    $('#count').textContent = `${list.length} of ${D.skills.length} cards`;
    $('#grid').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty"><strong>No skills match</strong>Try another word or clear the filters.<br><button class="btn" type="button" id="clear">Clear filters</button></div>`;
  }

  // ---------- widgets ----------
  function renderWidgets() {
    const counts = D.categories.map(c => ({ c, n: D.skills.filter(s => s.cat === c.id).reduce((a, s) => a + size(s), 0) }));
    const max = Math.max(...counts.map(x => x.n));
    $('#w-cats').innerHTML = `<div class="w-head"><span>Skills per category</span><span aria-hidden="true">📊</span></div>
      <div class="w-big">${total}</div><div class="w-sub">Packs count every skill inside. Tap a bar to filter.</div>
      <div class="bars">${counts.map(({ c, n }) => `<button class="bar" type="button" data-cat="${c.id}" aria-pressed="${state.cat === c.id}" aria-label="${esc(c.label)}: ${n} skills"><span class="tip">${esc(c.label)} · ${n}</span><span class="fill" style="height:${Math.max(10, n / max * 100)}%"></span><span class="lbl" aria-hidden="true">${c.icon}</span></button>`).join('')}</div>`;

    const bySrc = {};
    D.skills.forEach(s => { bySrc[s.src] = (bySrc[s.src] || 0) + size(s); });
    const rows = Object.entries(bySrc).sort((a, b) => b[1] - a[1]);
    const top = rows[0][1];
    $('#w-sources').innerHTML = `<div class="w-head"><span>Where they come from</span><span aria-hidden="true">🌍</span></div>
      <ul class="src-list">${rows.map(([k, n]) => { const src = D.sources[k]; const name = src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.name)} ↗</a>` : esc(src.name);
        return `<li class="src-row"><div class="top"><span>${name}</span><span class="n">${n}</span></div><div class="meter"><i style="width:${n / top * 100}%"></i></div></li>`; }).join('')}</ul>`;

    const feat = D.featured.map(id => D.skills.find(s => s.id === id)).filter(Boolean);
    $('#w-featured').innerHTML = `<div class="w-head"><span>Try these first</span><span aria-hidden="true">⭐</span></div>
      <ul class="feat-list">${feat.map(s => `<li><button class="feat" type="button" data-skill="${s.id}"><span class="c-ic" aria-hidden="true">${s.icon}</span><span><strong>${esc(s.title)}</strong><small>${esc(s.useFor[0])}</small></span></button></li>`).join('')}</ul>`;
  }

  // ---------- detail window ----------
  function openSkill(id, push = true) {
    const s = D.skills.find(x => x.id === id);
    if (!s) return;
    const src = D.sources[s.src];
    const cmd = s.members ? `/${s.members[0][0]}` : `/${s.id}`;
    const app = s.builtIn
      ? 'Already built in. Just ask for what you want, like the example below.'
      : `Get the skill${s.members ? ' pack' : ''} from ${src.url ? 'its GitHub page' : 'its source'}, zip the folder, and upload it under <em>Settings → Capabilities → Skills</em>. Then just ask.`;
    $('#detail-body').innerHTML = `<div class="d-inner">
      <div class="d-top"><span class="c-ic" aria-hidden="true">${s.icon}</span>
        <div><h2 id="d-title">${esc(s.title)}</h2><div class="d-chips">${levelChip(s.level)}<span class="chip">${cats[s.cat].icon} ${esc(cats[s.cat].label)}</span><span class="chip">From: ${esc(src.name)}</span>${s.builtIn ? '<span class="chip blue">Built into Claude</span>' : ''}</div></div>
        <button class="close" type="button" data-close aria-label="Close">×</button></div>
      <p class="d-what">${esc(s.what)}</p>
      <div class="d-sec"><h3>Good for</h3><ul class="uses">${s.useFor.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>
      <div class="d-sec"><h3>Try saying</h3><div class="say"><p>“${esc(s.say)}”</p><button class="btn primary" type="button" data-copy="${esc(s.say)}">Copy</button></div></div>
      <div class="d-sec"><h3>How to use it</h3><div class="how">
        <div class="how-card"><h3>💻 In Claude Code</h3><p>Just ask in normal words and Claude picks the skill. Or type <code>${esc(cmd)}</code> to start it directly.</p></div>
        <div class="how-card"><h3>💬 In the Claude app</h3><p>${app}</p></div></div>
        <p class="d-note">${esc(D.levels[s.level].hint)}</p></div>
      ${s.members ? `<div class="d-sec"><h3>Inside this pack (${s.members.length})</h3><ul class="members">${s.members.map(([n, t]) => `<li><code>/${esc(n)}</code><br>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      <div class="d-foot">${src.url ? `<a class="btn primary" href="${esc(src.url)}" target="_blank" rel="noopener">Get it on GitHub ↗</a>` : ''}<button class="btn" type="button" data-share="${s.id}">🔗 Copy link to this skill</button></div>
    </div>`;
    const dlg = $('#detail');
    if (!dlg.open) dlg.showModal();
    if (push) history.replaceState(null, '', '#skill=' + s.id);
  }
  function closeDetail() { if ($('#detail').open) $('#detail').close(); }
  $('#detail').addEventListener('close', () => { if (location.hash.startsWith('#skill=')) history.replaceState(null, '', location.pathname + location.search); });
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  // ---------- events ----------
  function rerender() { renderNav(); renderLevels(); renderGrid(); renderWidgets(); }
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.cat) { state.cat = state.cat === t.dataset.cat && t.classList.contains('bar') ? 'all' : t.dataset.cat; rerender(); }
    else if (t.dataset.level) { state.level = t.dataset.level; rerender(); }
    else if (t.dataset.skill) openSkill(t.dataset.skill);
    else if (t.dataset.copy !== undefined) copy(t.dataset.copy, 'Copied. Paste it into Claude.');
    else if (t.dataset.share) copy(pageUrl() + '#skill=' + t.dataset.share, 'Link copied. Send it to a friend.');
    else if (t.hasAttribute('data-close')) t.closest('dialog').close();
    else if (t.id === 'clear') { state.cat = 'all'; state.level = 'all'; state.q = ''; $('#q').value = ''; rerender(); }
    else if (t.id === 'open-guide') $('#guide').showModal();
    else if (t.id === 'share-page') copy(pageUrl(), 'Page link copied.');
    else if (t.id === 'intro-close') { $('#intro').hidden = true; store.set('shelf-intro-hidden', '1'); }
  });
  $('#q').addEventListener('input', e => { state.q = e.target.value.trim(); renderGrid(); });
  window.addEventListener('hashchange', () => { const m = /^#skill=([\w-]+)/.exec(location.hash); if (m) openSkill(m[1], false); else closeDetail(); });

  // ---------- start ----------
  if (store.get('shelf-intro-hidden') === '1') $('#intro').hidden = true;
  renderKpis();
  rerender();
  const start = /^#skill=([\w-]+)/.exec(location.hash);
  if (start) openSkill(start[1], false);
})();
