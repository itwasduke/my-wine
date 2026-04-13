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
- [ ] Vintage chart/score lookup.
- [ ] Read-only sharing view for friends.
