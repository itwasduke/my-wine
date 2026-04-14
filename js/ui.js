import { SECTIONS, state } from './state.js';
import { renderAnalytics } from './analytics.js';

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

export function updateAuthUI(user) {
  state.currentUser = user;
  const signInBtn = document.getElementById('signInBtn');
  const userInfo  = document.getElementById('userInfo');
  const fab       = document.getElementById('fab');
  const menuBtn   = document.getElementById('menuBtn');
  if (user) {
    signInBtn.style.display = 'none';
    userInfo.style.display  = 'flex';
    const initial = document.getElementById('userInitial');
    if (user.photoURL) {
      initial.outerHTML = `<img class="auth-avatar" id="userInitial" src="${user.photoURL}" alt="${user.displayName || ''}">`;
    } else {
      initial.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
    }
    fab.style.display = '';
    if (menuBtn) menuBtn.style.display = 'flex';
  } else {
    signInBtn.style.display = '';
    userInfo.style.display  = 'none';
    fab.style.display       = 'none';
    if (menuBtn) menuBtn.style.display = 'none';
  }
  // Re-render open modal if any
  const activeModal = document.getElementById('modalContent');
  if (activeModal && document.getElementById('modalOverlay').classList.contains('active')) {
    const openId = activeModal.dataset.openId;
    if (openId) openModal(openId);
  }
  renderInventory();
}

export function renderInventory() {
  const main   = document.getElementById('main-content');
  
  if (!state.currentUser) {
    renderWelcome();
    return;
  }

  const filter = document.getElementById('filterBar')?.dataset.filter || 'all';
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

  // Update tab star (Buy Again reminder)
  const hasBuyAgain = Object.values(state.inventory).some(w => w.buyAgain);
  const consumedBtn = document.querySelector('.filter-btn[data-filter="consumed"]');
  if (consumedBtn) {
    let star = consumedBtn.querySelector('.tab-star');
    if (hasBuyAgain) {
      if (!star) {
        const span = document.createElement('span');
        span.className = 'tab-star';
        span.textContent = '⭐';
        consumedBtn.appendChild(span);
      }
    } else if (star) {
      star.remove();
    }
  }

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
        return a.id.localeCompare(b.id); // Fallback: ID sorting
      case 'newest':
      default:
        return b.id.localeCompare(a.id); // Fallback: Reverse ID sorting
    }
  });

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
        return sec.status !== 'consumed'; // default for 'all'
      });

  main.innerHTML = visibleSections
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
  
  if (main.innerHTML === '') {
    const emptyMsg = searchQuery 
      ? `No bottles match "${searchQuery}"`
      : (filter === 'consumed' ? "You haven't finished any bottles yet." : "Your cellar is currently empty.");
    main.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted);">${emptyMsg}</div>`;
  }

  updateLastUpdatedUI();
  renderAnalytics();
}

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
  return `
    <div class="card ${w.status}" data-id="${w.id}">
      ${likedIcon}
      <div class="card-year">${w.year}</div>
      <div class="card-name">${w.name}</div>
      <div class="card-region">${w.region}</div>
      <div class="card-footer">
        <div class="card-badges-left">${badge}</div>
        <div class="card-badges-right">${starBadge}${qtyBadge}</div>
      </div>
    </div>
  `;
}

function renderWelcome() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="welcome-container" style="max-width:800px; margin:0 auto; padding:40px 0; line-height:1.8;">
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
        <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:20px; letter-spacing:0.05em;">Sign in with your Google account to begin your collection.</p>
        <button class="consume-btn" id="welcomeSignInBtn" style="max-width:300px; margin:0 auto;">Get Started — Sign In</button>
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
}

