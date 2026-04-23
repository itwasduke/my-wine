import { SECTIONS, state } from './state.js?v=2.0.49';

let lastRenderedHTML = '';
let lastInventoryData = null;
let lastFilterState = null;
let lastGalleryItems = null;

function formatRelativeTime(date) {
  if (!date) return 'Never';
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 0) return 'Just now'; // Handle future clocks
  if (diff < 5) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function updateLastUpdatedUI() {
  const el = document.querySelector('.last-updated');
  if (el) {
    el.textContent = `Last updated: ${formatRelativeTime(state.lastUpdated)}`;
  }
}

// Keep it fresh
setInterval(updateLastUpdatedUI, 30000);

function cardHTML(w) {
  const qtyBadge = (parseInt(w.quantity) > 1)
    ? `<span class="card-qty">×${w.quantity}</span>`
    : '';
  const starBadge = (w.buyAgain) ? '<span class="card-star">⭐</span>' : '';
  const badge = w.status === 'consumed'
    ? `<span class="card-badge badge-consumed">Consumed${w.consumedDate ? ` · ${w.consumedDate}` : ''}</span>`
    : (w.badge ? `<span class="card-badge ${w.badgeClass || ''}">${w.badge}</span>` : '');
  const likedIcon = (w.status === 'consumed' && w.liked === true)
    ? `<span class="card-liked-icon" title="Liked" style="color:var(--accent)">👍</span>`
    : '';
  const addedDateHtml = w.addedDate ? `<div class="card-added-date">Added ${w.addedDate}</div>` : '';
  return `
    <div class="card ${w.status}" data-id="${w.id}">
      ${likedIcon}
      <div class="card-year">${w.year}</div>
      <div class="card-name">${w.name}</div>
      <div class="card-region">${w.region}</div>
      ${addedDateHtml}
      <div class="card-footer">
        <div class="card-badges-left">${badge}</div>
        <div class="card-badges-right">${starBadge}${qtyBadge}</div>
      </div>
    </div>
  `;
}

// cloneType: null (real card) | 'start' (clone of last) | 'end' (clone of first)
function galleryCardHTML(w, index, totalCount, cloneType = null) {
  if (!w) return '';
  const qty = parseInt(w.quantity) || 1;
  const qtyHtml  = qty > 1 ? `<span class="gc-qty">×${qty}</span>` : '';
  const starHtml = w.buyAgain ? `<span class="gc-star">⭐</span>` : '';

  const section = SECTIONS.find(s => s.status === w.status);
  const badgeLabel = w.status === 'consumed'
    ? `Consumed${w.consumedDate ? ` · ${w.consumedDate}` : ''}`
    : (w.badge || (section ? section.label : w.status));

  const rawNotes = w.notes || '';
  const notesPreview = rawNotes.length > 0
    ? `"${rawNotes.slice(0, 80)}${rawNotes.length > 80 ? '…' : ''}"`
    : '';

  let dotsHtml = '';
  if (totalCount <= 12) {
    dotsHtml = Array.from({ length: totalCount }, (_, i) =>
      `<span class="gc-dot${i === index ? ' gc-dot-active' : ''}"></span>`
    ).join('');
  } else {
    const pct = totalCount > 1 ? Math.round((index / (totalCount - 1)) * 100) : 0;
    dotsHtml = `<div class="gc-progress"><div class="gc-progress-fill" style="width:${pct}%"></div></div>`;
  }

  const abvHtml = w.abv ? `<span class="gc-abv-pill">${w.abv}</span>` : '';
  const cloneAttr = cloneType ? `data-clone="${cloneType}"` : `data-index="${index}"`;

  return `
    <div class="gallery-card ${w.status}" data-id="${w.id}" ${cloneAttr}>
      <div class="gc-hero">
        <div class="gc-name">${w.name}</div>
        <div class="gc-year">${w.year || '—'}</div>
        <div class="gc-region">${w.region || ''}</div>
        ${w.grape ? `<div class="gc-grape">${w.grape}</div>` : ''}
      </div>
      <div class="gc-divider"></div>
      <div class="gc-bottom">
        <div class="gc-badges-row">
          <span class="gc-status-badge">${badgeLabel}</span>
          ${abvHtml}
        </div>
        ${notesPreview ? `<p class="gc-notes">${notesPreview}</p>` : ''}
        ${(starHtml || qtyHtml) ? `<div class="gc-bottom-meta">${starHtml}${qtyHtml}</div>` : ''}
        <div class="gc-dots">${dotsHtml}</div>
      </div>
    </div>
  `;
}

