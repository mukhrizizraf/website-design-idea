// Acceptance checks on the built page, in a real browser on the real GPU:   node test.mjs
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(join(here, existsSync(join(here, '../../07_Codex_Analysis')) ? '../home-concept-v2.html' : '../index.html')).href;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9500 + Math.floor(Math.random() * 400);
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--use-angle=d3d11', '--ignore-gpu-blocklist', `--user-data-dir=${join(tmpdir(), 'mpob-cdp-' + port)}`, 'about:blank'], { stdio: 'ignore' });
let t; for (let i = 0; i < 60 && !t; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(150); } }
const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(), problems = [], requests = [];
ws.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') problems.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Network.requestWillBeSent' && !/^(file|data|blob):/.test(m.params.request.url)) requests.push(m.params.request.url); });
const send = (method, params = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const run = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const size = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
const nav = async q => { await send('Page.navigate', { url: page + q }); for (let i = 0; i < 300; i++) { await sleep(100); if (await run('!!window.__heroReady||!!window.__heroError')) break; } const e = await run('window.__heroError||""'); if (e) problems.push(e); };
let pass = 0, fail = 0; const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`); };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });

await size(1280, 720);
await nav('?tier=1');
ok('3D started with no shader or script error', problems.length === 0, problems[0]?.slice(0, 160));
ok('works with no network: nothing fetched from outside the file', requests.length === 0, requests[0]);
const word = (await run('window.__hero.stats')).word;
ok('the D has a real hole the camera fits through', word.hole > 18, word.hole.toFixed(1) + ' m wide');

// Rail: a chapter button flies there; any wheel input takes over at once.
await run(`document.querySelectorAll('#rail button')[3].click();true`); await sleep(3600);
let g = (await run('window.__hero.stats')).g;
ok('rail button flies to Shock test', Math.abs(g - 3) < .05, 'g=' + g.toFixed(3));
ok('its chapter words are visible and clickable', await run(`(()=>{const e=document.querySelector('.ch[data-i="3"]');return +e.style.opacity>.9&&e.classList.contains('live')})()`));
ok('other chapter words are hidden', await run(`(()=>{const e=document.querySelector('.ch[data-i="5"]');return e.style.visibility==='hidden'})()`));

// Play moves the flight; Pause stops it.
const y0 = await run('scrollY'); await run(`document.getElementById('play').click();true`); await sleep(1500);
const y1 = await run('scrollY'); ok('Play moves the camera on', y1 > y0 + 10, Math.round(y1 - y0) + ' px');
ok('Play button now says Pause', (await run(`document.getElementById('play').textContent.trim()`)) === 'Pause');
await run(`document.getElementById('play').click();true`); await sleep(120); const y2 = await run('scrollY'); await sleep(500); const y3 = await run('scrollY');
ok('Pause stops it', Math.abs(y3 - y2) < 1);

// The blend buttons really change the drop, with a spring, by share of volume.
await run(`document.querySelectorAll('#rail button')[6].click();true`); await sleep(3800);
const peak = await run(`new Promise(r=>{document.querySelector('[data-blend="30"]').click();let m=0;const t0=performance.now();const f=n=>{m=Math.max(m,window.__hero.stats.lvl);n-t0<1400?requestAnimationFrame(f):r(m)};requestAnimationFrame(f)})`);
const lvl = (await run('window.__hero.stats')).lvl;
ok('B30 button raises the drop to 30%', Math.abs(lvl - .3) < .004, lvl.toFixed(3));
ok('it lands with a small spring overshoot', peak > .302 && peak < .32, 'peak ' + peak.toFixed(3));
ok('pressed state follows', await run(`document.querySelector('[data-blend="30"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-blend="20"]').getAttribute('aria-pressed')==='false'`));

// No sideways scroll or clipped controls from the smallest phone to desktop.
for (const [w, h, m] of [[320, 568, true], [375, 667, true], [390, 844, true], [412, 915, true], [768, 1024, true], [1024, 768, false], [1440, 900, false], [1920, 1080, false]]) {
  await size(w, h, m); await sleep(350);
  const over = await run('document.documentElement.scrollWidth-innerWidth');
  ok(`no sideways scroll at ${w}x${h}`, over <= 0, over + ' px');
  const clipped = await run(`[...document.querySelectorAll('.ch')].flatMap(c=>{const pv=c.style.visibility,pt=c.style.transform;c.style.visibility='visible';c.style.transform='none';const r=[...c.querySelectorAll('a,button,h2')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&(b.left<-1||b.right>innerWidth+1||b.top<0||b.bottom>innerHeight+1)}).map(e=>c.dataset.i+':'+e.textContent.trim().slice(0,18));c.style.visibility=pv;c.style.transform=pt;return r})`);
  ok(`every control fits on screen at ${w}x${h}`, clipped.length === 0, clipped.join(', '));
  const small = await run(`[...document.querySelectorAll('#rail button,#play,.go,.blend button,.tabs a')].filter(e=>{const b=e.getBoundingClientRect();return b.height&&b.height<(innerWidth<760?36:24)}).map(e=>e.className||e.textContent.trim().slice(0,12))`);
  if (m) ok(`tap targets are tall enough at ${w}x${h}`, small.length === 0, small.slice(0, 4).join(', '));
}
await size(1280, 720);

// Reduced motion: still pictures, nothing moves on its own.
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await nav('?tier=1'); await sleep(500);
ok('reduced motion: Play is removed', (await run(`getComputedStyle(document.getElementById('play')).display`)) === 'none');
await run(`document.querySelectorAll('#rail button')[2].click();true`); await sleep(300);
g = (await run('window.__hero.stats')).g; ok('reduced motion: rail jumps straight to the chapter', Math.abs(g - 2) < .001, 'g=' + g);
await send('Emulation.setEmulatedMedia', { features: [] });

// A browser without WebGL2 still gets the picture, the words and working links.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `HTMLCanvasElement.prototype.getContext=(o=>function(t,...a){return t==='webgl2'?null:o.call(this,t,...a)})(HTMLCanvasElement.prototype.getContext);` });
problems.length = 0; await send('Page.navigate', { url: page }); await sleep(1600);
ok('no WebGL2: no errors', problems.length === 0, problems[0]?.slice(0, 120));
ok('no WebGL2: poster picture shows', (await run(`getComputedStyle(document.getElementById('poster')).backgroundImage.startsWith('url("data:image/jpeg')`)));
ok('no WebGL2: first words visible', await run(`+document.querySelector('.ch[data-i="0"]').style.opacity>.9`));

console.log(`\n${pass} passed, ${fail} failed`); proc.kill(); process.exit(fail ? 1 : 0);
