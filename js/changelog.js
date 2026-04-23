export const CHANGELOG = [
  {
    version: "2.0.52",
    date: "April 23, 2026",
    changes: [
      "perf: Optimized immersive scroll performance with GPU-accelerated CSS properties (will-change).",
      "perf: Implemented O(1) mathematical card detection for Vertical mode to reduce CPU usage.",
      "fix: Refined Horizontal scroll logic for smoother infinite looping and reduced jank.",
      "UI: Snappier transitions (350ms) for a more responsive feel across all gallery modes."
    ]
  },
  {
    version: "2.0.51",
    date: "April 23, 2026",
    changes: [
      "fix: Resolved a critical bug where caching logic prevented Gallery mode from initializing correctly.",
      "fix: Corrected Vertical mode initial scroll positioning and card activation.",
      "UI: Improved code structure and scoping for more reliable view transitions."
    ]
  },
  {
    version: "2.0.50",
    date: "April 23, 2026",
    changes: [
      "feat: Implemented infinite scrolling for Vertical mode, matching the Horizontal gallery experience.",
      "fix: Added silent jump logic to Vertical mode to ensure smooth looping between first and last cards.",
      "UI: Standardized active card detection and clone mapping across all immersive modes."
    ]
  },
  {
    version: "2.0.49",
    date: "April 23, 2026",
    changes: [
      "feat: Consolidated Horizontal and Vertical views into a unified 'Gallery' category.",
      "feat: Added a sub-mode toggle within the Gallery to easily switch between Horizontal and Vertical layouts.",
      "UI: Simplified main navigation with a cleaner 2-way Grid/Gallery toggle.",
      "UX: Persists your preferred Gallery sub-mode across sessions."
    ]
  },
  {
    version: "2.0.48",
    date: "April 23, 2026",
    changes: [
      "fix: Fixed Gallery infinite scroll to smoothly transition onto the first/last card instead of jumping back across the entire list.",
      "UI: Improved Gallery pagination accuracy during rapid scrolling."
    ]
  },
  {
    version: "2.0.47",
    date: "April 23, 2026",
    changes: [
      "feat: Redesigned Gallery mode as a full-screen immersive overlay, matching Vertical mode.",
      "feat: Added a 'Back' button to Gallery mode for consistent navigation.",
      "UI: Enhanced Gallery card animations and depth effects.",
      "UI: Unified immersive mode z-indexing and background handling."
    ]
  },
  {
    version: "2.0.46",
    date: "April 23, 2026",
    changes: [
      "feat: Redesigned Vertical mode as a full-screen immersive overlay.",
      "feat: Added a 'Back' button to Vertical mode for seamless return to Grid view.",
      "UI: Enhanced vertical card animations and blur effects for a more premium feel.",
      "UI: Increased Vertical mode z-index to ensure it properly covers navigation when active."
    ]
  },
  {
    version: "2.0.45",
    date: "April 23, 2026",
    changes: [
      "fix: Restored app background image in Vertical mode by making container transparent.",
      "fix: Hardened navigation toggle accessibility with high-contrast background and stronger backdrop blur.",
      "UI: Finalized immersive vertical centering to ensure cards don't collide with controls."
    ]
  },
  {
    version: "2.0.44",
    date: "April 23, 2026",
    changes: [
      "fix: Restored access to View Toggle while in Vertical Mode by adjusting z-indices.",
      "UI: Enhanced header and controls legibility with increased blur and darker background during immersive scrolling.",
      "fix: Centered vertical cards properly to avoid overlap with sticky navigation."
    ]
  },
  {
    version: "2.0.43",
    date: "April 23, 2026",
    changes: [
      "feat: Added Vertical Scroll mode with native CSS snap scrolling.",
      "feat: Full-screen vertical card layout with one bottle centered at a time.",
      "feat: Vertical position indicators (dots) on the right side.",
      "UI: Three-way View Toggle (Grid, Gallery, Vertical) with persistence.",
      "UX: Support for keyboard Up/Down arrows and vertical swipe navigation."
    ]
  },
  {
    version: "2.0.42",

    date: "April 23, 2026",
    changes: [
      "perf: Optimized Gallery Mode with O(1) active card detection using scroll position math.",
      "perf: Implemented DOM caching in renderInventory to skip redundant filtering, sorting, and rendering.",
      "perf: Added a galleryHash to prevent unnecessary reconstruction of the entire gallery container.",
      "perf: Cached the Gemini AI model instance in ai.js to reduce SDK overhead.",
      "fix: Added window resize listener to keep Gallery Mode centered.",
      "fix: Hardened formatRelativeTime for future-dated timestamps and edge cases."
    ]
  },
  {
    version: "2.0.27",
    date: "April 22, 2026",
    changes: [
      "feat: Added Gallery Mode — a horizontal swipe view for browsing bottles on mobile.",
      "feat: Added Grid/Gallery view toggle with persistent preference in localStorage.",
      "feat: Implemented native touch swipe navigation with rubber band effects and keyboard support.",
      "UI: Enhanced card design for Gallery mode with large typography and thematic gradients.",
      "Performance: Optimized rendering to only keep 3 cards in the DOM at a time.",
      "Accessibility: Added screen reader announcements and a first-use swipe hint."
    ]
  },
  {
    version: "2.0.26",
    date: "April 22, 2026",
    changes: [
      "feat: Added 'Added Date' to inventory cards. New bottles now track and display the date they were added."
    ]
  },
  {
    version: "2.0.25",
    date: "April 22, 2026",
    changes: [
      "feat: Upgrade AI model to gemini-2.5-flash for improved reasoning and label OCR."
    ]
  },
  {
    version: "2.0.22",
    date: "April 22, 2026",
    changes: [
      "fix: Fixed Analytics Dashboard in the hamburger menu. Added 'Lifetime Finished' stat.",
      "UI: Improved dashboard layout with ellipsis for long region names."
    ]
  },
  {
    version: "2.0.17",
    date: "April 14, 2026",
    changes: [
      "refactor: Split monolithic js/ui.js into focused modules for improved maintainability (render, events, modal).",
      "UI: Applied thematic styling and opacity refinements across all card types."
    ]
  },
  {
    version: "2.0.16",
    date: "April 14, 2026",
    changes: [
      "perf: Replace getDocs() one-time fetch with onSnapshot() real-time listener for automatic updates."
    ]
  },
  {
    version: "2.0.15",
    date: "April 14, 2026",
    changes: [
      "perf: Optimistic UI updates for markConsumed, setRating, and updateQuantity for zero-latency feel."
    ]
  },
  {
    version: "2.0.14",
    date: "April 14, 2026",
    changes: [
      "feat: Search debouncing (150ms) to reduce rapid re-renders.",
      "feat: Global error and success toast notifications with auto-dismiss."
    ]
  },
  {
    version: "2.0.4",
    date: "April 14, 2026",
    changes: [
      "UI: Added immersive global background image with 50% opacity.",
      "UI: Removed tagline for a cleaner, minimalist header."
    ]
  },
  {
    version: "1.9.0",
    date: "April 14, 2026",
    changes: [
      "feat: Implemented 'Buy Again' feature to track bottles for repurchase.",
      "UI: Added visual indicators (stars) for restock reminders."
    ]
  },
  {
    version: "1.7.0",
    date: "April 13, 2026",
    changes: [
      "feat: Implemented Quantity Tracking (multiple bottles per entry).",
      "feat: Added 'Lifetime Consumed' counter to preserve history across restocks.",
      "feat: Intelligent Restock Flow - scanning a finished wine offers to update existing record."
    ]
  },
  {
    version: "1.4.3",
    date: "April 13, 2026",
    changes: [
      "feat: Implemented Vintage Chart & Professional Score Lookup.",
      "feat: Added Regional Vintage Rating to bottle details using Gemini AI."
    ]
  },
  {
    version: "1.4.0",
    date: "April 13, 2026",
    changes: [
      "refactor: Major modularization into ES modules and external CSS.",
      "perf: Client-side image resizing for faster scanning and reduced data usage."
    ]
  },
  {
    version: "1.3.0",
    date: "Initial Release",
    changes: [
      "Design: Complete UI redesign with charcoal dark theme and teal accents.",
      "feat: AI label scanning via Gemini Flash."
    ]
  }
];
