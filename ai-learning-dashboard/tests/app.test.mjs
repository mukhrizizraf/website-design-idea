import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';

test('installable library serves its manifest, icons and every offline asset', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const entry = await fetch(base);
    assert.match(await entry.text(), /id="library-title"/);
    const manifestResponse = await fetch(base + '/manifest.webmanifest');
    assert.match(manifestResponse.headers.get('content-type'), /manifest\+json/);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, './shelf.html');
    for (const icon of manifest.icons) {
      const response = await fetch(new URL(icon.src, base + '/'));
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /image\/png/);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
      assert.equal(bytes.readUInt32BE(20), Number(icon.sizes.split('x')[1]));
    }
    const swResponse = await fetch(base + '/sw.js');
    assert.match(swResponse.headers.get('content-type'), /javascript/);
    const sw = await swResponse.text();
    const assetList = /const ASSETS = (\[[^;]+\]);/.exec(sw)[1];
    const assets = JSON.parse(assetList.replaceAll("'", '"'));
    for (const asset of assets) assert.equal((await fetch(base + '/' + asset)).status, 200, asset);
    const html = await (await fetch(base + '/shelf.html')).text();
    for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) {
      if (/\.(?:css|js)(?:\?|$)/.test(match[1])) assert.ok(assets.includes(match[1]), `${match[1]} available offline`);
    }
    assert.equal((await fetch(base + '/data/lessons.json')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
