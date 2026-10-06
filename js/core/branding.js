/* ============================================================
   HOMERENT - GLOBAL BRANDING LOADER
   ============================================================

   PURPOSE
   -------
   Applies administrator settings to the current page.

   THIS FILE CONTROLS
   ------------------
   • Business/system name
   • Logo
   • Primary color
   • Accent color
   • Footer text
   • Copyright year
   • Business phone
   • Business email
   • Business address
   • Page title

   SETTINGS SOURCE
   ---------------
   js/core/settings.js
   js/core/settings-service.js
   Firebase Firestore

   IMPORTANT
   ----------
   Pages should use data-setting attributes instead of
   hard-coding administrator information.

   EXAMPLE
   -------
   <span data-setting="businessName"></span>

   The value will automatically come from Settings.

   FUTURE
   -------
   When Firebase Storage is enabled, the logo-loading logic
   can be changed here without redesigning every page.

   ============================================================ */


import { loadSettings }
    from "./settings-service.js";


/* ============================================================
   APPLY GLOBAL BRANDING
   ============================================================

   This is the main function used by every HomeRent page.

   ============================================================ */

export async function applyGlobalBranding() {

    try {

        /* ----------------------------------------------------
           LOAD SETTINGS
           ----------------------------------------------------

           loadSettings() automatically combines:

           DEFAULT SETTINGS
                    +
           ADMINISTRATOR SETTINGS

           Therefore a missing setting will not break the page.
           ---------------------------------------------------- */

        const settings =
            await loadSettings();


        /* ====================================================
           BUSINESS / SYSTEM NAME
           ==================================================== */

        setText(
            "[data-setting='businessName']",
            settings.businessName
        );


        /* ====================================================
           LOGO
           ====================================================

           CURRENT VERSION
           ----------------
           Uses the administrator's logo URL.

           IF EMPTY
           --------
           The default HomeRent/RM logo remains visible.

           FUTURE VERSION
           --------------
           Firebase Storage can provide the logo URL here.

           IMPORTANT
           ---------
           Individual pages will NOT need to be redesigned.
           ==================================================== */

        applyLogo(
            settings.logoUrl,
            settings.businessName
        );


        /* ====================================================
           PRIMARY COLOR
           ==================================================== */

        if (settings.primaryColor) {

            document.documentElement.style.setProperty(
                "--primary-color",
                settings.primaryColor
            );
        }


        /* ====================================================
           ACCENT COLOR
           ==================================================== */

        if (settings.accentColor) {

            document.documentElement.style.setProperty(
                "--accent-color",
                settings.accentColor
            );
        }


        /* ====================================================
           FOOTER TEXT
           ==================================================== */

        setText(
            "[data-setting='footerText']",
            settings.footerText
        );


        /* ====================================================
           BUSINESS PHONE
           ====================================================

           This can appear anywhere on the system.

           If the administrator leaves the phone empty,
           the element is hidden where appropriate.
           ==================================================== */

        setText(
            "[data-setting='businessPhone']",
            settings.businessPhone
        );


        /* ====================================================
           BUSINESS EMAIL
           ==================================================== */

        setText(
            "[data-setting='businessEmail']",
            settings.businessEmail
        );


        /* ====================================================
           BUSINESS ADDRESS
           ==================================================== */

        setText(
            "[data-setting='businessAddress']",
            settings.businessAddress
        );


        /* ====================================================
           OPTIONAL FOOTER CONTACT INFORMATION
           ====================================================

           The login page contains:

           #footerBusinessContact

           This section should ONLY appear when there is
           something useful to display.

           Examples:

           Phone only
           → Show phone

           Email only
           → Show email

           Phone + email
           → Show both

           Neither
           → Hide entire contact section
           ==================================================== */

        updateFooterContact(
            settings.businessPhone,
            settings.businessEmail
        );


        /* ====================================================
           PAGE TITLE
           ==================================================== */

        const businessName =
            settings.businessName || "HomeRent";


        document.title =
            `${businessName} — Management System`;


        /* ====================================================
           COPYRIGHT YEAR
           ====================================================

           Always use the current year automatically.

           This means we do NOT need to manually change
           "2026" every year.
           ==================================================== */

        setText(
            "[data-setting='copyrightYear']",
            new Date().getFullYear()
        );


        /* ====================================================
           RETURN SETTINGS
           ====================================================

           Returning the settings allows another script to use
           the already-loaded values without needing to guess
           what is currently configured.
           ==================================================== */

        return settings;


    } catch (error) {

        console.error(
            "HomeRent: Global branding failed.",
            error
        );


        /*
         * The page should remain usable even if branding
         * fails temporarily.

         * Default CSS/HTML values remain available.
         */

        return null;
    }
}


