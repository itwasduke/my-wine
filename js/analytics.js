import { state } from './state.js';

export function renderAnalytics() {
  const container = document.getElementById('analytics-dashboard');
  if (!container) return;

  const activeBottles = Object.values(state.inventory).filter(w => w.status !== 'consumed');
  
  if (activeBottles.length === 0) {
    container.style.display = 'none';
    return;
  }

  const total = activeBottles.length;
  
  let wineCount = 0;
  let spiritsCount = 0;
  const regionCounts = {};

  activeBottles.forEach(w => {
    // If status is spirits or type property indicates spirit
    if (w.status === 'spirits' || w.type === 'spirit') {
      spiritsCount++;
    } else {
      wineCount++;
    }

    // Try to extract a simple region name if it's too long, or just use as is
    const region = w.region && w.region.trim();
    if (region && region !== '—' && region.toLowerCase() !== 'unknown') {
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    }
  });

  const winePct = Math.round((wineCount / total) * 100) || 0;
  const spiritsPct = Math.round((spiritsCount / total) * 100) || 0;
  
  let topRegion = 'Mixed';
  let maxCount = 0;
  for (const [region, count] of Object.entries(regionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topRegion = region;
    }
  }
  
  // Truncate long region names for the dashboard
  if (topRegion.length > 22) {
    topRegion = topRegion.substring(0, 20) + '…';
  }

  container.innerHTML = `
    <div class="analytics-stat">
      <div class="analytics-value">${total}</div>
      <div class="analytics-label">Active Bottles</div>
    </div>
    <div class="analytics-divider"></div>
    <div class="analytics-stat">
      <div class="analytics-value">${winePct}% <span style="font-size: 0.8em; color: var(--text-muted)">/</span> ${spiritsPct}%</div>
      <div class="analytics-label">Wine / Spirits</div>
    </div>
    <div class="analytics-divider"></div>
    <div class="analytics-stat">
      <div class="analytics-value" title="${topRegion}">${topRegion}</div>
      <div class="analytics-label">Top Region</div>
    </div>
  `;
  container.style.display = 'flex';
}
