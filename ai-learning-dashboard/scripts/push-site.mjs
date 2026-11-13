// Push this folder to the live site (GitHub repo mukhrizizraf/website-design-idea, subfolder ai-learning-dashboard).
//
//   npm run push-site                          -> shows what is new or changed compared with GitHub, changes nothing
//   npm run push-site -- --yes -m "message"    -> copies those files, runs the tests, commits and pushes
//
// Why a fresh clone in a temp folder: git data inside Google Drive gets corrupted by sync, so the repo never lives
// in Drive. Files only on GitHub are never deleted (another session may have added them). Line endings are ignored
// when comparing text, so a CRLF-only difference is not a change.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/mukhrizizraf/website-design-idea.git';
const SUB = 'ai-learning-dashboard';
const SKIP_DIRS = new Set(['node_modules', 'dist', 'data', '.github', '.git', '.jury', '.claude', '__pycache__']);
const SKIP_EXT = new Set(['.mp4', '.zip']);
const TEXT_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.svg', '.py', '.webmanifest', '.yml', '.yaml', '.xml', '.csv', '.gitignore']);

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const mi = args.findIndex(a => a === '-m' || a === '--message');
const message = mi >= 0 ? args[mi + 1] : '';
if (yes && !message) { console.error('Add a commit message: npm run push-site -- --yes -m "what changed"'); process.exit(2); }

const source = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name), st = statSync(full);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(full, out); }
    else if (!SKIP_EXT.has(extname(name).toLowerCase())) out.push(full);
  }
  return out;
}
const isText = file => TEXT_EXT.has(extname(file).toLowerCase()) || TEXT_EXT.has(file.split(sep).pop());
const same = (a, b) => {
  const x = readFileSync(a), y = readFileSync(b);
  if (!isText(a)) return x.equals(y);
  const n = buf => buf.toString('utf8').replace(/\r\n/g, '\n');
  return n(x) === n(y);
};

const tmp = mkdtempSync(join(tmpdir(), 'skill-shelf-push-'));
console.log('Fresh copy of GitHub ->', tmp);
git(tmp, 'clone', '--quiet', '--depth', '5', REPO, 'repo');
const repo = join(tmp, 'repo'), target = join(repo, SUB);
console.log('GitHub is at:', git(repo, 'log', '--oneline', '-1'));

const added = [], changed = [];
for (const file of walk(source)) {
  const rel = relative(source, file), dest = join(target, rel);
  if (!existsSync(dest)) added.push(rel);
  else if (!same(file, dest)) changed.push(rel);
}
const show = (label, list) => { if (list.length) { console.log(`\n${label} (${list.length}):`); list.forEach(f => console.log('  ' + f.split(sep).join('/'))); } };
show('Changed', changed);
show('New', added);
const files = [...changed, ...added];
if (!files.length) { console.log('\nNothing to push: GitHub already matches this folder.'); rmSync(tmp, { recursive: true, force: true }); process.exit(0); }
if (!yes) {
  console.log('\nNothing was changed. Check the list, then run:\n  npm run push-site -- --yes -m "what changed"');
  rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}

for (const rel of files) { const dest = join(target, rel); mkdirSync(dirname(dest), { recursive: true }); copyFileSync(join(source, rel), dest); }
console.log('\nRunning the tests in the copy...');
try { execFileSync('npm', ['test'], { cwd: target, stdio: 'inherit', shell: true }); }
catch { console.error(`\nTests failed: nothing was pushed. The copy is kept at ${repo}`); process.exit(1); }

git(repo, 'add', '-A');
execFileSync('git', ['-c', 'user.name=mukhrizizraf', '-c', 'user.email=mukhrizizraf@users.noreply.github.com', 'commit', '--quiet', '-m', message], { cwd: repo, stdio: 'inherit' });
git(repo, 'push', '--quiet', 'origin', 'main');
console.log('\nPushed:', git(repo, 'log', '--oneline', '-1'));
console.log('Live in about a minute: https://mukhrizizraf.github.io/website-design-idea/ai-learning-dashboard/');
rmSync(tmp, { recursive: true, force: true });
