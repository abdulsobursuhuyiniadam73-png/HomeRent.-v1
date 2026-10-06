// ============================================================
// HomeRent - Authentication Guard
// ============================================================
//
// Purpose:
// Protect HomeRent pages from unauthorized access.
//
// Only the authenticated HomeRent administrator can access
// protected pages.
//
// Authorized Admin UID:
// EYtg0l1pwjNDcfZrrOfyvbUGd5D3
// ============================================================


import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  auth
} from "../firebase.js";

import {
  HOMERENT_ADMIN_UID
} from "./auth.js";


// ============================================================
// PAGE PATHS
// ============================================================

// Change this only if the location of the login page changes.
const LOGIN_PAGE = "../../pages/auth/login.html";


// ============================================================
// PROTECT CURRENT PAGE
// ============================================================
//
// This function checks whether the current visitor:
//
// 1. Is logged in.
// 2. Is using the authorized HomeRent admin account.
//
// If either check fails, the visitor is signed out and sent
// back to the login page.
// ============================================================

export function protectPage() {

  onAuthStateChanged(auth, async (user) => {

    // --------------------------------------------------------
    // No authenticated user
    // --------------------------------------------------------

    if (!user) {

      redirectToLogin();

      return;
    }


    // --------------------------------------------------------
    // User exists, but is not the HomeRent administrator
    // --------------------------------------------------------

    if (user.uid !== HOMERENT_ADMIN_UID) {

      console.warn(
        "Unauthorized HomeRent account detected."
      );

      try {
        await signOut(auth);
      } catch (error) {
        console.error(
          "Unable to sign out unauthorized user:",
          error
        );
      }

      redirectToLogin();

      return;
    }


    // --------------------------------------------------------
    // Authorized administrator
    // --------------------------------------------------------

    console.log(
      "HomeRent administrator authenticated."
    );
  });
}


// ============================================================
// REDIRECT TO LOGIN
// ============================================================

function redirectToLogin() {

  // Prevent unnecessary redirects if we are already
  // on the login page.
  if (
    window.location.pathname.endsWith(
      "login.html"
    )
  ) {
    return;
  }

  window.location.href = LOGIN_PAGE;
}


// ============================================================
// AUTO LOGOUT AFTER INACTIVITY
// ============================================================
//
// This is intentionally kept as a separate function so we can
// easily adjust the inactivity period later without changing
// the authentication system.
//
// Current setting:
// 30 minutes of inactivity.
// ============================================================

const INACTIVITY_LIMIT = 30 * 60 * 1000;

let inactivityTimer;


// ============================================================
// START INACTIVITY PROTECTION
// ============================================================

export function startInactivityProtection() {

  resetInactivityTimer();


  // User activity events
  const activityEvents = [
    "click",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart"
  ];


  activityEvents.forEach((eventName) => {

    window.addEventListener(
      eventName,
      resetInactivityTimer,
      { passive: true }
    );

  });
}


// ============================================================
// RESET INACTIVITY TIMER
// ============================================================

function resetInactivityTimer() {

  clearTimeout(inactivityTimer);


  inactivityTimer = setTimeout(
    handleInactivityLogout,
    INACTIVITY_LIMIT
  );
}


// ============================================================
// HANDLE INACTIVITY LOGOUT
// ============================================================

async function handleInactivityLogout() {

  try {

    await signOut(auth);

  } catch (error) {

    console.error(
      "Automatic logout failed:",
      error
    );

  } finally {

    redirectToLogin();
  }
}