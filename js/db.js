import { db } from './firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, deleteField } 
  from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { state } from './state.js';
import { renderInventory, closeModalDirect, openModal } from './ui.js';
import { closeScanModal } from './ai.js';

export async function loadInventory() {
  console.log('[Cellar] loadInventory() called');
  const loadingEl = document.getElementById('cellar-loading');
  try {
    console.log('[Cellar] Fetching cellar collection from Firestore…');
    const snapshot = await getDocs(collection(db, 'cellar'));
    console.log('[Cellar] Snapshot received, docs:', snapshot.size);
    state.inventory = {};
    snapshot.forEach(d => { state.inventory[d.id] = { id: d.id, ...d.data() }; });
    console.log('[Cellar] Inventory built, rendering…');
    renderInventory();
    console.log('[Cellar] Render complete');
  } catch (e) {
    console.error('[Cellar] loadInventory failed:', e);
    const msg = e?.code
      ? `Firestore error (${e.code}) — ${e.message}`
      : `Could not load cellar: ${e?.message || e}`;
    if (loadingEl) loadingEl.textContent = msg;
  }
}

export async function deleteBottle(id) {
  try {
    await deleteDoc(doc(db, 'cellar', id));
    delete state.inventory[id];
    closeModalDirect();
    renderInventory();
  } catch (e) {
    console.error('Failed to delete from Firestore:', e);
    alert('Could not remove bottle — check your connection and try again.');
  }
}

export async function markConsumed(id) {
  if (!state.currentUser) return;
  try {
    const consumedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    await updateDoc(doc(db, 'cellar', id), { status: 'consumed', statusLabel: 'Consumed', consumedDate });
    state.inventory[id].status = 'consumed';
    state.inventory[id].statusLabel = 'Consumed';
    state.inventory[id].consumedDate = consumedDate;
    closeModalDirect();
    renderInventory();
  } catch (e) {
    console.error('Failed to update Firestore:', e);
  }
}

export async function setRating(id, liked) {
  try {
    const current = state.inventory[id].liked;
    const newValue = (current === liked) ? null : liked;
    const update = newValue === null ? { liked: deleteField() } : { liked: newValue };
    await updateDoc(doc(db, 'cellar', id), update);
    if (newValue === null) {
      delete state.inventory[id].liked;
    } else {
      state.inventory[id].liked = newValue;
    }
    openModal(id);
    renderInventory();
  } catch (e) {
    console.error('Failed to set rating:', e);
  }
}

export async function saveNewBottle(data) {
  try {
    const ref = await addDoc(collection(db, 'cellar'), data);
    state.inventory[ref.id] = { id: ref.id, ...data };
    closeScanModal();
    renderInventory();
  } catch (e) {
    console.error('Failed to save to Firestore:', e);
    document.getElementById('scanOverlay').classList.add('active');
    const status = document.getElementById('scanStatus');
    status.className = 'scan-status error';
    document.getElementById('scanStatusText').textContent = 'Save failed — check Firestore rules';
    document.getElementById('scanSpinner').style.display = 'none';
  }
}

export async function saveProScores(id, scoreData) {
  try {
    await updateDoc(doc(db, 'cellar', id), { proScores: scoreData });
    state.inventory[id].proScores = scoreData;
    const activeModal = document.getElementById('modalContent');
    if (activeModal && activeModal.dataset.openId === id) {
      openModal(id); // Refresh modal if it's currently open
    }
  } catch (e) {
    console.error('Failed to update scores in Firestore:', e);
  }
}

export async function bulkUpdateScores(onProgress) {
  const winesToUpdate = Object.values(state.inventory).filter(w => {
    // Only wines, skip spirits
    if (w.status === 'spirits') return false;
    // Missing scores OR missing the new vintage field
    return !w.proScores || !w.proScores.vintage;
  });

  const total = winesToUpdate.length;
  if (total === 0) {
    onProgress('All wines are already up to date.');
    return;
  }

  const { lookupProScores } = await import('./ai.js');

  for (let i = 0; i < total; i++) {
    const w = winesToUpdate[i];
    onProgress(`Updating ${i + 1} of ${total}: ${w.name}…`);
    
    try {
      const scores = await lookupProScores(w);
      await saveProScores(w.id, scores);
    } catch (e) {
      console.error(`Failed to update ${w.name}:`, e);
      // Continue to next bottle even if one fails
    }
    
    // Small delay to be kind to the API rate limits
    await new Promise(r => setTimeout(r, 800));
  }

  onProgress(`Successfully updated ${total} wines.`);
  renderInventory();
}

export function confirmDeleteBottle(id) {
  if (!state.currentUser) return;
  const name = state.inventory[id]?.name || 'this bottle';
  if (confirm(`Remove "${name}" from your cellar?\n\nThis cannot be undone.`)) {
    deleteBottle(id);
  }
}
