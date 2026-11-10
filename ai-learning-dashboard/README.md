# AI Skill Shelf

[Open the live AI LEARNING TOOLS dashboard](https://mukhrizizraf.github.io/website-design-idea/ai-learning-dashboard/public/index.html)

Double-click **OPEN DASHBOARD.html** or **index.html** in the Google Drive folder to open this live dashboard. Both shortcuts require an internet connection. **PROMPT MOTION DESIGN IDEAS** is the first card under **Motion & 3D**, with eight ideas and custom ChatGPT Image icons.

For offline use, open **public/index.html**. That is a separate local copy; GitHub updates do not automatically update files on your computer. Make shared changes in the `website-design-idea/ai-learning-dashboard` repository folder and merge current GitHub changes before pushing.

The main page (`public/index.html`) is a shared showcase of the AI skills I collect from GitHub, TikTok and friends. Each card explains, in plain words, what the skill does, what it is good for, how to start it in Claude Code or the Claude app, and an example request to copy. Everyone who opens the link sees the same list. The design is visionOS-style glass over a soft blurred room, inspired by "Glassy Dashboard V18" (TikTok @paulcodes4).

## Add or change a skill

1. Open `public/skills.js`.
2. Copy one entry in the `skills` list and change its text. A pack has a `members` list.
3. Run `npm test` to check that nothing is missing.
4. Push. The live page updates in a minute or two.

Share one skill directly with a link like `…/public/index.html#skill=humanizer`.

## Old lesson workspace

The earlier lesson and learning-path dashboard still works at `public/legacy.html`. Everything below describes that workspace.

# AI LEARNING TOOLS — an AI learning workspace (legacy)

A calm, responsive dashboard for turning discoveries into practical AI skills. Includes a skill library, four learning paths, video notes, chat imports, progress tracking, and a private browser workspace. Built with HTML, CSS, JavaScript and Node.js; no package dependencies.

## Start locally

For the personal lesson workspace, double-click **public/legacy.html** in this folder. It opens directly without starting a server. Open it from the synced folder on your computer, not Google Drive's online file preview. The direct-file edition supports the skill library, notes, imports and progress; browser storage support may vary. For the chat bridge, use the local server below. Direct-file and server views have separate browser storage, so export/import a backup to move between them.

Install Node.js 22 or later, open this directory in a terminal, then run:

```sh
npm start
```

Open http://127.0.0.1:4173. No install step or AI API key is required. Stop the server with Ctrl+C.

## What works

- Search and filter nine editable-in-source starter guides across web design, Shopify, motion/3D, writing, cloud platforms, and coding agents.
- Bookmark skills, check off exercises, copy prompts, and set your confidence level.
- Choose a learning path and see actual progress; no fabricated streaks or completed work.
- Save video links, notes, transcripts, takeaways, and practice steps.
- Attach and play local video files up to 250 MB when the browser has storage available. Browser codec support determines playback.
- Paste one lesson, an array, or `{ "lessons": [...] }` as JSON, including fenced JSON copied from a chat.
- Export/restore workspace data. Video attachments remain separate from JSON backups.
- Receive lessons through the authenticated API and the included local MCP bridge.

Starter guides are authored practice suggestions, not installed third-party skills or endorsements. Impeccable and other tools are learning topics; the dashboard does not install those tools.

## From a TikTok or YouTube video to a lesson

### Works immediately: chat import

1. In **Video inbox → Import from a chat**, copy the video-analysis prompt.
2. Supply your video or transcript to your preferred chat, subject to its file and video capabilities. A URL alone does not guarantee that the chat can view the video.
3. Ask it to use the prompt and return a structured lesson.
4. Paste the JSON back into the inbox, then click **Import lessons**.

This dashboard does not download videos, transcribe audio, or analyze footage itself. Saving a video alone saves an attachment. The chat must actually have access to the content before it can summarize it. No AI service is called by this project, and no AI API key is stored in the browser.

### Direct delivery: local Codex / Claude MCP bridge

`bridge.mjs` is a local stdio MCP server exposing `save_lesson`. It implements the 2025-11-25 handshake and also negotiates older listed versions. It can be used with local MCP-capable clients; it is not a remotely hosted MCP server or an automatic integration with every ordinary web chat.

Start the dashboard with a long random token in the server environment. For example, in PowerShell:

```powershell
$env:DASHBOARD_TOKEN = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
npm start
```

Keep the same token in the MCP client's private configuration and enter it in **Connections & data**. Do not commit it or put it in frontend files. The server uses the variable for that process; a `.env` file is not automatically loaded. To use one, explicitly launch with Node's `--env-file` option and keep the file ignored.

Configure a local MCP client with an entry equivalent to this (replace paths and token locally):

```json
{
  "mcpServers": {
    "practice": {
      "command": "node",
      "args": ["/absolute/path/to/ai-learning-dashboard/bridge.mjs"],
      "env": {
        "DASHBOARD_URL": "http://127.0.0.1:4173",
        "DASHBOARD_TOKEN": "YOUR_PRIVATE_TOKEN_AT_LEAST_24_CHARACTERS"
      }
    }
  }
}
```

Configuration location and format vary by client. This is the generic JSON form, not a config file to paste indiscriminately into every client. On Windows use forward slashes or doubled backslashes in JSON paths. Restart/reload the client's MCP connection after configuring it.

Then ask the configured agent: “Analyze this transcript and save the lesson to AI LEARNING TOOLS using save_lesson.” The dashboard polls every 30 seconds while its tab is connected. The server retains incoming lessons even when the dashboard is closed. Each browser remembers already imported server IDs, so deleting a local lesson does not immediately reimport it. API retries can create duplicates; the save operation is intentionally not advertised as idempotent.

The bridge was tested against the bundled server using actual JSON-RPC messages. It has not been installed into your personal chat settings. Protocol reference: [MCP 2025-11-25 lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle).

### Hosted chat integration

For web-based chats with authenticated HTTP tool support, host the Node server behind HTTPS and use `integrations/openapi.json` as the API description. Replace its example server URL. Use Bearer authentication with the server token. Availability and configuration depend on your chat product and account; normal chats do not automatically gain this tool. A remote MCP connection requires an additional remote MCP transport adapter; the included bridge uses local stdio only.

API:

- `GET /api/health`: readiness, no private data.
- `POST /api/lessons`: validated lesson JSON, requires `Authorization: Bearer TOKEN`.
- `GET /api/lessons`: incoming lessons, same authentication.

Example lesson:

```json
{
  "title": "Design with clearer hierarchy",
  "category": "Web design",
  "source": "Claude",
  "sourceUrl": "",
  "summary": "A faithful summary of the source material.",
  "takeaways": ["A concrete technique from the video."],
  "actions": ["Try the technique on one page."],
  "transcript": ""
}
```

Allowed categories: Web design, Shopify, Motion & 3D, Writing, Cloud platforms, Codex & AI.

## GitHub project integration

This dashboard lives in `ai-learning-dashboard/` inside [website-design-idea](https://github.com/mukhrizizraf/website-design-idea), alongside the existing MPOB project. The repository homepage links to both. The existing Pages publishing configuration is preserved; no dashboard-only deployment workflow replaces the gallery or MPOB site.

Open [AI LEARNING TOOLS](https://mukhrizizraf.github.io/website-design-idea/ai-learning-dashboard/). The folder entry redirects to `public/index.html`. All browser assets use relative paths. For future changes, edit this folder, run `npm test` and `npm run build`, then commit the source and regenerated `public/dashboard.js` from the repository root. Never commit private workspace exports, videos or connection tokens.

GitHub Pages serves the personal dashboard without a backend. To receive chat lessons, run the server separately with:

- `DASHBOARD_TOKEN`: long random shared secret, at least 24 characters.
- `HOST=0.0.0.0`: only when your hosting platform requires external binding.
- `PORT`: hosting platform port (default 4173).
- `DATA_DIR`: durable storage mount. Default `./data` is ignored by Git.
- `ALLOWED_ORIGIN`: exact frontend origin, e.g. `https://YOUR-USER.github.io` (no repository path or trailing slash).

Use HTTPS, persistent storage, one server process, and host-level rate limiting for a public deployment. The JSON-file store serializes writes in one process; it is not a multi-instance database. API lesson bodies are limited to 1 MB, and the server retains at most 10,000 lessons. Archive/manage server data before reaching that cap. Do not deploy this to an ephemeral/serverless filesystem expecting durable storage.

## Data boundaries

- Personal progress, notes, and imported lessons live in localStorage for the current browser origin; different ports/domains are separate workspaces.
- Videos live in IndexedDB. Browser eviction, clearing site data, or moving devices can remove them. Keep original videos separately.
- The optional server inbox is shared among anyone holding its token. This is suitable for a personal or trusted-group inbox, not separate private accounts.
- Browser edits do not write back to the shared server; only incoming lessons sync. Export/restore moves personal progress between devices.
- Restoring a backup replaces local notes/progress and assigns new lesson IDs; video attachments are not restored.
- Google Fonts loads DM Sans and Manrope when online; fallback fonts work if it is blocked.

## Development

```sh
npm test
npm run build
```

Tests cover import formats, unsafe URLs, validation, authentication, CORS, concurrent writes, persistence after server restart, private-file isolation, and end-to-end MCP delivery. Frontend source is in `public/`. Starter skills and paths are in `public/model.js`. Runtime data and secrets are ignored; the build copies only public files and this README.
