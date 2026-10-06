// ============================================================
// HomeRent - Authentication Core
// ============================================================

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { auth, db } from "../firebase.js";


// ============================================================
// HOMERENT ADMIN UID
// ============================================================

export const HOMERENT_ADMIN_UID =
  "Wu3PA2ptwYV7MpyeEZ6e6Le4aI52";


// ============================================================
// ADMIN LOGIN
// ============================================================

export async function loginAdmin(email, password) {

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  try {

    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const user = credential.user;


    // --------------------------------------------------------
    // Verify that the logged-in account is the HomeRent admin
    // --------------------------------------------------------

    if (user.uid !== HOMERENT_ADMIN_UID) {

      await signOut(auth);

      throw new Error(
        "This account is not authorized to access HomeRent."
      );
    }


    return user;

  } catch (error) {

    throw formatAuthError(error);
  }
}


// ============================================================
// LOGOUT
// ============================================================

export async function logoutAdmin() {

  try {

    await signOut(auth);

  } catch (error) {

    throw formatAuthError(error);
  }
}


// ============================================================
// PASSWORD RESET
// ============================================================

export async function resetAdminPassword(email) {

  if (!email) {
    throw new Error("Enter your email address first.");
  }

  try {

    await sendPasswordResetEmail(
      auth,
      email.trim()
    );

  } catch (error) {

    throw formatAuthError(error);
  }
}


// ============================================================
// GET CURRENT ADMIN
// ============================================================

export function getCurrentAdmin() {

  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  if (user.uid !== HOMERENT_ADMIN_UID) {
    return null;
  }

  return user;
}


// ============================================================
// CHECK WHETHER CURRENT USER IS ADMIN
// ============================================================

export function isCurrentUserAdmin() {

  const user = auth.currentUser;

  return Boolean(
    user &&
    user.uid === HOMERENT_ADMIN_UID
  );
}


// ============================================================
// WATCH AUTHENTICATION STATE
// ============================================================

export function watchAuthState(callback) {

  return onAuthStateChanged(
    auth,
    (user) => {

      if (
        user &&
        user.uid === HOMERENT_ADMIN_UID
      ) {

        callback(user);

        return;
      }

      callback(null);
    }
  );
}


// ============================================================
// CHECK HOMERENT SETUP STATUS
// ============================================================

export async function getSetupStatus() {

  try {

    const setupRef = doc(
      db,
      "settings",
      "business"
    );

    const setupSnap = await getDoc(setupRef);


    // --------------------------------------------------------
    // Business settings document does not exist yet
    // --------------------------------------------------------

    if (!setupSnap.exists()) {

      return {
        exists: false,
        setupCompleted: false
      };
    }


    const data = setupSnap.data();


    return {
      exists: true,
      setupCompleted: data.setupCompleted === true
    };

  } catch (error) {

    console.error(
      "Unable to check HomeRent setup status:",
      error
    );

    throw new Error(
      "Unable to check HomeRent setup status."
    );
  }
}


// ============================================================
// AUTHENTICATION ERROR TRANSLATOR
// ============================================================

function formatAuthError(error) {

  switch (error.code) {

    case "auth/invalid-email":

      return new Error(
        "Please enter a valid email address."
      );


    case "auth/invalid-credential":

      return new Error(
        "Incorrect email or password."
      );


    case "auth/user-not-found":

      return new Error(
        "No HomeRent account was found with this email."
      );


    case "auth/wrong-password":

      return new Error(
        "Incorrect email or password."
      );


    case "auth/too-many-requests":

      return new Error(
        "Too many login attempts. Please try again later."
      );


    case "auth/network-request-failed":

      return new Error(
        "Network error. Check your internet connection."
      );


    case "auth/user-disabled":

      return new Error(
        "This HomeRent account has been disabled."
      );


    default:

      return new Error(
        error.message ||
        "An authentication error occurred."
      );
  }
}