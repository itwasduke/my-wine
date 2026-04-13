import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDSI59xpcHzwk6mwHA9ocQZePfjoGpholw",
  authDomain: "my-wine-616a8.firebaseapp.com",
  projectId: "my-wine-616a8",
  storageBucket: "my-wine-616a8.firebasestorage.app",
  messagingSenderId: "393703017848",
  appId: "1:393703017848:web:eefd98ed3e0c49f811cc8d"
};

console.log('[Cellar] Initializing Firebase…');
export const app  = initializeApp(firebaseConfig);
export const db   = initializeFirestore(app, { localCache: persistentLocalCache() });
export const auth = getAuth(app);
console.log('[Cellar] Firebase ready');
