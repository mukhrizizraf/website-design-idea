// Check the skill showcase data so a typo in skills.js never breaks the live page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/skills.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const D = context.window.SKILL_DATA;

test('skill data loads and has the expected sections', () => {
  assert.ok(D, 'window.SKILL_DATA is defined');
  for (const key of ['categories', 'levels', 'sources', 'featured', 'skills']) assert.ok(D[key], `${key} exists`);
  assert.ok(D.skills.length >= 10);
});

test('every skill is complete and points at real categories, levels and sources', () => {
  const ids = new Set();
  const cats = new Set(D.categories.map(c => c.id));
  for (const s of D.skills) {
    assert.match(s.id, /^[a-z0-9-]+$/, `id ${s.id}`);
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`); ids.add(s.id);
    assert.ok(cats.has(s.cat), `${s.id}: unknown category ${s.cat}`);
    assert.ok(D.levels[s.level], `${s.id}: unknown level ${s.level}`);
    assert.ok(D.sources[s.src], `${s.id}: unknown source ${s.src}`);
    for (const f of ['title', 'icon', 'what', 'say']) assert.ok(String(s[f] || '').trim(), `${s.id}: missing ${f}`);
    assert.ok(Array.isArray(s.useFor) && s.useFor.length >= 2 && s.useFor.length <= 3, `${s.id}: useFor needs 2-3 items`);
    if (s.members) for (const m of s.members) assert.ok(Array.isArray(m) && m.length === 2 && m[0] && m[1], `${s.id}: bad member`);
  }
  for (const id of D.featured) assert.ok(ids.has(id), `featured ${id} exists`);
});

test('source links are https GitHub pages or empty', () => {
  for (const [k, src] of Object.entries(D.sources)) {
    assert.ok(src.name, `${k}: name`);
    if (src.url) assert.match(src.url, /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/, `${k}: url`);
  }
});

test('the main page loads the showcase scripts', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<script defer src="\.\/skills\.js"><\/script>/);
  assert.match(html, /<script defer src="\.\/showcase\.js"><\/script>/);
});
