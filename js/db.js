import { db } from './firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, deleteField, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { state } from './state.js';
import { closeScanModal } from './ai.js';

export async function loadInventory() {
  console.log('[Cellar] loadInventory() called');
  const { renderInventory, updateLastUpdatedUI } = await import('./ui.js');
  const main = document.getElementById('main-content');
  const loadingEl = document.getElementById('cellar-loading');

  if (!state.currentUser) {
    console.log('[Cellar] No user signed in, fetching public inventory…');
  }

  try {
    console.log('[Cellar] Fetching cellar collection from Firestore…');
    const snapshot = await getDocs(collection(db, 'cellar'));
    console.log('[Cellar] Snapshot received, docs:', snapshot.size);
    state.inventory = {};
    let latest = 0;
    snapshot.forEach(d => { 
      const data = d.data();
      const item = { id: d.id, ...data };
      const name = (item.name || '').toLowerCase();

      // Data Fix: Specifically handle brands like Piggyback and Powers as spirits if type is missing
      if (!item.type && (name.includes('piggyback') || name.includes('powers'))) {
        item.type = 'spirit';
      }

      // Fallback for missing status (legacy data) or removed 'cook' status
      if (!item.status || item.status === 'cook') {
        if (item.type === 'spirit' || item.region === 'Japan') { 
          item.status = 'spirits';
        } else {
          item.status = 'ready';
        }
      }

      state.inventory[d.id] = item;
      if (data.updatedAt) {
        const ms = data.updatedAt.toMillis ? data.updatedAt.toMillis() : new Date(data.updatedAt).getTime();
        if (ms > latest) latest = ms;
      }
    });
    if (latest > 0) state.lastUpdated = new Date(latest);
    console.log('[Cellar] Inventory built, rendering…');
    renderInventory();
    console.log('[Cellar] Render complete');
  } catch (e) {
    console.error('[Cellar] loadInventory failed:', e);
    const msg = e?.code
      ? `Firestore error (${e.code}) — ${e.message}`
      : `Could not load cellar: ${e?.message || e}`;
    if (loadingEl) loadingEl.textContent = msg;
    // If it fails (maybe a rule change), still render welcome
    renderInventory();
  }
}

export async function deleteBottle(id) {
  if (!state.currentUser) return;
  const { renderInventory, closeModalDirect, showErrorToast, showSuccessToast } = await import('./ui.js');
  try {
    await deleteDoc(doc(db, 'cellar', id));
    delete state.inventory[id];
    state.lastUpdated = new Date();
    closeModalDirect();
    renderInventory();
    showSuccessToast('Bottle removed from cellar');
  } catch (e) {
    console.error('Failed to delete from Firestore:', e);
    showErrorToast('Could not remove bottle — check your connection');
  }
}

export async function markConsumed(id) {
  if (!state.currentUser) return;
  const { renderInventory, closeModalDirect, openModal, showErrorToast, showSuccessToast } = await import('./ui.js');
  try {
    const w = state.inventory[id];
    const currentQty = parseInt(w.quantity) || 1;
    const currentConsumed = parseInt(w.consumedCount) || 0;

    let update = {
      updatedAt: serverTimestamp(),
      consumedCount: currentConsumed + 1
    };

    if (currentQty > 1) {
      // Just decrement
      update.quantity = currentQty - 1;
      state.inventory[id].quantity = update.quantity;
      state.inventory[id].consumedCount = update.consumedCount;
    } else {
      // Last bottle: move to consumed
      const consumedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      update.quantity = 0;
      update.status = 'consumed';
      update.statusLabel = 'Consumed';
      update.consumedDate = consumedDate;

      state.inventory[id].quantity = 0;
      state.inventory[id].status = 'consumed';
      state.inventory[id].statusLabel = 'Consumed';
      state.inventory[id].consumedDate = consumedDate;
      state.inventory[id].consumedCount = update.consumedCount;
      closeModalDirect();
    }

    await updateDoc(doc(db, 'cellar', id), update);
    state.lastUpdated = new Date();
    renderInventory();
    showSuccessToast('Bottle marked as consumed');
    if (currentQty > 1) openModal(id); // Keep modal open if more left
  } catch (e) {
    console.error('Failed to update Firestore:', e);
    showErrorToast('Could not mark bottle as consumed');
  }
}

