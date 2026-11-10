# AI Skill Shelf design system

A shared showcase of AI skills, styled like a visionOS window floating in a warm room. Inspired by "Glassy Dashboard V18" (TikTok @paulcodes4): a smoky glass app window with its sidebar inside, separate floating glass widgets beside it, white pill-shaped bar charts, serif display numbers, and a small grab handle under the window.

Files: `public/index.html`, `public/showcase.css`, `public/showcase.js`, data in `public/skills.js`. The old lesson workspace keeps its own design in `public/styles.css` (`public/legacy.html`).

## Tokens
- Background: a CSS-painted room (window light, lamp glow, shelf, TV, sofa, wood floor) blurred 26px, with a light dark overlay. No photo file.
- Window glass: `rgba(32,27,23,.62)`, 40px backdrop blur, 1px white edge at 16%, 36px radius. Inner cards: white at 7.5%, 22px radius.
- Blue widget: `rgba(96,150,230,.62) → rgba(46,86,170,.55)`.
- Text: white; secondary white at 76%; faint white at 55%.
- Accent: system blue `#0a84ff`. Level chips: Easy green, Medium amber, Technical red, each with a text label.
- Type: Instrument Serif for the greeting, big numbers and dialog titles; Inter for everything else.

## Behaviour
- Sidebar categories and the bar chart both filter the cards. Tapping the active bar clears it.
- Difficulty filter (All, Easy, Medium, Technical) and live search across titles, uses and pack contents.
- Cards lift 5px on hover. Tapping a card opens a floating detail window: what it does, good for, a "Try saying" example with Copy, how to start it in Claude Code and the Claude app, the pack contents, and the GitHub source.
- `#skill=<id>` opens a skill directly, so one skill can be shared by link.
- Every number is counted from `skills.js`. Packs count every skill inside.

## Responsive
- Below 1180px the widgets move under the window and the window scrolls with the page.
- Below 860px the sidebar becomes a swipeable row of category chips, and the KPI tiles show two per row.
- Reduced motion turns off all animation. Without backdrop-filter support, the glass becomes solid.
