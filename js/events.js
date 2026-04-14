import { state } from './state.js';
import { renderInventory, updateLastUpdatedUI } from './render.js';
import { openModal, closeModalDirect } from './modal.js';

export function initUIListeners() {
  // Restore preferences from localStorage
  const savedFilter = localStorage.getItem('cellar_filter') || 'all';
  const savedWineColor = localStorage.getItem('cellar_subfilter_wine') || 'all';
  const savedConsumedLiked = localStorage.getItem('cellar_subfilter_consumed') || 'all';
  const savedSort = localStorage.getItem('cellar_sort') || 'newest';

  const filterBar = document.getElementById('filterBar');
  const subFilterBar = document.getElementById('subFilterBar');
  const consumedFilterBar = document.getElementById('consumedFilterBar');
  const sortSelect = document.getElementById('sortSelect');

  filterBar.dataset.filter = savedFilter;
  state.wineColorFilter = savedWineColor;
  state.consumedLikedFilter = savedConsumedLiked;
  sortSelect.value = savedSort;

  // Update UI to match
  filterBar.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === savedFilter)
  );
  document.querySelectorAll('.sub-filter-btn').forEach(b => {
    const isActive = (b.dataset.color === savedWineColor) || (b.dataset.liked === savedConsumedLiked);
    b.classList.toggle('active', isActive);
  });

  // Filter bar clicks
  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const filter = btn.dataset.filter;
    filterBar.dataset.filter = filter;
    filterBar.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === filter)
    );
    state.wineColorFilter = 'all';
    state.consumedLikedFilter = 'all';
    document.querySelectorAll('.sub-filter-btn').forEach(b => {
      const isWineAll = b.dataset.color === 'all';
      const isConsumedAll = b.dataset.liked === 'all';
      b.classList.toggle('active', isWineAll || isConsumedAll);
    });
    localStorage.setItem('cellar_filter', filter);
    localStorage.setItem('cellar_subfilter_wine', 'all');
    localStorage.setItem('cellar_subfilter_consumed', 'all');
    renderInventory();
  });

  // Sub-filter clicks (Wine Color)
  subFilterBar.addEventListener('click', e => {
    const btn = e.target.closest('.sub-filter-btn');
    if (!btn) return;
    state.wineColorFilter = btn.dataset.color;
    document.querySelectorAll('.sub-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.color === state.wineColorFilter)
    );
    localStorage.setItem('cellar_subfilter_wine', state.wineColorFilter);
    renderInventory();
  });

  // Sub-filter clicks (Consumed)
  consumedFilterBar.addEventListener('click', e => {
    const btn = e.target.closest('.sub-filter-btn');
    if (!btn) return;
    state.consumedLikedFilter = btn.dataset.liked;
    document.querySelectorAll('#consumedFilterBar .sub-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.liked === state.consumedLikedFilter)
    );
    localStorage.setItem('cellar_subfilter_consumed', state.consumedLikedFilter);
    renderInventory();
  });

  // Search input with debounce
  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderInventory();
    }, 150);
  });

  // Home link (logo)
  document.getElementById('homeLink').addEventListener('click', (e) => {
    e.preventDefault();
    renderInventory();
  });

  // Sort select
  sortSelect.addEventListener('change', () => {
    localStorage.setItem('cellar_sort', sortSelect.value);
    renderInventory();
  });
  sortSelect.addEventListener('input', () => {
    localStorage.setItem('cellar_sort', sortSelect.value);
    renderInventory();
  });

  // Main content clicks (Event Delegation for cards)
  document.getElementById('main-content').addEventListener('click', e => {
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