export async function setRating(id, liked) {
  if (!state.currentUser) return;
  const { renderInventory, openModal, showErrorToast } = await import('./ui.js');
  try {
    const current = state.inventory[id].liked;
    const newValue = (current === liked) ? null : liked;
    const update = newValue === null ? { liked: deleteField(), updatedAt: serverTimestamp() } : { liked: newValue, updatedAt: serverTimestamp() };
    await updateDoc(doc(db, 'cellar', id), update);
    if (newValue === null) {
      delete state.inventory[id].liked;
    } else {
      state.inventory[id].liked = newValue;
    }
    state.lastUpdated = new Date();
    openModal(id);
    renderInventory();
  } catch (e) {
    console.error('Failed to set rating:', e);
    showErrorToast('Could not save rating');
  }
}

export async function toggleBuyAgain(id) {
  if (!state.currentUser) return;
  const { renderInventory, openModal, showErrorToast } = await import('./ui.js');
  try {
    const current = state.inventory[id].buyAgain || false;
    const newValue = !current;
    const update = newValue ? { buyAgain: true, updatedAt: serverTimestamp() } : { buyAgain: deleteField(), updatedAt: serverTimestamp() };
    await updateDoc(doc(db, 'cellar', id), update);
    if (!newValue) {
      delete state.inventory[id].buyAgain;
    } else {
      state.inventory[id].buyAgain = true;
    }
    state.lastUpdated = new Date();
    openModal(id);
    renderInventory();
  } catch (e) {
    console.error('Failed to toggle Buy Again:', e);
    showErrorToast('Could not update restock flag');
  }
}

export async function saveNewBottle(data) {
  if (!state.currentUser) return;
  const { renderInventory, openModal, showErrorToast, showSuccessToast } = await import('./ui.js');
  try {
    // Check for existing bottle (Duplicate / Restock)
    const existingId = Object.keys(state.inventory).find(id => {
      const w = state.inventory[id];
      return w.name.toLowerCase() === data.name.toLowerCase() &&
             w.year === data.year &&
             w.region.toLowerCase() === data.region.toLowerCase();
    });

    if (existingId) {
      const w = state.inventory[existingId];
      const newQty = parseInt(data.quantity) || 1;
      const totalQty = (parseInt(w.quantity) || 0) + newQty;

      if (confirm(`You already have "${w.name}" (${w.year}) in your cellar.\n\nRestock ${newQty} more to the existing entry?`)) {
        const update = {
          quantity: totalQty,
          status: data.status, // Restock to Ready/Spirits
          statusLabel: data.statusLabel,
          updatedAt: serverTimestamp()
        };
        if (w.status === 'consumed') {
          update.consumedDate = deleteField();
        }
        await updateDoc(doc(db, 'cellar', existingId), update);
        state.inventory[existingId] = { ...state.inventory[existingId], ...update };
        if (update.consumedDate) delete state.inventory[existingId].consumedDate;
        state.lastUpdated = new Date();
        closeScanModal();
        renderInventory();
        openModal(existingId);
        showSuccessToast('Bottle restocked');
        return;
      }
    }

    const finalData = { ...data, updatedAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'cellar'), finalData);
    state.inventory[ref.id] = { id: ref.id, ...finalData };
    state.lastUpdated = new Date();
    closeScanModal();
    renderInventory();
    showSuccessToast('Bottle added to cellar');
  } catch (e) {
    console.error('Failed to save to Firestore:', e);
    document.getElementById('scanOverlay').classList.add('active');
    const status = document.getElementById('scanStatus');
    status.className = 'scan-status error';
    document.getElementById('scanStatusText').textContent = 'Save failed — check Firestore rules';
    document.getElementById('scanSpinner').style.display = 'none';
    showErrorToast('Could not save bottle');
  }
}

