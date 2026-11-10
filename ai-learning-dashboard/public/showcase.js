// AI Skill Shelf: renders window.SKILL_DATA (from skills.js) as an interactive showcase.
(() => {
  'use strict';
  const D = window.SKILL_DATA;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (!D) { $('#grid').innerHTML = '<p class="empty"><strong>Skills could not load.</strong>Keep skills.js next to this page.</p>'; return; }

  const icon = (name, size = 'i') => `<span class="${size} shelf-icon shelf-icon--${name}" aria-hidden="true"></span>`;
  const catIcon = { design: 'palette', motion: 'sparkles', writing: 'pen', docs: 'file', coding: 'code', workflow: 'cpu' };
  const tile = (cat, cls = 'c-ic') => `<span class="${cls}" data-cat="${cat}" aria-hidden="true">${icon(catIcon[cat])}</span>`;

  const cats = Object.fromEntries(D.categories.map(c => [c.id, c]));
  const collections = D.collections || [];
  const size = s => (s.members ? s.members.length : 1);              // a pack counts every skill inside it
  const total = D.skills.reduce((n, s) => n + size(s), 0);
  const isNew = s => s.added && (Date.now() - new Date(s.added + 'T00:00:00').getTime()) < 30 * 864e5;
  const orderedSkills = [...D.skills].sort((a, b) => (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0));
  const ordered = [...collections, ...orderedSkills];
  const state = { cat: 'all', level: 'all', q: '' };
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

  // ---------- helpers ----------
  const levelChip = l => `<span class="chip ${l}"><i class="dot"></i>${esc(D.levels[l].label)}</span>`;
  const catChip = c => `<span class="chip cat">${icon(catIcon[c], 'i sm')}<span class="t">${esc(cats[c].label)}</span></span>`;
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
    const lessonTopics = s.lessons?.flatMap(lesson => [lesson.title, lesson.summary]) || [];
    const hay = [s.title, s.id, s.what, ...(s.useFor || []), cats[s.cat]?.label, ...(s.members || []).flat(), ...lessonTopics].join(' ').toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
  }

  // ---------- greeting ----------
  const h = new Date().getHours();
  $('#greeting').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  // ---------- sidebar categories ----------
  function renderNav() {
    const items = [{ id: 'all', label: 'All skills', icon: 'grid', n: ordered.length },
      ...D.categories.map(c => ({ id: c.id, label: c.label, icon: catIcon[c.id], n: ordered.filter(s => s.cat === c.id).length }))];
    $('#cat-nav').innerHTML = items.map(c => `<button class="nav-btn" type="button" data-cat="${c.id}" aria-current="${state.cat === c.id}">${icon(c.icon)}<span class="nl">${esc(c.label)}</span><span class="n">${c.n}</span></button>`).join('');
    // Phone tab bar: the active tab's icon lifts into a glowing circle.
    const short = Object.fromEntries(D.categories.map(c => [c.id, c.short || c.label]));
    $('#tabbar').innerHTML = items.map(c => `<button class="tab" type="button" data-cat="${c.id}" aria-current="${state.cat === c.id}" aria-label="${esc(c.label)}"><span class="t-ic">${icon(c.icon)}</span><span class="t-lb">${esc(c.id === 'all' ? 'All' : short[c.id])}</span></button>`).join('');
  }

  // ---------- KPI tiles ----------
  function renderKpis() {
    const packs = D.skills.filter(s => s.members).length;
    const easy = D.skills.filter(s => s.level === 'easy').length;
    const linked = new Set(D.skills.filter(s => D.sources[s.src]?.url).map(s => s.src)).size;
    const tiles = [
      ['book', 'Skills collected', total, `${ordered.length} cards`],
      ['sprout', 'Easy to start', easy, 'no tech needed'],
      ['box', 'Skill packs', packs, 'several skills in one'],
      ['branch', 'GitHub sources', linked, 'linked on each card']
    ];
    $('#kpis').innerHTML = tiles.map(([ic, label, n, note]) => `<div class="kpi glass-card"><div class="k-top"><span>${label}</span><span class="k-ic">${icon(ic)}</span></div><strong>${n}</strong><span class="chip">${note}</span></div>`).join('');
  }

  // ---------- level filter ----------
  function renderLevels() {
    const opts = [['all', 'All levels'], ...Object.entries(D.levels).map(([k, v]) => [k, v.label])];
    $('#levels').innerHTML = opts.map(([k, label]) => `<button type="button" data-level="${k}" aria-pressed="${state.level === k}" title="${esc(D.levels[k]?.hint || 'Show every skill')}">${label}</button>`).join('');
  }

  // ---------- cards ----------
  function card(s, i) {
    if (s.lessons) return `<button class="card" type="button" data-skill="${esc(s.id)}" data-cat="${esc(s.cat)}" style="--i:${i}">
      <span class="c-top">${tile(s.cat)}<span class="chip blue">${s.lessons.length} ideas</span></span>
      <h3>${esc(s.title)}</h3>
      <span class="c-slug">Lesson collection</span>
      <p>${esc(s.what)}</p>
      <span class="c-foot">${catChip(s.cat)}</span>
    </button>`;
    const badge = isNew(s) ? '<span class="chip new">New</span>' : s.members ? `<span class="chip blue">${icon('box', 'i sm')}${s.members.length} skills</span>` : s.builtIn ? '<span class="chip blue">Built in</span>' : '';
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
    $('#count').textContent = `${list.length} of ${ordered.length} cards`;
    $('#grid').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty"><strong>No skills match</strong>Try another word or clear the filters.<br><button class="btn" type="button" id="clear">Clear filters</button></div>`;
  }

  // ---------- widgets ----------
  function renderWidgets() {
    const counts = D.categories.map(c => ({ c, n: D.skills.filter(s => s.cat === c.id).reduce((a, s) => a + size(s), 0) }));
    const max = Math.max(...counts.map(x => x.n));
    $('#w-cats').innerHTML = `<div class="w-head"><span>Skills per category</span>${icon('chart')}</div>
      <div class="w-big">${total}</div><div class="w-sub">Packs count every skill inside. Tap a bar to filter.</div>
      <div class="bars">${counts.map(({ c, n }) => `<button class="bar" type="button" data-cat="${c.id}" aria-pressed="${state.cat === c.id}" aria-label="${esc(c.label)}: ${n} skills"><span class="tip">${esc(c.label)} · ${n}</span><span class="fill" style="height:${Math.max(10, n / max * 100)}%"></span><span class="lbl">${icon(catIcon[c.id], 'i sm')}</span></button>`).join('')}</div>`;

    const bySrc = {};
    D.skills.forEach(s => { bySrc[s.src] = (bySrc[s.src] || 0) + size(s); });
    const rows = Object.entries(bySrc).sort((a, b) => b[1] - a[1]);
    const top = rows[0][1];
    $('#w-sources').innerHTML = `<div class="w-head"><span>Where they come from</span>${icon('globe')}</div>
      <ul class="src-list">${rows.map(([k, n]) => { const src = D.sources[k]; const name = src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.name)}${icon('arrow', 'i xs')}</a>` : esc(src.name);
        return `<li class="src-row"><div class="top"><span>${name}</span><span class="n">${n}</span></div><div class="meter"><i style="width:${n / top * 100}%"></i></div></li>`; }).join('')}</ul>`;

    const feat = D.featured.map(id => D.skills.find(s => s.id === id)).filter(Boolean);
    $('#w-featured').innerHTML = `<div class="w-head"><span>Try these first</span>${icon('star')}</div>
      <ul class="feat-list">${feat.map(s => `<li><button class="feat" type="button" data-skill="${s.id}">${tile(s.cat)}<span class="f-txt"><strong><span class="t">${esc(s.title)}</span>${isNew(s) ? '<span class="chip new">New</span>' : ''}</strong><small>${esc(s.useFor[0])}</small></span></button></li>`).join('')}</ul>`;
  }

  // ---------- detail window ----------
  function showDetail(id, push) {
    const dialog = $('#detail');
    if (!dialog.open) dialog.showModal();
    if (push) history.replaceState(null, '', '#skill=' + id);
  }

  function openCollection(collection, push) {
    const bullets = items => items.map(item => `<li>${esc(item)}</li>`).join('');
    $('#detail-body').innerHTML = `<div class="d-inner">
      <div class="d-top">${tile(collection.cat, 'c-ic lg')}
        <div><h2 id="d-title">${esc(collection.title)}</h2><div class="d-chips"><span class="chip blue">${collection.lessons.length} ideas</span>${catChip(collection.cat)}</div></div>
        <button class="close" type="button" data-close aria-label="Close">${icon('close')}</button>
      </div>
      <p class="d-what">${esc(collection.what)}</p>
      <div class="collection-lessons">
        ${collection.lessons.map(lesson => `<details class="collection-lesson">
          <summary>${icon('play', 'i sm')}<span><strong>${esc(lesson.title)}</strong><small>${esc(lesson.source)}</small></span></summary>
          <p>${esc(lesson.summary)}</p>
          <h3>What to learn</h3><ul>${bullets(lesson.takeaways)}</ul>
          <h3>Try it</h3><ol>${bullets(lesson.actions)}</ol>
          <a href="${esc(lesson.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original example ${icon('arrow', 'i sm')}</a>
        </details>`).join('')}
      </div>
      <div class="d-foot">
        <button class="btn primary" type="button" data-download-pack="${esc(collection.id)}">${icon('download', 'i sm')}Download lessons</button>
        <a class="btn" href="./legacy.html#inbox">${icon('book', 'i sm')}Open Video Inbox</a>
        <button class="btn" type="button" data-share="${esc(collection.id)}">${icon('link', 'i sm')}Copy collection link</button>
      </div>
      <p class="d-note">To save these to your personal inbox, download the lessons and choose the file under Import from a chat.</p>
    </div>`;
    showDetail(collection.id, push);
  }

  function downloadCollection(id) {
    const collection = collections.find(item => item.id === id);
    if (!collection) return;
    const file = new Blob([JSON.stringify({ lessons: collection.lessons }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openSkill(id, push = true) {
    const s = ordered.find(x => x.id === id);
    if (!s) return;
    if (s.lessons) { openCollection(s, push); return; }
    const src = D.sources[s.src];
    const cmd = s.members ? `/${s.members[0][0]}` : `/${s.id}`;
    const app = s.builtIn
      ? 'Already built in. Just ask for what you want, like the example below.'
      : `Get the skill${s.members ? ' pack' : ''} from ${src.url ? 'its GitHub page' : 'its source'}, zip the folder, and upload it under <em>Settings → Capabilities → Skills</em>. Then just ask.`;
    $('#detail-body').innerHTML = `<div class="d-inner">
      <div class="d-top">${tile(s.cat, 'c-ic lg')}
        <div><h2 id="d-title">${esc(s.title)}</h2><div class="d-chips">${isNew(s) ? '<span class="chip new">New</span>' : ''}${levelChip(s.level)}${catChip(s.cat)}<span class="chip">From: ${esc(src.name)}</span>${s.builtIn ? '<span class="chip blue">Built into Claude</span>' : ''}</div></div>
        <button class="close" type="button" data-close aria-label="Close">${icon('close')}</button></div>
      <p class="d-what">${esc(s.what)}</p>
      <div class="d-sec"><h3>Good for</h3><ul class="uses">${s.useFor.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>
      <div class="d-sec"><h3>Try saying</h3><div class="say"><p>“${esc(s.say)}”</p><button class="btn primary" type="button" data-copy="${esc(s.say)}">${icon('copy', 'i sm')}Copy</button></div></div>
      <div class="d-sec"><h3>How to use it</h3><div class="how">
        <div class="how-card"><h3>${icon('terminal', 'i sm')}In Claude Code</h3><p>Just ask in normal words and Claude picks the skill. Or type <code>${esc(cmd)}</code> to start it directly.</p></div>
        <div class="how-card"><h3>${icon('chat', 'i sm')}In the Claude app</h3><p>${app}</p></div></div>
        <p class="d-note">${esc(D.levels[s.level].hint)}</p></div>
      ${s.members ? `<div class="d-sec"><h3>Inside this pack (${s.members.length})</h3><ul class="members">${s.members.map(([n, t]) => `<li><code>/${esc(n)}</code><br>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      <div class="d-foot">${src.url ? `<a class="btn primary" href="${esc(src.url)}" target="_blank" rel="noopener">Get it on GitHub${icon('arrow', 'i sm')}</a>` : ''}<button class="btn" type="button" data-share="${s.id}">${icon('link', 'i sm')}Copy link to this skill</button></div>
    </div>`;
    showDetail(s.id, push);
  }
  function closeDetail() { if ($('#detail').open) $('#detail').close(); }
  $('#detail').addEventListener('close', () => { if (location.hash.startsWith('#skill=')) history.replaceState(null, '', location.pathname + location.search); });
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  // ---------- events ----------
  function rerender() { renderNav(); renderLevels(); renderGrid(); renderWidgets(); }
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.skill) openSkill(t.dataset.skill);
    else if (t.dataset.downloadPack) downloadCollection(t.dataset.downloadPack);
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
  const start = /^#skill=([\w-]+)/.exec(location.hash);
  const collection = start && collections.find(item => item.id === start[1]);
  if (collection) state.cat = collection.cat;
  renderKpis();
  rerender();
  if (start) openSkill(start[1], false);
})();
