"""Package built-in image generation output as individual app/upload assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import base64
import hashlib
import html
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets' / 'skills'
OUT.mkdir(parents=True, exist_ok=True)
sources = json.loads((ROOT / 'docs' / 'skill-image-sources.json').read_text(encoding='utf-8'))
data = json.loads(subprocess.check_output(['node', '-e', "global.window={};import('./public/skills.js').then(()=>console.log(JSON.stringify(window.SKILL_DATA)))"], cwd=ROOT, text=True, encoding='utf-8'))
items = data['skills'] + data.get('collections', [])
lookup = {s['id']: s for s in items}
manifest = []
for source in sources:
    skill_id = source['id']
    if skill_id not in lookup:
        raise ValueError(f'Unknown skill: {skill_id}')
    if not all((OUT / f'{skill_id}.{ext}').exists() for ext in ['png', 'webp']):
        with Image.open(source['path']) as original:
            image = original.convert('RGBA')
            if image.getchannel('A').getextrema()[0] != 0:
                raise ValueError(f'No transparent background: {skill_id}')
            image.resize((512, 512), Image.Resampling.LANCZOS).save(OUT / f'{skill_id}.png', optimize=True)
            image.resize((256, 256), Image.Resampling.LANCZOS).save(OUT / f'{skill_id}.webp', quality=90, method=6)
    manifest.append({'id': skill_id, 'title': lookup[skill_id]['title'], 'category': lookup[skill_id]['cat'], 'png': f'{skill_id}.png', 'webp': f'{skill_id}.webp', 'uploadSize': 512, 'appSize': 256, 'transparent': True, 'sha256': hashlib.sha256((OUT / f'{skill_id}.png').read_bytes()).hexdigest()})
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
(OUT / 'prompts.json').write_text(json.dumps({'tool': 'built-in image_gen', 'style': 'glossy miniature 3D resin and acrylic', 'prompts': [{'id': s['id'], 'prompt': s['prompt']} for s in sources]}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
cards = ''.join(f'<article><a href="{s["png"]}" download><img src="{s["webp"]}" width="160" height="160" alt="{html.escape(s["title"])} 3D icon"></a><h2>{html.escape(s["title"])}</h2><a href="{s["png"]}" download>PNG · 512px</a> <a href="{s["webp"]}" download>WebP · 256px</a></article>' for s in manifest)
(OUT / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skill images</title><style>body{font:16px/1.5 system-ui;margin:24px;background:#f5f5f7;color:#1d1d1f}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}article{background:white;padding:20px;border-radius:18px;text-align:center}img{object-fit:contain}h2{font-size:15px;min-height:45px}a{color:#174cba;font-size:13px;margin:4px}header{margin-bottom:24px}h1{font-size:28px}</style><header><h1>Individual 3D skill images</h1><p>Transparent PNGs for uploads, smaller WebPs for the app. Click an image to download its PNG.</p></header><main>' + cards + '</main></html>', encoding='utf-8')
if (ROOT / 'public' / 'assets' / 'future-skills' / 'index.html').exists():
    catalogue = OUT / 'index.html'
    catalogue.write_text(catalogue.read_text(encoding='utf-8').replace('</header>', '<p><a href="../future-skills/index.html">Browse 20 extra icons for future skills</a></p></header>', 1), encoding='utf-8')
home_ids = ['tiktok-reader', 'awwwards', 'canvas-design', 'motion-design', 'humanizer', 'pptx', 'gsap', 'frontend-design', 'deep-research']
home = {s['id']: 'data:image/webp;base64,' + base64.b64encode((OUT / s['webp']).read_bytes()).decode('ascii') for s in manifest if s['id'] in home_ids}
(ROOT / 'public' / 'skill-images-home.js').write_text('// Embedded cover art allows canvas textures when index.html opens directly from disk.\nwindow.SkillImagesHome = Object.freeze(' + json.dumps(home) + ');\n', encoding='utf-8')
sheet = Image.new('RGB', (1000, ((len(manifest) + 4) // 5) * 190), '#f5f5f7')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 12)
for i, item in enumerate(manifest):
    x, y = (i % 5) * 200, (i // 5) * 190
    with Image.open(OUT / item['webp']) as image:
        thumb = image.resize((148, 148), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 26, y + 4), thumb)
    label = item['title']
    words, line, lines = label.split(), '', []
    for word in words:
        if draw.textlength((line + ' ' + word).strip(), font=font) > 185:
            lines.append(line)
            line = word
        else:
            line = (line + ' ' + word).strip()
    lines.append(line)
    for n, line in enumerate(lines[:2]):
        draw.text((x + 100, y + 155 + n * 15), line, fill='#1d1d1f', font=font, anchor='mt')
sheet.save(OUT / 'contact-sheet.png', optimize=True)
if len(manifest) == len(items):
    archive = ROOT / 'skill-images-upload.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for folder in [OUT, ROOT / 'public' / 'assets' / 'future-skills']:
            if folder.is_dir():
                for asset in sorted(folder.iterdir()):
                    if asset.is_file():
                        bundle.write(asset, asset.relative_to(ROOT / 'public'))
    print(f'Upload archive: {archive}')
print(f'Packaged {len(manifest)}/{len(items)} unique skill images in {OUT}')
