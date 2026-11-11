// AI Skill Shelf: the funky "vibing on Claude" background shared by both pages.
// Tilted ribbons scroll real prompts from skills.js, chat bubbles float and type,
// a sticker spins, and a giant outlined "just ask." sits behind everything.
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

  const bubbles = [
    ['me', 'Eh Claude, make me a poster ✨'], ['ai', 'typing'], ['me', 'Can you make this sound less robotic?'],
    ['ai', 'Sure! Here are 3 ideas →'], ['me', 'Build me a 3D website?'], ['ai', 'typing']
  ].map(([who, text], i) => `<div class="bubble b${i + 1} ${who}">${text === 'typing' ? '<i></i><i></i><i></i>' : esc(text)}</div>`).join('');

  const sticker = `<svg class="sticker" viewBox="0 0 200 200"><defs><path id="vibe-ring" d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0"/></defs>
    <circle cx="100" cy="100" r="96" fill="#1d1d1f"/>
    <text><textPath href="#vibe-ring" startOffset="0">MADE WITH CLAUDE ✦ JUST ASK ✦ MADE WITH CLAUDE ✦</textPath></text>
    <path class="spark" d="M100 64c4 22 14 32 36 36-22 4-32 14-36 36-4-22-14-32-36-36 22-4 32-14 36-36Z"/></svg>`;

  const layer = document.createElement('div');
  layer.className = 'vibe' + (home ? ' vibe-home' : ' vibe-shelf');
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = (home ? '' : '<div class="big-word">just ask.</div>') + ribbon('r1', a) + ribbon('r2', b) + bubbles + sticker;
  document.body.prepend(layer);
})();
