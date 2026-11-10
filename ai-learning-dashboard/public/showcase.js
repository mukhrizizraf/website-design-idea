// AI Skill Shelf: renders window.SKILL_DATA (from skills.js) as an interactive showcase.
(() => {
  'use strict';
  const D = window.SKILL_DATA;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (!D) { $('#grid').innerHTML = '<p class="empty"><strong>Skills could not load.</strong>Keep skills.js next to this page.</p>'; return; }

  // Thin line icons (Lucide-style), white on glass like the reference video.
  const P = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
    palette: 'M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22Z M7.5 10.5h.01 M12 7.5h.01 M16.5 10.5h.01',
    sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z',
    pen: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h6',
    code: 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
    cpu: 'M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
    sprout: 'M7 20h10 M12 20v-8 M12 12c0-4 3-7 8-7 0 5-3 8-8 7Z M12 13c0-3-2-5-6-5 0 4 2 6 6 5Z',
    box: 'M21 8l-9-5-9 5 9 5 9-5Z M3 8v8l9 5 9-5V8 M12 13v8',
    branch: 'M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 9a9 9 0 0 1-9 9',
    chart: 'M3 3v18h18 M7 16v-5 M12 16V8 M17 16V7',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20',
    star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z',
    terminal: 'M4 17l6-6-6-6 M12 19h8',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
    link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
    copy: 'M9 9h11v11H9z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    arrow: 'M7 17L17 7 M8 7h9v9'
  };
  const svg = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name] || P.grid}"/></svg>`;
  const catIcon = { design: 'palette', motion: 'sparkles', writing: 'pen', docs: 'file', coding: 'code', workflow: 'cpu' };
  const tile = (cat, cls = 'c-ic') => `<span class="${cls}" data-cat="${cat}" aria-hidden="true">${svg(catIcon[cat])}</span>`;

  const cats = Object.fromEntries(D.categories.map(c => [c.id, c]));
  const size = s => (s.members ? s.members.length : 1);              // a pack counts every skill inside it
  const total = D.skills.reduce((n, s) => n + size(s), 0);
  const isNew = s => s.added && (Date.now() - new Date(s.added + 'T00:00:00').getTime()) < 30 * 864e5;
  const ordered = [...D.skills].sort((a, b) => (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0)); // new skills first, rest keep file order
  const state = { cat: 'all', level: 'all', q: '' };
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

  // ---------- helpers ----------
  const levelChip = l => `<span class="chip ${l}"><i class="dot"></i>${esc(D.levels[l].label)}</span>`;
  const catChip = c => `<span class="chip cat">${svg(catIcon[c], 'i sm')}<span class="t">${esc(cats[c].label)}</span></span>`;
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
    const items = [{ id: 'all', label: 'All skills', icon: 'grid', n: D.skills.length },
      ...D.categories.map(c => ({ id: c.id, label: c.label, icon: catIcon[c.id], n: D.skills.filter(s => s.cat === c.id).length }))];
    $('#cat-nav').innerHTML = items.map(c => `<button class="nav-btn" type="button" data-cat="${c.id}" aria-current="${state.cat === c.id}">${svg(c.icon)}<span class="nl">${esc(c.label)}</span><span class="n">${c.n}</span></button>`).join('');
    // Phone tab bar: the active tab's icon lifts into a glowing circle.
    const short = Object.fromEntries(D.categories.map(c => [c.id, c.short || c.label]));
    $('#tabbar').innerHTML = items.map(c => `<button class="tab" type="button" data-cat="${c.id}" aria-current="${state.cat === c.id}" aria-label="${esc(c.label)}"><span class="t-ic">${svg(c.icon)}</span><span class="t-lb">${esc(c.id === 'all' ? 'All' : short[c.id])}</span></button>`).join('');
  }

  // ---------- KPI tiles ----------
  function renderKpis() {
    const packs = D.skills.filter(s => s.members).length;
    const easy = D.skills.filter(s => s.level === 'easy').length;
    const linked = new Set(D.skills.filter(s => D.sources[s.src]?.url).map(s => s.src)).size;
    const tiles = [
      ['book', 'Skills collected', total, `${D.skills.length} cards`],
      ['sprout', 'Easy to start', easy, 'no tech needed'],
      ['box', 'Skill packs', packs, 'several skills in one'],
      ['branch', 'GitHub sources', linked, 'linked on each card']
    ];
    $('#kpis').innerHTML = tiles.map(([ic, label, n, note]) => `<div class="kpi glass-card"><div class="k-top"><span>${label}</span><span class="k-ic">${svg(ic)}</span></div><strong>${n}</strong><span class="chip">${note}</span></div>`).join('');
  }

  // ---------- level filter ----------
  function renderLevels() {
    const opts = [['all', 'All levels'], ...Object.entries(D.levels).map(([k, v]) => [k, v.label])];
    $('#levels').innerHTML = opts.map(([k, label]) => `<button type="button" data-level="${k}" aria-pressed="${state.level === k}" title="${esc(D.levels[k]?.hint || 'Show every skill')}">${label}</button>`).join('');
  }

  // ---------- cards ----------
  function card(s, i) {
    const badge = isNew(s) ? '<span class="chip new">New</span>' : s.members ? `<span class="chip blue">${svg('box', 'i sm')}${s.members.length} skills</span>` : s.builtIn ? '<span class="chip blue">Built in</span>' : '';
    return `<button class="card" type="button" data-skill="${s.id}" data-cat="${s.cat}" style="--i:${i}">
      <span class="c-top">${tile(s.cat)}${badge}</span>
      <h3>${esc(s.title)}</h3>
      <span class="c-slug">${s.members ? 'skill pack' : '/' + esc(s.id)}</span>
      <p>${esc(s.what)}</p>
      <span class="c-foot">${levelChip(s.level)}${catChip(s.cat)}</span>
    </button>`;
  }
  function renderGrid() {
    const list = ordered.filter(matches);
    $('#count').textContent = `${list.length} of ${D.skills.length} cards`;
    $('#grid').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty"><strong>No skills match</strong>Try another word or clear the filters.<br><button class="btn" type="button" id="clear">Clear filters</button></div>`;
  }

  // ---------- widgets ----------
  function renderWidgets() {
    const counts = D.categories.map(c => ({ c, n: D.skills.filter(s => s.cat === c.id).reduce((a, s) => a + size(s), 0) }));
    const max = Math.max(...counts.map(x => x.n));
    $('#w-cats').innerHTML = `<div class="w-head"><span>Skills per category</span>${svg('chart')}</div>
      <div class="w-big">${total}</div><div class="w-sub">Packs count every skill inside. Tap a bar to filter.</div>
      <div class="bars">${counts.map(({ c, n }) => `<button class="bar" type="button" data-cat="${c.id}" aria-pressed="${state.cat === c.id}" aria-label="${esc(c.label)}: ${n} skills"><span class="tip">${esc(c.label)} · ${n}</span><span class="fill" style="height:${Math.max(10, n / max * 100)}%"></span><span class="lbl">${svg(catIcon[c.id], 'i sm')}</span></button>`).join('')}</div>`;

    const bySrc = {};
    D.skills.forEach(s => { bySrc[s.src] = (bySrc[s.src] || 0) + size(s); });
    const rows = Object.entries(bySrc).sort((a, b) => b[1] - a[1]);
    const top = rows[0][1];
    $('#w-sources').innerHTML = `<div class="w-head"><span>Where they come from</span>${svg('globe')}</div>
      <ul class="src-list">${rows.map(([k, n]) => { const src = D.sources[k]; const name = src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.name)}${svg('arrow', 'i xs')}</a>` : esc(src.name);
        return `<li class="src-row"><div class="top"><span>${name}</span><span class="n">${n}</span></div><div class="meter"><i style="width:${n / top * 100}%"></i></div></li>`; }).join('')}</ul>`;

    const feat = D.featured.map(id => D.skills.find(s => s.id === id)).filter(Boolean);
    $('#w-featured').innerHTML = `<div class="w-head"><span>Try these first</span>${svg('star')}</div>
      <ul class="feat-list">${feat.map(s => `<li><button class="feat" type="button" data-skill="${s.id}">${tile(s.cat)}<span class="f-txt"><strong><span class="t">${esc(s.title)}</span>${isNew(s) ? '<span class="chip new">New</span>' : ''}</strong><small>${esc(s.useFor[0])}</small></span></button></li>`).join('')}</ul>`;
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
      <div class="d-top">${tile(s.cat, 'c-ic lg')}
        <div><h2 id="d-title">${esc(s.title)}</h2><div class="d-chips">${isNew(s) ? '<span class="chip new">New</span>' : ''}${levelChip(s.level)}${catChip(s.cat)}<span class="chip">From: ${esc(src.name)}</span>${s.builtIn ? '<span class="chip blue">Built into Claude</span>' : ''}</div></div>
        <button class="close" type="button" data-close aria-label="Close">×</button></div>
      <p class="d-what">${esc(s.what)}</p>
      <div class="d-sec"><h3>Good for</h3><ul class="uses">${s.useFor.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>
      <div class="d-sec"><h3>Try saying</h3><div class="say"><p>“${esc(s.say)}”</p><button class="btn primary" type="button" data-copy="${esc(s.say)}">${svg('copy', 'i sm')}Copy</button></div></div>
      <div class="d-sec"><h3>How to use it</h3><div class="how">
        <div class="how-card"><h3>${svg('terminal', 'i sm')}In Claude Code</h3><p>Just ask in normal words and Claude picks the skill. Or type <code>${esc(cmd)}</code> to start it directly.</p></div>
        <div class="how-card"><h3>${svg('chat', 'i sm')}In the Claude app</h3><p>${app}</p></div></div>
        <p class="d-note">${esc(D.levels[s.level].hint)}</p></div>
      ${s.members ? `<div class="d-sec"><h3>Inside this pack (${s.members.length})</h3><ul class="members">${s.members.map(([n, t]) => `<li><code>/${esc(n)}</code><br>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      <div class="d-foot">${src.url ? `<a class="btn primary" href="${esc(src.url)}" target="_blank" rel="noopener">Get it on GitHub${svg('arrow', 'i sm')}</a>` : ''}<button class="btn" type="button" data-share="${s.id}">${svg('link', 'i sm')}Copy link to this skill</button></div>
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
    if (t.dataset.skill) openSkill(t.dataset.skill);
    else if (t.dataset.cat) { state.cat = state.cat === t.dataset.cat && t.classList.contains('bar') ? 'all' : t.dataset.cat; rerender(); }
    else if (t.dataset.level) { state.level = t.dataset.level; rerender(); }
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
