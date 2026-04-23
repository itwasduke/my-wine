import { db } from './firebase.js?v=2.0.48';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, deleteField, serverTimestamp, onSnapshot }
  from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { state } from './state.js?v=2.0.48';
import { closeScanModal } from './ai.js?v=2.0.48';

let unsubscribeInventory = null;
let renderTimeout = null;

// Applies legacy data fixes to a raw Firestore doc
function processDoc(d) {
  const data = d.data();
  const item = { id: d.id, ...data };
  const name = (item.name || '').toLowerCase();
  if (!item.type && (name.includes('piggyback') || name.includes('powers'))) {
    item.type = 'spirit';
  }
  if (!item.status || item.status === 'cook') {
    item.status = (item.type === 'spirit' || item.region === 'Japan') ? 'spirits' : 'ready';
  }
  return item;
}

function buildInventoryFromSnapshot(snapshot) {
  state.inventory = {};
  let latest = 0;
  snapshot.forEach(d => {
    const item = processDoc(d);
    state.inventory[d.id] = item;
    const ts = d.data().updatedAt;
    if (ts) {
      const ms = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
      if (ms > latest) latest = ms;
    }
  });
  if (latest > 0) state.lastUpdated = new Date(latest);
}

export function startInventoryListener() {
  if (unsubscribeInventory) {
    unsubscribeInventory();
    unsubscribeInventory = null;
  }

  unsubscribeInventory = onSnapshot(
    collection(db, 'cellar'),
    async (snapshot) => {
      if (snapshot.metadata.fromCache) {
        console.log('[Cellar] Serving inventory from local cache');
      }
      buildInventoryFromSnapshot(snapshot);
      
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(async () => {
        const { renderInventory } = await import('./ui.js?v=2.0.48');
        renderInventory();
      }, 50);
    },
    async (e) => {
      console.error('[Cellar] onSnapshot error:', e);
      const { showErrorToast, renderInventory } = await import('./ui.js?v=2.0.48');
      showErrorToast('Real-time sync unavailable — loading snapshot');
      try {
        const snapshot = await getDocs(collection(db, 'cellar'));
        buildInventoryFromSnapshot(snapshot);
        renderInventory();
      } catch (e2) {
        console.error('[Cellar] Fallback getDocs failed:', e2);
      }
    }
  );
}

export function stopInventoryListener() {
  if (unsubscribeInventory) {
    unsubscribeInventory();
    unsubscribeInventory = null;
  }
}

// Kept as alias for the welcome-screen "View Collection" path in ui.js
export function loadInventory() {
  startInventoryListener();
}

export async function deleteBottle(id) {
  if (!state.currentUser) return;
  const { closeModalDirect, showErrorToast, showSuccessToast } = await import('./ui.js?v=2.0.48');
  try {
    await deleteDoc(doc(db, 'cellar', id));
    state.lastUpdated = new Date();
    closeModalDirect();
    showSuccessToast('Bottle removed from cellar');
  } catch (e) {
    console.error('Failed to delete from Firestore:', e);
    showErrorToast('Could not remove bottle — check your connection');
  }
}

export async function markConsumed(id) {
  if (!state.currentUser) return;
  const { renderInventory, closeModalDirect, openModal, showErrorToast, showSuccessToast } = await import('./ui.js?v=2.0.48');

  const previous = { ...state.inventory[id] };
  const currentQty = parseInt(previous.quantity) || 1;
  const currentConsumed = parseInt(previous.consumedCount) || 0;

  let firestoreUpdate = { updatedAt: serverTimestamp(), consumedCount: currentConsumed + 1 };

  if (currentQty > 1) {
    // Optimistic: decrement quantity
    state.inventory[id] = { ...previous, quantity: currentQty - 1, consumedCount: currentConsumed + 1 };
    firestoreUpdate.quantity = currentQty - 1;
    renderInventory();
    openModal(id);
  } else {
    // Optimistic: move to consumed
    const consumedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    state.inventory[id] = {
      ...previous,
      quantity: 0,
      status: 'consumed',
      statusLabel: 'Consumed',
      consumedDate,
      consumedCount: currentConsumed + 1
    };
    firestoreUpdate = { ...firestoreUpdate, quantity: 0, status: 'consumed', statusLabel: 'Consumed', consumedDate };
    closeModalDirect();
    renderInventory();
  }

  try {
    await updateDoc(doc(db, 'cellar', id), firestoreUpdate);
    state.lastUpdated = new Date();
    showSuccessToast('Bottle marked as consumed');
  } catch (e) {
    console.error('Failed to update Firestore:', e);
    state.inventory[id] = previous;
    renderInventory();
    showErrorToast('Could not mark bottle as consumed — changes reverted');
  }
}

