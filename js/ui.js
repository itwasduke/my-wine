import { renderInventory, updateLastUpdatedUI, showErrorToast, showSuccessToast } from './render.js?v=2.0.41';
import { initUIListeners } from './events.js?v=2.0.41';
import { openModal, closeModalDirect } from './modal.js?v=2.0.41';
import { state } from './state.js?v=2.0.41';

// Coordinator module: re-exports all public functions from sub-modules
// for backward compatibility with existing import contracts.

export {
  renderInventory,
  updateLastUpdatedUI,
  showErrorToast,
  showSuccessToast,
  initUIListeners,
  openModal,
  closeModalDirect
};

// updateAuthUI manages auth state changes and triggers renders
export function updateAuthUI(user) {
  state.currentUser = user;
  const signInBtn = document.getElementById('signInBtn');
  const userInfo  = document.getElementById('userInfo');
  const fab       = document.getElementById('fab');
  const menuBtn   = document.getElementById('menuBtn');
  const consumedBtn = document.querySelector('.filter-btn[data-filter="consumed"]');

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
    if (consumedBtn) consumedBtn.style.display = '';
  } else {
    signInBtn.style.display = '';
    userInfo.style.display  = 'none';
    fab.style.display       = 'none';
    if (menuBtn) menuBtn.style.display = 'none';
    if (consumedBtn) consumedBtn.style.display = 'none';
  }
  // Re-render open modal if any
  const activeModal = document.getElementById('modalContent');
  if (activeModal && document.getElementById('modalOverlay').classList.contains('active')) {
    const openId = activeModal.dataset.openId;
    if (openId) openModal(openId);
  }
  renderInventory();
}
