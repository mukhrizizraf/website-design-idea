// AI Skill Shelf: the shelf page. Renders window.SKILL_DATA (skills.js).
(() => {
  'use strict';
  const D = window.SKILL_DATA;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (!D) { $('#groups').innerHTML = '<p class="empty"><strong>The skills did not load.</strong>Keep skills.js in the same folder as this page.</p>'; return; }

  const BS = '\\';
  const cats = Object.fromEntries(D.categories.map(c => [c.id, c]));
  const collections = D.collections || [];
  const isNew = s => s.added && (Date.now() - new Date(s.added + 'T00:00:00').getTime()) < 30 * 864e5;
  const skills = [...D.skills].sort((a, b) => (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0));
  const items = [...collections, ...skills];
  let storageAvailable = true;
  function readPreference(key, fallback) {
    try { return JSON.parse(localStorage.getItem('skill-shelf:' + key)) ?? fallback; }
    catch { return fallback; }
  }
  function savePreference(key, value) {
    try { localStorage.setItem('skill-shelf:' + key, JSON.stringify(value)); }
    catch { storageAvailable = false; $('#storage-note').textContent = 'Saving is available for this session only.'; }
  }
  const storedSaved = readPreference('saved', []);
  const saved = new Set(Array.isArray(storedSaved) ? storedSaved.filter(id => items.some(s => s.id === id)) : []);
  const preferredCat = readPreference('category', 'all');
  const state = { cat: cats[preferredCat] ? preferredCat : 'all', q: '', easy: false, savedOnly: false, view: readPreference('view', 'cards') === 'list' ? 'list' : 'cards' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Small line icons, only for the phone tab bar where labels are short.
  const P = { all: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z', design: 'M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22Z',
    motion: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z', writing: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
    docs: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6', coding: 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
    workflow: 'M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4' };
  const svg = (d, w = 16) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

  // ---------- small helpers ----------
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); }
    catch { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} a.remove(); if (!ok) { toast('Copy unavailable. Select the text and copy it manually.'); return; } }
    toast(done);
  }
  const pageUrl = () => location.href.split('#')[0];
  const levelLabel = s => s.lessons ? `${s.lessons.length} ideas` : s.members ? `${s.members.length} skills` : D.levels[s.level].label;
  function matches(s) {
    if (state.savedOnly && !saved.has(s.id)) return false;
    if (state.cat !== 'all' && s.cat !== state.cat) return false;
    if (state.easy && s.level !== 'easy') return false;
    if (!state.q) return true;
    const extra = s.lessons ? s.lessons.flatMap(l => [l.title, l.summary]) : [];
    const hay = [s.title, s.id, s.what, ...(s.useFor || []), cats[s.cat]?.label, ...(s.members || []).flat(), ...extra].join(' ').toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
  }

  // ---------- category tabs (toolbar) and phone tab bar ----------
  // Tabs are built once; switching only moves the pill, so it can spring from the old tab to the new one.
  // Every skill has its own symbol (tabs and headings use the category symbol), so rows never look alike.
  // Skill symbols and colours live in toys.js, so the homepage cards use the same ones.
  const G = ShelfToys.G, SKILL_GLYPH = ShelfToys.SKILL_GLYPH;
  const glyphFor = s => G[SKILL_GLYPH[s.id]] || G.cube;
  const appIc = (cat, path) => `<span class="app-ic" data-cat="${cat}" aria-hidden="true">${svg(path || P[cat] || P.all, 19)}</span>`;
  // Category headings: a small 3D cube that turns non-stop.
  const headCube = cat => window.ShelfToys ? ShelfToys.toy(cat, 'head-toy') : '';
  let tabsBuilt = false;
  function renderTabs() {
    const list = [{ id: 'all', label: 'All categories', short: 'All' }, ...D.categories];
    if (!tabsBuilt) {
      $('#tabs').innerHTML = list.map(c => `<button class="tab" type="button" data-cat="${c.id}" aria-label="${esc(c.label)}" aria-current="false">${window.ShelfToys ? ShelfToys.toy(c.id, 'dock-toy') : appIc(c.id)}<span class="tab-label">${esc(c.short || c.label)}</span><span class="tab-count">${c.id === 'all' ? items.length : items.filter(s => s.cat === c.id).length}</span></button>`).join('');
      tabsBuilt = true;
    }
    document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-current', String(b.dataset.cat === state.cat)));
    document.querySelectorAll('[data-section]').forEach(b => {
      if (b.dataset.section === (state.savedOnly ? 'saved' : 'library')) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-saved-count]').forEach(el => { el.textContent = saved.size; });
    $('#library-count').textContent = items.length;
    $('#library-title').textContent = state.savedOnly ? 'Saved skills' : state.cat === 'all' ? 'All skills' : cats[state.cat].label;
    $('#shelf').dataset.category = state.cat;
    $('#location-label').textContent = state.savedOnly ? 'Saved' : 'Library';
    $('#library-description').textContent = '';
    document.title = $('#library-title').textContent + ' · AI Skill Shelf';
  }
  addEventListener('resize', () => { if (tabsBuilt) renderTabs(); });
  document.fonts?.ready?.then(() => { if (tabsBuilt) renderTabs(); });

  // ---------- the shelf: grouped rows ----------
  // Every skill is a book: a cartoon cover with the skill symbol on a white badge and its name on a white label.
  // Covers take ten clearly different colours in grid order, so neighbouring books never look alike.
  const COVERS = ['#ff3b30', '#2f6bff', '#ffd60a', '#a259ff', '#ff8a00', '#4cc9ff', '#ff5fa2', '#1d1d1f', '#fff1c9', '#3a2fd6'];
  const DARK = new Set(['#2f6bff', '#a259ff', '#1d1d1f', '#3a2fd6']);
  const coverOf = new Map();
  let coverN = 0;
  function row(s, i) {
    const c = COVERS[coverN++ % COVERS.length]; coverOf.set(s.id, c);
    return `<li style="--i:${i};--c:${c}"><button class="row book${DARK.has(c) ? ' dark' : ''}" type="button" data-skill="${esc(s.id)}" aria-label="${esc(s.title)}: ${esc(s.what)}">
      <span class="badge" aria-hidden="true">${svg(glyphFor(s), 24)}</span>
      <span class="lbl"><span class="row-name">${esc(s.title)}</span><span class="row-meta">${isNew(s) ? '<b class="new">New</b> · ' : ''}${esc(levelLabel(s))}</span></span></button></li>`;
  }
  const miniBook = s => `<span class="mini-book" style="--c:${coverOf.get(s.id) || COVERS[0]}" aria-hidden="true"><span>${svg(glyphFor(s), 19)}</span></span>`;
  function renderShelf() {
    coverN = 0;
    const found = items.filter(matches);
    $('#surprise').disabled = !found.some(s => !s.lessons);
    $('#surprise').title = $('#surprise').disabled ? 'No matching skills. Change your filters to try again.' : 'Choose a skill from your current results';
    $('#result').textContent = `${found.length} ${found.length === 1 ? 'skill' : 'skills'}${state.q ? ' found' : ''}`;
    $('#reset-filters').hidden = !state.q && !state.easy && state.cat === 'all';
    if (!found.length) {
      const noSaved = state.savedOnly && !saved.size;
      $('#groups').innerHTML = `<div class="empty">${svg(noSaved ? 'M6 3h12v18l-6-4-6 4Z' : G.search)}<strong>${noSaved ? 'Keep your favourites here' : 'No matching skills'}</strong>${noSaved ? 'Tap the bookmark on any skill to save it.' : 'Try another search or clear your filters.'}<br><button class="btn" type="button" id="clear">${noSaved ? 'Browse skills' : 'Clear filters'}</button></div>`;
      return;
    }
    $('#groups').innerHTML = D.categories.map(c => {
      const list = found.filter(s => s.cat === c.id);
      if (!list.length) return '';
      return `<section class="group" data-cat="${c.id}" aria-labelledby="g-${c.id}"><div class="group-head">${headCube(c.id)}<h2 id="g-${c.id}">${esc(c.label)}</h2><span>${list.length}</span></div><ul class="rows">${list.map((s, i) => row(s, i)).join('')}</ul></section>`;
    }).join('');
    watchRows();
  }
  function watchRows() {}

  // Arriving from a homepage category card: that card morphs into this category's heading.
  window.addEventListener('pagereveal', e => {
    const cat = new URLSearchParams(location.search).get('cat');
    if (!e.viewTransition || !cat) return;
    const head = document.querySelector(`.group[data-cat="${cat}"] .group-head`);
    if (!head) return;
    head.style.viewTransitionName = 'cat-card';
    e.viewTransition.finished.finally(() => { head.style.viewTransitionName = ''; });
  });

  // ---------- install steps, written out so nobody has to open GitHub ----------
  function install(s) {
    const src = D.sources[s.src] || {};
    if (src.plugin) return { plugin: src.plugin, url: src.url };
    if (!src.repo) return { none: s.src };
    const folders = s.members ? s.members.map(m => m[0]) : [s.id];
    const slug = src.repo.replace('/', '-');
    const base = src.dir ? src.dir + '/' : '';
    const winBase = src.dir ? src.dir + BS : '';
    const git = `https://github.com/${src.repo}.git`;
    const zip = `https://github.com/${src.repo}/archive/refs/heads/${src.branch}.zip`;
    const folderUrl = src.root ? src.url : `https://github.com/${src.repo}/tree/${src.branch}/${base}${s.members ? '' : s.id}`.replace(/\/$/, '');
    let ask, mac, win, unzipped;
    if (src.root) {
      ask = `Install the ${s.id} skill: clone ${src.url} into ~/.claude/skills/${s.id}. Then tell me how to use it.`;
      mac = `git clone --depth 1 ${git} ~/.claude/skills/${s.id}`;
      win = `git clone --depth 1 ${git} "$HOME${BS}.claude${BS}skills${BS}${s.id}"`;
      unzipped = `${src.repo.split('/')[1]}-${src.branch}`;
    } else {
      ask = s.members
        ? `Install these skills from ${src.url}: copy the folders ${folders.join(', ')} from ${src.dir ? `its ${src.dir} folder` : 'the top of the repo'} into ~/.claude/skills. Then tell me how to use them.`
        : `Install the ${s.id} skill from ${folderUrl} into ~/.claude/skills/${s.id}. Then tell me how to use it.`;
      const macCopy = folders.length > 1
        ? `for s in ${folders.join(' ')}; do cp -R /tmp/${slug}/${base}$s ~/.claude/skills/; done`
        : `cp -R /tmp/${slug}/${base}${folders[0]} ~/.claude/skills/`;
      mac = [`rm -rf /tmp/${slug}`, `git clone --depth 1 ${git} /tmp/${slug}`, 'mkdir -p ~/.claude/skills', macCopy].join('\n');
      const tmp = `"$env:TEMP${BS}${slug}`;
      const winCopy = folders.length > 1
        ? `foreach ($s in ${folders.map(f => `'${f}'`).join(',')}) { Copy-Item -Recurse -Force ${tmp}${BS}${winBase}$s" "$HOME${BS}.claude${BS}skills${BS}" }`
        : `Copy-Item -Recurse -Force ${tmp}${BS}${winBase}${folders[0]}" "$HOME${BS}.claude${BS}skills${BS}"`;
      win = [`Remove-Item -Recurse -Force ${tmp}" -ErrorAction SilentlyContinue`, `git clone --depth 1 ${git} ${tmp}"`,
        `New-Item -ItemType Directory -Force "$HOME${BS}.claude${BS}skills" | Out-Null`, winCopy].join('\n');
      unzipped = `${src.repo.split('/')[1]}-${src.branch}/${base}${s.members ? '…' : s.id}`;
    }
    return { ask, mac, win, zip, unzipped, folderUrl, url: src.url, repo: src.repo };
  }

  function installHtml(s) {
    const i = install(s);
    if (i.none) {
      const text = i.none === 'claudeapp' ? 'This one already comes with the Claude app. Nothing to install, just ask.'
        : i.none === 'plugin' ? 'This one comes in a Claude Code plugin. In Claude Code, type <code>/plugin</code>, find it in the list, install from there.'
        : "No public download link for this one yet. Just message me and I'll send you the folder.";
      return `<h3>How to install</h3><p class="note" style="margin-top:0">${text}</p>`;
    }
    const block = (code, label) => `<pre class="code">${esc(code)}</pre><div class="code-row"><button class="btn small" type="button" data-copy="${esc(code)}" data-done="${esc(label)}">Copy</button></div>`;
    const ways = i.plugin
      ? [['ask', 'In Claude Code', `<p>Type these two lines into Claude Code, one at a time.</p>${block(i.plugin.join('\n'), 'Copied! Now paste it into Claude Code.')}`],
         ['term', 'Terminal', `<p>Or run this in a terminal. It'll ask you a few questions.</p>${block('npx claude-mem install', 'Copied! Now paste it into a terminal.')}`]]
      : [['ask', 'Ask Claude Code', `<p>The easiest way. Paste it into Claude Code and it copies the files for you. Done.</p>${block(i.ask, 'Copied! Now paste it into Claude Code.')}`],
         ['win', 'Windows', `<p>Paste into PowerShell. You'll need Git. No Git? Just use Ask Claude Code instead.</p>${block(i.win, 'Copied! Now paste it into PowerShell.')}`],
         ['mac', 'Mac or Linux', `<p>Paste into Terminal. You'll need Git.</p>${block(i.mac, 'Copied! Now paste it into Terminal.')}`],
         ['app', 'Claude app', s.builtIn ? '<p>Already in the Claude app. Nothing to install.</p>'
           : `<p>Download the ZIP, unzip it, and open <code>${esc(i.unzipped)}</code>. Zip ${s.members ? 'each skill folder you want' : 'that one folder'}, then upload it in the Claude app under Settings, Capabilities, Skills.</p><a class="btn" href="${esc(i.zip)}" download>Download the ZIP</a>`]];
    return `<h3>How to install</h3>
      <div class="ways" role="tablist" aria-label="Ways to install">${ways.map(([id, label], n) => `<button class="way" type="button" role="tab" data-way="${id}" aria-selected="${n === 0}">${label}</button>`).join('')}</div>
      ${ways.map(([id, , body], n) => `<div class="way-panel" role="tabpanel" data-panel="${id}" ${n ? 'hidden' : ''}>${body}</div>`).join('')}
      <p class="repo">GitHub: <code>${esc(i.folderUrl || i.url)}</code><button class="btn small" type="button" data-copy="${esc(i.folderUrl || i.url)}" data-done="GitHub link copied!">Copy link</button></p>`;
  }

  // ---------- detail sheets: a 3D pop-up ----------
  const cube = cat => `<div class="cube-wrap" data-cat="${cat}" aria-hidden="true"><div class="cube">${Array.from({ length: 6 }, () => `<i>${svg(P[cat] || P.all, 26)}</i>`).join('')}</div></div>`;
  let lastClick = null;                      // where the visitor clicked, so the window flies out from there
  function openSheet(id, push) {
    const d = $('#detail');
    d.dataset.skill = id;
    const r = lastClick?.getBoundingClientRect?.();
    if (r) {
      d.style.setProperty('--fx', `${Math.round(r.left + r.width / 2 - innerWidth / 2)}px`);
      d.style.setProperty('--fy', `${Math.round(r.top + r.height / 2 - innerHeight / 2)}px`);
      d.style.setProperty('--fr', `${r.left + r.width / 2 < innerWidth / 2 ? 14 : -14}deg`);
    }
    d.classList.remove('closing');
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    if (push && location.hash !== '#skill=' + id) history.pushState({ skillShelfSheet: true }, '', '#skill=' + id);
  }
  function closeSheet(d) {
    if (!d.open) return;
    if (reduced) { d.close(); return; }
    d.classList.add('closing');
    setTimeout(() => { d.classList.remove('closing'); d.close(); }, 240);
  }
  // A clip loads only when someone presses play, straight from its creator's site. If the network
  // or an antivirus blocks that server, the card says so and the prompt below still works.
  function clip(l) {
    if (!l.video) return '';
    return `<div class="clip"><video preload="none" controls playsinline loop muted ${l.poster ? `poster="${esc(l.poster)}"` : ''} src="${esc(l.video)}" aria-label="${esc(l.title)} clip"></video>
      <p class="clip-blocked" hidden>Oops, this clip won't load. Your network or antivirus might be blocking prompt-motion.com. No worries, the prompt below still works.</p></div>`;
  }
  function openCollection(c, push) {
    $('#detail').dataset.cat = c.cat;
    const li = list => list.map(x => `<li>${esc(x)}</li>`).join('');
    const credit = l => {
      const who = String(l.source || '').replace(/^Prompt Motion\s*·\s*/, '');
      const name = l.creatorUrl ? `<a href="${esc(l.creatorUrl)}" target="_blank" rel="noopener noreferrer">${esc(who)}</a>` : esc(who);
      return `By ${name}, via Prompt Motion. The video and prompt are theirs, all credit to them.`;
    };
    $('#detail-body').innerHTML = `<div class="sheet">
      <div class="sheet-top">${miniBook(c)}<div><h2 id="d-title">${esc(c.title.charAt(0) + c.title.slice(1).toLowerCase())}</h2><p class="sheet-sub">${c.lessons.length} ideas, each with its clip and the exact prompt or install command</p></div><button class="close" type="button" data-close aria-label="Close">×</button></div>
      <p class="lead">${esc(c.what)}</p>
      <div class="ideas">${c.lessons.map((l, i) => `<article class="idea">
        <div class="idea-head"><span class="idea-n">${i + 1}</span><div><h3>${esc(l.title)}</h3><p class="idea-credit">${credit(l)}</p></div></div>
        ${clip(l)}
        <p class="idea-sum">${esc(l.summary)}</p>
        ${l.prompt ? `<div class="prompt-box"><div class="prompt-top"><strong>The prompt</strong><button class="btn small primary" type="button" data-copy="${esc(l.prompt)}" data-done="Prompt copied! Now paste it into Claude.">Copy prompt</button></div><pre class="prompt-text">${esc(l.prompt)}</pre></div>` : ''}
        ${l.install ? `<div class="prompt-box"><div class="prompt-top"><strong>Install this skill</strong><button class="btn small primary" type="button" data-copy="${esc(l.install)}" data-done="Copied. Paste it into ${l.install.startsWith('/') ? 'Claude Code' : 'a terminal'}.">Copy</button></div><pre class="code">${esc(l.install)}</pre><p class="note">${l.install.startsWith('/') ? 'Type these into Claude Code, one line at a time.' : 'Paste into a terminal. It needs Node.js.'}</p></div>` : ''}
        <details class="lesson"><summary><strong>What to learn and try</strong></summary><h4>What to learn</h4><ul>${li(l.takeaways)}</ul><h4>Try it</h4><ol>${li(l.actions)}</ol></details>
      </article>`).join('')}</div>
      <div class="sheet-foot"><button class="btn" type="button" data-share="${esc(c.id)}">Copy the link, share with friends</button></div></div>`;
    openSheet(c.id, push);
    // Show the "blocked" note if a clip fails to load.
    $('#detail-body').querySelectorAll('.clip video').forEach(v => {
      const blocked = () => { v.parentElement.querySelector('.clip-blocked').hidden = false; v.parentElement.classList.add('is-blocked'); };
      v.addEventListener('error', blocked, { once: true });
      // If even the preview image cannot load, say so straight away instead of showing a black box.
      const poster = v.getAttribute('poster');
      if (poster) { const probe = new Image(); probe.onerror = blocked; probe.src = poster; }
    });
  }
  function openSkill(id, push = true) {
    const s = items.find(x => x.id === id);
    if (!s) return;
    if (s.lessons) { openCollection(s, push); return; }
    const src = D.sources[s.src] || { name: 'Unknown' };
    $('#detail').dataset.cat = s.cat;
    { const c = ShelfToys.color(s.id); $('#detail').style.setProperty('--a', c.a); $('#detail').style.setProperty('--b', c.b); }
    $('#detail-body').innerHTML = `<div class="sheet">
      <div class="sheet-top">${miniBook(s)}<div><h2 id="d-title">${esc(s.title)}</h2><p class="sheet-sub">${esc(cats[s.cat].label)}, ${esc(D.levels[s.level].label.toLowerCase())}, from ${esc(src.name)}${isNew(s) ? ', new this month' : ''}</p></div><button class="close" type="button" data-close aria-label="Close">×</button></div>
      <p class="lead">${esc(s.what)}</p>
      <h3>Best for</h3><ul class="uses">${s.useFor.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
      <h3>Just say this to Claude</h3><div class="say"><p>“${esc(s.say)}”</p><button class="btn primary" type="button" data-copy="${esc(s.say)}">Copy</button></div>
      <p class="note">${esc(D.levels[s.level].hint)} In Claude Code you can also type <code>/${esc(s.members ? s.members[0][0] : s.id)}</code> to start it right away.</p>
      ${installHtml(s)}
      ${s.members ? `<h3>What's inside this pack</h3><ul class="members">${s.members.map(([n, t]) => `<li><code>/${esc(n)}</code><br>${esc(t)}</li>`).join('')}</ul>` : ''}
      <div class="sheet-foot"><button class="btn" type="button" data-save="${esc(s.id)}" aria-pressed="${saved.has(s.id)}">${saved.has(s.id) ? 'Saved' : 'Save skill'}</button><button class="btn" type="button" data-share="${esc(s.id)}">Share skill</button></div></div>`;
    openSheet(s.id, push);
  }
  $('#detail').addEventListener('close', () => {
    $('#detail').querySelectorAll('video').forEach(v => v.pause());
    const opener = [...document.querySelectorAll('.row')].find(b => b.dataset.skill === $('#detail').dataset.skill);
    (opener || $('#shelf')).focus({ preventScroll: true });
    if (location.hash.startsWith('#skill=')) {
      if (history.state?.skillShelfSheet) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
  });
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) closeSheet(d); }));

  // ---------- events ----------
  let lastSurprise = null;
  function render() { renderTabs(); renderShelf(); }
  function clearFilters() {
    state.cat = 'all'; state.q = ''; state.easy = false;
    $('#q').value = ''; $('#easy').checked = false;
    savePreference('category', 'all'); updateCategoryUrl(); render();
  }
  function updateCategoryUrl() {
    const url = new URL(location.href);
    if (state.cat === 'all') url.searchParams.delete('cat');
    else url.searchParams.set('cat', state.cat);
    history.replaceState(history.state, '', url);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.view) {
      state.view = t.dataset.view; $('#shelf').dataset.view = state.view;
      savePreference('view', state.view);
      document.querySelectorAll('[data-view][aria-pressed]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
      watchRows();
    }
    else if (t.dataset.save) {
      const id = t.dataset.save;
      if (saved.has(id)) saved.delete(id); else saved.add(id);
      savePreference('saved', [...saved]);
      const inSheet = !!t.closest('dialog');
      render();
      if (inSheet) { t.textContent = saved.has(id) ? 'Saved' : 'Save skill'; t.setAttribute('aria-pressed', String(saved.has(id))); }
      else {
        const replacement = [...document.querySelectorAll('.save-skill')].find(b => b.dataset.save === id);
        if (replacement) replacement.focus({ preventScroll: true });
        else $('#shelf').focus({ preventScroll: true });
      }
      toast(storageAvailable ? (saved.has(id) ? 'Skill saved' : 'Skill removed from saved') : 'Saved for this session. Device storage is unavailable.');
    }
    else if (t.dataset.section) {
      state.savedOnly = t.dataset.section === 'saved'; clearFilters();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    else if (t.id === 'surprise') {
      const options = items.filter(s => !s.lessons && matches(s));
      const fresh = options.filter(s => s.id !== lastSurprise);
      const pool = fresh.length ? fresh : options;
      if (!pool.length) return;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      lastSurprise = chosen.id; lastClick = t; openSkill(chosen.id);
    }
    else if (t.dataset.skill) { lastClick = t; openSkill(t.dataset.skill); }
    else if (t.dataset.cat) { state.cat = t.dataset.cat; savePreference('category', state.cat); updateCategoryUrl(); render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
    else if (t.dataset.copy !== undefined) copy(t.dataset.copy, t.dataset.done || 'Copied! Now paste it into Claude.');
    else if (t.dataset.share) copy(pageUrl() + '#skill=' + t.dataset.share, 'Link copied! Send it to a friend.');
    else if (t.dataset.way) {
      const sheet = t.closest('.sheet');
      sheet.querySelectorAll('.way').forEach(b => b.setAttribute('aria-selected', String(b === t)));
      sheet.querySelectorAll('.way-panel').forEach(p => { p.hidden = p.dataset.panel !== t.dataset.way; });
    }
    else if (t.hasAttribute('data-close')) closeSheet(t.closest('dialog'));
    else if (t.id === 'clear' || t.id === 'reset-filters') { if (state.savedOnly && !saved.size) state.savedOnly = false; clearFilters(); }
    else if (t.id === 'open-guide' || t.hasAttribute('data-guide')) $('#guide').showModal();
    else if (t.id === 'share-page') copy(pageUrl(), 'Link copied!');
  });
  $('#q').addEventListener('input', e => { state.q = e.target.value.trim(); renderShelf(); });
  $('#easy').addEventListener('change', e => { state.easy = e.target.checked; renderShelf(); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input, textarea, [contenteditable="true"]') && !document.querySelector('dialog[open]')) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape' && e.target === $('#q') && state.q) { e.preventDefault(); $('#q').value = ''; state.q = ''; renderShelf(); }
    if (e.target.matches('.way') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const ways = [...e.target.parentElement.querySelectorAll('.way')];
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? ways.length - 1 : (ways.indexOf(e.target) + (e.key === 'ArrowRight' ? 1 : -1) + ways.length) % ways.length;
      ways[n].focus(); ways[n].click();
    }
  });
  window.addEventListener('hashchange', () => { const m = /^#skill=([\w-]+)/.exec(location.hash); if (m) openSkill(m[1], false); else if ($('#detail').open) $('#detail').close(); });

  // ---------- start ----------
  const askedCat = new URLSearchParams(location.search).get('cat');   // from the homepage category cards
  if (cats[askedCat]) state.cat = askedCat;
  $('#shelf').dataset.view = state.view;
  document.querySelectorAll('[data-view][aria-pressed]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  savePreference('view', state.view);
  if (location.hash === '#saved') state.savedOnly = true;
  render();
  const start = /^#skill=([\w-]+)/.exec(location.hash);
  if (start) openSkill(start[1], false);
  else if (location.hash === '#guide') $('#guide').showModal();
})();
