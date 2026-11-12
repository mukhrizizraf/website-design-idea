// AI Skill Shelf: the funky "vibing on Claude" background shared by both pages.
// Tilted ribbons scroll real prompts from skills.js, behind everything.
(() => {
  'use strict';
  const D = window.SKILL_DATA;
  if (!D) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const home = !!document.getElementById('stage');

  // Real things people say to Claude, taken from the skills themselves.
  const says = D.skills.map(s => s.say).filter(Boolean)
    .map(t => t.replace(/<[^>]*>/g, '…').replace(/https?:\/\/\S+/g, 'my site').replace(/\s+/g, ' ').trim())
    .filter(t => t.length < 110);
  const half = Math.ceil(says.length / 2);
  const a = says.slice(0, half), b = says.slice(half).reverse();
  const ribbon = (cls, list) => `<div class="ribbon ${cls}"><div class="ribbon-track">${[...list, ...list].map(t => `<span>“${esc(t)}”</span><b>✦</b>`).join('')}</div></div>`;



  const layer = document.createElement('div');
  layer.className = 'vibe' + (home ? ' vibe-home' : ' vibe-shelf');
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = ribbon('r1', a) + ribbon('r2', b);
  document.body.prepend(layer);
})();
