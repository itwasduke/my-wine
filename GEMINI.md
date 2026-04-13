# The Cellar — Project Context

Personal wine & spirits inventory tracker built as a high-end, mobile-first PWA.

## Architecture & Tech Stack
- **Frontend**: Single-page application (SPA) with a clean `index.html`.
- **Logic**: Vanilla JavaScript (ES modules) in `js/` directory. No build step.
- **Styling**: Vanilla CSS in `css/` directory. Dark charcoal theme (#1A1A1A) with teal accents (#4ECDC4).
- **Backend**: Firebase (Firestore, Auth, Vertex AI).
- **AI**: Gemini 2.0 Flash via Firebase Vertex AI for automated label scanning and data extraction.
- **PWA**: Service worker (`sw.js`) for offline caching and `manifest.json` for home-screen installation.

## Core Mandates & Conventions
- **Modular Structure**: Logic in `js/`, styling in `css/`, structure in `index.html`.
- **No Build Tools**: Avoid adding `npm`, `webpack`, or `vite`. Keep the project portable as a static site.
- **Mobile First**: Design specifically for iPhone/Android home-screen use.
- **Accessibility**: Maintain WCAG AA contrast (4.5:1 or higher) for all text.
- **Security**: All write operations must be gated by Firebase Auth and validated against the owner's UID in `firestore.rules`.

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
- `status`: One of `ready`, `soon`, `cook`, `spirits`, `consumed`.
- `rating`: (Optional) `up` or `down` for consumed bottles.

## Version History
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
