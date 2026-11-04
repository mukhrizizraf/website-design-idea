// Inlines the font and logos so the concept is one offline file (the studios must work with no internet).
//   node build.mjs   ->   ../index.html (or ../home-concept-v2.html in the Drive project)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const b64 = p => readFileSync(p).toString('base64');
const brand = existsSync(join(here, 'brand')) ? join(here, 'brand') : join(here, '../../07_Codex_Analysis/dashboard/brand');
const output = join(here, existsSync(join(here, '../../07_Codex_Analysis')) ? '../home-concept-v2.html' : '../index.html');
const font = join(here, 'archivo-latin.woff2');
if (!existsSync(font)) throw new Error('archivo-latin.woff2 missing next to build.mjs');
const css = readFileSync(join(here, 'hero.css'), 'utf8').replace('__FONT__', b64(font)).replace('__POSTER__', existsSync(join(here, 'poster.jpg')) ? b64(join(here, 'poster.jpg')) : '');
const out = readFileSync(join(here, 'hero.src.html'), 'utf8')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => readFileSync(join(here, 'hero.js'), 'utf8'))
  .replace('__MPOB__', 'data:image/svg+xml;base64,' + b64(join(brand, 'mpob.svg')))
  .replace('__UKM__', 'data:image/png;base64,' + b64(join(brand, 'ukm.png')));
writeFileSync(output, out);
console.log('built', Math.round(out.length / 1024), 'KB');
