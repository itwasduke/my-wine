import { auth } from './firebase.js?v=2.0.27';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { updateAuthUI } from './ui.js?v=2.0.27';
import { startInventoryListener, stopInventoryListener } from './db.js?v=2.0.27';

export async function signIn() {
  const provider = new GoogleAuthProvider();
  try {
    // Try popup first (best for desktop)
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      console.log('[Cellar] Popup blocked or closed, falling back to redirect…');
      await signInWithRedirect(auth, provider);
    } else {
      console.error('[Cellar] Sign-in failed:', e);
    }
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('[Cellar] Sign-out failed:', e);
  }
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('[Cellar] Redirect sign-in success:', result.user.email);
    }
  } catch (e) {
    console.error('[Cellar] Redirect result error:', e);
  }
}

export function initAuth() {
  onAuthStateChanged(auth, user => {
    if (user) {
      updateAuthUI(user);
      startInventoryListener();
    } else {
      stopInventoryListener();
      updateAuthUI(null);
    }
  });
  handleRedirectResult();
  
  document.getElementById('signInBtn').addEventListener('click', signIn);
  document.getElementById('signOutBtn').addEventListener('click', signOutUser);
}
