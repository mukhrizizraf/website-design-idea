# AI Skill Shelf

**Live:** <https://mukhrizizraf.github.io/website-design-idea/ai-learning-dashboard/>

Every AI skill I find on TikTok, GitHub and from friends, kept in one place and shared so others can learn too. Each skill explains what it does, gives the exact words to say to Claude, and writes out the install steps so nobody has to open GitHub.

Double-click **OPEN DASHBOARD.html** or **index.html** in this folder to open the live site (needs internet). To see local edits before publishing, open **public/index.html** instead.

## Pages

- **Homepage** (`public/index.html`, `home.css`): a four-chapter 3D scroll story that explains the purpose. A deck of candy-coloured glass skill cards (Three.js 0.170.0 from jsDelivr) fans out, brings one card forward, then lines up on a glass shelf. Click a card to open that skill. Six frosted-glass category cards with turning 3D cubes open the shelf on one category.
- **The shelf** (`public/shelf.html`, `shelf.css`, `shelf.js`): every skill grouped by what it helps with, with search and an "Easy ones only" switch. Each skill opens a sheet with what it does, the words to say to Claude, and install steps: a sentence to paste into Claude Code, PowerShell and Terminal commands, and a ZIP download for the Claude app.

Share one skill with a link like `…/public/shelf.html#skill=humanizer`. Older `index.html#skill=…` links forward to the shelf.

## Look and motion

Bright and colourful for every age, with Apple's discipline: a light base with soft colour fields behind white frosted glass, and Apple's system colours as a fixed set, one per category, shown as app icons. Type follows my other sites: Bricolage Grotesque, Instrument Serif italic and JetBrains Mono. Details are in [DESIGN.md](DESIGN.md).

Motion is iOS-style (`public/pop.css`): a pill springs to the chosen tab or chapter, icons shrink on press and spring back, rows cascade in, and skills open as 3D pop-ups that spring out from where you tapped. Pages blend into each other with view transitions, and a tapped homepage category card morphs into its heading on the shelf. There is no sound. Reduced motion turns the effects off.

## Prompt Motion ideas

The **Prompt Motion design ideas** card (Motion & 3D) shows eight ideas from prompt-motion.com. Each has its video clip, played from prompt-motion.com's own media server and never copied, the full prompt or install command with a Copy button, and a credit linking to the creator. The videos and prompts belong to their creators.

Links to prompt-motion.com pages stay off after an antivirus warning on this computer. Avast also blocks `media.prompt-motion.com` here, so on this PC the clips show a "blocked" note; the prompts still work, and visitors without that block see the clips.

## Add or change a skill

1. Open `public/skills.js`.
2. Copy one entry in the `skills` list and change its text. A pack has a `members` list. For a skill from a new GitHub repo, add the repo to `sources` with `repo`, `branch` and `dir` (the folder that holds the skill folders) so the install steps can be written for it.
3. Optional: `added: 'YYYY-MM-DD'` shows a "New" badge for 30 days and puts the skill first.
4. Run `npm test`, then publish (see below).

A skill without a public source (for example a skill made on this computer) shows "no public download link yet" instead of install steps.

## Publish

This folder is the source. The live site is served by GitHub Pages from the `main` branch of [website-design-idea](https://github.com/mukhrizizraf/website-design-idea), folder `ai-learning-dashboard/`. To publish, copy the changed files into that repo folder, run `npm test` there, then commit and push. The live page updates in about a minute.

## Run locally

Install Node.js 22 or later, then:

```sh
npm start      # http://127.0.0.1:4173
npm test       # all tests
npm run build  # static copy in dist/
```

## Still included: lesson API and bridge

`server.mjs` also has an authenticated lesson API (`/api/lessons`, needs `DASHBOARD_TOKEN`), and `bridge.mjs` is a local MCP server with a `save_lesson` tool. They fed the old lesson workspace, which has been removed, so no page uses them now. `integrations/openapi.json` describes the API.
