# AI Skill Shelf design system

A shared showcase of AI skills, styled like a visionOS window floating in a warm room. Inspired by "Glassy Dashboard V18" (TikTok @paulcodes4): a smoky glass app window with its sidebar inside, separate floating glass widgets beside it, white pill-shaped bar charts, serif display numbers, and a small grab handle under the window.

Files: `public/index.html`, `public/showcase.css`, `public/showcase.js`, data in `public/skills.js`. The old lesson workspace keeps its own design in `public/styles.css` (`public/legacy.html`).

Tabs and the teal glow come from a second reference, "Glassy Navigation Tabs V5" (same creator): a spotlight cone on the active level tab and active sidebar item, and on phones a floating glass tab bar whose active icon lifts into a glowing teal circle.

## Tokens
- Background: a real room photo (`public/room.jpg`, Unsplash License, credited on the Shelf), blurred 2.5px and dimmed with a vignette so white text stays readable.
- Glass: white 16% → 5% gradient over `rgba(24,20,17,.44)`, 30px backdrop blur, saturate 180%, a bright 1px gradient edge (masked pseudo-element) and a top inner highlight. Window radius 38px, widgets 30px, cards 24px.
- Accent: teal `#2dd4bf` / `#5eead4` with a soft glow. Level chips: Easy green, Medium amber, Technical red, each with a text label. "New" chip: teal with glow, shown for 30 days after a skill's `added` date.
- Icons: custom ivory and mint artwork from ChatGPT Image, served as a single transparent atlas. Sidebar and phone tabs share the same category artwork. Card tiles use the existing tinted glass surfaces.
- Text: white; secondary white at 80%; faint white at 58%.
- Type: Instrument Serif for the greeting, big numbers and dialog titles; Inter for everything else.

## Behaviour
- Sidebar categories and the bar chart both filter the cards. Tapping the active bar clears it.
- Difficulty filter (All, Easy, Medium, Technical) and live search across titles, uses and pack contents.
- Cards lift 5px on hover. Tapping a card opens a floating detail window: what it does, good for, a "Try saying" example with Copy, how to start it in Claude Code and the Claude app, the pack contents, and the GitHub source.
- `#skill=<id>` opens a skill directly, so one skill can be shared by link.
- The Prompt Motion collection is filed under Motion & 3D. Its card opens eight sourced examples and exports them as a lesson pack.
- Every number is counted from `skills.js`. Packs count every skill inside.

## Responsive
- Below 1180px the widgets move under the window and the window scrolls with the page.
- Below 860px the sidebar is replaced by the floating glass tab bar at the bottom, and the KPI tiles show two per row.
- Reduced motion turns off all animation. Without backdrop-filter support, the glass becomes solid.

## Icon atlas

The [transparent atlas](public/skill-shelf-icons.png) was generated with ChatGPT Image and is mapped in `public/showcase.css`.

```text
Create a single production sprite atlas for AI Skill Shelf, a warm charcoal frosted-glass learning dashboard. EXACTLY 25 small UI glyphs in a rigid 5 column × 5 row matrix on a square canvas. Equal 20%-wide and 20%-high cells, glyph centers precisely at 10%, 30%, 50%, 70%, 90% of canvas width and height. Each glyph fills about 66% of its cell, generously padded. True transparent background across the whole canvas, no cell borders, no backgrounds, no labels, no words, no extra marks. Design each icon as a clean chunky sculpted ivory enamel silhouette with subtle soft shading and restrained mint/teal inner accents. High contrast on dark warm gray and legible at 18 px, softly rounded edges, same scale and light direction for every glyph. Exact row order left to right: row 1 four-square grid, artist palette, three diamond sparkles, writing pen, folded-corner document; row 2 angle brackets, AI microchip, closed book, sprout, package box; row 3 git branch, bar chart, globe, five-point star, terminal chevron with underscore; row 4 chat bubble, chain link, overlapping copy sheets, up-right external arrow, light bulb; row 5 magnifying glass, close X, download arrow into tray, play triangle, short row of upright books with tiny sparkle. Plain functional icon art, no tiny decorative texture, no heavy shadows, no neon glow, no squares behind the icons. The outer canvas and all whitespace between icons must be transparent.
```
