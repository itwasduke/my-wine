import { SECTIONS, state } from './state.js?v=2.0.40';

let lastRenderedHTML = '';

function formatRelativeTime(date) {
  if (!date) return 'Never';
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
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

function renderGallery(items) {
  const main = document.getElementById('main-content');
  if (items.length === 0) {
    main.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted);">No bottles match your filters.</div>`;
    return;
  }

  const showHint = !localStorage.getItem('cellar_gallery_hint_seen');
  const N = items.length;

  // Clone last card at start, first card at end — enables infinite wrap-around
  const startClone = galleryCardHTML(items[N - 1], N - 1, N, 'start');
  const endClone   = galleryCardHTML(items[0],     0,     N, 'end');

  main.innerHTML = `
    <div class="gallery-container" id="galleryContainer">
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
  // allCards layout: [startClone, real_0 … real_N-1, endClone]
  const REAL_START = 1;           // node index of real card 0
  const REAL_END   = N;           // node index of real card N-1
  const pagination = document.getElementById('galleryPagination');
  const prevBtn    = document.getElementById('galleryPrevBtn');
  const nextBtn    = document.getElementById('galleryNextBtn');

  // Scroll container so allCards[nodeIdx] is centered
  const scrollToNode = (nodeIdx, smooth = true) => {
    const card = allCards[nodeIdx];
    if (!card) return;
    const targetLeft = card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: smooth ? 'smooth' : 'instant' });
  };

  // Mark a node active; map node index → logical index for state + pagination
  const setActiveNode = (nodeIdx) => {
    allCards.forEach(c => c.classList.remove('active'));
    if (allCards[nodeIdx]) allCards[nodeIdx].classList.add('active');
    const logicalIdx = Math.max(0, Math.min(N - 1, nodeIdx - REAL_START));
    state.galleryIndex = logicalIdx;
    pagination.textContent = `${logicalIdx + 1} of ${N}`;
  };

  // After scroll settles: identify centered card, silently jump if it's a clone
  const detectActive = () => {
    const center = container.scrollLeft + container.clientWidth / 2;
    let bestNode = REAL_START, bestDist = Infinity;
    allCards.forEach((card, i) => {
      const dist = Math.abs((card.offsetLeft + card.offsetWidth / 2) - center);
      if (dist < bestDist) { bestDist = dist; bestNode = i; }
    });

    const landed = allCards[bestNode];
    if (landed?.dataset.clone === 'start') {
      // Swiped left past first → instant jump to real last
      setActiveNode(REAL_END);
      scrollToNode(REAL_END, false);
    } else if (landed?.dataset.clone === 'end') {
      // Swiped right past last → instant jump to real first
      setActiveNode(REAL_START);
      scrollToNode(REAL_START, false);
    } else {
      setActiveNode(bestNode);
    }
  };

  let scrollTimer;
  if ('onscrollend' in window) {
    container.addEventListener('scrollend', detectActive, { passive: true });
  } else {
    container.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(detectActive, 80);
    }, { passive: true });
  }

  // Shared navigate fn — used by buttons and exposed for keyboard handler
  const navigate = (dir) => {
    const curNode = state.galleryIndex + REAL_START;
    const target  = dir < 0
      ? (curNode <= REAL_START ? REAL_END   : curNode - 1)
      : (curNode >= REAL_END   ? REAL_START : curNode + 1);
    setActiveNode(target);
    scrollToNode(target);
  };

  state.galleryNavigate = navigate;
  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));

  // Initial render: measure real card width, set exact spacer sizes, then position
  setTimeout(() => {
    const firstReal = allCards[REAL_START];
    if (firstReal) {
      const spacerW = Math.max(0, (container.clientWidth - firstReal.offsetWidth) / 2);
      container.querySelectorAll('.gallery-spacer').forEach(s => {
        s.style.flexBasis = spacerW + 'px';
        s.style.minWidth  = spacerW + 'px';
      });
    }
    const startNode = state.galleryIndex + REAL_START;
    scrollToNode(startNode, false);
    setActiveNode(startNode);
  }, 50);

  // Hide chevrons + hint on first scroll or after 3s
  const hideChevrons = () => {
    document.getElementById('galChevronLeft')?.classList.add('hidden');
    document.getElementById('galChevronRight')?.classList.add('hidden');
    if (showHint) {
      localStorage.setItem('cellar_gallery_hint_seen', 'true');
      document.getElementById('galleryHint')?.classList.add('faded');
    }
  };
  container.addEventListener('scroll', hideChevrons, { once: true, passive: true });
  if (showHint) setTimeout(hideChevrons, 3000);
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
      const { loadInventory } = await import('./db.js?v=2.0.40');
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
    btn.classList.toggle('active', btn.dataset.view === state.viewMode);
  });

  let filter = document.getElementById('filterBar')?.dataset.filter || 'all';

  // Enforce: unauthorized users cannot see "Consumed"
  if (!state.currentUser && filter === 'consumed') {
    filter = 'all';
    const filterBar = document.getElementById('filterBar');
    if (filterBar) {
      filterBar.dataset.filter = 'all';
      filterBar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
      });
    }
  }

  const searchQuery = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sortBy = document.getElementById('sortSelect')?.value || 'newest';

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

  // 1. Convert to array and filter by Search + Type Filter + Color Filter
  let items = Object.values(state.inventory).filter(w => {
    // Main Filter logic
    let matchesMain = false;
    if (filter === 'all') {
      matchesMain = (w.status !== 'consumed');
    } else if (filter === 'wine') {
      // Wine only, exclude spirits and consumed
      matchesMain = (w.status !== 'spirits' && w.status !== 'consumed');
    } else if (filter === 'spirits') {
      // Spirits only, exclude consumed
      matchesMain = (w.status === 'spirits' && w.status !== 'consumed');
    } else if (filter === 'consumed') {
      // Consumed only
      matchesMain = (w.status === 'consumed');
    }

    if (!matchesMain) return false;

    // Consumed Sub-Filter (Liked vs All)
    if (filter === 'consumed' && state.consumedLikedFilter === 'liked') {
      if (w.liked !== true) return false;
    }

    // Wine Sub-Filter (Color)
    if (filter === 'wine' && state.wineColorFilter !== 'all') {
      if (w.colorStyle !== state.wineColorFilter) return false;
    }

    // Search Query
    if (searchQuery) {
      const searchStr = `${w.name} ${w.region} ${w.grape} ${w.year}`.toLowerCase();
      return searchStr.includes(searchQuery);
    }

    return true;
  });

  // 2. Sort
  items.sort((a, b) => {
    switch (sortBy) {
      case 'year-asc':
        return (parseInt(a.year) || 0) - (parseInt(b.year) || 0);
      case 'year-desc':
        return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'oldest':
        return a.id.localeCompare(b.id);
      case 'newest':
      default:
        return b.id.localeCompare(a.id);
    }
  });

  if (state.viewMode === 'gallery') {
    renderGallery(items);
    lastRenderedHTML = ''; // Reset cache for gallery mode
    return;
  }

  // 3. Group by Status
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
    ? [
        { status: 'consumed-wine',    label: 'Consumed Wine',    cls: 'consumed' },
        { status: 'consumed-spirits', label: 'Consumed Spirits', cls: 'consumed' }
      ]
    : SECTIONS.filter(sec => {
        if (filter === 'wine')     return (sec.status !== 'spirits' && sec.status !== 'consumed');
        if (filter === 'spirits')  return (sec.status === 'spirits');
        return sec.status !== 'consumed';
      });

  const newHTML = visibleSections
    .filter(sec => byStatus[sec.status]?.length)
    .map(sec => {
      let sectionItems = byStatus[sec.status];
      return `
        <div class="section">
          <div class="section-header">
            <span class="section-title ${sec.cls}">${sec.label}</span>
            <div class="section-line ${sec.cls}"></div>
          </div>
          <div class="grid">
            ${sectionItems.map(cardHTML).join('')}
          </div>
        </div>
      `;
    }).join('');

  const finalHTML = newHTML || (() => {
    const emptyMsg = searchQuery
      ? `No bottles match "${searchQuery}"`
      : (filter === 'consumed' ? "You haven't finished any bottles yet." : "Your cellar is currently empty.");
    return `<div style="text-align:center;padding:80px 20px;color:var(--text-muted);">${emptyMsg}</div>`;
  })();

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
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 10000;
    `;
    document.body.appendChild(container);
  }
  return container;
}

export function showErrorToast(message) {
  const container = createToastContainer();
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #c41e3a;
    color: #ffffff;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 8px;
    font-size: 0.9rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    animation: slideInUp 0.3s ease-out;
  `;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export function showSuccessToast(message) {
  const container = createToastContainer();
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #2ecc71;
    color: #ffffff;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 8px;
    font-size: 0.9rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    animation: slideInUp 0.3s ease-out;
  `;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Inject toast animations if not already present
if (!document.querySelector('style[data-toasts]')) {
  const style = document.createElement('style');
  style.setAttribute('data-toasts', 'true');
  style.textContent = `
    @keyframes slideInUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideOutDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
