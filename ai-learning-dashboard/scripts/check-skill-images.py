"""Browser verification of skill artwork on desktop, phone, sheets and home."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'skill-image-checks'
OUT.mkdir(exist_ok=True)
BASE = 'http://127.0.0.1:4187'
errors = []
checks = {}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1365, 'height': 900}, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/shelf.html', wait_until='networkidle')
    page.wait_for_selector('.book .skill-art img')
    page.locator('.book .skill-art img').evaluate_all("images => images.forEach(image => image.loading = 'eager')")
    page.wait_for_function("() => [...document.querySelectorAll('.book .skill-art img')].every(i => i.complete && i.naturalWidth > 0)")
    checks['libraryImages'] = page.locator('.book .skill-art img').count()
    assert checks['libraryImages'] == 44
    checks['uniqueSources'] = page.locator('.book .skill-art img').evaluate_all('images => new Set(images.map(i => i.currentSrc)).size')
    assert checks['uniqueSources'] == 44
    page.screenshot(path=str(OUT / 'library-desktop.png'), full_page=True)
    page.locator('#q').fill('Animation Dictionary')
    assert page.locator('.book').count() == 1
    page.locator('.book').click()
    page.wait_for_selector('#detail[open] .skill-art img')
    page.wait_for_function("() => document.querySelector('#detail .skill-art img').naturalWidth > 0")
    assert 'animation-vocabulary' in page.locator('#detail .skill-art img').get_attribute('src')
    page.screenshot(path=str(OUT / 'detail-desktop.png'))
    page.keyboard.press('Escape')
    page.locator('#q').fill('')
    checks['searchAndDetails'] = True
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(BASE + '/shelf.html?cat=motion', wait_until='networkidle')
    page.locator('.book .skill-art img').evaluate_all("images => images.forEach(image => image.loading = 'eager')")
    page.wait_for_function("() => [...document.querySelectorAll('.book .skill-art img')].every(i => i.complete && i.naturalWidth > 0)")
    checks['mobileMotionImages'] = page.locator('.book .skill-art img').count()
    assert checks['mobileMotionImages'] == 11
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT / 'motion-phone.png'), full_page=True)
    page.locator('[data-skill="review-animations"]').click()
    page.wait_for_function("() => document.querySelector('#detail .skill-art img').naturalWidth > 0")
    page.screenshot(path=str(OUT / 'detail-phone.png'))
    checks['mobileDetails'] = True
    # Direct disk entry: images work without a local web server.
    page.goto((ROOT / 'public' / 'shelf.html').as_uri(), wait_until='networkidle')
    page.locator('.book .skill-art img').evaluate_all("images => images.forEach(image => image.loading = 'eager')")
    page.wait_for_function("() => [...document.querySelectorAll('.book .skill-art img')].every(i => i.complete && i.naturalWidth > 0)")
    checks['diskLibraryImages'] = page.locator('.book .skill-art img').count()
    page.set_viewport_size({'width': 1365, 'height': 900})
    page.goto(BASE + '/index.html#pop=humanizer', wait_until='networkidle')
    page.wait_for_function("() => document.querySelector('#pop .skill-art img')?.naturalWidth > 0")
    checks['homePopupImage'] = True
    page.screenshot(path=str(OUT / 'home-popup.png'))
    page.keyboard.press('Escape')
    page.wait_for_function("() => document.documentElement.classList.contains('ready') || document.querySelector('#front-link').textContent !== 'Open the front book'", timeout=60000)
    page.wait_for_timeout(1500)
    assert not page.locator('html.no-webgl').count()
    checks['homeEmbeddedCovers'] = page.evaluate('Object.keys(window.SkillImagesHome).length')
    page.screenshot(path=str(OUT / 'home-desktop.png'))
    page.goto((ROOT / 'index.html').as_uri(), wait_until='networkidle')
    page.wait_for_function("() => document.querySelector('#front-link') && document.querySelector('#front-link').textContent !== 'Open the front book'", timeout=60000)
    checks['diskHomepage'] = not bool(page.locator('html.no-webgl').count())
    assert checks['diskHomepage']
    checks['pageErrors'] = errors
    assert not errors, errors
    browser.close()
(OUT / 'results.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
print(json.dumps(checks, indent=2))