export async function updateQuantity(id, newQty) {
  if (!state.currentUser) return;
  const { renderInventory, openModal, showErrorToast } = await import('./ui.js');
  try {
    const qty = Math.max(0, newQty);
    let update = { quantity: qty, updatedAt: serverTimestamp() };
    if (qty === 0) {
      const consumedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      update.status = 'consumed';
      update.statusLabel = 'Consumed';
      update.consumedDate = consumedDate;
      state.inventory[id].status = 'consumed';
      state.inventory[id].statusLabel = 'Consumed';
      state.inventory[id].consumedDate = consumedDate;
    } else if (state.inventory[id].status === 'consumed') {
      // Manual restock
      update.status = 'ready';
      update.statusLabel = 'Ready to Drink';
      update.consumedDate = deleteField();
      state.inventory[id].status = 'ready';
      state.inventory[id].statusLabel = 'Ready to Drink';
      delete state.inventory[id].consumedDate;
    }

    await updateDoc(doc(db, 'cellar', id), update);
    state.inventory[id].quantity = qty;
    state.lastUpdated = new Date();
    openModal(id);
    renderInventory();
  } catch (e) {
    console.error('Failed to update quantity:', e);
    showErrorToast('Could not update quantity');
  }
}

export async function updateConsumedCount(id, newCount) {
  if (!state.currentUser) return;
  const { updateLastUpdatedUI, showErrorToast } = await import('./ui.js');
  try {
    const count = Math.max(0, parseInt(newCount) || 0);
    await updateDoc(doc(db, 'cellar', id), { consumedCount: count, updatedAt: serverTimestamp() });
    state.inventory[id].consumedCount = count;
    state.lastUpdated = new Date();
    updateLastUpdatedUI();
  } catch (e) {
    console.error('Failed to update consumed count:', e);
    showErrorToast('Could not update consumed count');
  }
}

export async function saveProScores(id, scoreData) {
  const { openModal, updateLastUpdatedUI, showErrorToast, showSuccessToast } = await import('./ui.js');
  try {
    await updateDoc(doc(db, 'cellar', id), { proScores: scoreData, updatedAt: serverTimestamp() });
    state.inventory[id].proScores = scoreData;
    state.lastUpdated = new Date();
    const activeModal = document.getElementById('modalContent');
    if (activeModal && activeModal.dataset.openId === id) {
      openModal(id); // Refresh modal if it's currently open
    }
    updateLastUpdatedUI(); // Immediate UI update
    showSuccessToast('Professional scores saved');
  } catch (e) {
    console.error('Failed to update scores in Firestore:', e);
    showErrorToast('Could not save scores');
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

  state.lastUpdated = new Date();
  onProgress(`Successfully updated ${total} wines.`);
  const { renderInventory: renderInv1 } = await import('./ui.js');
  renderInv1();
}

export async function bulkTagWineColor(onProgress) {
  const winesToTag = Object.values(state.inventory).filter(w => {
    return w.status !== 'spirits' && !w.colorStyle;
  });

  const total = winesToTag.length;
  if (total === 0) {
    onProgress('All wines already have color tags.');
    return;
  }

  const { guessWineColor } = await import('./ai.js');

  for (let i = 0; i < total; i++) {
    const w = winesToTag[i];
    onProgress(`Tagging ${i + 1} of ${total}: ${w.name}…`);
    
    try {
      const color = await guessWineColor(w);
      await updateDoc(doc(db, 'cellar', w.id), { colorStyle: color, updatedAt: serverTimestamp() });
      state.inventory[w.id].colorStyle = color;
    } catch (e) {
      console.error(`Failed to tag ${w.name}:`, e);
    }
    
    await new Promise(r => setTimeout(r, 600));
  }

  state.lastUpdated = new Date();
  onProgress(`Successfully tagged ${total} wines.`);
  const { renderInventory: renderInv2 } = await import('./ui.js');
  renderInv2();
}

export function confirmDeleteBottle(id) {
  if (!state.currentUser) return;
  const name = state.inventory[id]?.name || 'this bottle';
  if (confirm(`Remove "${name}" from your cellar?\n\nThis cannot be undone.`)) {
    deleteBottle(id);
  }
}
