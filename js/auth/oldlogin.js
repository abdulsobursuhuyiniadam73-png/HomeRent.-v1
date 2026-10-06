/* ============================================================
   HOMERENT - LOGIN CONTROLLER
   ============================================================

   PURPOSE
   -------
   Controls the HomeRent administrator login page.

   RESPONSIBILITIES
   ----------------
   1. Check existing authentication state.
   2. Authenticate administrator with Firebase.
   3. Verify authorized administrator UID.
   4. Reject unauthorized accounts.
   5. Handle password visibility.
   6. Handle password reset.
   7. Display friendly error messages.
   8. Determine Setup/Dashboard destination.
   9. Keep authentication logic separate from UI styling.

   IMPORTANT
   ----------
   Branding is NOT handled here.

   Global branding is handled by:

       js/core/branding.js

   Global settings are handled by:

       js/core/settings.js
       js/core/settings-service.js

   ============================================================ */


/* ============================================================
   FIREBASE IMPORTS
   ============================================================ */

import { app } from "../firebase.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* ============================================================
   CONFIGURATION
   ============================================================

   AUTHORIZED ADMINISTRATOR UID
   ----------------------------
   Only this Firebase Authentication account is allowed
   to access HomeRent.

   IMPORTANT
   ----------
   This JavaScript check is NOT the main security barrier.

   Firestore Security Rules will independently restrict
   database access to the same administrator UID.

   ============================================================ */

const ADMIN_UID =
    "EYtg0l1pwjNDcfZrrOfyvbUGd5D3";


/* ============================================================
   APPLICATION PATHS
   ============================================================

   These are relative paths from:

       pages/auth/login.html

   This is safer for local development and GitHub Pages
   because it does not assume the website is hosted at
   the domain root.

   CHANGE HERE if the final folder structure changes.

   ============================================================ */

const SETUP_PAGE =
    "../setup/index.html";

const DASHBOARD_PAGE =
    "../dashboard/index.html";


/* ============================================================
   FIREBASE SERVICES
   ============================================================ */

const auth =
    getAuth(app);

const db =
    getFirestore(app);


/* ============================================================
   DOM ELEMENTS
   ============================================================

   These IDs must match login.html.

   If the login HTML changes, update the corresponding
   ID here rather than searching through the entire file.

   ============================================================ */

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const togglePasswordButton =
    document.getElementById("togglePassword");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById("loginButtonText");

const loginSpinner =
    document.getElementById("loginSpinner");

const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

const loginMessage =
    document.getElementById("loginMessage");


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeLogin
);


/* ============================================================
   MAIN INITIALIZATION
   ============================================================ */

function initializeLogin() {

    /*
     * Make sure the expected login form exists.
     *
     * This catches an HTML/JavaScript mismatch immediately.
     */

    if (!loginForm) {

        console.error(
            "HomeRent Login: #loginForm was not found."
        );

        return;
    }


    /* --------------------------------------------------------
       LOGIN SUBMISSION
       -------------------------------------------------------- */

    loginForm.addEventListener(
        "submit",
        handleLogin
    );


    /* --------------------------------------------------------
       PASSWORD VISIBILITY
       -------------------------------------------------------- */

    if (togglePasswordButton) {

        togglePasswordButton.addEventListener(
            "click",
            togglePasswordVisibility
        );
    }


    /* --------------------------------------------------------
       FORGOT PASSWORD
       -------------------------------------------------------- */

    if (forgotPasswordButton) {

        forgotPasswordButton.addEventListener(
            "click",
            handleForgotPassword
        );
    }


    /* --------------------------------------------------------
       FIREBASE AUTH STATE
       -------------------------------------------------------- */

    monitorAuthenticationState();
}


/* ============================================================
   AUTHENTICATION STATE
   ============================================================

   Firebase remembers an authenticated session.

   Therefore, if the administrator is already logged in and
   opens the login page again, we don't require another login.

   ============================================================ */

