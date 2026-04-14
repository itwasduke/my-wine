#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths (relative to project root)
const projectRoot = path.join(__dirname, '..');
const pkgPath = path.join(projectRoot, 'package.json');
const indexPath = path.join(projectRoot, 'index.html');
const swPath = path.join(projectRoot, 'sw.js');
const geminiPath = path.join(projectRoot, 'GEMINI.md');

// ─────────────────────────────────────────────────────────────
// 1. Read current version from package.json
// ─────────────────────────────────────────────────────────────
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (err) {
  console.error(`❌ Failed to read package.json: ${err.message}`);
  process.exit(1);
}

const currentVersion = pkg.version;
const parts = currentVersion.split('.');
if (parts.length !== 3) {
  console.error(`❌ Invalid version format in package.json: ${currentVersion}`);
  console.error(`   Expected format: X.Y.Z (e.g., 2.0.17)`);
  process.exit(1);
}

// Increment patch version
parts[2] = String(parseInt(parts[2], 10) + 1);
const newVersion = parts.join('.');

console.log(`📦 Version bump: ${currentVersion} → ${newVersion}\n`);

// ─────────────────────────────────────────────────────────────
// 2. Update package.json
// ─────────────────────────────────────────────────────────────
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✓ package.json`);

// ─────────────────────────────────────────────────────────────
// 3. Update index.html (CSS, JS, and footer version)
// ─────────────────────────────────────────────────────────────
let html = fs.readFileSync(indexPath, 'utf8');
const escapedVersion = currentVersion.replace(/\./g, '\\.');
const cssRegex = new RegExp(`css/(\\w+)\\.css\\?v=${escapedVersion}`, 'g');
const jsRegex = new RegExp(`js/(\\w+)\\.js\\?v=${escapedVersion}`, 'g');
const footerRegex = new RegExp(`v${escapedVersion}`, 'g');

html = html.replace(cssRegex, `css/$1.css?v=${newVersion}`);
html = html.replace(jsRegex, `js/$1.js?v=${newVersion}`);
html = html.replace(footerRegex, `v${newVersion}`);

fs.writeFileSync(indexPath, html);
console.log(`✓ index.html (CSS/JS queries, footer version)`);

// ─────────────────────────────────────────────────────────────
// 4. Update all JS files in the js/ directory
// ─────────────────────────────────────────────────────────────
const jsDir = path.join(projectRoot, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

jsFiles.forEach(file => {
  const filePath = path.join(jsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update ?v= query strings in both static and dynamic imports
  const oldContent = content;
  content = content.replace(
    new RegExp(`\\?v=${currentVersion.replace(/\./g, '\\.')}`, 'g'),
    `?v=${newVersion}`
  );
  
  if (content !== oldContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ js/${file} (updated internal imports)`);
  }
});

// ─────────────────────────────────────────────────────────────
// 5. Update sw.js (SHELL_CACHE version and APP_SHELL queries)
// ─────────────────────────────────────────────────────────────
let sw = fs.readFileSync(swPath, 'utf8');

// Bump the SHELL_CACHE version (e.g., v43 → v44)
const shellCacheMatch = sw.match(/const SHELL_CACHE = 'cellar-shell-v(\d+)'/);
if (shellCacheMatch) {
  const oldCacheVersion = parseInt(shellCacheMatch[1], 10);
  const newCacheVersion = oldCacheVersion + 1;
  sw = sw.replace(
    /const SHELL_CACHE = 'cellar-shell-v\d+'/,
    `const SHELL_CACHE = 'cellar-shell-v${newCacheVersion}'`
  );
}

// Update ?v= query strings in APP_SHELL
sw = sw.replace(
  new RegExp(`\\?v=${currentVersion.replace(/\./g, '\\.')}`, 'g'),
  `?v=${newVersion}`
);

fs.writeFileSync(swPath, sw);
console.log(`✓ sw.js (SHELL_CACHE version, APP_SHELL queries)`);

// ─────────────────────────────────────────────────────────────
// 5. Update GEMINI.md (add version history entry at the top)
// ─────────────────────────────────────────────────────────────
let gemini = fs.readFileSync(geminiPath, 'utf8');

// Get today's date in the format "Month Day, Year"
const today = new Date();
const dateStr = today.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// Find the "## Version History" section and insert after it
const versionHistoryMarker = '## Version History';
const markerIndex = gemini.indexOf(versionHistoryMarker);
if (markerIndex === -1) {
  console.error(`❌ Could not find "## Version History" section in GEMINI.md`);
  process.exit(1);
}

// Find the end of the marker line
const endOfMarkerLine = gemini.indexOf('\n', markerIndex);
if (endOfMarkerLine === -1) {
  console.error(`❌ Could not parse GEMINI.md structure`);
  process.exit(1);
}

// Insert new entry after the marker
const newEntry = `- **v${newVersion} (${dateStr})**:\n    - (Add your changes here)\n`;
gemini = gemini.slice(0, endOfMarkerLine + 1) + newEntry + gemini.slice(endOfMarkerLine + 1);

fs.writeFileSync(geminiPath, gemini);
console.log(`✓ GEMINI.md (added version history entry)`);

// ─────────────────────────────────────────────────────────────
// 6. Summary
// ─────────────────────────────────────────────────────────────
console.log(`\n✨ All files updated successfully!`);
console.log(`\n📝 Next step: Edit the new entry in GEMINI.md to describe your changes.`);
