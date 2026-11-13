// Individual generated artwork. Add a skill ID here after creating its matching assets.
(() => {
  'use strict';
  const ids = Object.freeze([
  "animation-vocabulary",
  "awwwards",
  "jury",
  "frontend-design",
  "design-dna",
  "design-inspiration",
  "canvas-design",
  "theme-factory",
  "emil-design-eng",
  "apple-design",
  "mobile-native",
  "break-ui",
  "brand-guidelines",
  "algorithmic-art",
  "web-artifacts-builder",
  "genjutsu",
  "figma",
  "motion-design",
  "animate",
  "find-animation-opportunities",
  "review-animations",
  "improve-animations",
  "animation-performance",
  "gsap",
  "threejs",
  "slack-gif-creator",
  "humanizer",
  "deep-research",
  "llm-council",
  "econ-write",
  "doc-coauthoring",
  "internal-comms",
  "pptx",
  "docx",
  "xlsx",
  "pdf",
  "superpowers",
  "webapp-testing",
  "mcp-builder",
  "engineering",
  "skill-creator",
  "tiktok-reader",
  "claude-mem",
  "prompt-motion-design-ideas"
]);
  const known = new Set(ids);
  const src = (id, format = 'webp') => known.has(id) && ['webp', 'png'].includes(format) ? './assets/skills/' + id + '.' + format : '';
  const markup = (id, lazy = true) => src(id) ? `<picture class="skill-art"><source type="image/webp" srcset="${src(id)}"><img src="${src(id, 'png')}" width="256" height="256" alt="" decoding="async"${lazy ? ' loading="lazy"' : ''}></picture>` : '';
  window.SkillImages = Object.freeze({ ids, src, markup });
})();
