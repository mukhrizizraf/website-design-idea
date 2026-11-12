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
  // Every skill has its own symbol (shared by the library and the homepage cards).
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
  const glyph = id => G[SKILL_GLYPH[id]] || G.cube;
  // Every skill gets its own colour pair: hues spread by the golden ratio of a 270-degree range that skips greens (owner preference).
  const color = id => {
    const list = (window.SKILL_DATA && window.SKILL_DATA.skills) || [];
    let i = list.findIndex(s => s.id === id);
    if (i < 0) i = [...String(id)].reduce((n, ch) => n + ch.charCodeAt(0), 0);
    const h = (170 + (i * 166.87) % 270) % 360;
    let h2 = (h + 28) % 360; if (h2 > 80 && h2 < 170) h2 = (h + 332) % 360;
    return { a: 'hsl(' + h.toFixed(0) + ' 86% 57%)', b: 'hsl(' + h2.toFixed(0) + ' 95% 63%)' };
  };
  // One cover colour per skill on both pages: the nine homepage books keep the colours they have in the 3D loop
  // (same order as CARTOON in index.html); the library fills in the rest so neighbours never match.
  const HOME_COVERS = { 'tiktok-reader': '#ff3b30', awwwards: '#2f6bff', 'canvas-design': '#ffd60a', 'motion-design': '#a259ff', humanizer: '#ff8a00', pptx: '#4cc9ff', gsap: '#ff5fa2', 'frontend-design': '#1d1d1f', 'deep-research': '#fff1c9' };
  window.ShelfToys = { toy, glyph, color, G, SKILL_GLYPH, HOME_COVERS };
  // Keep categories within reach without altering the WebGL book scene.
  if (document.body.dataset.page === 'home' && window.SKILL_DATA) {
    const dock = document.createElement('nav');
    dock.className = 'category-dock'; dock.setAttribute('aria-label', 'Skill categories');
    dock.innerHTML = window.SKILL_DATA.categories.map(c => '<a class="dock-item" href="./shelf.html?cat=' + c.id + '" aria-label="' + c.label.replace(/&/g, '&amp;') + '">' + toy(c.id, 'dock-toy') + '<span>' + (c.short || c.label) + '</span></a>').join('');
    document.body.appendChild(dock);
  }
})();
