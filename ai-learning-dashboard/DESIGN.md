# AI LEARNING TOOLS design system

An Operate surface for deliberate daily learning. Quiet warm paper, botanical green, and restrained lime give a daytime workspace a sense of care. A persistent rail leads to distinct workspaces rather than a wall of metrics. The overview prioritizes the next action, with honest activity and a chosen path supporting it.

## Tokens
- Background: `#f6f5f0`; surface: `#fffefa`; sidebar: `#eeefe7`.
- Primary ink: `#252c27`; secondary: `#687066`; divider: `#dddfd5`.
- Action green: `#234d3d`; lime: `#e8edbc`; sage: `#edf0e6`.
- Headings: Manrope 500–750; body: DM Sans 400–650; local sans fallback.
- Page title: 34px desktop / 28px mobile; body: 13–14px; supporting labels: 10–12px.
- Panels: 14px radius, single border, no decorative shadows. Dialog uses a soft offset shadow.
- Page spacing: 42px desktop / 20px mobile; grids: 16–26px gaps.

## Behavior
Native buttons, forms, dialog, checkboxes, and video controls. Visible keyboard focus and an accessible skip link. SVG line icons. Color is never the only state cue. Category tags are text-labelled. Hover, empty, invalid import, connection failure, and storage failure states are explicit.

## Responsive composition
238px desktop rail becomes a 76px icon rail at 900px, then bottom navigation at 600px. The overview uses a short skills list and stacks its columns below 800px. Library cards become a single column on phones. Dialogs stay within the viewport.

## Motion

A half-second checkmark confirms a saved or imported lesson. The [Lottie source](motion/lesson-saved.json) was rendered to a single-play animated PNG with LottieFiles dotLottie Web 0.82.1. The browser displays the same confirmation text if reduced motion is on or the image fails to load.

## Content
No simulated personal metrics. Starter guides carry a clear label. Notes are escaped before HTML rendering and source links accept HTTP/HTTPS only. Saving media and analyzing media are explained as distinct actions.