function monitorAuthenticationState() {

    onAuthStateChanged(
        auth,
        async (user) => {

            /* ------------------------------------------------
               No authenticated user
               ------------------------------------------------ */

            if (!user) {

                return;
            }


            /* ------------------------------------------------
               Verify administrator UID
               ------------------------------------------------

               Firebase authentication alone is not enough.

               HomeRent only accepts the designated
               administrator account.
               ------------------------------------------------ */

            if (user.uid !== ADMIN_UID) {

                await signOut(auth);

                showMessage(
                    "This account is not authorized to access HomeRent.",
                    "error"
                );

                return;
            }


            /* ------------------------------------------------
               Authorized administrator
               ------------------------------------------------ */

            await redirectAfterLogin();
        }
    );
}


/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(event) {

    event.preventDefault();


    /* --------------------------------------------------------
       Read form values
       -------------------------------------------------------- */

    const email =
        emailInput
            ? emailInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";


    /* --------------------------------------------------------
       Email validation
       -------------------------------------------------------- */

    if (!email) {

        showMessage(
            "Please enter your email address.",
            "error"
        );

        emailInput?.focus();

        return;
    }


    /* --------------------------------------------------------
       Password validation
       -------------------------------------------------------- */

    if (!password) {

        showMessage(
            "Please enter your password.",
            "error"
        );

        passwordInput?.focus();

        return;
    }


    /* --------------------------------------------------------
       Loading state
       -------------------------------------------------------- */

    setLoginLoading(true);

    clearMessage();


    try {

        /* ----------------------------------------------------
           Firebase Authentication
           ---------------------------------------------------- */

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        /* ----------------------------------------------------
           ADMINISTRATOR UID SECURITY CHECK
           ---------------------------------------------------- */

        if (user.uid !== ADMIN_UID) {

            await signOut(auth);

            showMessage(
                "This account is not authorized to access HomeRent.",
                "error"
            );

            return;
        }


        /* ----------------------------------------------------
           SUCCESS
           ---------------------------------------------------- */

        showMessage(
            "Login successful. Opening HomeRent...",
            "success"
        );


        await redirectAfterLogin();


    } catch (error) {

        console.error(
            "HomeRent login error:",
            error
        );


        handleFirebaseLoginError(error);

    } finally {

        setLoginLoading(false);
    }
}


/* ============================================================
   REDIRECT AFTER LOGIN
   ============================================================

   FLOW
   ----

       Login
         ↓
       UID check
         ↓
       settings/business
         ↓
       Does setup exist?
         ↓
       ┌───────────────┐
       │               │
      NO              YES
       ↓               ↓
     SETUP       setupCompleted?
                       ↓
                 ┌─────┴─────┐
                NO           YES
                ↓             ↓
              SETUP       DASHBOARD

   ============================================================ */

async function redirectAfterLogin() {

    try {

        /* ----------------------------------------------------
           Firestore settings reference
           ---------------------------------------------------- */

        const settingsRef =
            doc(
                db,
                "settings",
                "business"
            );


        /* ----------------------------------------------------
           Read settings
           ---------------------------------------------------- */

        const settingsSnapshot =
            await getDoc(settingsRef);


        /* ----------------------------------------------------
           No settings document
           ----------------------------------------------------

           This means the administrator has not completed
           the initial HomeRent setup.
           ---------------------------------------------------- */

        if (!settingsSnapshot.exists()) {

            window.location.replace(
                SETUP_PAGE
            );

            return;
        }


        /* ----------------------------------------------------
           Read settings data
           ---------------------------------------------------- */

        const settings =
            settingsSnapshot.data();


        /* ----------------------------------------------------
           Setup completed
           ---------------------------------------------------- */

        if (
            settings.setupCompleted === true
        ) {

            window.location.replace(
                DASHBOARD_PAGE
            );

            return;
        }


        /* ----------------------------------------------------
           Settings exist but setup is incomplete
           ---------------------------------------------------- */

        window.location.replace(
            SETUP_PAGE
        );


    } catch (error) {

        console.error(
            "HomeRent setup-status check failed:",
            error
        );


        /*
         * SECURITY-FIRST FALLBACK
         *
         * If we cannot confirm that setup is complete,
         * do NOT send the administrator into the dashboard.
         *
         * Send them to Setup instead.
         */

        window.location.replace(
            SETUP_PAGE
        );
    }
}


/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

