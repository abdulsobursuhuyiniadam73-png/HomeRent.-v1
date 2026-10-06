/* ============================================================
   HOMERENT - SETTINGS SERVICE
   ============================================================

   PURPOSE
   -------
   Reads and saves the administrator's global HomeRent
   settings in Firestore.

   FIRESTORE LOCATION
   ------------------
   Collection: settings
   Document:   business

   IMPORTANT
   ----------
   This file handles FIRESTORE communication.

   settings.js handles DEFAULT/CURRENT settings.

   Keeping them separate makes future maintenance easier.
   ============================================================ */

import { getFirestore, doc, getDoc, setDoc }
    from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { app }
    from "../firebase.js";

import {
    DEFAULT_SETTINGS,
    setSettings,
    getSettings
} from "./settings.js";


/* ============================================================
   FIRESTORE
   ============================================================ */

const db = getFirestore(app);


/* ============================================================
   SETTINGS REFERENCE
   ============================================================ */

const SETTINGS_COLLECTION = "settings";

const SETTINGS_DOCUMENT = "business";


/* ============================================================
   LOAD SETTINGS
   ============================================================

   Process:

   Firestore
       ↓
   Read settings/business
       ↓
   Merge with defaults
       ↓
   Make available to entire application
   ============================================================ */

export async function loadSettings() {

    try {

        const settingsRef = doc(
            db,
            SETTINGS_COLLECTION,
            SETTINGS_DOCUMENT
        );


        const snapshot = await getDoc(settingsRef);


        /*
         * No settings document exists yet.
         *
         * Use defaults.
         */

        if (!snapshot.exists()) {

            setSettings(DEFAULT_SETTINGS);

            return getSettings();
        }


        /*
         * Firestore settings exist.
         *
         * setSettings() automatically combines:
         *
         * DEFAULT SETTINGS
         * +
         * ADMIN SETTINGS
         */

        const firebaseSettings =
            snapshot.data();


        return setSettings(
            firebaseSettings
        );


    } catch (error) {

        console.error(
            "HomeRent: Failed to load settings.",
            error
        );


        /*
         * If Firestore temporarily fails,
         * the application should still have
         * usable default settings.
         */

        setSettings(DEFAULT_SETTINGS);

        return getSettings();
    }
}


/* ============================================================
   SAVE SETTINGS
   ============================================================

   Used by the administrator's Settings page.

   merge: true means we don't accidentally remove
   settings that were already saved.
   ============================================================ */

export async function saveSettings(
    settingsToSave = {}
) {

    try {

        const settingsRef = doc(
            db,
            SETTINGS_COLLECTION,
            SETTINGS_DOCUMENT
        );


        await setDoc(
            settingsRef,
            settingsToSave,
            {
                merge: true
            }
        );


        /*
         * Update the application's current settings
         * immediately after successful saving.
         */

        const updatedSettings =
            setSettings({
                ...getSettings(),
                ...settingsToSave
            });


        return {
            success: true,
            settings: updatedSettings
        };


    } catch (error) {

        console.error(
            "HomeRent: Failed to save settings.",
            error
        );


        return {
            success: false,
            error
        };
    }
}


/* ============================================================
   CHECK WHETHER INITIAL SETUP IS COMPLETE
   ============================================================ */

export async function isSetupComplete() {

    const settings =
        await loadSettings();


    return settings.setupCompleted === true;
}