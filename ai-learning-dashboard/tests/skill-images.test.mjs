import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { createServer } from '../server.mjs';

test('every skill and collection has distinct transparent upload artwork and a web image', async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(await readFile('public/skills.js', 'utf8'), context);
  vm.runInContext(await readFile('public/skill-images.js', 'utf8'), context);
  const { SKILL_DATA: data, SkillImages: art } = context.window;
  const items = [...data.skills, ...(data.collections || [])];
  assert.equal(art.ids.length, items.length);
  const hashes = new Set();
  for (const item of items) {
    assert.ok(art.ids.includes(item.id), item.id);
    for (const format of ['png', 'webp']) {
      const bytes = await readFile('public/' + art.src(item.id, format).slice(2));
      assert.ok(bytes.length > 1000, item.id + ' ' + format);
      if (format === 'png') {
        assert.equal(bytes.readUInt32BE(16), 512);
        assert.equal(bytes.readUInt32BE(20), 512);
        assert.equal(bytes[25], 6, 'RGBA PNG: ' + item.id);
        hashes.add(createHash('sha256').update(bytes).digest('hex'));
      } else {
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      }
    }
    assert.match(art.markup(item.id), /alt=""/);
  }
  assert.equal(hashes.size, items.length, 'Each skill has different artwork');
  assert.equal(art.src('../data/lessons'), '');
  assert.equal(art.src(items[0].id, 'html'), '');
  const embedded = vm.createContext({ window: {} });
  vm.runInContext(await readFile('public/skill-images-home.js', 'utf8'), embedded);
  assert.equal(Object.keys(embedded.window.SkillImagesHome).length, 9);
  for (const src of Object.values(embedded.window.SkillImagesHome)) assert.match(src, /^data:image\/webp;base64,/);
});

test('the local server serves the entire image manifest with correct types and isolates private paths', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base + '/assets/skills/manifest.json');
    assert.equal(response.status, 200);
    const manifest = await response.json();
    assert.equal(manifest.length, 44);
    for (const skill of manifest) {
      for (const format of ['png', 'webp']) {
        const image = await fetch(base + '/assets/skills/' + skill[format]);
        assert.equal(image.status, 200, skill.id + ' ' + format);
        assert.equal(image.headers.get('content-type'), 'image/' + format);
      }
    }
    assert.equal((await fetch(base + '/assets/skills/not-a-skill.png')).status, 404);
    assert.equal((await fetch(base + '/docs/skill-image-sources.json')).status, 404);
    assert.equal((await fetch(base + '/assets/skills/index.html')).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
