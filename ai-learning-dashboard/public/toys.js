// AI Skill Shelf: cartoon 3D "toys", one per category, shared by both pages.
// Chunky outlines and flat bright colours (cartoon style). Each toy is stacked in layers so it
// has real thickness when it turns, and each one moves in its own way (see .toy-* in pop.css).
(() => {
  'use strict';
  const O = 'stroke="#1d1d1f" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
  const ART = {
    // Paint palette with blobs of paint and a brush
    design: `<path d="M50 14C28 14 12 29 12 48c0 17 13 28 26 28 6 0 8-4 8-8 0-5 4-8 9-8h9c12 0 22-8 22-21C86 25 70 14 50 14Z" fill="#ffd27a" ${O}/>
      <circle cx="30" cy="44" r="6" fill="#ff375f" ${O}/><circle cx="38" cy="28" r="6" fill="#ffd60a" ${O}/>
      <circle cx="56" cy="25" r="6" fill="#30d158" ${O}/><circle cx="71" cy="36" r="6" fill="#0a84ff" ${O}/>
      <g class="toy-brush"><path d="M62 92 82 54" stroke="#1d1d1f" stroke-width="11" stroke-linecap="round"/><path d="M62 92 82 54" stroke="#c97a3a" stroke-width="5" stroke-linecap="round"/>
      <path d="M80 52l6-12 6 4-4 12Z" fill="#bf5af2" ${O}/></g>`,
    // Film clapperboard whose top arm snaps shut
    motion: `<rect x="14" y="40" width="72" height="44" rx="6" fill="#1d1d1f" ${O}/>
      <rect x="20" y="50" width="60" height="28" rx="3" fill="#fff" ${O}/>
      <path d="M28 58h44M28 68h30" stroke="#bf5af2" stroke-width="5" stroke-linecap="round"/>
      <g class="toy-arm"><path d="M14 40 20 18l70 10-4 12Z" fill="#fff" ${O}/>
      <path d="M30 20l-6 18M48 23l-6 18M66 26l-6 18M84 28l-4 12" stroke="#1d1d1f" stroke-width="7"/></g>`,
    // Pencil that scribbles
    writing: `<g class="toy-pencil"><path d="M24 76 70 30l12 12-46 46Z" fill="#ffd60a" ${O}/>
      <path d="M70 30l8-8a6 6 0 0 1 9 0l3 3a6 6 0 0 1 0 9l-8 8Z" fill="#ff7aa8" ${O}/>
      <path d="M66 34l12 12" stroke="#1d1d1f" stroke-width="4"/>
      <path d="M24 76l-8 20 20-8Z" fill="#ffe2b8" ${O}/><path d="M16 96l3-8 5 5Z" fill="#1d1d1f"/></g>
      <path class="toy-scribble" d="M10 96c10-6 16 4 26-2" fill="none" stroke="#0a84ff" stroke-width="4" stroke-linecap="round"/>`,
    // Stack of papers with a paperclip
    docs: `<rect x="26" y="20" width="52" height="66" rx="6" fill="#bfe0ff" ${O} transform="rotate(8 52 53)"/>
      <rect x="22" y="16" width="52" height="66" rx="6" fill="#fff" ${O}/>
      <path d="M32 34h32M32 44h32M32 54h22M32 64h28" stroke="#0a84ff" stroke-width="5" stroke-linecap="round"/>
      <path d="M62 8v22a6 6 0 0 1-12 0V14" fill="none" stroke="#1d1d1f" stroke-width="8" stroke-linecap="round"/>
      <path d="M62 8v22a6 6 0 0 1-12 0V14" fill="none" stroke="#c7ccd6" stroke-width="3" stroke-linecap="round"/>`,
    // Laptop with code on the screen
    coding: `<rect x="18" y="20" width="64" height="44" rx="6" fill="#1d1d1f" ${O}/>
      <rect x="24" y="26" width="52" height="32" rx="3" fill="#30d158" class="toy-screen"/>
      <path d="M40 34l-8 8 8 8M60 34l8 8-8 8M54 32l-8 20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8 70h84l-6 12H14Z" fill="#c7ccd6" ${O}/><path d="M42 76h16" stroke="#1d1d1f" stroke-width="4" stroke-linecap="round"/>`,
    // Friendly robot head with a blinking antenna
    workflow: `<path d="M50 8v12" stroke="#1d1d1f" stroke-width="4"/><circle cx="50" cy="8" r="6" fill="#ff375f" ${O} class="toy-bulb"/>
      <rect x="18" y="20" width="64" height="56" rx="16" fill="#ff7ab8" ${O}/>
      <rect x="10" y="40" width="10" height="18" rx="4" fill="#bf5af2" ${O}/><rect x="80" y="40" width="10" height="18" rx="4" fill="#bf5af2" ${O}/>
      <rect x="28" y="32" width="44" height="26" rx="10" fill="#fff" ${O}/>
      <g class="toy-eyes"><circle cx="40" cy="45" r="5" fill="#1d1d1f"/><circle cx="60" cy="45" r="5" fill="#1d1d1f"/>
      <circle cx="42" cy="43" r="1.6" fill="#fff"/><circle cx="62" cy="43" r="1.6" fill="#fff"/></g>
      <path d="M40 66c6 5 14 5 20 0" fill="none" stroke="#1d1d1f" stroke-width="4" stroke-linecap="round"/>`,
    all: `<rect x="14" y="14" width="32" height="32" rx="9" fill="#ff375f" ${O}/><rect x="54" y="14" width="32" height="32" rx="9" fill="#ffd60a" ${O}/>
      <rect x="14" y="54" width="32" height="32" rx="9" fill="#0a84ff" ${O}/><rect x="54" y="54" width="32" height="32" rx="9" fill="#30d158" ${O}/>`
  };
  const LAYERS = 6;                         // depth slices behind the front face
  function toy(cat, cls = '') {
    const art = ART[cat] || ART.all;
    const back = Array.from({ length: LAYERS }, (_, i) =>
      `<svg class="toy-slice" viewBox="0 0 100 100" style="--z:${-(i + 1) * 1.6}px">${art}</svg>`).join('');
    return `<span class="toy toy-${cat} ${cls}" aria-hidden="true"><span class="toy-spin">${back}<svg class="toy-face" viewBox="0 0 100 100">${art}</svg></span></span>`;
  }
  window.ShelfToys = { toy };
  // Keep categories within reach without altering the WebGL book scene.
  if (document.getElementById('stage') && window.SKILL_DATA) {
    const dock = document.createElement('nav');
    dock.className = 'category-dock'; dock.setAttribute('aria-label', 'Skill categories');
    dock.innerHTML = window.SKILL_DATA.categories.map(c => '<a class="dock-item" href="./shelf.html?cat=' + c.id + '" aria-label="' + c.label.replace(/&/g, '&amp;') + '">' + toy(c.id, 'dock-toy') + '<span>' + (c.short || c.label) + '</span></a>').join('');
    document.body.appendChild(dock);
  }
})();
