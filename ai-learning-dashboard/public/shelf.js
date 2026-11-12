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
  const G = {
    clapper: 'M4 11h16v9H4z M4 11l1.5-6h15L19 11 M9 5 7.5 11 M15 5l-1.5 6',
    film: 'M3 4h18v16H3z M7 4v16 M17 4v16 M3 9h4 M3 15h4 M17 9h4 M17 15h4',
    trophy: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0Z M7 6H4a3 3 0 0 0 3 4 M17 6h3a3 3 0 0 1-3 4',
    scale: 'M12 3v18 M7 21h10 M4 7h16 M4 7l-2.5 6a3 3 0 0 0 5 0Z M20 7l-2.5 6a3 3 0 0 0 5 0Z',
    layout: 'M3 3h18v18H3z M3 9h18 M9 9v12',
    dna: 'M7 3c0 6 10 6 10 12s-10 6-10 6 M17 3c0 6-10 6-10 12 M8 7h8 M8 17h8',
    image: 'M3 4h18v16H3z M8 10a2 2 0 1 0 0-.01 M21 16l-5-5-9 9',
    brush: 'M18 3l3 3-9 9-3-3Z M9 12c-3 0-5 2-5 5 0 1-1 2-2 2 2 2 6 2 8-1 1-2 1-4-1-6',
    swatch: 'M4 4h6v16H4z M10 8l5-3 5 9-10 6 M10 18l9-5',
    gem: 'M6 3h12l4 6-10 12L2 9Z M2 9h20 M10 3l-2 6 4 12 4-12-2-6',
    leaf: 'M5 20c0-9 6-15 15-15 0 9-6 15-15 15Z M5 20l8-8',
    phone: 'M7 2h10v20H7z M11 18h2',
    zap: 'M13 2 4 14h7l-1 8 9-12h-7Z',
    tag: 'M3 12V3h9l9 9-9 9Z M7.5 7.5h.01',
    spiral: 'M12 12a1 1 0 1 1 1-1 3 3 0 1 1-3-3 5 5 0 1 1-5 5 7 7 0 1 1 7 7',
    blocks: 'M3 13h8v8H3z M13 13h8v8h-8z M8 3h8v8H8z',
    wand: 'M3 21 15 9 M15 9l3-3 M18 3v2 M21 6h-2 M20 10l-1-1 M14 4l1 1',
    pen: 'M12 19l7-7 3 3-7 7Z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18Z M2 2l7.6 7.6 M11 11a2 2 0 1 0 0-.01',
    play: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M10 8l6 4-6 4Z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
    search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    wrench: 'M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8Z M14.7 6.3 10 2 2 10l4.3 4.7',
    gauge: 'M12 14l4-4 M3.3 18a10 10 0 1 1 17.4 0',
    timeline: 'M3 6h12 M3 12h18 M3 18h8 M15 4v4 M21 10v4 M11 16v4',
    cube: 'M21 8 12 3 3 8l9 5Z M3 8v8l9 5 9-5V8 M12 13v8',
    gif: 'M3 5h18v14H3z M9 10H7v4h2v-2 M12 10v4 M15 14v-4h3 M15 12h2',
    smile: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z M9 10h.01 M15 10h.01 M9 13c1.5 1.5 4.5 1.5 6 0',
    microscope: 'M6 18h8 M3 22h18 M14 22a7 7 0 0 0 0-14 M9 14h2 M8 6l2-4 3 1.5-2 4 M9 6.5l3 1.5-2 4-3-1.5Z',
    people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21a7 7 0 0 1 14 0 M16 3.1a4 4 0 0 1 0 7.8 M22 21a7 7 0 0 0-4-6.3',
    chart: 'M3 3v18h18 M7 16l4-4 3 3 5-6',
    edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
    megaphone: 'M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z M17 8a5 5 0 0 1 0 8 M20 5a9 9 0 0 1 0 14',
    present: 'M2 3h20 M4 3v11h16V3 M12 14v4 M8 21l4-3 4 3 M8 10l3-3 2 2 3-3',
    doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h6',
    table: 'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18',
    pdf: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 18v-5h2a1.5 1.5 0 0 1 0 3H8',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z M9 12l2 2 4-4',
    flask: 'M9 3h6 M10 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3 M7 15h10',
    plug: 'M9 2v6 M15 2v6 M6 8h12v4a6 6 0 0 1-12 0Z M12 18v4',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
    toolbox: 'M3 9h18v11H3z M8 9V5h8v4 M3 14h18 M10 13v2 M14 13v2',
    music: 'M9 18V5l12-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    brain: 'M9.5 2a2.5 2.5 0 0 1 2.5 2.5V20a2 2 0 0 1-4 .5 3 3 0 0 1-3-3.5 3 3 0 0 1-1-5 3 3 0 0 1 2-5A2.5 2.5 0 0 1 9.5 2Z M14.5 2A2.5 2.5 0 0 0 12 4.5V20a2 2 0 0 0 4 .5 3 3 0 0 0 3-3.5 3 3 0 0 0 1-5 3 3 0 0 0-2-5A2.5 2.5 0 0 0 14.5 2Z'
  };
  const SKILL_GLYPH = {
    'prompt-motion-design-ideas': 'clapper', awwwards: 'trophy', jury: 'scale', 'frontend-design': 'layout', 'design-dna': 'dna',
    'design-inspiration': 'image', 'canvas-design': 'brush', 'theme-factory': 'swatch', 'emil-design-eng': 'gem', 'apple-design': 'leaf',
    'mobile-native': 'phone', 'break-ui': 'zap', 'brand-guidelines': 'tag', 'algorithmic-art': 'spiral', 'web-artifacts-builder': 'blocks',
    genjutsu: 'wand', figma: 'pen', 'motion-design': 'film', animate: 'play', 'animation-vocabulary': 'book',
    'find-animation-opportunities': 'search', 'review-animations': 'eye', 'improve-animations': 'wrench', 'animation-performance': 'gauge',
    gsap: 'timeline', threejs: 'cube', 'slack-gif-creator': 'gif', humanizer: 'smile', 'deep-research': 'microscope', 'llm-council': 'people',
    'econ-write': 'chart', 'doc-coauthoring': 'edit', 'internal-comms': 'megaphone', pptx: 'present', docx: 'doc', xlsx: 'table', pdf: 'pdf',
    superpowers: 'shield', 'webapp-testing': 'flask', 'mcp-builder': 'plug', engineering: 'gear', 'skill-creator': 'toolbox',
    'tiktok-reader': 'music', 'claude-mem': 'brain'
  };
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
  function row(s, i) {
    return `<li style="--i:${i}"><button class="row" type="button" data-skill="${esc(s.id)}" aria-label="${esc(s.title)}: ${esc(s.what)}">
      ${appIc(s.cat, glyphFor(s))}
      <span class="row-name">${esc(s.title)}${isNew(s) ? '<span class="new">New</span>' : ''}</span>
      <span class="row-what">${esc(s.what)}</span>
      <span class="row-meta lv-${s.lessons ? 'ideas' : s.members ? 'pack' : s.level}">${esc(levelLabel(s))}</span></button><button class="save-skill" type="button" data-save="${esc(s.id)}" aria-pressed="${saved.has(s.id)}" aria-label="${saved.has(s.id) ? 'Unsave' : 'Save'} ${esc(s.title)}">${svg('M6 3h12v18l-6-4-6 4Z')}</button></li>`;
  }
  function renderShelf() {
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
      <div class="sheet-top">${cube(c.cat)}<div><h2 id="d-title">${esc(c.title.charAt(0) + c.title.slice(1).toLowerCase())}</h2><p class="sheet-sub">${c.lessons.length} ideas, each with its clip and the exact prompt or install command</p></div><button class="close" type="button" data-close aria-label="Close">×</button></div>
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
    $('#detail-body').innerHTML = `<div class="sheet">
      <div class="sheet-top">${window.ShelfToys ? ShelfToys.toy(s.cat, 'detail-toy') : cube(s.cat)}<div><h2 id="d-title">${esc(s.title)}</h2><p class="sheet-sub">${esc(cats[s.cat].label)}, ${esc(D.levels[s.level].label.toLowerCase())}, from ${esc(src.name)}${isNew(s) ? ', new this month' : ''}</p></div><button class="close" type="button" data-close aria-label="Close">×</button></div>
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
  render();
  const start = /^#skill=([\w-]+)/.exec(location.hash);
  if (start) openSkill(start[1], false);
  else if (location.hash === '#guide') $('#guide').showModal();
})();
