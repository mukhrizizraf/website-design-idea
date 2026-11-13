"""Verify spare asset files, complete upload archives and the visual catalogue."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets' / 'future-skills'
manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
original = json.loads((ROOT / 'public' / 'assets' / 'skills' / 'manifest.json').read_text(encoding='utf-8'))
assert len(manifest) == 20
assert len({s['id'] for s in manifest}) == 20
hashes = {s['sha256'] for s in original}
for item in manifest:
    for kind, side in [('png', 512), ('webp', 256)]:
        asset = OUT / item[kind]
        with Image.open(asset) as image:
            assert image.size == (side, side), item['id']
            assert image.mode == 'RGBA', item['id']
            assert image.getchannel('A').getextrema() == (0, 255), item['id']
        assert (ROOT / 'dist' / 'assets' / 'future-skills' / item[kind]).read_bytes() == asset.read_bytes()
    digest = hashlib.sha256((OUT / item['png']).read_bytes()).hexdigest()
    assert digest == item['sha256']
    assert digest not in hashes, item['id']
    hashes.add(digest)
assert len(hashes) == 64
for name, count in [('future-skill-icons-upload.zip', 20), ('skill-images-upload.zip', 64)]:
    with zipfile.ZipFile(ROOT / name) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert len([n for n in names if n.endswith('.webp')]) == count
        assert len([n for n in names if n.endswith('.png') and not n.endswith('/contact-sheet.png')]) == count
        for item in manifest:
            assert archive.read('assets/future-skills/' + item['png']) == (OUT / item['png']).read_bytes()
shots = ROOT / 'docs' / 'future-icon-checks'
shots.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1365, 'height': 900})
    page.goto((OUT / 'index.html').as_uri(), wait_until='networkidle')
    page.wait_for_function("() => [...document.images].every(image => image.complete && image.naturalWidth === 256)")
    assert page.locator('article').count() == 20
    assert page.locator('a[download]').count() == 60
    page.screenshot(path=str(shots / 'catalogue-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(shots / 'catalogue-phone.png'))
    browser.close()
print('Verified 20 unique spare icons; all 64 artwork hashes are distinct.')
print('PNG/WebP dimensions, transparency, dist copies, both ZIPs and desktop/phone catalogue passed.')