function immersiveHeaderHTML(currentMode) {
  return `
    <div class="immersive-header">
      <button class="vertical-close" id="immersiveBackBtn" aria-label="Back to inventory">
        <span>←</span>
        <span>Back</span>
      </button>
      <div class="mode-sub-toggle">
        <button class="sub-mode-btn ${currentMode === 'gallery' ? 'active' : ''}" data-mode="gallery">Horizontal</button>
        <button class="sub-mode-btn ${currentMode === 'vertical' ? 'active' : ''}" data-mode="vertical">Vertical</button>
      </div>
    </div>
  `;
}

let galleryScrollListener = null;
let galleryResizeListener = null;
let hintTimeout = null;

function renderGallery(items) {
  const main = document.getElementById('main-content');
  const itemsHash = items.map(i => i.id).join(',');
  
  // If the items are the same and we are already in gallery mode, just update active state
  if (main.querySelector('.gallery-container') && main.dataset.galleryHash === itemsHash) {
    return;
  }
  main.dataset.galleryHash = itemsHash;

  if (items.length === 0) {
    main.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted);">No bottles match your filters.</div>`;
    return;
  }

  const showHint = !localStorage.getItem('cellar_gallery_hint_seen');
  const N = items.length;

  const startClone = galleryCardHTML(items[N - 1], N - 1, N, 'start');
  const endClone   = galleryCardHTML(items[0],     0,     N, 'end');

  main.innerHTML = `
    <div class="gallery-container" id="galleryContainer">
      ${immersiveHeaderHTML('gallery')}
      <div class="gc-chevron gc-chevron-left" id="galChevronLeft">&#x2039;</div>
      <div class="gallery-scroll-wrapper" id="galleryScrollWrapper">
        <div class="gallery-spacer"></div>
        ${startClone}
        ${items.map((item, idx) => galleryCardHTML(item, idx, N)).join('')}
        ${endClone}
        <div class="gallery-spacer"></div>
      </div>
      <div class="gc-chevron gc-chevron-right" id="galChevronRight">&#x203A;</div>
    </div>
    ${showHint ? '<div class="gallery-hint" id="galleryHint">Swipe to browse</div>' : ''}
    <div class="gallery-controls">
      <button class="gallery-nav-btn gallery-prev" id="galleryPrevBtn" aria-label="Previous bottle">←</button>
      <div class="gallery-pagination" id="galleryPagination">
        ${state.galleryIndex + 1} of ${N}
      </div>
      <button class="gallery-nav-btn gallery-next" id="galleryNextBtn" aria-label="Next bottle">→</button>
    </div>
  `;

  const container  = document.getElementById('galleryContainer');
  const allCards   = container.querySelectorAll('.gallery-card');
  const REAL_START = 1;
  const REAL_END   = N;
  const pagination = document.getElementById('galleryPagination');
  const prevBtn    = document.getElementById('galleryPrevBtn');
  const nextBtn    = document.getElementById('galleryNextBtn');

  const scrollToNode = (nodeIdx, smooth = true) => {
    const card = allCards[nodeIdx];
    if (!card) return;
    const targetLeft = card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: smooth ? 'smooth' : 'instant' });
  };

  const setActiveNode = (nodeIdx) => {
    allCards.forEach((c, i) => c.classList.toggle('active', i === nodeIdx));
    // Map clone indices back to logical items for pagination
    let logicalIdx = nodeIdx - REAL_START;
    if (logicalIdx < 0) logicalIdx = N - 1;
    if (logicalIdx >= N) logicalIdx = 0;
    
    state.galleryIndex = logicalIdx;
    pagination.textContent = `${logicalIdx + 1} of ${N}`;
  };

  // O(1) active detection using card width + scroll offset
  const detectActive = () => {
    if (!allCards[REAL_START]) return;
    const cardWidth = allCards[REAL_START].offsetWidth;
    const gap = 20; // from CSS gap
    const containerMid = container.scrollLeft + container.clientWidth / 2;
    const firstCardCenter = allCards[REAL_START].offsetLeft + cardWidth / 2;
    
    // Calculate node index from scroll position
    const nodeIdx = Math.round((containerMid - firstCardCenter) / (cardWidth + gap)) + REAL_START;
    const clampedNode = Math.max(0, Math.min(allCards.length - 1, nodeIdx));

    const landed = allCards[clampedNode];
    if (landed?.dataset.clone === 'start') {
      setActiveNode(REAL_END);
      scrollToNode(REAL_END, false);
    } else if (landed?.dataset.clone === 'end') {
      setActiveNode(REAL_START);
      scrollToNode(REAL_START, false);
    } else {
      setActiveNode(clampedNode);
    }
  };

  if (galleryScrollListener) container.removeEventListener('scrollend', galleryScrollListener);
  
  let scrollTimer;
  const onScroll = () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(detectActive, 50);
  };

  if ('onscrollend' in window) {
    galleryScrollListener = detectActive;
    container.addEventListener('scrollend', galleryScrollListener, { passive: true });
  } else {
    galleryScrollListener = onScroll;
    container.addEventListener('scroll', galleryScrollListener, { passive: true });
  }

  const navigate = (dir) => {
    const curNode = state.galleryIndex + REAL_START;
    const target = dir < 0 ? curNode - 1 : curNode + 1;
    setActiveNode(target);
    scrollToNode(target);
  };

  state.galleryNavigate = navigate;
  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));

  // Handle resize to fix centering
  if (galleryResizeListener) window.removeEventListener('resize', galleryResizeListener);
  galleryResizeListener = () => {
    scrollToNode(state.galleryIndex + REAL_START, false);
  };
  window.addEventListener('resize', galleryResizeListener, { passive: true });

  setTimeout(() => {
    const firstReal = allCards[REAL_START];
    if (firstReal) {
      const spacerW = Math.max(0, (container.clientWidth - firstReal.offsetWidth) / 2);
      container.querySelectorAll('.gallery-spacer').forEach(s => {
        s.style.flexBasis = spacerW + 'px';
        s.style.minWidth  = spacerW + 'px';
      });
    }
    scrollToNode(state.galleryIndex + REAL_START, false);
    setActiveNode(state.galleryIndex + REAL_START);
  }, 50);

  const hideChevrons = () => {
    document.getElementById('galChevronLeft')?.classList.add('hidden');
    document.getElementById('galChevronRight')?.classList.add('hidden');
    if (showHint) {
      localStorage.setItem('cellar_gallery_hint_seen', 'true');
      document.getElementById('galleryHint')?.classList.add('faded');
    }
  };
  container.addEventListener('scroll', hideChevrons, { once: true, passive: true });
  clearTimeout(hintTimeout);
  if (showHint) hintTimeout = setTimeout(hideChevrons, 3000);
}

