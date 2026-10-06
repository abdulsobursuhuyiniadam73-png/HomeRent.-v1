/* ============================================================
   HOMERENT - LOGIN CONTROLLER
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
   ============================================================ */

const ADMIN_UID =
    "Wu3PA2ptwYV7MpyeEZ6e6Le4aI52";


const SETUP_PAGE =
    "../setup/setup.html";


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
   DOM
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


function initializeLogin() {

    if (!loginForm) {

        console.error(
            "HomeRent Login: #loginForm was not found."
        );

        return;
    }


    loginForm.addEventListener(
        "submit",
        handleLogin
    );


    if (togglePasswordButton) {

        togglePasswordButton.addEventListener(
            "click",
            togglePasswordVisibility
        );

    }


    if (forgotPasswordButton) {

        forgotPasswordButton.addEventListener(
            "click",
            handleForgotPassword
        );

    }


    monitorAuthenticationState();

}


/* ============================================================
   ADMIN AUTHORIZATION
   ============================================================ */

function isAuthorizedAdmin(user) {

    if (!user) {

        return false;

    }


    const authenticatedUID =
        String(user.uid || "").trim();

    const configuredUID =
        String(ADMIN_UID || "").trim();


    console.log(
        "HomeRent Authorization Check:",
        {
            authenticatedUID,
            configuredUID,
            match:
                authenticatedUID === configuredUID,
            projectId:
                app.options?.projectId || "unknown"
        }
    );


    return (
        authenticatedUID ===
        configuredUID
    );

}


/* ============================================================
   AUTH STATE MONITOR
   ============================================================ */

function monitorAuthenticationState() {

    onAuthStateChanged(
        auth,
        async (user) => {

            /*
             * No authenticated user.
             *
             * Stay on login page.
             */

            if (!user) {

                return;

            }


            /*
             * Firebase has restored an existing session.
             *
             * Verify the account.
             */

            if (
                !isAuthorizedAdmin(user)
            ) {

                await signOut(auth);

                showMessage(
                    "This account is not authorized to access HomeRent.",
                    "error"
                );

                return;

            }


            /*
             * Authorized existing session.
             */

            await redirectAfterLogin();

        }
    );

}


/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(event) {

    event.preventDefault();


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const password =
        passwordInput
            ? passwordInput.value
            : "";


    if (!email) {

        showMessage(
            "Please enter your email address.",
            "error"
        );

        emailInput?.focus();

        return;

    }


    if (!password) {

        showMessage(
            "Please enter your password.",
            "error"
        );

        passwordInput?.focus();

        return;

    }


    setLoginLoading(true);

    clearMessage();


    try {

        /*
         * Authenticate with Firebase.
         */

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        /*
         * IMPORTANT DIAGNOSTIC
         */

        console.log(
            "HomeRent login successful:",
            {
                uid: user.uid,
                email: user.email,
                projectId:
                    app.options?.projectId
            }
        );


        /*
         * Authorization check.
         */

        if (
            !isAuthorizedAdmin(user)
        ) {

            await signOut(auth);

            showMessage(
                "This account is not authorized to access HomeRent.",
                "error"
            );

            return;

        }


        /*
         * Authorized.
         */

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


        handleFirebaseLoginError(
            error
        );

    } finally {

        setLoginLoading(false);

    }

}


/* ============================================================
   REDIRECT AFTER LOGIN
   ============================================================ */

async function redirectAfterLogin() {

    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "business"
            );


        const settingsSnapshot =
            await getDoc(
                settingsRef
            );


        if (
            !settingsSnapshot.exists()
        ) {

            window.location.replace(
                SETUP_PAGE
            );

            return;

        }


        const settings =
            settingsSnapshot.data();


        if (
            settings.setupCompleted === true
        ) {

            window.location.replace(
                DASHBOARD_PAGE
            );

            return;

        }


        window.location.replace(
            SETUP_PAGE
        );


    } catch (error) {

        console.error(
            "HomeRent setup-status check failed:",
            error
        );


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


        handlePasswordResetError(
            error
        );


    } finally {

        setLoginLoading(false);

    }

}


/* ============================================================
   LOADING STATE
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
   MESSAGE
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