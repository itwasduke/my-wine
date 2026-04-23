import { initAuth } from './auth.js?v=2.0.51';
import { initUIListeners, closeModalDirect, renderInventory } from './ui.js?v=2.0.51';
import { initAIListeners, closeScanModal } from './ai.js?v=2.0.51';

// Initialize
initAuth();
initUIListeners();
initAIListeners();

// Initial render (shows Welcome if not signed in)
renderInventory();

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
