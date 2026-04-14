# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Cellar** is a personal wine and spirits inventory tracker — a mobile-first PWA backed by Firebase. There is no build step; it runs as a static site served directly from the file system or any static host.

## Deployment

There is no build process. To develop locally, serve the project root with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Firebase Firestore rules are managed in `firestore.rules` and must be deployed via the Firebase CLI when changed:

```bash
firebase deploy --only firestore:rules
```

## Architecture

### Module Graph

`index.html` loads only `js/app.js` as an ES module entry point. All other modules are imported from there or lazily via dynamic `import()`.

```
app.js
├── auth.js      — Google sign-in (popup-first, redirect fallback), onAuthStateChanged
├── ui.js        — renderInventory(), openModal(), updateAuthUI(), initUIListeners()
│   └── analytics.js — renderAnalytics() (called from renderInventory)
└── ai.js        — Gemini label scan, pro score lookup, color tagging, initAIListeners()
    └── db.js    — all Firestore read/write (loadInventory, saveNewBottle, markConsumed, etc.)
        └── state.js — shared singleton: state.inventory, state.currentUser, SECTIONS
```

**Circular dependency resolution:** `db.js` and `ui.js` would create a cycle if imported at the top level. All cross-references between them use dynamic `await import('./ui.js')` / `await import('./db.js')` inside async functions.

### State

All runtime state lives in `js/state.js` — a single exported `state` object. Mutate it directly; there is no reactive framework. After any mutation, call `renderInventory()` to sync the DOM.

### Rendering

`ui.js:renderInventory()` is the sole render function. It reads `state.inventory`, applies filters/search/sort, builds HTML strings, and sets `main.innerHTML`. There is no virtual DOM or diffing.

### Auth & Data Access

- Firestore rules allow **public read** of the `cellar` collection; writes are locked to a single hardcoded owner UID (`firestore.rules`).
- `loadInventory()` is called both for authenticated and unauthenticated users. Unauthenticated browsing is gated by `state.showInventoryUnauth`.
- On sign-in state change (`onAuthStateChanged`), `updateAuthUI()` is called which re-renders and triggers `loadInventory()`.

### AI (Gemini)

`js/ai.js` uses `gemini-2.0-flash` via Firebase Vertex AI SDK. It tries `firebase-vertexai.js` first and falls back to `firebase-ai.js` with `GoogleAIBackend`. All AI calls are text-only (label scan also passes an inline base64 image). Images are client-side resized to max 1024px before being sent.

### PWA / Service Worker

`sw.js` uses a two-cache strategy:
- `cellar-shell-v{N}` — app shell (cache-first for static assets, network-first for HTML)
- `cellar-fonts-v1` — Firebase SDK + Google Fonts (network-first, cached thereafter)

**When adding a new JS or CSS file**, add it to the `APP_SHELL` array in `sw.js`. **When making any JS/CSS change**, bump the `SHELL_CACHE` version number (e.g. `v27` → `v28`) to force clients to pick up the new files.

## Key Conventions

- **No build tools.** Do not introduce npm, webpack, vite, TypeScript, or any preprocessor.
- **No frameworks.** All UI is vanilla JS + DOM string templating. CSS custom properties (vars) for theming.
- **Version bump on every push.** Increment the footer version in `index.html` (e.g. `v2.0.1 → v2.0.2`) and add a corresponding entry at the top of the Version History in `GEMINI.md` with every change pushed to GitHub.
- **Mobile-first.** All new UI must be designed for small screens and touch.
- **Auth guard all writes.** Every function that calls Firestore write ops must check `state.currentUser` and return early if null.

## Data Schema (Firestore `cellar` collection)

| Field | Type | Notes |
|---|---|---|
| `name` | string | Producer + wine/spirit name |
| `year` | string | Vintage or age statement |
| `region` | string | Appellation/country |
| `grape` | string | Variety, blend, or spirit type |
| `abv` | string | e.g. `"13.5%"` |
| `temp` | string | Serving temperature |
| `notes` | string | Tasting notes |
| `decant` | string | Decanting recommendation |
| `window` | string | Drinking window |
| `status` | string | `ready` \| `soon` \| `spirits` \| `consumed` |
| `statusLabel` | string | Display label for `status` |
| `type` | string | `"wine"` or `"spirit"` |
| `colorStyle` | string | `Red` \| `White` \| `Rose` \| `Sparkling` \| `Fortified` (wine only) |
| `quantity` | number | Bottles in stock |
| `consumedCount` | number | Lifetime consumed count |
| `consumedDate` | string | Set when last bottle is consumed |
| `liked` | boolean | `true` / `false` / absent |
| `buyAgain` | boolean | Star/restock flag |
| `proScores` | object | `{ summary, scores, vintage }` from Gemini |
| `updatedAt` | Timestamp | Firestore server timestamp |
