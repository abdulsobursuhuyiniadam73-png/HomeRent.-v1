/* ============================================================
   HOMERENT - CENTRAL SETTINGS
   ============================================================

   PURPOSE
   -------
   One central place for system-wide settings.

   RULE
   ----
   DEFAULT SETTINGS are always available.

   When the administrator saves a setting in Firestore,
   the saved value overrides the default value.

   This prevents pages from breaking when a setting has
   not yet been configured.

   ============================================================ */


/* ============================================================
   DEFAULT SETTINGS
   ============================================================ */

export const DEFAULT_SETTINGS = {

    /* --------------------------------------------------------
       BUSINESS INFORMATION
       -------------------------------------------------------- */

    businessName: "HomeRent",

    businessEmail: "",

    businessPhone: "",

    businessAddress: "",

    businessType: "Property & Storeroom Management",


    /* --------------------------------------------------------
       BRANDING
       -------------------------------------------------------- */

    logoUrl: "",

    primaryColor: "#087fdf",

    accentColor: "#d9a441",

    theme: "system",


    /* --------------------------------------------------------
       REGIONAL SETTINGS
       -------------------------------------------------------- */

    currency: "GHS",

    currencySymbol: "₵",

    dateFormat: "DD/MM/YYYY",

    timezone: "Africa/Accra",


    /* --------------------------------------------------------
       RECEIPTS
       -------------------------------------------------------- */

    receiptPrefix: "HR",

    receiptFooter:
        "Thank you for your business.",


    /* --------------------------------------------------------
       RENTAL SETTINGS
       -------------------------------------------------------- */

    defaultRentalDuration: "Monthly",

    gracePeriodDays: 0,

    reminderDaysBeforeDue: 3,


    /* --------------------------------------------------------
       SYSTEM INFORMATION
       -------------------------------------------------------- */

    systemVersion: "1.0.0",

    footerText:
        "Secure Property & Storeroom Management",

    setupCompleted: false
};


/* ============================================================
   CURRENT SETTINGS
   ============================================================

   Starts with the defaults.

   Later, Firestore values are merged over these defaults.
   ============================================================ */

let currentSettings = {
    ...DEFAULT_SETTINGS
};


/* ============================================================
   GET CURRENT SETTINGS
   ============================================================ */

export function getSettings() {

    return {
        ...currentSettings
    };
}


/* ============================================================
   SET SETTINGS
   ============================================================

   Used by the settings loader after reading Firestore.
   ============================================================ */

export function setSettings(firebaseSettings = {}) {

    currentSettings = {

        ...DEFAULT_SETTINGS,

        ...firebaseSettings
    };


    return getSettings();
}


/* ============================================================
   GET ONE SETTING
   ============================================================ */

export function getSetting(key) {

    /*
     * If the saved value exists, use it.
     *
     * Otherwise return the default value.
     */

    if (
        currentSettings[key] !== undefined &&
        currentSettings[key] !== null
    ) {

        return currentSettings[key];
    }


    return DEFAULT_SETTINGS[key];
}


/* ============================================================
   RESET TO DEFAULTS
   ============================================================

   Mainly useful during development/testing.

   We will NOT expose this directly to normal users.
   ============================================================ */

export function resetSettingsToDefaults() {

    currentSettings = {
        ...DEFAULT_SETTINGS
    };

    return getSettings();
}