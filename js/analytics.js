import { state } from './state.js?v=2.0.19';

export function renderAnalytics() {
  const container = document.getElementById('analytics-dashboard');
  if (!container) return;

  const allBottles = Object.values(state.inventory);
  const activeBottles = allBottles.filter(w => w.status !== 'consumed');
  
  // If we have NO bottles at all, it might still be loading, 
  // but if we've fetched and it's empty, we hide it.
  if (allBottles.length === 0) {
    container.style.display = 'none';
    return;
  }

  const total = activeBottles.length;
  if (total === 0) {
    container.style.display = 'none';
    return;
  }

  let wineCount = 0;
  let spiritsCount = 0;
  const regionCounts = {};

  activeBottles.forEach(w => {
    if (w.status === 'spirits' || w.type === 'spirit') {
      spiritsCount++;
    } else {
      wineCount++;
    }

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
