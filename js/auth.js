import { auth } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { updateAuthUI } from './ui.js';

export async function signIn() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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

export function initAuth() {
  onAuthStateChanged(auth, user => updateAuthUI(user));
  
  document.getElementById('signInBtn').addEventListener('click', signIn);
  document.getElementById('signOutBtn').addEventListener('click', signOutUser);
}
