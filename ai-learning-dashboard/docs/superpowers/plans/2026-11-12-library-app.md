# Library app implementation plan

**Goal:** Open directly into a useful, compact and installable skill library.

**Architecture:** Reuse shelf.js and the existing skill data and sheets. Replace shelf.css rather than add another theme layer. Keep the animated preview in public/index.html.

**Tech stack:** HTML, CSS, vanilla JavaScript, Node test runner.

**Spec:** ../specs/2026-11-12-library-app-design.md

- [x] Use the owner's corrected direction: retain colourful glass, book-jacket cards, animated category toys and a compact glass app dock. Remove the oversized hero and duplicate explanatory copy.
- [x] Update shelf.js to support saved skills, durable layout preferences, category context, clearing filters and search keyboard shortcuts. Preserve install and share flows.
- [x] Add manifest, app icons, offline shell and install handling; add public assets to the server allowlist. Make the root entry open the library and remove the unwanted intro chapters.
- [x] Distribute the 3D preview books across the desktop canvas and three phone columns; clamp negative first-frame time to prevent books flying out of view.
- [x] Run tests and build: 15 Node tests passed; 46 browser checks passed across seven viewport sizes, including saved skills, search, sharing, Back, unavailable storage and offline loading. Inspect the restored playful desktop and phone layouts and the distributed 3D books.

Review focus: long titles, 320px phones, short laptop screens, unavailable local storage, filtered empty saved lists and browser Back while a sheet is open.
