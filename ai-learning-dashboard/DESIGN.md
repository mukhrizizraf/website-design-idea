# AI Skill Shelf design system

Bright and playful for every age, with Apple's discipline. A light base, white frosted glass over soft colour fields, and Apple's system colours used as a fixed set, one per category, like app icons. The memorable element is the 3D deck of candy-glass skill cards on the homepage.

Files: homepage `public/index.html` + `home.css`; shelf `public/shelf.html` + `shelf.css` + `shelf.js`; shared pop-ups, cubes, page transitions and category colours in `public/pop.css`; data in `public/skills.js`. `showcase.*`, `room.jpg` and `skill-shelf-icons.png` are left over from earlier versions and no page loads them.

## Tokens

- Background `#f5f5f7` with radial colour fields (orange, indigo, sky, pink, purple). Glass: white 78% → 52%, 28px backdrop blur, saturate 180%, white top edge.
- Text `#1d1d1f`; secondary at 74%; faint at 50%.
- Category colours (gradient pairs): Web & design `#ff375f → #ff9f0a`, Motion & 3D `#bf5af2 → #5e5ce6`, Writing `#ff9f0a → #ffd60a`, Docs `#0a84ff → #64d2ff`, Coding `#30d158 → #00b5a8`, AI tools `#ff2d55 → #bf5af2`.
- 3D deck cards use a rainbow order so neighbours never match: `#ff375f #ff8a00 #e0a400 #28b44f #00a8a0 #0a84ff #5e5ce6 #a94fe0 #e8344e`.
- Level chips: Easy green, Medium orange, Technical pink, each with a text label. "New": pink text for 30 days after `added`.
- Type: Bricolage Grotesque (800, tight tracking) for headings and UI; Instrument Serif italic for the coloured second line and quoted prompts; JetBrains Mono for small tags and code.
- Radii: windows 34 to 38px, cards 24 to 30px, app icons about 30% of their size.

## Motion

- Springs: `cubic-bezier(.34,1.56,.64,1)` fallback, with a `linear()` spring curve where supported. Press: scale to about .92 in 80ms, spring back on release.
- Tabs and chapters: one pill slides to the active item and changes colour per chapter.
- Pop-ups spring out from the tapped element (`--fx`, `--fy`, `--fr`), close with a short sink.
- Homepage: chapter windows tilt up into place on scroll; category cards pop in one by one. Shelf: rows cascade in on scroll; six floating 3D cubes drift behind the window. Reveals are checked by position on load and scroll, so nothing can stay hidden.
- Page changes: cross-document view transitions (old page sinks and blurs, new page rises; the brand stays; category card morphs into its shelf heading).
- 3D deck: four poses, one per chapter (fan, card forward, the words, shelf). `?pose=0..3` holds a pose for review. Phones use a lighter glass without refraction for frame rate.
- No sound.
- `prefers-reduced-motion` turns animations off; `prefers-reduced-transparency` and no backdrop-filter make glass solid.

## Responsive

- Below 820 to 860px: chapter nav hides, the deck floats behind the text, and the shelf uses a floating glass tab bar with app icons at the bottom.
- Category cards go from 3 to 2 per row; shelf rows put the level chip beside the name.
