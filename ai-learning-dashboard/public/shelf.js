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
  const picks = D.featured.map(id => D.skills.find(s => s.id === id)).filter(Boolean);
  const state = { cat: 'all', q: '', easy: false, pick: 0 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Small line icons, only for the phone tab bar where labels are short.
  const P = { all: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z', design: 'M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22Z',
    motion: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z', writing: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
    docs: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6', coding: 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
    workflow: 'M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4' };
  const svg = (d, w = 16) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const chevron = dir => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}"/></svg>`;

  // ---------- small helpers ----------
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); }
    catch { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch {} a.remove(); }
    toast(done);
  }
  const pageUrl = () => location.href.split('#')[0];
  const levelLabel = s => s.lessons ? `${s.lessons.length} ideas` : s.members ? `${s.members.length} skills` : D.levels[s.level].label;
  function matches(s) {
    if (state.cat !== 'all' && s.cat !== state.cat) return false;
    if (state.easy && s.level !== 'easy') return false;
    if (!state.q) return true;
    const extra = s.lessons ? s.lessons.flatMap(l => [l.title, l.summary]) : [];
    const hay = [s.title, s.id, s.what, ...(s.useFor || []), cats[s.cat]?.label, ...(s.members || []).flat(), ...extra].join(' ').toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
  }

  // ---------- category tabs (toolbar) and phone tab bar ----------
  function renderTabs() {
    const list = [{ id: 'all', label: 'All', short: 'All' }, ...D.categories];
    $('#tabs').innerHTML = list.map(c => `<button class="tab" type="button" data-cat="${c.id}" aria-current="${state.cat === c.id}">${esc(c.short || c.label)}</button>`).join('');
    $('#tabbar').innerHTML = list.map(c => `<button class="tb" type="button" data-cat="${c.id}" aria-current="${state.cat === c.id}" aria-label="${esc(c.label)}"><b>${svg(P[c.id] || P.all)}</b><span>${esc(c.short || c.label)}</span></button>`).join('');
  }

  // ---------- the pick card: the exact words to say ----------
  function renderPick() {
    const s = picks[state.pick];
    if (!s) { $('#tilt').hidden = true; return; }
    $('#pick').innerHTML = `<blockquote>“${esc(s.say)}”</blockquote>
      <figcaption>
        <button class="pick-name" type="button" data-skill="${s.id}"><strong>${esc(s.title)}</strong><span>${esc(cats[s.cat].label)}</span></button>
        <span class="stepper"><button class="step" type="button" data-step="-1" aria-label="Previous pick">${chevron(-1)}</button>${state.pick + 1} of ${picks.length}<button class="step" type="button" data-step="1" aria-label="Next pick">${chevron(1)}</button></span>
      </figcaption>
      <div class="pick-actions"><button class="btn primary" type="button" data-copy="${esc(s.say)}">Copy the words</button><button class="btn" type="button" data-skill="${s.id}">How to install it</button></div>`;
  }
  // Tilt toward the pointer, like a pane of glass you could pick up.
  const tilt = $('#tilt');
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    tilt.addEventListener('pointermove', e => {
      const r = tilt.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, card = $('#pick');
      card.classList.add('moving');
      card.style.setProperty('--ry', `${(x - .5) * 10}deg`); card.style.setProperty('--rx', `${(.5 - y) * 8}deg`);
      card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
    });
    tilt.addEventListener('pointerleave', () => { const card = $('#pick'); card.classList.remove('moving'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  }

  // ---------- the shelf: grouped rows ----------
  function row(s) {
    return `<li><button class="row" type="button" data-skill="${esc(s.id)}">
      <span class="row-name">${esc(s.title)}${isNew(s) ? '<span class="new">New</span>' : ''}</span>
      <span class="row-what">${esc(s.what)}</span>
      <span class="row-meta lv-${s.lessons ? 'ideas' : s.members ? 'pack' : s.level}">${esc(levelLabel(s))}</span></button></li>`;
  }
  function renderShelf() {
    const found = items.filter(matches);
    $('#result').textContent = state.q || state.easy || state.cat !== 'all' ? `${found.length} of ${items.length} skills shown` : `${items.length} skills, grouped by what they help with`;
    if (!found.length) {
      $('#groups').innerHTML = `<div class="empty"><strong>Nothing matches yet</strong>Try a shorter word, or show every skill again.<br><button class="btn" type="button" id="clear">Show every skill</button></div>`;
      return;
    }
    $('#groups').innerHTML = D.categories.map(c => {
      const list = found.filter(s => s.cat === c.id);
      if (!list.length) return '';
      return `<section class="group" data-cat="${c.id}" aria-labelledby="g-${c.id}"><div class="group-head"><i class="swatch" aria-hidden="true"></i><h2 id="g-${c.id}">${esc(c.label)}</h2><span>${list.length}</span></div><ul class="rows">${list.map(row).join('')}</ul></section>`;
    }).join('');
  }

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
      const text = i.none === 'claudeapp' ? 'This one comes with the Claude app. There is nothing to install: just ask for what you want.'
        : i.none === 'plugin' ? 'This comes inside a Claude Code plugin. In Claude Code, type <code>/plugin</code>, find it in the list, and install it there.'
        : 'There is no public download link for this one yet. Ask me and I will send you the folder.';
      return `<h3>Install it</h3><p class="note" style="margin-top:0">${text}</p>`;
    }
    const block = (code, label) => `<pre class="code">${esc(code)}</pre><div class="code-row"><button class="btn small" type="button" data-copy="${esc(code)}" data-done="${esc(label)}">Copy</button></div>`;
    const ways = i.plugin
      ? [['ask', 'In Claude Code', `<p>Type these two lines into Claude Code, one at a time.</p>${block(i.plugin.join('\n'), 'Copied. Paste them into Claude Code.')}`],
         ['term', 'Terminal', `<p>Or run this in a terminal. It asks a few setup questions.</p>${block('npx claude-mem install', 'Copied. Paste it into a terminal.')}`]]
      : [['ask', 'Ask Claude Code', `<p>The easiest way. Paste this into Claude Code and it copies the files for you.</p>${block(i.ask, 'Copied. Paste it into Claude Code.')}`],
         ['win', 'Windows', `<p>Paste into PowerShell. It needs Git; if you don't have it, use Ask Claude Code instead.</p>${block(i.win, 'Copied. Paste it into PowerShell.')}`],
         ['mac', 'Mac or Linux', `<p>Paste into Terminal. It needs Git.</p>${block(i.mac, 'Copied. Paste it into Terminal.')}`],
         ['app', 'Claude app', s.builtIn ? '<p>Already built into the Claude app. Nothing to install.</p>'
           : `<p>Download the ZIP, unzip it, and open <code>${esc(i.unzipped)}</code>. Zip ${s.members ? 'each skill folder you want' : 'that one folder'}, then upload it in the Claude app under Settings, Capabilities, Skills.</p><a class="btn" href="${esc(i.zip)}" download>Download the ZIP</a>`]];
    return `<h3>Install it</h3>
      <div class="ways" role="tablist" aria-label="Ways to install">${ways.map(([id, label], n) => `<button class="way" type="button" role="tab" data-way="${id}" aria-selected="${n === 0}">${label}</button>`).join('')}</div>
      ${ways.map(([id, , body], n) => `<div class="way-panel" role="tabpanel" data-panel="${id}" ${n ? 'hidden' : ''}>${body}</div>`).join('')}
      <p class="repo">GitHub: <code>${esc(i.folderUrl || i.url)}</code><button class="btn small" type="button" data-copy="${esc(i.folderUrl || i.url)}" data-done="GitHub link copied.">Copy link</button></p>`;
  }

  // ---------- detail sheets: a 3D pop-up that speaks ----------
  const Sound = window.ShelfSound;
  const cube = cat => `<div class="cube-wrap" data-cat="${cat}" aria-hidden="true"><div class="cube">${Array.from({ length: 6 }, () => `<i>${svg(P[cat] || P.all, 26)}</i>`).join('')}</div></div>`;
  const listenBtn = id => `<button class="listen" type="button" data-listen="${esc(id)}"><span class="wave" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b></span><span class="lbl">Listen</span></button>`;
  let lastClick = null;                      // where the visitor clicked, so the window flies out from there
  function speak(item) {
    const btn = $('#detail .listen'); if (!Sound || !btn) return;
    const text = item.lessons ? `${item.title.charAt(0) + item.title.slice(1).toLowerCase()}. ${item.what} There are ${item.lessons.length} ideas to study, each with an exercise.` : Sound.narration(item, D.sources);
    const ok = Sound.say(text, { onstart: () => btn.classList.add('speaking'), onend: () => btn.classList.remove('speaking') });
    if (!ok) btn.classList.remove('speaking');
  }
  function openSheet(id, push) {
    const d = $('#detail');
    const r = lastClick?.getBoundingClientRect?.();
    if (r) {
      d.style.setProperty('--fx', `${Math.round(r.left + r.width / 2 - innerWidth / 2)}px`);
      d.style.setProperty('--fy', `${Math.round(r.top + r.height / 2 - innerHeight / 2)}px`);
      d.style.setProperty('--fr', `${r.left + r.width / 2 < innerWidth / 2 ? 14 : -14}deg`);
    }
    d.classList.remove('closing');
    if (d.open) { d.close(); }
    d.showModal();
    d.scrollTop = 0;
    if (push) history.replaceState(null, '', '#skill=' + id);
    Sound?.sfx.open();
    const item = items.find(x => x.id === id);
    if (Sound?.on && item) setTimeout(() => { if (d.open) speak(item); }, 520);
  }
  function closeSheet(d) {
    if (!d.open) return;
    if (reduced) { d.close(); return; }
    d.classList.add('closing');
    setTimeout(() => { d.classList.remove('closing'); d.close(); }, 240);
  }
  function openCollection(c, push) {
    const paused = c.externalLinksPaused;
    const li = list => list.map(x => `<li>${esc(x)}</li>`).join('');
    $('#detail-body').innerHTML = `<div class="sheet">
      <div class="sheet-top">${cube(c.cat)}<div><h2 id="d-title">${esc(c.title.charAt(0) + c.title.slice(1).toLowerCase())}</h2><p class="sheet-sub">${c.lessons.length} ideas to study, in ${esc(cats[c.cat].label)}</p></div><button class="close" type="button" data-close aria-label="Close">×</button></div>
      <p class="lead">${esc(c.what)}</p>
      <div class="sheet-actions">${listenBtn(c.id)}</div>
      ${paused ? '<p class="note">Links to the original examples are paused after an antivirus warning. Every summary and exercise is still here.</p>' : ''}
      <div style="margin-top:18px">${c.lessons.map(l => `<details class="lesson"><summary><strong>${esc(l.title)}</strong><small>${esc(String(l.source || '').replace(/^Prompt Motion\s*·\s*/, ''))}</small></summary>
        <p>${esc(l.summary)}</p><h4>What to learn</h4><ul>${li(l.takeaways)}</ul><h4>Try it</h4><ol>${li(l.actions)}</ol>
        ${!paused && l.sourceUrl ? `<a href="${esc(l.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open the original example</a>` : ''}</details>`).join('')}</div>
      <div class="sheet-foot"><button class="btn primary" type="button" data-download="${esc(c.id)}">Download the lessons</button><a class="btn" href="./legacy.html#inbox">Open my lesson inbox</a><button class="btn" type="button" data-share="${esc(c.id)}">Copy a link to this</button></div>
      <p class="note">To keep these, download the lessons, then choose the file under Import from a chat in the lesson inbox.</p></div>`;
    openSheet(c.id, push);
  }
  function download(id) {
    const c = collections.find(x => x.id === id); if (!c) return;
    const lessons = c.lessons.map(l => c.externalLinksPaused ? { ...l, sourceUrl: '' } : l);
    const url = URL.createObjectURL(new Blob([JSON.stringify({ lessons }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${id}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function openSkill(id, push = true) {
    const s = items.find(x => x.id === id);
    if (!s) return;
    if (s.lessons) { openCollection(s, push); return; }
    const src = D.sources[s.src] || { name: 'Unknown' };
    $('#detail-body').innerHTML = `<div class="sheet">
      <div class="sheet-top">${cube(s.cat)}<div><h2 id="d-title">${esc(s.title)}</h2><p class="sheet-sub">${esc(cats[s.cat].label)}, ${esc(D.levels[s.level].label.toLowerCase())}, from ${esc(src.name)}${isNew(s) ? ', new this month' : ''}</p></div><button class="close" type="button" data-close aria-label="Close">×</button></div>
      <p class="lead">${esc(s.what)}</p>
      <div class="sheet-actions">${listenBtn(s.id)}</div>
      <h3>Good for</h3><ul class="uses">${s.useFor.map(u => `<li>${esc(u)}</li>`).join('')}</ul>
      <h3>Say this to Claude</h3><div class="say"><p>“${esc(s.say)}”</p><button class="btn primary" type="button" data-copy="${esc(s.say)}">Copy</button></div>
      <p class="note">${esc(D.levels[s.level].hint)} In Claude Code you can also type <code>/${esc(s.members ? s.members[0][0] : s.id)}</code> to start it directly.</p>
      ${installHtml(s)}
      ${s.members ? `<h3>Inside this pack</h3><ul class="members">${s.members.map(([n, t]) => `<li><code>/${esc(n)}</code><br>${esc(t)}</li>`).join('')}</ul>` : ''}
      <div class="sheet-foot"><button class="btn" type="button" data-share="${esc(s.id)}">Copy a link to this skill</button></div></div>`;
    openSheet(s.id, push);
  }
  $('#detail').addEventListener('close', () => {
    Sound?.stop(); Sound?.sfx.close();
    if (location.hash.startsWith('#skill=')) history.replaceState(null, '', location.pathname + location.search);
  });
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) closeSheet(d); }));
  document.addEventListener('shelf-sound', e => { if (!e.detail) $('#detail .listen')?.classList.remove('speaking'); });

  // ---------- events ----------
  function render() { renderTabs(); renderShelf(); }
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.skill) { lastClick = t; openSkill(t.dataset.skill); }
    else if (t.dataset.listen) {
      if (t.classList.contains('speaking')) { Sound?.stop(); t.classList.remove('speaking'); }
      else {
        if (Sound && !Sound.on) Sound.set(true);
        const item = items.find(x => x.id === t.dataset.listen); if (item) speak(item);
      }
    }
    else if (t.dataset.cat) { state.cat = t.dataset.cat; render(); if (matchMedia('(max-width: 760px)').matches) $('#shelf').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
    else if (t.dataset.step) { state.pick = (state.pick + Number(t.dataset.step) + picks.length) % picks.length; renderPick(); }
    else if (t.dataset.copy !== undefined) copy(t.dataset.copy, t.dataset.done || 'Copied. Paste it into Claude.');
    else if (t.dataset.share) copy(pageUrl() + '#skill=' + t.dataset.share, 'Link copied. Send it to a friend.');
    else if (t.dataset.download) download(t.dataset.download);
    else if (t.dataset.way) {
      const sheet = t.closest('.sheet');
      sheet.querySelectorAll('.way').forEach(b => b.setAttribute('aria-selected', String(b === t)));
      sheet.querySelectorAll('.way-panel').forEach(p => { p.hidden = p.dataset.panel !== t.dataset.way; });
    }
    else if (t.hasAttribute('data-close')) closeSheet(t.closest('dialog'));
    else if (t.id === 'clear') { state.cat = 'all'; state.q = ''; state.easy = false; $('#q').value = ''; $('#easy').checked = false; render(); }
    else if (t.id === 'open-guide') $('#guide').showModal();
    else if (t.id === 'share-page') copy(pageUrl(), 'Page link copied.');
  });
  $('#q').addEventListener('input', e => { state.q = e.target.value.trim(); renderShelf(); });
  $('#easy').addEventListener('change', e => { state.easy = e.target.checked; renderShelf(); });
  window.addEventListener('hashchange', () => { const m = /^#skill=([\w-]+)/.exec(location.hash); if (m) openSkill(m[1], false); else if ($('#detail').open) $('#detail').close(); });

  // ---------- start ----------
  const askedCat = new URLSearchParams(location.search).get('cat');   // from the homepage category cards
  if (cats[askedCat]) state.cat = askedCat;
  renderPick();
  render();
  const start = /^#skill=([\w-]+)/.exec(location.hash);
  if (start) openSkill(start[1], false);
  else if (location.hash === '#guide') $('#guide').showModal();
})();
