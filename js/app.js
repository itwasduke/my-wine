import { initAuth } from './auth.js';
import { loadInventory } from './db.js';
import { closeModalDirect, closeScanModal } from './ui.js';

// Initialize
initAuth();
loadInventory();

// Global Escape Key Listener
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('scanOverlay').classList.contains('active')) {
      if (typeof window.closeScanModal === 'function') window.closeScanModal();
    } else {
      closeModalDirect();
    }
  }
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}

console.log('[Cellar] App initialized');
