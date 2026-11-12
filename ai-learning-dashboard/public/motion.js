// AI Skill Shelf: shared page motion.
//  - pointer parallax (--px / --py on <html>) so the background layers sit at different depths
//  - library: skill cards fly in from depth, and tilt in 3D under the pointer with a moving sheen
//  - homepage: the headline flips in letter by letter
// Everything here is decoration. With reduced motion this file does nothing.
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  // ---------- pointer parallax ----------
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const glide = () => {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08;
    root.style.setProperty('--px', cx.toFixed(3)); root.style.setProperty('--py', cy.toFixed(3));
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > .002 ? requestAnimationFrame(glide) : 0;
  };
  addEventListener('pointermove', e => {
    tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5;
    if (!raf) raf = requestAnimationFrame(glide);
  }, { passive: true });

  // ---------- library cards ----------
  const groups = document.getElementById('groups');
  if (groups) {
    // Cards that are new on screen (first load, a new category, new search results) fly in from depth.
    // Cards below the fold wait until they are scrolled into view.
    const seen = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.remove('fx-wait'); seen.unobserve(en.target); }
    }), { rootMargin: '0px 0px -6% 0px' });
    // Cubes that are off screen stop turning, so 44 cubes cost nothing while you read.
    const cubes = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('off', !en.isIntersecting)));
    let prev = new Set(), prevKey = '';
    const arrive = () => {
      const key = (document.getElementById('library-title')?.textContent || '') + '|' + (document.getElementById('shelf')?.dataset.view || '');
      const cards = [...groups.querySelectorAll('.rows > li')];
      groups.querySelectorAll('.rows .cube').forEach(c => cubes.observe(c));
      const all = key !== prevKey || !prev.size;
      let n = 0;
      cards.forEach(li => {
        const id = li.querySelector('[data-skill]')?.dataset.skill;
        if (!all && prev.has(id)) return;
        const below = li.getBoundingClientRect().top > innerHeight;
        li.style.setProperty('--fxd', (below ? (n % 3) * 70 : Math.min(n, 8) * 40) + 'ms');
        li.classList.add('fx-in');
        if (below) { li.classList.add('fx-wait'); seen.observe(li); }
        n++;
      });
      prev = new Set(cards.map(li => li.querySelector('[data-skill]')?.dataset.skill));
      prevKey = key;
    };
    new MutationObserver(arrive).observe(groups, { childList: true });
    arrive();   // the library has usually rendered already when this script runs

    // 3D tilt: the card leans toward the pointer and a sheen follows it.
    if (fine) {
      let active = null;
      const lean = (li, e) => {
        const r = li.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        li.style.setProperty('--rx', ((.5 - y) * 9).toFixed(2) + 'deg');
        li.style.setProperty('--ry', ((x - .5) * 11).toFixed(2) + 'deg');
        li.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        li.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      };
      const rest = li => { li.classList.remove('lean'); li.style.removeProperty('--rx'); li.style.removeProperty('--ry'); };
      groups.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const li = e.target.closest?.('.rows > li');
        if (active && active !== li) rest(active);
        active = li || null;
        if (!li || li.closest('[data-view="list"]')) return;
        li.classList.add('lean'); lean(li, e);
      }, { passive: true });
      groups.addEventListener('pointerleave', () => { if (active) rest(active); active = null; });
    }
  }

  // ---------- homepage headline ----------
  const h = document.querySelector('.home-hero h1 .heavy, #ch-saved h1 .heavy');
  if (h && !h.querySelector('.ch')) {
    const text = h.textContent.trim();
    h.closest('h1').setAttribute('aria-label', text);
    let n = 0;
    h.innerHTML = text.split(' ').map(word => `<span class="wd" aria-hidden="true">${[...word].map(c => `<span class="ch" style="--n:${n++}">${c}</span>`).join('')}</span>`).join(' ');
  }
})();
