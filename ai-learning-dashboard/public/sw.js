const CACHE = 'ai-skill-shelf-art-v3';
const ASSETS = ["shelf.html","shelf.css?v=20261113-art","pop.css?v=20261112-cards","skills.js?v=20261113-jury2","motion.js?v=20261113-jury","toys.js?v=20261113-jury","skill-images.js?v=20261113-art","skill-images.css?v=20261113-art","shelf.js?v=20261113-art","app.js?v=20261112-books","favicon.svg","manifest.webmanifest","app-icon-192.png","app-icon-512.png","assets/skills/animation-vocabulary.webp","assets/skills/awwwards.webp","assets/skills/jury.webp","assets/skills/frontend-design.webp","assets/skills/design-dna.webp","assets/skills/design-inspiration.webp","assets/skills/canvas-design.webp","assets/skills/theme-factory.webp","assets/skills/emil-design-eng.webp","assets/skills/apple-design.webp","assets/skills/mobile-native.webp","assets/skills/break-ui.webp","assets/skills/brand-guidelines.webp","assets/skills/algorithmic-art.webp","assets/skills/web-artifacts-builder.webp","assets/skills/genjutsu.webp","assets/skills/figma.webp","assets/skills/motion-design.webp","assets/skills/animate.webp","assets/skills/find-animation-opportunities.webp","assets/skills/review-animations.webp","assets/skills/improve-animations.webp","assets/skills/animation-performance.webp","assets/skills/gsap.webp","assets/skills/threejs.webp","assets/skills/slack-gif-creator.webp","assets/skills/humanizer.webp","assets/skills/deep-research.webp","assets/skills/llm-council.webp","assets/skills/econ-write.webp","assets/skills/doc-coauthoring.webp","assets/skills/internal-comms.webp","assets/skills/pptx.webp","assets/skills/docx.webp","assets/skills/xlsx.webp","assets/skills/pdf.webp","assets/skills/superpowers.webp","assets/skills/webapp-testing.webp","assets/skills/mcp-builder.webp","assets/skills/engineering.webp","assets/skills/skill-creator.webp","assets/skills/tiktok-reader.webp","assets/skills/claude-mem.webp","assets/skills/prompt-motion-design-ideas.webp"];
const assetUrls = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assetUrls)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ai-skill-shelf-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Cache only this app's public files; API traffic is never intercepted.
  if (event.request.mode === 'navigate' && url.pathname.endsWith('/shelf.html')) {
    event.respondWith(fetch(event.request).then(async response => {
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(new URL('shelf.html', self.registration.scope).href, response.clone()); }
      return response;
    }).catch(() => caches.match(new URL('shelf.html', self.registration.scope).href)));
  } else if (assetUrls.includes(url.href)) {
    // Revalidate public assets so a later deploy cannot leave stale data behind.
    event.respondWith(fetch(event.request).then(async response => {
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(event.request, response.clone()); }
      return response;
    }).catch(() => caches.match(event.request)));
  }
});
