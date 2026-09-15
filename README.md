# YEAR 3 PASS — Web Edition

Migrated from the Electron desktop app to a Node/Express web application.
This README explains what changed, what didn't, what's genuinely tested,
and what's still open.

## Quick start

```bash
npm install
cp .env.example .env   # (a real .env with your existing keys is already included in this zip)
npm start
```

Open **http://localhost:3000/** (redirects to `/UI/index.html`).

Deploy anywhere that runs Node ≥18 and lets you set env vars (Railway, Render,
Fly.io, etc.) — the server reads `process.env.PORT`, no localhost assumptions.

## What changed vs. the Electron app

| Electron | Web |
|---|---|
| `CORE/main.js` (BrowserWindow + IPC bootstrap) | `backend/server.js` (Express bootstrap) |
| `CORE/preload.js` (`contextBridge` → `window.year3`/`window.api`) | `UI/services/api-client.js` — **same method names**, backed by `fetch()` instead of `ipcRenderer` |
| `CORE/ipcHandlers.js` (37 `ipcMain.handle` channels) | `backend/services/ipcHandlers.js` — **same file, same logic**, `ipcMain` replaced by `backend/webCompat.js` (a plain handler registry), invoked via `POST /api/invoke` |
| `CORE/moduleManager.js` | Copied unchanged (only the `MODULES_ROOT` path constant was adjusted) |
| `CORE/pharmacologyDocumentService.js` | Copied unchanged |
| `AI/*` (aiManager, aiRouter, providerRegistry, modelManager, fallbackManager, healthManager, contextManager, memoryManager, promptManager, taskManager, providers, openrouter) | **Copied unchanged.** This subsystem never touched Electron — it runs identically behind the same 25 `ai:*` channels. |
| Native "Open File" dialogs (Master Module import, Pharmacology PDF import) | Browser `<input type="file">` → `POST /api/upload/html-file`, `/api/upload/folder`, `/api/upload/pharmacology-pdf`. Each route saves the upload to a temp path/dir and then calls the **exact same handler function** the Electron version used. |
| Native "Save File" dialog (PowerPoint export) | The handler now writes the `.pptx` to the OS temp directory instead of a user-chosen path; `POST /api/export/content` streams it back as a normal browser download, then deletes the temp file. |

Every place the logic changed is marked with a `WEB MIGRATION` comment in
`backend/services/ipcHandlers.js` so you can find and review each one.

`UI/`, `MODULES/`, and `AI/` keep the exact same folder layout and relative
paths they had on disk in the Electron app (`UI/app.js` still loads modules
via `../MODULES/<id>/module.js`), so almost nothing in those folders needed
to change — the server just serves `UI/` at `/UI` and `MODULES/` at `/MODULES`
as siblings, exactly like they were siblings on disk.

## What I actually tested (not just wrote)

I ran this server and exercised it end-to-end before packaging it:

- [x] Server boots, all 38 handlers register
- [x] `/` redirects to `/UI/index.html`; `UI/*` and `MODULES/*` static assets serve correctly
- [x] `modules:list` / `modules:get` return real module HTML+JS content read from disk
- [x] `settings:get`, `state:get` / `state:save` round-trip correctly to `DATA/system/*.json`
- [x] `ai:status` and `ai:models` correctly detect your real OpenRouter key from `.env` and list the configured model catalogue
- [x] `pharmacology-documents:list` correctly reads your **existing real imported PDFs** from `DATA/modules/Y3-003-Pharmacology/documents/` — your prior data survived the migration
- [x] Browser-upload replacement for the HTML file picker (`POST /api/upload/html-file`) — uploaded a file, got back the same response shape as the Electron dialog handler
- [x] Browser-download replacement for the PowerPoint export dialog (`POST /api/export/content`) — generated and downloaded a real, valid `.pptx`
- [x] Unknown channel returns a clean 404 instead of crashing the server