let verticalScrollListener = null;

function renderVertical(items) {
  const main = document.getElementById('main-content');
  const itemsHash = items.map(i => i.id).join(',');
  
  if (main.querySelector('.vertical-container') && main.dataset.verticalHash === itemsHash) {
    return;
  }
  main.dataset.verticalHash = itemsHash;

  if (items.length === 0) {
    main.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted);">No bottles match your filters.</div>`;
    return;
  }

  const N = items.length;
  state.galleryIndex = Math.min(state.galleryIndex, N - 1);

  main.innerHTML = `
    <div class="vertical-container" id="verticalContainer">
      ${immersiveHeaderHTML('vertical')}
      <div class="vertical-wrapper" id="verticalWrapper">
        ${items.map((item, idx) => `
          <div class="vertical-card-wrapper" data-index="${idx}">
            ${galleryCardHTML(item, idx, N)}
          </div>
        `).join('')}
      </div>
      <div class="vertical-indicators">
        ${items.map((_, i) => `<div class="vi-dot ${i === state.galleryIndex ? 'active' : ''}" data-index="${i}"></div>`).join('')}
      </div>
      <div class="gallery-controls" style="position:fixed; bottom:20px; left:0; right:0; z-index:100; margin:0; pointer-events:none;">
        <div class="gallery-pagination" style="background:rgba(0,0,0,0.6); backdrop-filter:blur(10px); padding:8px 16px; border-radius:20px; display:inline-block; pointer-events:auto; margin:0 auto; border:1px solid rgba(255,255,255,0.1);">
          ${state.galleryIndex + 1} of ${N}
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById('verticalContainer');
  const wrappers  = container.querySelectorAll('.vertical-card-wrapper');
  const dots      = container.querySelectorAll('.vi-dot');
  const pagination = container.querySelector('.gallery-pagination');

  const setActive = (idx) => {
    state.galleryIndex = idx;
    wrappers.forEach((w, i) => w.classList.toggle('active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    pagination.textContent = `${idx + 1} of ${N}`;
  };

  const detectActive = () => {
    const center = container.scrollTop + container.clientHeight / 2;
    let bestIdx = 0, bestDist = Infinity;
    wrappers.forEach((w, i) => {
      const dist = Math.abs((w.offsetTop + w.offsetHeight / 2) - center);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    if (bestIdx !== state.galleryIndex) setActive(bestIdx);
  };

  if (verticalScrollListener) container.removeEventListener('scroll', verticalScrollListener);
  
  let scrollTimer;
  verticalScrollListener = () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(detectActive, 50);
  };
  container.addEventListener('scroll', verticalScrollListener, { passive: true });

  state.verticalNavigate = (dir) => {
    const targetIdx = Math.max(0, Math.min(N - 1, state.galleryIndex + dir));
    const target = wrappers[targetIdx];
    if (target) {
      container.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    }
  };

  setTimeout(() => {
    const startNode = wrappers[state.galleryIndex];
    if (startNode) container.scrollTo({ top: startNode.offsetTop, behavior: 'instant' });
    setActive(state.galleryIndex);
  }, 50);
}

function renderWelcome() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="welcome-container" style="max-width:800px; margin:0 auto; padding:40px; line-height:1.8; background:rgba(0,0,0,0.5); backdrop-filter:blur(10px); border-radius:12px; border:1px solid var(--border);">

      <div style="text-align:center; padding-bottom:40px;">
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:20px; letter-spacing:0.05em;">Browse the collection in read-only mode.</p>
        <button class="consume-btn" id="welcomeViewBtn" style="max-width:300px; margin:0 auto; border-color:var(--accent); color:var(--accent);">View the Collection</button>
      </div>

      <div class="section-header">
        <span class="section-title ready">Welcome to The Cellar</span>
        <div class="section-line ready"></div>
      </div>

      <p class="modal-text" style="font-size:1.1rem; margin-bottom:32px; color:var(--text-primary);">
        The Cellar is your high-end, personal inventory for tracking fine wines and rare spirits.
        Designed for serious collectors, it combines a mobile-first experience with powerful AI label scanning.
      </p>

      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; margin-bottom: 48px;">
        <div>
          <h3 style="font-family:'Cinzel',serif; color:var(--accent); font-size:0.9rem; letter-spacing:0.15em; margin-bottom:12px; text-transform:uppercase;">AI-Powered Scanning</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary);">Using Gemini 2.0 Flash, instantly extract vintage, region, grape, and expert tasting notes from any label photo.</p>
        </div>
        <div>
          <h3 style="font-family:'Cinzel',serif; color:var(--accent); font-size:0.9rem; letter-spacing:0.15em; margin-bottom:12px; text-transform:uppercase;">Mobile Inventory</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary);">A lightning-fast PWA that lives on your home screen. Track your collection across "Ready," "Drink Soon," and "Consumed."</p>
        </div>
        <div>
          <h3 style="font-family:'Cinzel',serif; color:var(--accent); font-size:0.9rem; letter-spacing:0.15em; margin-bottom:12px; text-transform:uppercase;">Analytics & Insights</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary);">Visualize your collection's distribution by region and type. Track your lifetime consumption and favorites.</p>
        </div>
        <div>
          <h3 style="font-family:'Cinzel',serif; color:var(--accent); font-size:0.9rem; letter-spacing:0.15em; margin-bottom:12px; text-transform:uppercase;">Private & Secure</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary);">Your data is your own. Securely backed by Google Firebase, ensuring your collection is always accessible but only to you.</p>
        </div>
      </div>

      <div style="text-align:center; padding-top:20px;">
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:20px; letter-spacing:0.05em;">Sign in with your Google account to begin your collection.</p>
        <button class="consume-btn" id="welcomeSignInBtn" style="max-width:300px; margin:0 auto;">Sign In — Manage Collection</button>
      </div>
    </div>
  `;
  // Attach event listener to the welcome sign in button
  const welcomeSignInBtn = document.getElementById('welcomeSignInBtn');
  if (welcomeSignInBtn) {
    welcomeSignInBtn.addEventListener('click', () => {
      document.getElementById('signInBtn').click();
    });
  }

  // Attach event listener to the welcome view button
  const welcomeViewBtn = document.getElementById('welcomeViewBtn');
  if (welcomeViewBtn) {
    welcomeViewBtn.addEventListener('click', async () => {
      state.showInventoryUnauth = true;
      const { loadInventory } = await import('./db.js?v=2.0.49');
      await loadInventory();
    });
  }
}