/* ============================================================
   SET TEXT
   ============================================================

   Generic helper used by the entire branding system.

   It updates every element matching the selector.

   ============================================================ */

function setText(selector, value) {

    const elements =
        document.querySelectorAll(selector);


    elements.forEach((element) => {

        /*
         * Do not display:
         *
         * undefined
         * null
         *
         * or accidentally replace useful default text
         * with an empty value.
         */

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            element.textContent = value;
        }

    });
}


/* ============================================================
   APPLY LOGO
   ============================================================ */

function applyLogo(
    logoUrl,
    businessName
) {

    /*
     * Find all centrally-controlled logos on the page.

     * This allows a page to have more than one logo if
     * necessary without changing this function.
     */

    const logos =
        document.querySelectorAll(
            "[data-system-logo]"
        );


    logos.forEach((logo) => {

        /* ----------------------------------------------------
           NO CUSTOM LOGO
           ---------------------------------------------------- */

        if (!logoUrl) {

            logo.hidden = true;

            showDefaultLogo(logo);

            return;
        }


        /* ----------------------------------------------------
           CUSTOM LOGO
           ---------------------------------------------------- */

        logo.src = logoUrl;

        logo.alt =
            `${businessName || "HomeRent"} logo`;

        logo.hidden = false;


        /* ----------------------------------------------------
           LOGO LOAD FAILURE
           ----------------------------------------------------

           If the administrator enters a broken URL,
           automatically return to the default logo.

           This prevents a broken-image icon from appearing
           throughout the application.
           ---------------------------------------------------- */

        logo.onerror = () => {

            logo.hidden = true;

            showDefaultLogo(logo);

            console.warn(
                "HomeRent: Custom logo could not be loaded. Using default logo."
            );
        };

    });
}


/* ============================================================
   SHOW DEFAULT LOGO
   ============================================================ */

function showDefaultLogo(logoElement) {

    /*
     * Find the nearest logo container.
     */

    const container =
        logoElement.closest(
            "[data-logo-container]"
        );


    if (!container) {

        return;
    }


    /*
     * Find the default logo inside that container.
     */

    const defaultLogo =
        container.querySelector(
            "[data-default-logo]"
        );


    if (defaultLogo) {

        defaultLogo.hidden = false;
    }
}


/* ============================================================
   FOOTER CONTACT INFORMATION
   ============================================================

   DISPLAY RULES
   -------------
   Phone + Email → Phone • Email
   Phone only    → Phone
   Email only    → Email
   Neither       → Hide entire contact line

   ============================================================ */

function updateFooterContact(
    phone,
    email
) {

    const contactContainer =
        document.getElementById(
            "footerBusinessContact"
        );

    const phoneElement =
        document.getElementById(
            "footerPhone"
        );

    const emailElement =
        document.getElementById(
            "footerEmail"
        );

    const separator =
        document.getElementById(
            "footerContactSeparator"
        );


    /* --------------------------------------------------------
       If this page does not have a contact footer,
       there is nothing to update.
       -------------------------------------------------------- */

    if (!contactContainer) {
        return;
    }


    /* --------------------------------------------------------
       Clean the values
       -------------------------------------------------------- */

    const cleanPhone =
        typeof phone === "string"
            ? phone.trim()
            : "";

    const cleanEmail =
        typeof email === "string"
            ? email.trim()
            : "";


    /* ========================================================
       PHONE
       ======================================================== */

    if (phoneElement) {

        phoneElement.textContent =
            cleanPhone;

        phoneElement.hidden =
            !cleanPhone;
    }


    /* ========================================================
       EMAIL
       ======================================================== */

    if (emailElement) {

        emailElement.textContent =
            cleanEmail;

        emailElement.hidden =
            !cleanEmail;
    }


    /* ========================================================
       SEPARATOR
       ========================================================

       Only show the bullet when BOTH values exist.
       ======================================================== */

    if (separator) {

        separator.hidden =
            !(cleanPhone && cleanEmail);
    }


    /* ========================================================
       ENTIRE CONTACT LINE
       ========================================================

       Hide it when neither phone nor email exists.
       ======================================================== */

    contactContainer.hidden =
        !(cleanPhone || cleanEmail);
}



/* ============================================================
   INITIALIZE
   ============================================================

   Automatically runs when the page has loaded.

   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        applyGlobalBranding();

    }
);