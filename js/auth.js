import { auth } from './firebase.js';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { updateAuthUI } from './ui.js';

export async function signIn() {
  try {
    const provider = new GoogleAuthProvider();
    // On mobile, popups are often blocked. Redirect is more reliable.
    await signInWithRedirect(auth, provider);
  } catch (e) {
    console.error('[Cellar] Sign-in failed:', e);
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
  onAuthStateChanged(auth, user => updateAuthUI(user));
  handleRedirectResult();
  
  document.getElementById('signInBtn').addEventListener('click', signIn);
  document.getElementById('signOutBtn').addEventListener('click', signOutUser);
}