export function openModal(id) {
  const w = state.inventory[id];
  if (!w) return;
  const showConsumeBtn = state.currentUser && w.status !== 'consumed';
  const isConsumed     = w.status === 'consumed' || w.quantity === 0 || w.statusLabel?.toLowerCase() === 'consumed';
  const showRating     = state.currentUser && isConsumed;
  const el = document.getElementById('modalContent');
  el.dataset.openId = id;
  el.innerHTML = `
    <div class="modal-year">${w.year}</div>
    <div class="modal-name">${w.name}</div>
    <div class="modal-region">${w.region}</div>
    <span class="modal-status status-${w.status}">${w.statusLabel}</span>
    <div class="modal-divider"></div>
    <div class="modal-meta">
      <div class="meta-item"><span class="meta-label">Variety</span><span class="meta-value">${w.grape}</span></div>
      <div class="meta-item"><span class="meta-label">ABV</span><span class="meta-value">${w.abv}</span></div>
      <div class="meta-item"><span class="meta-label">Serve</span><span class="meta-value">${w.temp}</span></div>
    </div>

    <div class="qty-row">
      <div class="meta-item">
        <span class="meta-label">In Stock</span>
        <div class="qty-controls">
          ${state.currentUser ? `<button class="qty-btn" data-action="qty-dec" data-id="${id}">–</button>` : ''}
          <span class="qty-value">${w.quantity || 1}</span>
          ${state.currentUser ? `<button class="qty-btn" data-action="qty-inc" data-id="${id}">+</button>` : ''}
        </div>
      </div>
      <div class="meta-item">
        <span class="meta-label">Lifetime Consumed</span>
        <input type="number" class="qty-input" id="edit-consumed-count" value="${w.consumedCount || 0}" min="0" data-id="${id}">
      </div>
    </div>

    <div class="modal-section-label">Tasting Notes</div>
    <div class="modal-text">${w.notes}</div>
    <div class="modal-section-label">Decanting</div>
    <div class="modal-text">${w.decant}</div>
    <div class="modal-section-label">Drinking Window</div>
    <div class="modal-text">${w.window}</div>
    
    ${w.proScores ? `
      <div class="modal-section-label">Professional Ratings</div>
      <div class="modal-text" style="color:var(--ready); font-weight:500;">${w.proScores.scores}</div>
      <div class="modal-text" style="font-size:0.85rem; font-style:italic;">${w.proScores.summary}</div>
      ${w.proScores.vintage ? `
        <div class="modal-section-label" style="margin-top:12px;">Regional Vintage Rating</div>
        <div class="modal-text" style="font-weight:500;">${w.proScores.vintage}</div>
      ` : ''}
    ` : (state.currentUser ? `
      <button class="consume-btn" style="border-color:var(--text-muted); color:var(--text-secondary); margin-top:16px;" data-action="lookup-scores" data-id="${id}">
        🔍 Lookup Pro Scores & Vintage
      </button>
    ` : '')}

    ${showConsumeBtn ? `<div class="modal-divider" style="margin-top:24px"></div>
      <button class="consume-btn" data-action="consume" data-id="${id}">Mark as Consumed</button>` : '<div class="modal-divider" style="margin-top:24px"></div>'}
    
    ${state.currentUser ? `
      <button class="buy-again-btn${w.buyAgain ? ' buy-again-active' : ''}" data-action="buy-again" data-id="${id}">
        <span>⭐</span> Buy Again
      </button>
    ` : ''}

    ${showRating ? `
      <div class="rating-row">
        <button class="rating-btn${w.liked === true ? ' liked-active' : ''}" data-action="rate" data-id="${id}" data-value="true">
          <span>👍</span> Liked
        </button>
        <button class="rating-btn${w.liked === false ? ' disliked-active' : ''}" data-action="rate" data-id="${id}" data-value="false">
          <span>👎</span> Didn't Like
        </button>
      </div>` : ''}
    ${state.currentUser ? `<button class="delete-btn" data-action="delete" data-id="${id}">Remove from Cellar</button>` : ''}
  `;
  document.getElementById('modalOverlay').classList.add('active');
}

export function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('active');
}

