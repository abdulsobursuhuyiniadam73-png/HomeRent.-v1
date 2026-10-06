// ============================================================
// HomeRent - Firebase Configuration
// ============================================================

// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

// Firebase Authentication
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Cloud Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ============================================================
// Firebase Configuration
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCM5RfRB7mu3-hw2woqhtnL-mKwJDWs2vg",
  authDomain: "rental-management-system-ba09e.firebaseapp.com",
  projectId: "rental-management-system-ba09e",
  storageBucket: "rental-management-system-ba09e.firebasestorage.app",
  messagingSenderId: "822891163467",
  appId: "1:822891163467:web:2bb23bb7926e9c0699c2ce"
};


// ============================================================
// Initialize Firebase
// ============================================================

const app = initializeApp(firebaseConfig);


// ============================================================
// Initialize Firebase Services
// ============================================================

const auth = getAuth(app);

const db = getFirestore(app);


// ============================================================
// Export
// ============================================================

export {
  app,
  auth,
  db
};