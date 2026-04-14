import { initAuth } from './auth.js';
import { loadInventory } from './db.js';
import { initUIListeners, closeModalDirect } from './ui.js';
import { initAIListeners, closeScanModal } from './ai.js';

// Initialize
initAuth();
initUIListeners();
initAIListeners();

// Global Escape Key Listener
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('scanOverlay').classList.contains('active')) {
      closeScanModal();
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
