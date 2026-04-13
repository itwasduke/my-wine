# The Cellar — Project Context

Personal wine & spirits inventory tracker built as a high-end, mobile-first PWA.

## Architecture & Tech Stack
- **Frontend**: Single-page application (SPA) in a monolithic `index.html`.
- **Logic**: Vanilla JavaScript (ES modules) with no build step.
- **Styling**: Vanilla CSS with a dark charcoal theme (#1A1A1A) and teal accents (#4ECDC4).
- **Backend**: Firebase (Firestore, Auth, Vertex AI).
- **AI**: Gemini 2.0 Flash via Firebase Vertex AI for automated label scanning and data extraction.
- **PWA**: Service worker (`sw.js`) for offline caching and `manifest.json` for home-screen installation.

## Core Mandates & Conventions
- **Single File**: All UI components, styles, and logic must remain in `index.html` unless the file size becomes unmanageable.
- **Mobile First**: Design specifically for iPhone/Android home-screen use.
- **Accessibility**: Maintain WCAG AA contrast (4.5:1 or higher) for all text.
- **Security**: All write operations must be gated by Firebase Auth and validated against the owner's UID in `firestore.rules`.
- **No Build Tools**: Avoid adding `npm`, `webpack`, or `vite`. Keep the project portable as a static site.

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

## Roadmap (Planned Features)
- [ ] Personal user-editable tasting notes field.
- [ ] Purchase price tracking.
- [ ] Push notifications for "Drink Soon" bottles.
- [ ] Vintage chart/score lookup.
- [ ] Read-only sharing view for friends.