export function renderInventory() {
  const main   = document.getElementById('main-content');
  const controls = document.querySelector('.controls-container');

  if (!state.currentUser && !state.showInventoryUnauth) {
    if (controls) controls.style.display = 'none';
    renderWelcome();
    return;
  }

  if (controls) controls.style.display = 'block';

  // Update View Toggle UI
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    const isImmersive = (state.viewMode === 'gallery' || state.viewMode === 'vertical');
    if (btn.dataset.view === 'grid') {
      btn.classList.toggle('active', state.viewMode === 'grid');
    } else if (btn.dataset.view === 'gallery') {
      btn.classList.toggle('active', isImmersive);
    }
  });

  const filter = document.getElementById('filterBar')?.dataset.filter || 'all';
  const searchQuery = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sortBy = document.getElementById('sortSelect')?.value || 'newest';

  // 1. Caching check: skip re-filtering/sorting if nothing changed
  const filterState = `${filter}|${searchQuery}|${sortBy}|${state.consumedLikedFilter}|${state.wineColorFilter}|${state.viewMode}`;
  const inventoryData = JSON.stringify(Object.keys(state.inventory)); // simple check for structural changes

  if (lastInventoryData === inventoryData && lastFilterState === filterState && state.viewMode !== 'gallery') {
    // We only skip if NOT in gallery mode, as gallery mode handles its own internal re-renders
    return;
  }

  lastInventoryData = inventoryData;
  lastFilterState = filterState;

  // Toggle sub-filter visibility
  const subFilterBar = document.getElementById('subFilterBar');
  if (subFilterBar) {
    subFilterBar.style.display = (filter === 'wine') ? 'flex' : 'none';
  }
  const consumedFilterBar = document.getElementById('consumedFilterBar');
  if (consumedFilterBar) {
    consumedFilterBar.style.display = (filter === 'consumed') ? 'flex' : 'none';
  }

  // Defensive: Clear any leftover stars from previous versions
  document.querySelectorAll('.tab-star').forEach(el => el.remove());

  // Filtering
  let items = Object.values(state.inventory).filter(w => {
    let matchesMain = false;
    if (filter === 'all') matchesMain = (w.status !== 'consumed');
    else if (filter === 'wine') matchesMain = (w.status !== 'spirits' && w.status !== 'consumed');
    else if (filter === 'spirits') matchesMain = (w.status === 'spirits' && w.status !== 'consumed');
    else if (filter === 'consumed') matchesMain = (w.status === 'consumed');

    if (!matchesMain) return false;
    if (filter === 'consumed' && state.consumedLikedFilter === 'liked' && !w.liked) return false;
    if (filter === 'wine' && state.wineColorFilter !== 'all' && w.colorStyle !== state.wineColorFilter) return false;
    if (searchQuery) {
      const searchStr = `${w.name} ${w.region} ${w.grape} ${w.year}`.toLowerCase();
      return searchStr.includes(searchQuery);
    }
    return true;
  });

  // Sorting
  items.sort((a, b) => {
    switch (sortBy) {
      case 'year-asc':  return (parseInt(a.year) || 0) - (parseInt(b.year) || 0);
      case 'year-desc': return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      case 'name-asc':  return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'oldest':    return a.id.localeCompare(b.id);
      case 'newest':
      default:          return b.id.localeCompare(a.id);
    }
  });

  if (state.viewMode === 'gallery') {
    renderGallery(items);
    lastRenderedHTML = '';
    return;
  }

  if (state.viewMode === 'vertical') {
    renderVertical(items);
    lastRenderedHTML = '';
    return;
  }

  // Grouping
  const byStatus = {};
  items.forEach(w => {
    let key = w.status;
    if (filter === 'consumed') {
      const name = (w.name || '').toLowerCase();
      const isSpirit = (w.type === 'spirit' || w.statusLabel === 'Spirits' || name.includes('piggyback') || name.includes('powers'));
      key = isSpirit ? 'consumed-spirits' : 'consumed-wine';
    }
    if (!byStatus[key]) byStatus[key] = [];
    byStatus[key].push(w);
  });

  const visibleSections = (filter === 'consumed')
    ? [{ status: 'consumed-wine', label: 'Consumed Wine', cls: 'consumed' }, { status: 'consumed-spirits', label: 'Consumed Spirits', cls: 'consumed' }]
    : SECTIONS.filter(sec => {
        if (filter === 'wine')     return (sec.status !== 'spirits' && sec.status !== 'consumed');
        if (filter === 'spirits')  return (sec.status === 'spirits');
        return sec.status !== 'consumed';
      });

  const newHTML = visibleSections
    .filter(sec => byStatus[sec.status]?.length)
    .map(sec => `
      <div class="section">
        <div class="section-header">
          <span class="section-title ${sec.cls}">${sec.label}</span>
          <div class="section-line ${sec.cls}"></div>
        </div>
        <div class="grid">
          ${byStatus[sec.status].map(cardHTML).join('')}
        </div>
      </div>
    `).join('');

  const finalHTML = newHTML || `<div style="text-align:center;padding:80px 20px;color:var(--text-muted);">${searchQuery ? `No bottles match "${searchQuery}"` : (filter === 'consumed' ? "You haven't finished any bottles yet." : "Your cellar is currently empty.") }</div>`;

  if (finalHTML !== lastRenderedHTML) {
    main.innerHTML = finalHTML;
    lastRenderedHTML = finalHTML;
  }

  updateLastUpdatedUI();
}

// ── Toast Notifications ────────────────────────────────────────────────────
function createToastContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `position: fixed; bottom: 20px; left: 20px; right: 20px; max-width: 400px; z-index: 10000;`;
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, color) {
  const container = createToastContainer();
  const toast = document.createElement('div');
  toast.style.cssText = `background: ${color}; color: #ffffff; padding: 12px 16px; border-radius: 6px; margin-bottom: 8px; font-size: 0.9rem; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: slideInUp 0.3s ease-out;`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export const showErrorToast = (msg) => showToast(msg, '#c41e3a');
export const showSuccessToast = (msg) => showToast(msg, '#2ecc71');

if (!document.querySelector('style[data-toasts]')) {
  const style = document.createElement('style');
  style.setAttribute('data-toasts', 'true');
  style.textContent = `
    @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slideOutDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
  `;
  document.head.appendChild(style);
}
