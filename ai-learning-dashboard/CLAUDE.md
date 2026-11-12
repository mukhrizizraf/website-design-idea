# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two copies of this project: edit here, publish there

- **Source (edit here):** `I:\My Drive\AI LEARNING\ai-learning-dashboard` (not a git repo).
- **Published copy:** `I:\My Drive\AI LEARNING\website-design-idea\ai-learning-dashboard`, inside the git repo `mukhrizizraf/website-design-idea`. GitHub Pages serves `main` directly; live URL `https://mukhrizizraf.github.io/website-design-idea/ai-learning-dashboard/`.
- To publish: `git fetch` and check `git status` in the repo, list files that differ between the two folders, copy **only the files changed in this session**, run `npm test` in the repo copy, then commit and push. Never mirror the whole folder: another session (Codex or Claude) has edited both copies in parallel before, and a full copy once wiped its work. Leave out `node_modules`, `dist`, `data`, `.github` and `*.mp4`.
- Git has no global identity on this machine: commit with `git -c user.name=mukhrizizraf -c user.email=mukhrizizraf@users.noreply.github.com commit ...`.
- The root `index.html` and `OPEN DASHBOARD.html` are only redirects to the live site (with a `?v=` cache-busting tag). The repo root `index.html` makes the folder URL work, so never delete it.

## Commands

```sh
npm start                                  # local server, http://127.0.0.1:4173
npm test                                   # node --test tests/*.test.mjs
node --test tests/skills.test.mjs          # one test file
node --test --test-name-pattern="install" tests/skills.test.mjs   # one test
npm run build                              # copies public/ to dist/ (and README into public/)
```

No dependencies and no bundler. Node 22+.

## Architecture

- **Data:** `public/skills.js` sets `window.SKILL_DATA` (categories, levels, sources, featured, collections, skills). Both pages render from it, and `tests/skills.test.mjs` validates it, so a typo fails the tests rather than the live page.
- **Install steps are generated, not stored:** `install()` in `public/shelf.js` builds the Claude Code sentence, PowerShell and Terminal commands and the ZIP link from `sources[src].repo/branch/dir` (`root: true` means the whole repo is one skill; `plugin: [...]` means Claude Code `/plugin` commands). A skill whose source has no `repo` shows "no public download link".
- **Homepage** `public/index.html` (app style, minimal text by owner request): the original 3D glass-book scene from the live site (commit 6155802) fills the screen; four empty `.chapter` sections give the scroll distance, so scrolling plays stack → fan → hero card → collision → books rising onto the shelf (`progress()` 0..3). On top: the app nav (`.appnav`), story dots (`.steps`, the chapter links), one `Browse skills` button and the category dock. No headlines, paragraphs or footer; no lettering on the wallpaper. `particles.js` and `skillcube.js` are unused drafts.
- **Shelf** `public/shelf.html` + `shelf.js`: tabs (built once; a pill moves between them), grouped rows, detail sheets, the Prompt Motion collection sheet, `#skill=<id>` deep links, `?cat=<id>` from homepage cards.
- **Background** `public/vibe.js` (library): prompt ribbons built from `skills.js`. The owner asked to remove the "just ask. / Claude can do that" lettering (the site is not sponsored by Claude): keep it out.
- **Live 3D wallpaper** `public/wallpaper.js` (ES module, both pages): a transparent Three.js canvas above `.room` / the CSS colour fields with glossy candy shapes (stars, sparkles, rings, cubes, gems, iridescent bubbles) that tumble, follow the pointer, glide with scroll, spin on hover and pop on click. `createField()` is exported. Both pages need the inline import map; `server.mjs` hashes inline scripts in every `.html` for its CSP.
- **Motion** `public/motion.js` (both pages): `--px/--py` pointer parallax, library cards flying in (`.fx-in`/`.fx-wait`), 3D tilt with sheen (`.lean`), pausing off-screen cubes (`.cube.off`), and the homepage headline split into letters. Does nothing with reduced motion.
- **Design direction (approved 12 Nov 2026, "Every skill is a book"):** library cards are cartoon book covers (`.book`: cover colour, thick ink outline, ink drop shadow, white badge with the skill symbol, white name label; name and level only). Ten distinct cover colours (`COVERS` in `shelf.js`, same order as the home books) assigned in grid order so neighbours never match. Colour only on covers; UI is ink, white and light grey. Big touch targets. Library motion only answers the visitor (rise-in, hover lift, sheet slide); nothing moves by itself. `shelf.css` was rewritten clean to this; the old layered file is gone. Saving is removed from the UI.
- **App navigation:** laptop = shelf rail (`.rail`: Home, shelves, Guide) + one sticky title bar (`.bar`: title, count, search, Easy, dice); phone = top bar, sticky shelf strip, 2-column grid, tab bar (Home, Library, Guide). The homepage has only the logo bar, the book loop, one button and the category dock.
- **Shared** `public/pop.css`: category colour variables (`[data-cat]`), app icons, the CSS 3D cube, the spring pop-up animation, cross-document view transitions, floating cubes. Both pages load it after their own stylesheet.
- `server.mjs` serves only an explicit allowlist of files (`const files={...}`): add any new public file there or `npm start` returns 404 for it. It also hosts a token-protected lesson API; `bridge.mjs` is a stdio MCP server (`save_lesson`). The lesson workspace they fed was removed, so no page uses them; `public/model.js` (lesson parsing) remains for them and the tests.
- `showcase.*`, `room.jpg` and `skill-shelf-icons.png` are leftovers from an earlier design; no page loads them (`tests/showcase.test.mjs` still checks `showcase.js`).

## Things that are easy to get wrong

- Prompt Motion clips play from `media.prompt-motion.com` (credited, never copied). Avast on this PC blocks that host (curl gets a reset), so clips can't be checked from here; the sheet shows a "blocked" note when the poster fails. Links to prompt-motion.com pages stay off after an antivirus warning.
- Headless Edge with `--use-angle=swiftshader --enable-unsafe-swiftshader` renders the WebGL homepage for screenshots; its frame rate is not representative. Opened as `file://`, pages can't read images into WebGL.
- Scroll reveals hide content until revealed (`.js-reveal`); they check positions on load and scroll so nothing can stay hidden. Keep that fallback if you change them.

## Owner preferences (from past feedback)

Plain, simple English in the UI. Bright, colourful, Apple-like glass and 3D; no mint/green accent, no brown theme, no sound. Symmetry matters: rows and columns must line up, and the layout must not squash on short laptop screens.
