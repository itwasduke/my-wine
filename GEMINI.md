# The Cellar — Project Context

Personal wine & spirits inventory tracker built as a high-end, mobile-first PWA.

## Architecture & Tech Stack
- **Frontend**: Single-page application (SPA) with a clean `index.html`.
- **Logic**: Vanilla JavaScript (ES modules) in `js/` directory. No build step.
- **Styling**: Vanilla CSS in `css/` directory. Dark charcoal theme (#1A1A1A) with teal accents (#4ECDC4).
- **Backend**: Firebase (Firestore, Auth, Vertex AI).
- **AI**: Gemini 2.0 Flash via Firebase Vertex AI for automated label scanning and data extraction.
- **PWA**: Service worker (`sw.js`) for offline caching and `manifest.json` for home-screen installation.

## Local Development

No build process. Serve the project root with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Deploy Firestore rules when changed:

```bash
firebase deploy --only firestore:rules
```

## Deployment

**Production URL:** `cellar.jaihimself.com`

**Hosting:** Cloudflare Pages (auto-deploys from GitHub main branch)

The app is automatically deployed to Cloudflare Pages whenever you push to the `main` branch on GitHub. There is no manual deployment step required — `git push` triggers the deployment automatically.

**GitHub's role:** Source control only. GitHub is not used for hosting; it is solely the source repository. Cloudflare Pages watches the GitHub main branch, clones it, and serves the static files from `cellar.jaihimself.com`.

**Firestore rules:** Deploy separately when updated:

```bash
firebase deploy --only firestore:rules
```

## Module Graph

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

## State & Rendering

All runtime state lives in `js/state.js` — a single exported `state` object. Mutate it directly; there is no reactive framework. After any mutation, call `renderInventory()` to sync the DOM.

`ui.js:renderInventory()` is the sole render function. It reads `state.inventory`, applies filters/search/sort, builds HTML strings, and sets `main.innerHTML`. There is no virtual DOM or diffing.

## Auth & Data Access

- Firestore rules allow **public read** of the `cellar` collection; writes are locked to a single hardcoded owner UID (`firestore.rules`).
- `loadInventory()` is called for both authenticated and unauthenticated users. Unauthenticated browsing is gated by `state.showInventoryUnauth`.
- On sign-in state change (`onAuthStateChanged`), `updateAuthUI()` re-renders and triggers `loadInventory()`.

## AI Integration

`js/ai.js` uses `gemini-2.0-flash` via Firebase Vertex AI SDK. It tries `firebase-vertexai.js` first and falls back to `firebase-ai.js` with `GoogleAIBackend`. Label scans pass a base64 inline image (client-side resized to max 1024px before sending). Pro score and color lookups are text-only.

## PWA / Service Worker

`sw.js` uses a two-cache strategy:
- `cellar-shell-v{N}` — app shell (cache-first for static assets, network-first for HTML)
- `cellar-fonts-v1` — Firebase SDK + Google Fonts (network-first, cached thereafter)

**When adding a new JS or CSS file**, add it to the `APP_SHELL` array in `sw.js`. **When making any JS/CSS change**, bump the `SHELL_CACHE` version number to force clients to pick up the new files.

## Core Mandates & Conventions
- **No Build Tools**: Avoid adding `npm`, `webpack`, or `vite`. Keep the project portable as a static site.
- **No Frameworks**: All UI is vanilla JS + DOM string templating. CSS custom properties for theming.
- **Mobile First**: Design specifically for iPhone/Android home-screen use.
- **Accessibility**: Maintain WCAG AA contrast (4.5:1 or higher) for all text.
- **Security**: All write operations must be gated by Firebase Auth (`state.currentUser` check) and validated against the owner's UID in `firestore.rules`.
- **Version bump on every push**: Increment the footer version in `index.html` and add a corresponding entry at the top of the Version History below with every change.

## Data Schema (Firestore: `cellar` collection)
- `name`: Full producer and wine/spirit name.
- `year`: Vintage or age statement.
- `region`: Appellation/Country.
- `grape`: Variety or blend.
- `abv`: Alcohol percentage.
- `temp`: Serving temperature.
- `notes`: AI-generated or user-provided tasting notes.
- `decant`: Decanting recommendation.
- `window`: Drinking window.
- `status`: One of `ready`, `soon`, `spirits`, `consumed`.
- `rating`: (Optional) `up` or `down` for consumed bottles.
- `buyAgain`: (Optional) Boolean to track bottles to be restocked.

## Version History
- **v2.0.48 (April 23, 2026)**:
    - fix: Improved Gallery infinite scroll by allowing smooth transitions into clones before silent swapping.
    - UI: Fixed pagination mapping for clone elements in Gallery mode.
- **v2.0.47 (April 23, 2026)**:
    - feat: Redesigned Gallery mode as an immersive full-screen overlay with a "Back" button, mirroring Vertical mode.
    - UI: Unified depth effects and background handling across all immersive views.
- **v2.0.46 (April 23, 2026)**:
    - feat: Redesigned Vertical mode as an immersive full-screen overlay with a "Back" button.
    - UI: Enhanced animations and depth effects for vertical cards.
- **v2.0.45 (April 23, 2026)**:
    - fix: Restored background image in Vertical mode by removing solid background color.
    - UI: Improved View Toggle visibility with increased contrast and backdrop blur.
- **v2.0.44 (April 23, 2026)**:
    - fix: Restored navigation visibility in Vertical mode by adjusting z-indices.
    - UI: Enhanced sticky header/controls contrast and card centering.
- **v2.0.43 (April 23, 2026)**:
    - feat: Added Vertical Scroll mode with native CSS snap scrolling and full-screen cards.
    - feat: Three-way View Toggle (Grid, Gallery, Vertical) with localStorage persistence.
    - UX: Added vertical dot indicators and keyboard ArrowUp/Down support.
- **v2.0.42 (April 23, 2026)**:
    - feat: Added a dedicated Changelog (Version History) modal to the hamburger menu.
    - feat: Structured version history data into `js/changelog.js` for easy maintenance.
    - UI: Improved navigation by adding a "📜 Changelog" option to the drawer.
- **v2.0.41 (April 23, 2026)**:
    - perf: Optimized Gallery Mode with O(1) active card detection using scroll position math.
    - perf: Implemented DOM caching in `renderInventory` to skip redundant filtering, sorting, and rendering when data hasn't changed.
    - perf: Added a `galleryHash` to prevent unnecessary reconstruction of the entire gallery container.
    - perf: Cached the Gemini AI model instance in `ai.js` to reduce SDK overhead.
    - fix: Added window resize listener to keep Gallery Mode centered.
    - fix: Hardened `formatRelativeTime` for future-dated timestamps and edge cases.
- **v2.0.33 (April 23, 2026)**:
    - (Add your changes here)
- **v2.0.32 (April 23, 2026)**:
    - (Add your changes here)
- **v2.0.31 (April 23, 2026)**:
    - (Add your changes here)
- **v2.0.30 (April 23, 2026)**:
    - (Add your changes here)
- **v2.0.29 (April 22, 2026)**:
    - (Add your changes here)
- **v2.0.28 (April 22, 2026)**:
    - (Add your changes here)
- **v2.0.27 (April 22, 2026)**:
    - feat: Added Gallery Mode — a horizontal swipe view for browsing bottles on mobile.
    - feat: Added Grid/Gallery view toggle with persistent preference in localStorage.
    - feat: Implemented native touch swipe navigation with rubber band effects and keyboard support.
    - UI: Enhanced card design for Gallery mode with large typography and thematic gradients.
    - Performance: Optimized rendering to only keep 3 cards in the DOM at a time.
    - Accessibility: Added screen reader announcements and a first-use swipe hint.
- **v2.0.26 (April 22, 2026)**:
    - feat: Added "Added Date" to inventory cards. New bottles now track and display the date they were added to the cellar.
- **v2.0.25 (April 22, 2026)**:
    - feat: Upgrade AI model to `gemini-2.5-flash` for improved reasoning and label OCR.
- **v2.0.24 (April 22, 2026)**:
    - fix: Switched AI model to `gemini-1.5-flash` as an intermediate fix for 404 errors with the previous 2.0-flash endpoint.
- **v2.0.23 (April 22, 2026)**:
    - fix: Resolved a loading issue that prevented the database from initializing.
    - refactor: Decoupled `analytics.js` from `state.js` to prevent circular dependencies.
- **v2.0.22 (April 22, 2026)**:
    - fix: Fixed Analytics Dashboard in the hamburger menu. Dashboard no longer hides when active bottles are 0, added "Lifetime Finished" stat, and added a placeholder for empty collections.
    - UI: Improved dashboard layout with ellipsis for long region names.
- **v2.0.21 (April 22, 2026)**:
    - fix: Synchronized all internal JS module imports and Service Worker `APP_SHELL` to `v2.0.21` to resolve a PWA cache mismatch.
    - UI: Updated hardcoded "Last updated" date in header to reflect the current release.
    - Maintenance: Bumped Service Worker `SHELL_CACHE` to `v47` to force clients to pick up versioned asset changes.
- **v2.0.20 (April 22, 2026)**:
    - deploy: Migrated hosting from GitHub Pages to Cloudflare Pages at cellar.jaihimself.com. No code changes—production URL is now cellar.jaihimself.com instead of jaihimself.github.io. Firebase Auth authorized domains updated to include the new production domain.
- **v2.0.19 (April 14, 2026)**:
    - fix: Complete aggressive cache-breaking for all JS module imports and sync Service Worker `APP_SHELL`. Updated all internal JS imports to use versioned query strings (`?v=2.0.19`) to ensure browsers always load the latest logic and the Service Worker pre-caches the correct URLs.
- **v2.0.18 (April 14, 2026)**:
    - UI: Applied `opacity: 0.6` to all card types (ready, soon, spirits, consumed) to match the dark aesthetic. Bumped cache version and updated query strings to force reload of CSS.
- **v2.0.17 (April 14, 2026)**:
    - refactor: Split monolithic `js/ui.js` into three focused modules for improved maintainability: `js/render.js` (all rendering functions), `js/events.js` (all event listeners), and `js/modal.js` (modal-specific functions). `js/ui.js` now serves as a thin coordinator that re-exports public functions and maintains `updateAuthUI()`. No logic changes—pure structural refactoring to improve code organization and ease future maintenance.
- **v2.0.16 (April 14, 2026)**:
    - perf: Replace getDocs() one-time fetch with onSnapshot() real-time listener. Inventory updates automatically on any Firestore change without manual re-fetch. Listener starts on sign-in, stops on sign-out. Falls back to getDocs() if onSnapshot errors. Removed redundant renderInventory() calls from all write operations.
- **v2.0.15 (April 14, 2026)**:
    - perf: Optimistic UI updates for markConsumed, setRating, and updateQuantity. State is updated and re-rendered immediately; Firestore write happens in background. On failure, state is reverted and an error toast is shown.
- **v2.0.14 (April 14, 2026)**:
    - feat: Search debouncing (150ms) to reduce rapid re-renders on every keystroke.
    - feat: Filter/sub-filter/sort persistence via localStorage with graceful defaults.
    - feat: Global error and success toast notifications with auto-dismiss. All Firestore write operations now show toasts on success or failure.
- **v2.0.13 (April 14, 2026)**:
    - Maintenance: Remove ineffective background/border-color overrides on card status classes; rely solely on ::before accent border for status indication. Consumed opacity retained.
- **v2.0.12 (April 14, 2026)**:
    - UI: Replace full-card opacity with background-only dimming for ready/soon/spirits cards so text stays at full brightness; consumed cards retain opacity: 0.6.
- **v2.0.11 (April 14, 2026)**:
    - UI: Applied opacity: 0.6 to all card types (ready, soon, spirits) to match consumed card styling.
- **v2.0.10 (April 14, 2026)**:
    - Maintenance: Implemented aggressive cache-breaking by appending version query strings to CSS and JS imports. This ensures that UI readability improvements and thematic styling are immediately visible to all users, bypassing stubborn Service Worker or browser caches.
- **v2.0.9 (April 14, 2026)**:
    - UI Refinement: Extended thematic color-coding to sub-filter buttons (Red, White, etc.) and increased CSS specificity for more reliable styling. Slightly increased opacity for active tabs (0.15) for better visibility.
- **v2.0.8 (April 14, 2026)**:
    - UI Refinement: Thematic color-coding for filter tabs. "Wine", "Spirits", and "Consumed" tabs now use their specific status colors (Emerald, Copper, and Grey) when active, with a consistent low-opacity background style.
- **v2.0.7 (April 14, 2026)**:
    - UX Enhancement: Improved readability of filter tabs and search bars by adding a semi-transparent dark overlay and blur effect to the controls container.
    - UI Refinement: Increased contrast for inactive filter and sub-filter buttons to ensure they remain legible against the background image.
- **v2.0.6 (April 14, 2026)**:
    - UX Fix: Improved readability of the Welcome screen by adding a frosted-glass background (blur + semi-transparent overlay) to the main text container, ensuring contrast against the new background image.
- **v2.0.5 (April 14, 2026)**:
    - UI Refinement: Removed the "A personal inventory" tagline for a cleaner, more minimalist header.
- **v2.0.4 (April 14, 2026)**:
    - UI Enhancement: Added `wine.jpg` as the global background image with 50% opacity for a more immersive aesthetic.
- **v2.0.3 (April 14, 2026)**:
    - Privacy Enhancement: Hidden the "Consumed" filter tab and associated "Lifetime Consumed" metrics for unauthorized users to maintain collection privacy during public browsing.
- **v2.0.2 (April 14, 2026)**:
    - Refactor: Split monolithic `css/style.css` into modular `css/base.css`, `css/cards.css`, `css/modal.css`, and new `css/style.css` for improved maintainability.
- **v2.0.1 (April 14, 2026)**:
    - UI Refinement: Moved "View the Collection" to the top of the welcome screen and hidden top-level filters until the inventory is viewed.
- **v2.0.0 (April 14, 2026)**:
    - Major Milestone: Corrected the AI model reference to Gemini 2.0 Flash across the codebase.
- **v1.9.9 (April 14, 2026)**:
    - Data Fix: Ensured `loadInventory` is called for unauthenticated users so "View the Collection" actually has data to display.
- **v1.9.8 (April 14, 2026)**:
    - Feature: Added "View the Collection" button to the Welcome screen, allowing unauthenticated users to browse the inventory in read-only mode.
- **v1.9.7 (April 14, 2026)**:
    - Bug Fix: Restored the "In Stock" section for active inventory by refining the detection for consumed items.
- **v1.9.6 (April 14, 2026)**:
    - Robustness Fix: Hardened the `isConsumed` check to ensure "In Stock" is always hidden for bottles with 0 quantity or consumed status.
- **v1.9.5 (April 14, 2026)**:
    - UI Refinement: Hidden the "In Stock" section in the details popup for consumed bottles.
- **v1.9.4 (April 14, 2026)**:
    - UI Fix: Forced removal of any leftover star elements on tab buttons.
- **v1.9.3 (April 14, 2026)**:
    - UI Refinement: Removed the star indicator from the "Consumed" filter tab for a cleaner look.
- **v1.9.2 (April 14, 2026)**:
    - Feature: Made "Lifetime Consumed" count editable in the bottle details modal for easy historical corrections.
    - Bug Fix: Ensured initial quantity and consumption count are correctly saved when adding a new bottle.
- **v1.9.1 (April 14, 2026)**:
    - UX Fix: Made "Buy Again" button visible for all items (not just consumed) when signed in.
    - Robustness: Improved "Consumed" detection for older or manually edited records.
    - Performance: Bumped Service Worker cache version to force latest JS assets.
- **v1.9.0 (April 14, 2026)**:
    - Implemented "Buy Again" feature: added a star to consumed bottles marked for repurchase.
    - Added a visual star reminder to the "Consumed" filter tab when items are marked for repurchase.
- **v1.8.9 (April 14, 2026)**:
    - Feature Removal: Removed the "For Cooking" section and associated `cook` status as requested.
- **v1.8.8 (April 14, 2026)**:
    - Resolved Circular Dependency: Used dynamic imports in `bulkUpdateScores` and `bulkTagWineColor` and cleaned up `db.js`.
- **v1.8.7 (April 14, 2026)**:
    - Fixed Initial Loading Stall: Added immediate `renderInventory()` call on app startup to show the Welcome screen instantly while Auth resolves.
- **v1.8.6 (April 14, 2026)**:
    - Resolved Circular Dependency: Removed all top-level UI imports from `db.js` in favor of dynamic `import()` calls, fixing a race condition that prevented the app from loading.
- **v1.8.4 (April 13, 2026)**:
    - Fixed Circular Dependency: Resolved a module hang where `ui.js` and `db.js` were stuck in an import loop.
    - Improved Auth: Implemented a popup-first strategy with a redirect fallback for sign-in, maximizing compatibility across browsers.
- **v1.8.3 (April 13, 2026)**:
    - Auth Fix: Switched to `signInWithRedirect` for reliable mobile sign-in (popups often blocked on mobile).
    - UX Fix: Added "Welcome" landing page (Readme portion) for unauthenticated users.
    - Performance: Deferred inventory loading until after authentication.
- **v1.8.2 (April 13, 2026)**:
    - Data Fix: Ensured "Piggyback" and "Powers" are correctly identified as spirits, even in the Consumed tab.
- **v1.8.1 (April 13, 2026)**:
    - Enhanced "Consumed" tab: now automatically splits finished bottles into "Consumed Wine" and "Consumed Spirits" sub-sections.
    - Added "For Cooking" section to track culinary wines.
    - Added empty state messaging for all filter tabs.
    - Improved legacy data handling with automatic status fallbacks.
- **v1.8.0 (April 13, 2026)**:
    - Dedicated "Consumed" filter tab: isolate finished bottles from active inventory.
    - Improved "Wine" and "Spirits" filters to exclude consumed items for a cleaner view.
    - Relocated "All" vs "Liked Only" filters to a secondary sub-filter bar under the Consumed tab.
- **v1.7.3 (April 13, 2026)**:
    - UI Refinement: Moved quantity badge from top-left to bottom-right of inventory cards.
    - Fixed overlap issues between quantity badge and vintage year.
- **v1.7.2 (April 13, 2026)**:
    - Expanded Security: Added explicit authentication guards to all write operations (Add, Delete, Rate).
    - Unified protection for inventory modifications across UI and database logic.
- **v1.7.1 (April 13, 2026)**:
    - Security Fix: Restricted quantity adjustment buttons (+/-) to signed-in users only.
    - Added backend authentication check for manual quantity updates.
- **v1.7.0 (April 13, 2026)**:
    - Implemented Quantity Tracking: track multiple bottles per wine entry.
    - Added "Lifetime Consumed" counter to preserve history across restocks.
    - Intelligent Restock Flow: scanning a previously finished wine offers to restock the existing entry.
    - Added quantity controls (+/-) to the bottle details modal.
    - Visual quantity badges (e.g. x3) on inventory cards.
- **v1.6.2 (April 13, 2026)**:
    - Implemented dynamic "Last updated" header with relative time formatting (e.g., "Just now").
    - Added background timestamp synchronization using Firestore `updatedAt` field.
    - Synchronized app version numbering across footer and documentation.
- **v1.6.1 (April 13, 2026)**:
    - Added secondary sub-filter bar for Wines (All, Red, White, Rosé, Sparkling).
    - Updated AI scan prompt to automatically detect wine color/style.
    - Implemented "Bulk Auto-Tag Wine Colors" maintenance tool in settings.
- **v1.6.0 (April 13, 2026)**:
    - Redesigned navigation with a slide-out Hamburger Menu (Drawer).
    - Moved Analytics Dashboard into a dedicated Modal overlay.
    - Integrated Inventory Settings into the navigation drawer.
    - Improved UI layout by removing inline dashboard and gear icon.
- **v1.5.0 (April 13, 2026)**:
    - Added Settings Gear to controls bar (only visible when signed in).
    - Implemented "Bulk Update" feature to find and update wines missing scores/vintages.
    - Fixed UI listeners for settings modal and improved background refresh logic.
- **v1.4.3 (April 13, 2026)**:
    - Implemented Vintage Chart & Professional Score Lookup.
    - Added "Regional Vintage Rating" to bottle details modal.
    - Enhanced Gemini AI prompt to fetch regional vintage quality info.
- **v1.4.2 (April 13, 2026)**:
    - Fixed Service Worker cache to include new JS modules and CSS.
    - Improved Sort Dropdown responsiveness on mobile (font-size bump to prevent iOS zoom).
    - Fixed bug where Stats would hide prematurely on slow loads.
- **v1.4.1 (April 13, 2026)**:
    - Fixed mobile layout for Analytics Dashboard (responsive padding, flex-wrap, and smaller font sizes).
    - Implemented Real-Time Search & Sorting.
- **v1.4.0 (April 13, 2026)**:
    - Modularized JS into ES modules (`js/`).
    - Separated CSS into external file (`css/style.css`).
    - Decoupled HTML from JS using event delegation (removed `onclick`).
    - Implemented client-side image resizing (max 1024px) for faster scanning.
- **v1.3.0**: Redesign palette (charcoal dark theme, teal accent).

## Roadmap (Planned Features)
- [ ] Personal user-editable tasting notes field.
- [ ] Purchase price tracking.
- [ ] Push notifications for "Drink Soon" bottles.
- [x] Vintage chart/score lookup.
- [ ] Read-only sharing view for friends.
