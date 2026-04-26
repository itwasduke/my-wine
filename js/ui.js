import { renderInventory, updateLastUpdatedUI, showErrorToast, showSuccessToast } from './render.js';
import { initUIListeners } from './events.js';
import { openModal, closeModalDirect } from './modal.js';
import { state, OWNER_UID } from './state.js';

export {
  renderInventory,
  updateLastUpdatedUI,
  showErrorToast,
  showSuccessToast,
  initUIListeners,
  openModal,
  closeModalDirect
};

export function updateAuthUI(user) {
  state.currentUser = user;
  const isOwner = user && user.uid === OWNER_UID;

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
      const img = document.createElement('img');
      img.className = 'auth-avatar';
      img.id = 'userInitial';
      img.src = user.photoURL;
      img.alt = user.displayName || '';
      initial.replaceWith(img);
    } else {
      initial.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
    }
    
    // Only show "Add" and "Consumed" if they are the owner
    fab.style.display = isOwner ? '' : 'none';
    if (menuBtn) menuBtn.style.display = 'flex';
    if (consumedBtn) consumedBtn.style.display = isOwner ? '' : 'none';
  } else {
    signInBtn.style.display = '';
    userInfo.style.display  = 'none';
    fab.style.display       = 'none';
    if (menuBtn) menuBtn.style.display = 'none';
    if (consumedBtn) consumedBtn.style.display = 'none';
  }

  const activeModal = document.getElementById('modalContent');
  if (activeModal && document.getElementById('modalOverlay').classList.contains('active')) {
    const openId = activeModal.dataset.openId;
    if (openId) openModal(openId);
  }
  renderInventory();
}