export async function setRating(id, liked) {
  if (!state.currentUser) return;
  const { renderInventory, openModal, showErrorToast } = await import('./ui.js?v=2.0.48');

  const previous = { ...state.inventory[id] };
  const newValue = (previous.liked === liked) ? null : liked;

  // Optimistic update
  if (newValue === null) {
    const optimistic = { ...previous };
    delete optimistic.liked;
    state.inventory[id] = optimistic;
  } else {
    state.inventory[id] = { ...previous, liked: newValue };
  }
  openModal(id);
  renderInventory();

  const firestoreUpdate = newValue === null
    ? { liked: deleteField(), updatedAt: serverTimestamp() }
    : { liked: newValue, updatedAt: serverTimestamp() };

  try {
    await updateDoc(doc(db, 'cellar', id), firestoreUpdate);
    state.lastUpdated = new Date();
  } catch (e) {
    console.error('Failed to set rating:', e);
    state.inventory[id] = previous;
    openModal(id);
    renderInventory();
    showErrorToast('Could not save rating — changes reverted');
  }
}

export async function toggleBuyAgain(id) {
  if (!state.currentUser) return;
  const { openModal, showErrorToast } = await import('./ui.js?v=2.0.48');
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
  } catch (e) {
    console.error('Failed to toggle Buy Again:', e);
    showErrorToast('Could not update restock flag');
  }
}

export async function saveNewBottle(data) {
  if (!state.currentUser) return;
  const { openModal, showErrorToast, showSuccessToast } = await import('./ui.js?v=2.0.48');
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
          status: data.status,
          statusLabel: data.statusLabel,
          updatedAt: serverTimestamp()
        };
        if (w.status === 'consumed') {
          update.consumedDate = deleteField();
        }
        await updateDoc(doc(db, 'cellar', existingId), update);
        state.lastUpdated = new Date();
        closeScanModal();
        openModal(existingId);
        showSuccessToast('Bottle restocked');
        return;
      }
    }

    const addedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const finalData = { ...data, addedDate, updatedAt: serverTimestamp() };
    await addDoc(collection(db, 'cellar'), finalData);
    state.lastUpdated = new Date();
    closeScanModal();
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
  const { renderInventory, openModal, showErrorToast } = await import('./ui.js?v=2.0.48');

  const previous = { ...state.inventory[id] };
  const qty = Math.max(0, newQty);
  let optimistic = { ...previous, quantity: qty };
  let firestoreUpdate = { quantity: qty, updatedAt: serverTimestamp() };

  if (qty === 0) {
    const consumedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    optimistic = { ...optimistic, status: 'consumed', statusLabel: 'Consumed', consumedDate };
    firestoreUpdate = { ...firestoreUpdate, status: 'consumed', statusLabel: 'Consumed', consumedDate };
  } else if (previous.status === 'consumed') {
    const { consumedDate: _removed, ...restOptimistic } = optimistic;
    optimistic = { ...restOptimistic, status: 'ready', statusLabel: 'Ready to Drink' };
    firestoreUpdate = { ...firestoreUpdate, status: 'ready', statusLabel: 'Ready to Drink', consumedDate: deleteField() };
  }

  // Optimistic update
  state.inventory[id] = optimistic;
  openModal(id);
  renderInventory();

  try {
    await updateDoc(doc(db, 'cellar', id), firestoreUpdate);
    state.lastUpdated = new Date();
  } catch (e) {
    console.error('Failed to update quantity:', e);
    state.inventory[id] = previous;
    openModal(id);
    renderInventory();
    showErrorToast('Could not update quantity — changes reverted');
  }
}

export async function updateConsumedCount(id, newCount) {
  if (!state.currentUser) return;
  const { updateLastUpdatedUI, showErrorToast } = await import('./ui.js?v=2.0.48');
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
  const { openModal, updateLastUpdatedUI, showErrorToast, showSuccessToast } = await import('./ui.js?v=2.0.48');
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

  const { lookupProScores } = await import('./ai.js?v=2.0.48');

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
  const { renderInventory: renderInv1 } = await import('./ui.js?v=2.0.48');
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

  const { guessWineColor } = await import('./ai.js?v=2.0.48');

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
  const { renderInventory: renderInv2 } = await import('./ui.js?v=2.0.48');
  renderInv2();
}

export function confirmDeleteBottle(id) {
  if (!state.currentUser) return;
  const name = state.inventory[id]?.name || 'this bottle';
  if (confirm(`Remove "${name}" from your cellar?\n\nThis cannot be undone.`)) {
    deleteBottle(id);
  }
}