function togglePasswordVisibility() {

    if (!passwordInput) {

        return;
    }


    const showingPassword =
        passwordInput.type === "text";


    if (showingPassword) {

        passwordInput.type =
            "password";


        togglePasswordButton.textContent =
            "Show";


        togglePasswordButton.setAttribute(
            "aria-label",
            "Show password"
        );

    } else {

        passwordInput.type =
            "text";


        togglePasswordButton.textContent =
            "Hide";


        togglePasswordButton.setAttribute(
            "aria-label",
            "Hide password"
        );
    }
}


/* ============================================================
   FORGOT PASSWORD
   ============================================================ */

async function handleForgotPassword() {

    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    /* --------------------------------------------------------
       Email required
       -------------------------------------------------------- */

    if (!email) {

        showMessage(
            "Enter your email address first, then select Forgot password.",
            "error"
        );

        emailInput?.focus();

        return;
    }


    try {

        setLoginLoading(true);

        clearMessage();


        /* ----------------------------------------------------
           Firebase password reset
           ---------------------------------------------------- */

        await sendPasswordResetEmail(
            auth,
            email
        );


        showMessage(
            "If the account is eligible, password reset instructions have been sent to the email.",
            "success"
        );


    } catch (error) {

        console.error(
            "HomeRent password reset error:",
            error
        );


        handlePasswordResetError(error);

    } finally {

        setLoginLoading(false);
    }
}


/* ============================================================
   LOGIN LOADING STATE
   ============================================================ */

function setLoginLoading(isLoading) {

    if (loginButton) {

        loginButton.disabled =
            isLoading;
    }


    if (forgotPasswordButton) {

        forgotPasswordButton.disabled =
            isLoading;
    }


    if (loginSpinner) {

        loginSpinner.hidden =
            !isLoading;
    }


    if (loginButtonText) {

        loginButtonText.textContent =
            isLoading
                ? "Please wait..."
                : "Sign in";
    }
}


/* ============================================================
   DISPLAY MESSAGE
   ============================================================ */

function showMessage(
    message,
    type = "error"
) {

    if (!loginMessage) {

        return;
    }


    loginMessage.textContent =
        message;


    loginMessage.hidden =
        false;


    /*
     * CSS can use:

       .login-message[data-type="success"]

       .login-message[data-type="error"]

       for different visual states.
     */

    loginMessage.dataset.type =
        type;
}


/* ============================================================
   CLEAR MESSAGE
   ============================================================ */

function clearMessage() {

    if (!loginMessage) {

        return;
    }


    loginMessage.textContent =
        "";


    loginMessage.hidden =
        true;


    delete loginMessage.dataset.type;
}


/* ============================================================
   FIREBASE LOGIN ERRORS
   ============================================================ */

function handleFirebaseLoginError(error) {

    let message =
        "Unable to sign in. Please try again.";


    switch (error.code) {

        case "auth/invalid-email":

            message =
                "Please enter a valid email address.";

            break;


        case "auth/user-not-found":

        case "auth/invalid-credential":

        case "auth/wrong-password":

            message =
                "The email or password is incorrect.";

            break;


        case "auth/too-many-requests":

            message =
                "Too many unsuccessful attempts. Please try again later.";

            break;


        case "auth/network-request-failed":

            message =
                "Network connection failed. Check your internet connection.";

            break;


        case "auth/user-disabled":

            message =
                "This account has been disabled.";

            break;
    }


    showMessage(
        message,
        "error"
    );
}


/* ============================================================
   PASSWORD RESET ERRORS
   ============================================================ */

function handlePasswordResetError(error) {

    let message =
        "Unable to send the password reset email.";


    switch (error.code) {

        case "auth/invalid-email":

            message =
                "Please enter a valid email address.";

            break;


        case "auth/user-not-found":

            /*
             * Keep this generic.
             *
             * We don't reveal whether an email exists.
             */

            message =
                "If the account is eligible, password reset instructions have been sent to the email.";

            break;


        case "auth/network-request-failed":

            message =
                "Network connection failed. Check your internet connection.";

            break;
    }


    showMessage(
        message,
        "error"
    );
}


/* ============================================================
   FUTURE LOGIN EXTENSIONS
   ============================================================

   RESERVED FOR:

   • Inactivity timeout
   • Optional PIN lock
   • Session handling
   • Login audit records
   • Security notifications
   • Additional administrator verification

   DO NOT add visual styling here.

   ============================================================ */