export function initUIListeners() {
  // Filter bar clicks
  document.getElementById('filterBar').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const filter = btn.dataset.filter;
    const bar = document.getElementById('filterBar');
    bar.dataset.filter = filter;
    bar.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === filter)
    );
    state.wineColorFilter = 'all'; // Reset sub-filters on main change
    state.consumedLikedFilter = 'all'; 
    document.querySelectorAll('.sub-filter-btn').forEach(b => {
      const isWineAll = b.dataset.color === 'all';
      const isConsumedAll = b.dataset.liked === 'all';
      b.classList.toggle('active', isWineAll || isConsumedAll);
    });
    renderInventory();
  });

  // Sub-filter clicks (Wine Color)
  document.getElementById('subFilterBar').addEventListener('click', e => {
    const btn = e.target.closest('.sub-filter-btn');
    if (!btn) return;
    state.wineColorFilter = btn.dataset.color;
    document.querySelectorAll('.sub-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.color === state.wineColorFilter)
    );
    renderInventory();
  });

  // Sub-filter clicks (Consumed)
  document.getElementById('consumedFilterBar').addEventListener('click', e => {
    const btn = e.target.closest('.sub-filter-btn');
    if (!btn) return;
    state.consumedLikedFilter = btn.dataset.liked;
    document.querySelectorAll('#consumedFilterBar .sub-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.liked === state.consumedLikedFilter)
    );
    renderInventory();
  });

  // Search input
  document.getElementById('searchInput').addEventListener('input', () => {
    renderInventory();
  });

  // Home link (logo)
  document.getElementById('homeLink').addEventListener('click', (e) => {
    e.preventDefault();
    renderInventory();
  });

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', () => renderInventory());
  sortSelect.addEventListener('input', () => renderInventory());

  // Main content clicks (Event Delegation for cards)
  document.getElementById('main-content').addEventListener('click', e => {
    // Card clicks
    const card = e.target.closest('.card');
    if (card) {
      openModal(card.dataset.id);
      return;
    }
  });

  // Modal overlay click to close
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
  });
  document.getElementById('closeModalBtn').addEventListener('click', closeModalDirect);

  // ── Hamburger Menu & Modals ───────────────────────────────────────────────
  const menuBtn         = document.getElementById('menuBtn');
  const menuDrawer      = document.getElementById('menuDrawer');
  const menuOverlay     = document.getElementById('menuOverlay');
  const closeDrawerBtn  = document.getElementById('closeDrawerBtn');
  const navAnalytics    = document.getElementById('navAnalytics');
  const navSettings     = document.getElementById('navSettings');
  
  const analyticsOverlay = document.getElementById('analyticsOverlay');
  const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
  const settingsOverlay  = document.getElementById('settingsOverlay');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  const toggleDrawer = (open) => {
    menuDrawer.classList.toggle('active', open);
    menuOverlay.classList.toggle('active', open);
  };

  menuBtn.addEventListener('click', () => toggleDrawer(true));
  closeDrawerBtn.addEventListener('click', () => toggleDrawer(false));
  menuOverlay.addEventListener('click', () => toggleDrawer(false));

  navAnalytics.addEventListener('click', () => {
    toggleDrawer(false);
    analyticsOverlay.classList.add('active');
  });

  navSettings.addEventListener('click', () => {
    toggleDrawer(false);
    settingsOverlay.classList.add('active');
  });

  closeAnalyticsBtn.addEventListener('click', () => analyticsOverlay.classList.remove('active'));
  analyticsOverlay.addEventListener('click', (e) => {
    if (e.target === analyticsOverlay) analyticsOverlay.classList.remove('active');
  });

  closeSettingsBtn.addEventListener('click', () => settingsOverlay.classList.remove('active'));
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove('active');
  });

  const bulkUpdateBtn = document.getElementById('bulkUpdateBtn');
  const bulkColorBtn  = document.getElementById('bulkColorBtn');
  const bulkUpdateStatus = document.getElementById('bulkUpdateStatus');

  if (bulkUpdateBtn) {
    bulkUpdateBtn.addEventListener('click', async () => {
      bulkUpdateBtn.disabled = true;
      if (bulkUpdateStatus) bulkUpdateStatus.style.display = 'block';
      const { bulkUpdateScores } = await import('./db.js');
      await bulkUpdateScores((msg) => {
        if (bulkUpdateStatus) bulkUpdateStatus.textContent = msg;
      });
      bulkUpdateBtn.disabled = false;
    });
  }

  if (bulkColorBtn) {
    bulkColorBtn.addEventListener('click', async () => {
      bulkColorBtn.disabled = true;
      if (bulkUpdateStatus) bulkUpdateStatus.style.display = 'block';
      const { bulkTagWineColor } = await import('./db.js');
      await bulkTagWineColor((msg) => {
        if (bulkUpdateStatus) bulkUpdateStatus.textContent = msg;
      });
      bulkColorBtn.disabled = false;
    });
  }

  // Modal internal actions (consume, rate, delete, edit-consumed)
  document.getElementById('modalContent').addEventListener('change', async e => {
    if (e.target.id === 'edit-consumed-count') {
      const { id, value } = e.target;
      const bottleId = e.target.dataset.id;
      const { updateConsumedCount } = await import('./db.js');
      await updateConsumedCount(bottleId, value);
    }
  });

  document.getElementById('modalContent').addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id, value } = btn.dataset;

    if (action === 'consume') {
      const { markConsumed } = await import('./db.js');
      markConsumed(id);
    } else if (action === 'qty-dec' || action === 'qty-inc') {
      const { updateQuantity } = await import('./db.js');
      const w = state.inventory[id];
      const current = parseInt(w.quantity) || 1;
      const change = action === 'qty-inc' ? 1 : -1;
      updateQuantity(id, current + change);
    } else if (action === 'lookup-scores') {
      btn.disabled = true;
      btn.textContent = 'Searching critics & vintage...';
      const { lookupProScores } = await import('./ai.js');
      const { saveProScores }   = await import('./db.js');
      try {
        const scores = await lookupProScores(state.inventory[id]);
        await saveProScores(id, scores);
      } catch (e) {
        console.error('Score lookup failed:', e);
        btn.disabled = false;
        btn.textContent = 'Lookup Failed - Try Again';
      }
    } else if (action === 'rate') {
      const { setRating } = await import('./db.js');
      setRating(id, value === 'true');
    } else if (action === 'buy-again') {
      const { toggleBuyAgain } = await import('./db.js');
      toggleBuyAgain(id);
    } else if (action === 'delete') {
      const { confirmDeleteBottle } = await import('./db.js');
      confirmDeleteBottle(id);
    }
  });
}
