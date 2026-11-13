"""Package the twenty spare skill illustrations after generation finishes."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import html
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets' / 'future-skills'
sources = [json.loads(path.read_text(encoding='utf-8')) for path in sorted((ROOT / 'docs' / 'future-icon-sources').glob('*.json'))]
if len(sources) != 20:
    raise SystemExit(f'Waiting for the complete set: {len(sources)}/20 generated.')
OUT.mkdir(parents=True, exist_ok=True)
manifest = []
for source in sources:
    name = source['id']
    if not all((OUT / f'{name}.{ext}').exists() for ext in ['png', 'webp']):
        with Image.open(source['path']) as original:
            image = original.convert('RGBA')
            assert image.getchannel('A').getextrema() == (0, 255), name
            image.resize((512, 512), Image.Resampling.LANCZOS).save(OUT / f'{name}.png', optimize=True)
            image.resize((256, 256), Image.Resampling.LANCZOS).save(OUT / f'{name}.webp', quality=90, method=6)
    manifest.append({'id': name, 'title': source['title'], 'category': source['category'], 'status': 'available for a future skill', 'png': f'{name}.png', 'webp': f'{name}.webp', 'uploadSize': 512, 'appSize': 256, 'transparent': True, 'sha256': hashlib.sha256((OUT / f'{name}.png').read_bytes()).hexdigest()})
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(OUT / 'prompts.json').write_text(json.dumps({'tool': 'built-in image_gen', 'prompts': [{'id': s['id'], 'prompt': s['prompt']} for s in sources]}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
cards = ''.join(f'<article><a href="{s["png"]}" download><img src="{s["webp"]}" width="160" height="160" alt="{html.escape(s["title"])} 3D icon"></a><h2>{html.escape(s["title"])}</h2><p><a href="{s["png"]}" download>PNG · 512px</a> <a href="{s["webp"]}" download>WebP · 256px</a></p></article>' for s in manifest)
(OUT / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Future skill icons</title><style>body{font:16px/1.5 system-ui;margin:24px;background:#f5f5f7;color:#1d1d1f}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}article{background:white;padding:20px;border-radius:18px;text-align:center}img{object-fit:contain}h2{font-size:16px}a{color:#174cba;font-size:13px;margin:4px}header{margin-bottom:24px}h1{font-size:28px}</style><header><h1>20 icons for future skills</h1><p>Transparent 3D-style images ready for your next skills. Click an image to download its PNG.</p><a href="../skills/index.html">View the original 44 skill images</a></header><main>' + cards + '</main></html>', encoding='utf-8')
(OUT / 'README.md').write_text('# Future skill icons\n\n20 spare 3D-style illustrations for future skills.\n\n- PNG: 512 x 512, transparent, suitable for uploads.\n- WebP: 256 x 256, transparent, optimised for the app.\n- index.html: catalogue and individual download links.\n- manifest.json: suggested topics, categories, filenames and hashes.\n- prompts.json: the built-in image generation prompts.\n\nUse the filenames in the manifest when assigning an image to a future skill. These are spare assets; assigning one to a skill does not create its lesson content. The current dashboard image mapping lives in public/skill-images.js.\n', encoding='utf-8')
sheet = Image.new('RGB', (1000, 4 * 190), '#f5f5f7')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
for i, item in enumerate(manifest):
    x, y = (i % 5) * 200, (i // 5) * 190
    with Image.open(OUT / item['webp']) as im:
        thumb = im.resize((148, 148), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 26, y + 4), thumb)
    draw.text((x + 100, y + 164), item['title'], fill='#1d1d1f', font=font, anchor='mt')
sheet.save(OUT / 'contact-sheet.png', optimize=True)
for archive, folders in [('future-skill-icons-upload.zip', [OUT]), ('skill-images-upload.zip', [ROOT / 'public' / 'assets' / 'skills', OUT])]:
    with zipfile.ZipFile(ROOT / archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for folder in folders:
            for asset in sorted(folder.iterdir()):
                if asset.is_file():
                    bundle.write(asset, asset.relative_to(ROOT / 'public'))
    print(f'Created {archive}')
print(f'Packaged {len(manifest)} future skill icons in {OUT}')
