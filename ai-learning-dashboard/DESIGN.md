# AI Skill Shelf

Keep the original bright, playful world: candy colours, frosted glass, cartoon 3D objects, illustrated book covers and spring feedback. The owner explicitly rejected the restrained workspace/sidebar redesign on 12 November 2026. App-like means compact navigation, fewer words and more icons and animation.

## Surfaces

- `index.html` opens the library in `public/shelf.html`.
- `public/index.html` is the optional 3D preview. Nine books occupy separate viewport positions around a small launcher. Phones use a three-column layout above the launcher and category dock. The three explanatory chapters are removed.
- The library keeps the original glass window, colourful book-jacket cards, animated category rail and playful backdrop. Phones use an animated category strip and a glass Library/Saved/Guide dock. The large hero, rotating prompt panel and promotional paragraphs are removed.
- Skill sheets retain the exact prompts, setup instructions, creator credits and shared links. Bookmarks, search, difficulty and cards/list view are real controls.

## Visual system

Light base `#f5f5f7`; warm orange, pink, purple and sky colour fields behind white glass. Primary ink `#1d1d1f`. Category colours are set in `pop.css`; the library uses blue for Coding to avoid a dominant green accent.

Use Bricolage Grotesque for headings and controls, Instrument Serif italic for quoted prompts, and a system monospace for code. Book jackets have a dark outline, a colour-matched depth edge and a tilted category icon. Ordinary controls stay compact; the yellow dice is the discovery action. Category and app navigation use labelled icons with clear selection and focus states.

## Motion and layout

- Preserve the original animated category toys and background ribbons. Each toy has its own motion and remains recognisable without rotating edge-on.
- Books float and tilt independently, rather than overlapping in a central stack. Desktop positions surround the launcher; phone positions reserve the top bar, launcher and bottom dock.
- Cards lift and their icons rock on hover. Press feedback is short. Saved state gives a small bookmark response.
- Below 760px the toolbar stays at the viewport top, category toys remain reachable, and the bottom app dock reserves safe-area space. Below 380px skill cards use one column.
- Reduced motion disables decorative animation and book drift. Reduced transparency uses solid surfaces. Search remains 16px on phones and zoom stays enabled.

## Local app state

Saved skills, category and layout preferences use namespaced local storage. Blocked storage leaves session-only saving usable with a visible note. Closing a skill sheet restores focus and browser Back closes sheets.

The manifest and service worker provide an installable web app with a cached local library. Setup commands and shared links work offline; external videos, GitHub downloads, hosted fonts and the Three.js preview still need their remote resources. App Store packaging and submission remain separate work.
