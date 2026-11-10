# AI LEARNING TOOLS design system

An Operate surface for deliberate daily learning, in a purple-and-white glassmorphism style (inspired by TikTok @settigation "Glassy Dashboard V7"). Translucent white cards float over a soft lavender field with slow drifting colour orbs. A floating glass rail leads to distinct workspaces. The overview leads with the next action, then real-data KPI tiles, a 14-day activity chart and a skill-status bar. No simulated numbers.

The glass theme is a layer at the end of `public/styles.css`. The previous warm-paper theme is kept in `public/styles.classic.css`.

## Tokens
- Background: `#f3f0ff` plus lavender, pink and periwinkle radial gradients; glass cards: white 72%→42% with 20px backdrop blur and a white 1px edge.
- Primary ink: `#231a3b`; secondary: `#625a7c`; divider: violet at 12% alpha.
- Accent violet: `#7c3aed`; deep: `#5b21b6`; accent text: `#6d28d9`. Primary buttons and active nav use a `#7c3aed → #5b21b6` gradient with a violet glow.
- Charts: single-series bars `#7c3aed`; skill-status sequential ramp `#c4b5fd → #8b5cf6 → #5b21b6`. Each status segment carries a text label and count, because the lightest step is below 3:1 contrast.
- Headings: Manrope 500–750; body: DM Sans 400–650; local sans fallback.
- Page title: 34px desktop / 28px mobile, violet gradient text; body: 13–14px; supporting labels: 10–12px.
- Panels: 20px radius, soft violet shadow; sidebar 28px radius, floating 16px from the edges.
- Page spacing: 42px desktop / 20px mobile; grids: 16–26px gaps.
- Without backdrop-filter support, cards fall back to solid white.

## Behavior
Native buttons, forms, dialog, checkboxes, and video controls. Visible keyboard focus and an accessible skip link. SVG line icons. Color is never the only state cue. Category tags are text-labelled. Hover, empty, invalid import, connection failure, and storage failure states are explicit.

## Responsive composition
238px floating glass rail becomes a 72px icon rail at 900px, then a floating glass bottom bar at 600px. KPI tiles go 4 → 2 columns below 1150px. The overview uses a short skills list and stacks its columns below 800px. Library cards become a single column on phones. Dialogs stay within the viewport.

## Motion

A half-second checkmark confirms a saved or imported lesson. The [Lottie source](motion/lesson-saved.json) was rendered to a single-play animated PNG with LottieFiles dotLottie Web 0.82.1. The browser displays the same confirmation text if reduced motion is on or the image fails to load.

## Content
No simulated personal metrics. Starter guides carry a clear label. Notes are escaped before HTML rendering and source links accept HTTP/HTTPS only. Saving media and analyzing media are explained as distinct actions.
