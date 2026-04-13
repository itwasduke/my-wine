import { SECTIONS, state } from './state.js';
import { renderAnalytics } from './analytics.js';

export function updateAuthUI(user) {
  state.currentUser = user;
  const signInBtn = document.getElementById('signInBtn');
  const userInfo  = document.getElementById('userInfo');
  const fab       = document.getElementById('fab');
  const settingsBtn = document.getElementById('settingsBtn');
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
    if (settingsBtn) settingsBtn.style.display = 'flex';
  } else {
    signInBtn.style.display = '';
    userInfo.style.display  = 'none';
    fab.style.display       = 'none';
    if (settingsBtn) settingsBtn.style.display = 'none';
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
  const filter = document.getElementById('filterBar')?.dataset.filter || 'all';
  const searchQuery = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sortBy = document.getElementById('sortSelect')?.value || 'newest';

  // 1. Convert to array and filter by Search + Type Filter
  let items = Object.values(state.inventory).filter(w => {
    // Type Filter
    const matchesFilter = 
      (filter === 'all') || 
      (filter === 'wine' && w.status !== 'spirits') || 
      (filter === 'spirits' && (w.status === 'spirits' || w.status === 'consumed'));
    
    if (!matchesFilter) return false;

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
    if (!byStatus[w.status]) byStatus[w.status] = [];
    byStatus[w.status].push(w);
  });

  const visibleSections = SECTIONS.filter(sec => {
    if (filter === 'wine')    return sec.status !== 'spirits';
    if (filter === 'spirits') return sec.status === 'spirits' || sec.status === 'consumed';
    return true;
  });

  main.innerHTML = visibleSections
    .filter(sec => byStatus[sec.status]?.length)
    .map(sec => {
      let sectionItems = byStatus[sec.status];
      let extraHeader = '';
      if (sec.status === 'consumed') {
        extraHeader = `
          <div class="consumed-filter">
            <button class="consumed-filter-btn${state.consumedLikedFilter === 'all' ? ' active' : ''}" data-filter="all">All</button>
            <button class="consumed-filter-btn${state.consumedLikedFilter === 'liked' ? ' active' : ''}" data-filter="liked">Liked Only</button>
          </div>`;
        if (state.consumedLikedFilter === 'liked') {
          sectionItems = sectionItems.filter(w => w.liked === true);
        }
      }
      if (!sectionItems.length) return '';
      return `
        <div class="section">
          <div class="section-header">
            <span class="section-title ${sec.cls}">${sec.label}</span>
            <div class="section-line ${sec.cls}"></div>
            ${extraHeader}
          </div>
          <div class="grid">
            ${sectionItems.map(cardHTML).join('')}
          </div>
        </div>
      `;
    }).join('');
  
  if (main.innerHTML === '' && searchQuery) {
    main.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted);">No bottles match "${searchQuery}"</div>`;
  }

  renderAnalytics();
}

function cardHTML(w) {
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
      ${badge}
    </div>
  `;
}

export function openModal(id) {
  const w = state.inventory[id];
  if (!w) return;
  const showConsumeBtn = state.currentUser && w.status !== 'consumed' && w.status !== 'cook';
  const showRating     = state.currentUser && w.status === 'consumed';
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
    renderInventory();
  });

  // Search input
  document.getElementById('searchInput').addEventListener('input', () => {
    renderInventory();
  });

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', () => renderInventory());
  sortSelect.addEventListener('input', () => renderInventory());

  // Main content clicks (Event Delegation for cards and consumed filters)
  document.getElementById('main-content').addEventListener('click', e => {
    // Card clicks
    const card = e.target.closest('.card');
    if (card) {
      openModal(card.dataset.id);
      return;
    }

    // Consumed section filter clicks
    const filterBtn = e.target.closest('.consumed-filter-btn');
    if (filterBtn) {
      state.consumedLikedFilter = filterBtn.dataset.filter;
      renderInventory();
    }
  });

  // Modal overlay click to close
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
  });
  document.getElementById('closeModalBtn').addEventListener('click', closeModalDirect);

  // Settings
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const bulkUpdateBtn = document.getElementById('bulkUpdateBtn');
  const bulkUpdateStatus = document.getElementById('bulkUpdateStatus');

  settingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.add('active');
  });

  document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    settingsOverlay.classList.remove('active');
  });

  settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove('active');
  });

  bulkUpdateBtn.addEventListener('click', async () => {
    bulkUpdateBtn.disabled = true;
    bulkUpdateStatus.style.display = 'block';
    const { bulkUpdateScores } = await import('./db.js');
    await bulkUpdateScores((msg) => {
      bulkUpdateStatus.textContent = msg;
    });
    bulkUpdateBtn.disabled = false;
  });

  // Modal internal actions (consume, rate, delete)
  document.getElementById('modalContent').addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id, value } = btn.dataset;

    if (action === 'consume') {
      const { markConsumed } = await import('./db.js');
      markConsumed(id);
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
    } else if (action === 'delete') {
      const { confirmDeleteBottle } = await import('./db.js');
      confirmDeleteBottle(id);
    }
  });
}