Not yet exercised: `ai:ask` against a live model (didn't want to spend your API
credits during a smoke test), the folder-upload path for Master Module import,
and a real end-to-end click-through of every module's UI in an actual browser.

## Decisions I made without waiting for your answers

You asked me to just generate the project, so here's exactly what I assumed —
flag anything you want changed:

1. **The six placeholder modules** (Physiology, Neuroanatomy, O&G, MCQ,
   Flashcards, Spotter) were carried over **as the placeholders they already
   were** in your Electron source. I did not invent MCQ/flashcard/spotter
   functionality that doesn't exist in your original app — see the Phase 1
   audit for why.
2. **Y3-005-CDC and Y3-014-Pharmacology2000** (the two fully-built modules
   your original brief never mentioned) are included, unchanged.
3. **Stack**: plain Node + Express, no framework, matching your "simplest
   robust stack" instruction. **Persistence is still file-based JSON**
   (`DATA/system/*.json`, exactly like the Electron app), not a real database.
   This means: it works today, single-server-instance, but it does **not**
   yet give you cross-device sync for user content, and most module content
   still lives in browser `localStorage` (unchanged from the Electron app —
   see the audit's Storage Inventory). That's the real remaining migration
   work — a genuine database + auth layer — and needs your input on schema
   priorities before I build it, since it touches every module.

## Known limitations / honest gaps

- **No authentication.** There was none in the Electron app either (single
  local user), but a web deployment reachable by others needs it before you
  put real data behind it — right now anyone who can reach the server can
  read/write `state`, `settings`, and pharmacology documents.
- **`modules:list`/`modules:get` currently return absolute server filesystem
  paths** (`path`, `files.index`, `files.javascript`) in the JSON response.
  This was already present in the original `moduleManager.js` (unchanged
  here), but it's more of a concern once this is running on a public server
  than it was on a local desktop app. Worth stripping before a public launch.
- **`localStorage`-based module data doesn't sync across devices** — flagged
  in the Phase 1 audit as the biggest real migration risk. This zip does not
  yet solve it; the browser UI works exactly as before, per-browser.
- **Master Module folder-import** (`pickFolder`) is adapted but not yet
  tested end-to-end from an actual browser drag/select — please try it and
  report back if the reconstructed folder structure doesn't match.
- **Mistral**: `.env.example` keeps the `MISTRAL_API_KEY` variable for
  forward-compatibility, but as the audit noted, no Mistral client exists in
  `AI/providers` or `AI/openrouter` — don't assume it's wired up.

## Project layout

```
YEAR3-PASS-WEB/
├── package.json
├── .env / .env.example
├── backend/
│   ├── server.js            ← replaces CORE/main.js
│   ├── webCompat.js          ← fake ipcMain registry
│   └── services/
│       ├── ipcHandlers.js    ← adapted CORE/ipcHandlers.js (37 handlers)
│       ├── moduleManager.js  ← unchanged CORE/moduleManager.js
│       └── pharmacologyDocumentService.js  ← unchanged
├── AI/                       ← unchanged (aiManager, aiRouter, providers, ...)
├── UI/
│   ├── index.html            ← +1 script tag for the new api-client.js
│   ├── app.js / sidebar / dashboard / css   ← unchanged
│   └── services/api-client.js  ← replaces CORE/preload.js
├── MODULES/                  ← unchanged (all 15 modules, incl. Y3-005-CDC
│                                 and Y3-014-Pharmacology2000)
└── DATA/                     ← your real settings/state/pharmacology PDFs,
                                  carried over as-is
```

## Next steps I'd recommend

1. `npm install && npm start`, click through Notes, Pathology, Pharmacology,
   Microbiology, CDC, Lecture Studio, Essay, and AI in an actual browser —
   these are the modules with real functionality to verify.
2. Tell me which of the three decisions above you want changed.
3. When ready, we design the real database layer (Postgres is a good default)
   and a migration path that pulls existing `localStorage` content into it —
   that's the piece that actually delivers your "same note on laptop and
   phone" requirement from your responsive-architecture brief.
