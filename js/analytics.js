export function renderAnalytics(inventory) {
  const container = document.getElementById('analytics-dashboard');
  if (!container) return;

  const allBottles = Object.values(inventory);
  const activeBottles = allBottles.filter(w => w.status !== 'consumed');
  const consumedBottles = allBottles.filter(w => w.status === 'consumed');
  
  // If we have NO bottles at all, show a placeholder
  if (allBottles.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--text-muted); grid-column: 1 / -1;">
        <div style="font-size: 3rem; margin-bottom: 20px;">📊</div>
        <p>No bottles in your collection yet.</p>
        <p style="font-size: 0.8rem; margin-top: 10px;">Start scanning or adding bottles to see your cellar insights here.</p>
      </div>
    `;
    container.style.display = 'grid';
    return;
  }

  const total = activeBottles.length;
  let wineCount = 0;
  let spiritsCount = 0;
  const regionCounts = {};

  activeBottles.forEach(w => {
    const name = (w.name || '').toLowerCase();
    const isSpirit = (w.status === 'spirits' || w.type === 'spirit' || name.includes('piggyback') || name.includes('powers'));
    
    if (isSpirit) {
      spiritsCount++;
    } else {
      wineCount++;
    }

    const region = w.region && w.region.trim();
    if (region && region !== '—' && region.toLowerCase() !== 'unknown') {
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    }
  });

  const winePct = total > 0 ? Math.round((wineCount / total) * 100) : 0;
  const spiritsPct = total > 0 ? Math.round((spiritsCount / total) * 100) : 0;
  
  let topRegion = total > 0 ? 'Mixed' : '—';
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
      <div class="analytics-value">${consumedBottles.length}</div>
      <div class="analytics-label">Lifetime Finished</div>
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
