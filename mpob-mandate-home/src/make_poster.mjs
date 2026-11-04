// Captures the real first frame, small, for the instant first paint:  node make_poster.mjs   then   node build.mjs
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9500 + Math.floor(Math.random() * 400);
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--use-angle=d3d11', '--ignore-gpu-blocklist', `--user-data-dir=${join(tmpdir(), 'mpob-cdp-' + port)}`, 'about:blank'], { stdio: 'ignore' });
let t; for (let i = 0; i < 60 && !t; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(150); } }
const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); ws.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const run = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;
await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 405, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(join(here, existsSync(join(here, '../../07_Codex_Analysis')) ? '../home-concept-v2.html' : '../index.html')).href + '?g=0&tier=1&shot=1' });
for (let i = 0; i < 300 && !(await run('!!window.__heroReady')); i++) await sleep(100);
await sleep(1500);
const url = await run(`document.getElementById('scene').toDataURL('image/jpeg', .62)`);
const buf = Buffer.from(url.split(',')[1], 'base64');
writeFileSync(join(here, 'poster.jpg'), buf);
console.log('poster.jpg', Math.round(buf.length / 1024), 'KB');
proc.kill();
