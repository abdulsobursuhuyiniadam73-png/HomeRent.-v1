/* ============================================================
   HOMERENT - SETUP WIZARD CONTROLLER
   ============================================================

   FLOW
   ----
   STEP 1 → Business Information
       ↓
   STEP 2 → Branding & Appearance
       ↓
   STEP 3 → Rental Rules
       ↓
   STEP 4 → Receipts & Documents
       ↓
   REVIEW → Confirm information
       ↓
   FINISH SETUP → Save to Firestore

   IMPORTANT
   ----------
   • Continue is used only for Steps 1–3.
   • Step 4 uses "Review & Save".
   • Finish Setup appears ONLY on the Review screen.
   • Nothing is saved to Firestore until Finish Setup.
   ============================================================ */


/* ============================================================
   IMPORTS
   ============================================================ */

import {
    loadSettings,
    saveSettings
} from "../core/settings-service.js";

import {
    getSettings
} from "../core/settings.js";

import {
    applyGlobalBranding
} from "../core/branding.js";


/* ============================================================
   WIZARD CONFIGURATION
   ============================================================ */

const TOTAL_STEPS = 4;

let currentStep = 1;


/* ============================================================
   TEMPORARY WIZARD DATA
   ============================================================ */

let wizardData = {};


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const elements = {

    /* --------------------------------------------------------
       STEP DISPLAY
       -------------------------------------------------------- */

    currentStepNumber:
        document.getElementById("currentStepNumber"),

    stepButtons:
        document.querySelectorAll("[data-step-button]"),

    wizardSteps:
        document.querySelectorAll("[data-step]"),


    /* --------------------------------------------------------
       REVIEW
       -------------------------------------------------------- */

    setupReview:
        document.getElementById("setupReview"),

    reviewContent:
        document.getElementById("reviewContent"),


    /* --------------------------------------------------------
       MESSAGE
       -------------------------------------------------------- */

    setupMessage:
        document.getElementById("setupMessage"),


    /* --------------------------------------------------------
       NAVIGATION
       -------------------------------------------------------- */

    previousButton:
        document.getElementById("previousButton"),

    continueButton:
        document.getElementById("continueButton"),

    saveSetupButton:
        document.getElementById("saveSetupButton"),

    saveSetupButtonText:
        document.getElementById("saveSetupButtonText"),

    saveSetupSpinner:
        document.getElementById("saveSetupSpinner"),


    /* --------------------------------------------------------
       STEP 1
       -------------------------------------------------------- */

    businessName:
        document.getElementById("businessName"),

    businessEmail:
        document.getElementById("businessEmail"),

    businessPhone:
        document.getElementById("businessPhone"),

    businessType:
        document.getElementById("businessType"),

    businessAddress:
        document.getElementById("businessAddress"),

    currency:
        document.getElementById("currency"),

    dateFormat:
        document.getElementById("dateFormat"),


    /* --------------------------------------------------------
       STEP 2
       -------------------------------------------------------- */

    logoUrl:
        document.getElementById("logoUrl"),

    primaryColor:
        document.getElementById("primaryColor"),

    accentColor:
        document.getElementById("accentColor"),

    theme:
        document.getElementById("theme"),


    /* --------------------------------------------------------
       STEP 3
       -------------------------------------------------------- */

    defaultRentalDuration:
        document.getElementById("defaultRentalDuration"),

    gracePeriodDays:
        document.getElementById("gracePeriodDays"),

    reminderDaysBeforeDue:
        document.getElementById("reminderDaysBeforeDue"),


    /* --------------------------------------------------------
       STEP 4
       -------------------------------------------------------- */

    receiptPrefix:
        document.getElementById("receiptPrefix"),

    receiptFooter:
        document.getElementById("receiptFooter")
};


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeSetup
);


/* ============================================================
   INITIALIZE SETUP
   ============================================================ */

async function initializeSetup() {

    if (!elements.continueButton) {

        console.error(
            "HomeRent Setup: Continue button not found."
        );

        return;
    }


    if (!elements.previousButton) {

        console.error(
            "HomeRent Setup: Previous button not found."
        );

        return;
    }


    attachEventListeners();

    await loadInitialSettings();

    showStep(1);
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function attachEventListeners() {

    /* --------------------------------------------------------
       CONTINUE / REVIEW & SAVE
       -------------------------------------------------------- */

    elements.continueButton.addEventListener(
        "click",
        handleContinue
    );


    /* --------------------------------------------------------
       PREVIOUS
       -------------------------------------------------------- */

    elements.previousButton.addEventListener(
        "click",
        handlePrevious
    );


    /* --------------------------------------------------------
       FINISH SETUP
       -------------------------------------------------------- */

    if (elements.saveSetupButton) {

        elements.saveSetupButton.addEventListener(
            "click",
            handleSaveSetup
        );
    }


    /* --------------------------------------------------------
       PROGRESS NAVIGATION
       -------------------------------------------------------- */

    elements.stepButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => handleStepButtonClick(button)
            );
        }
    );


    /* --------------------------------------------------------
       LIVE PRIMARY COLOR
       -------------------------------------------------------- */

    if (elements.primaryColor) {

        elements.primaryColor.addEventListener(
            "input",
            handleBrandingPreview
        );
    }


    /* --------------------------------------------------------
       LIVE ACCENT COLOR
       -------------------------------------------------------- */

    if (elements.accentColor) {

        elements.accentColor.addEventListener(
            "input",
            handleBrandingPreview
        );
    }


    /* --------------------------------------------------------
       THEME
       -------------------------------------------------------- */

    if (elements.theme) {

        elements.theme.addEventListener(
            "change",
            handleThemeChange
        );
    }
}


/* ============================================================
   LOAD INITIAL SETTINGS
   ============================================================ */

async function loadInitialSettings() {

    try {

        const settings =
            await loadSettings();


        wizardData = {
            ...settings
        };


        populateForm(settings);


    } catch (error) {

        console.error(
            "HomeRent Setup: Failed to load initial settings.",
            error
        );


        wizardData = {
            ...getSettings()
        };


        populateForm(wizardData);
    }
}


/* ============================================================
   POPULATE FORM
   ============================================================ */

function populateForm(settings) {

    setInputValue(
        elements.businessName,
        settings.businessName
    );

    setInputValue(
        elements.businessEmail,
        settings.businessEmail
    );

    setInputValue(
        elements.businessPhone,
        settings.businessPhone
    );

    setInputValue(
        elements.businessType,
        settings.businessType
    );

    setInputValue(
        elements.businessAddress,
        settings.businessAddress
    );

    setInputValue(
        elements.currency,
        settings.currency
    );

    setInputValue(
        elements.dateFormat,
        settings.dateFormat
    );


    /* BRANDING */

    setInputValue(
        elements.logoUrl,
        settings.logoUrl
    );

    setInputValue(
        elements.primaryColor,
        settings.primaryColor
    );

    setInputValue(
        elements.accentColor,
        settings.accentColor
    );

    setInputValue(
        elements.theme,
        settings.theme
    );


    /* RENTAL */

    setInputValue(
        elements.defaultRentalDuration,
        settings.defaultRentalDuration
    );

    setInputValue(
        elements.gracePeriodDays,
        settings.gracePeriodDays
    );

    setInputValue(
        elements.reminderDaysBeforeDue,
        settings.reminderDaysBeforeDue
    );


    /* RECEIPTS */

    setInputValue(
        elements.receiptPrefix,
        settings.receiptPrefix
    );

    setInputValue(
        elements.receiptFooter,
        settings.receiptFooter
    );


    /*
     * Apply initial visual settings.
     */

    handleBrandingPreview();

    applyTheme(
        settings.theme
    );
}


/* ============================================================
   SAFE INPUT SETTER
   ============================================================ */

function setInputValue(element, value) {

    if (!element) {
        return;
    }


    if (
        value !== undefined &&
        value !== null
    ) {

        element.value = value;
    }
}


/* ============================================================
   CONTINUE / REVIEW & SAVE
   ============================================================ */

function handleContinue() {

    /*
     * Always collect the current step first.
     */

    collectCurrentStepData();


    /*
     * Validate current step.
     */

    if (!validateCurrentStep()) {

        return;
    }


    /*
     * --------------------------------------------------------
     * STEPS 1–3
     * --------------------------------------------------------
     */

    if (currentStep < TOTAL_STEPS) {

        showStep(
            currentStep + 1
        );

        return;
    }


    /*
     * --------------------------------------------------------
     * STEP 4
     * --------------------------------------------------------
     *
     * DO NOT save here.
     *
     * Instead show the review screen.
     */

    showReview();
}


/* ============================================================
   PREVIOUS
   ============================================================ */

function handlePrevious() {

    /*
     * If the REVIEW screen is visible,
     * return to Step 4.
     */

    if (
        elements.setupReview &&
        !elements.setupReview.hidden
    ) {

        elements.setupReview.hidden = true;

        showStep(4);

        return;
    }


    /*
     * Save current values before moving backwards.
     */

    collectCurrentStepData();


    /*
     * Never go below Step 1.
     */

    if (currentStep <= 1) {

        return;
    }


    showStep(
        currentStep - 1
    );
}


/* ============================================================
   PROGRESS STEP BUTTON
   ============================================================ */

function handleStepButtonClick(button) {

    const requestedStep =
        Number(
            button.dataset.stepButton
        );


    if (
        !requestedStep ||
        requestedStep < 1 ||
        requestedStep > TOTAL_STEPS
    ) {

        return;
    }


    /*
     * Future steps cannot be opened.
     */

    if (
        requestedStep > currentStep
    ) {

        return;
    }


    collectCurrentStepData();

    showStep(
        requestedStep
    );
}


/* ============================================================
   SHOW STEP
   ============================================================ */

function showStep(stepNumber) {

    if (
        stepNumber < 1 ||
        stepNumber > TOTAL_STEPS
    ) {

        return;
    }


    currentStep =
        stepNumber;


    /*
     * Hide review screen.
     */

    if (elements.setupReview) {

        elements.setupReview.hidden = true;
    }


    /*
     * Show only requested wizard step.
     */

    elements.wizardSteps.forEach(
        (step) => {

            const number =
                Number(
                    step.dataset.step
                );


            const active =
                number === stepNumber;


            step.hidden =
                !active;


            step.classList.toggle(
                "active",
                active
            );
        }
    );


    /*
     * Update top indicator.
     */

    if (elements.currentStepNumber) {

        elements.currentStepNumber.textContent =
            stepNumber;
    }


    updateProgressNavigation();

    updateNavigationButtons();

    clearMessage();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   UPDATE PROGRESS
   ============================================================ */

function updateProgressNavigation() {

    elements.stepButtons.forEach(
        (button) => {

            const step =
                Number(
                    button.dataset.stepButton
                );


            const active =
                step === currentStep;


            const completed =
                step < currentStep;


            button.classList.toggle(
                "active",
                active
            );


            button.classList.toggle(
                "completed",
                completed
            );


            /*
             * Current and completed steps are accessible.
             * Future steps remain locked.
             */

            button.disabled =
                step > currentStep;


            if (active) {

                button.setAttribute(
                    "aria-current",
                    "step"
                );

            } else {

                button.removeAttribute(
                    "aria-current"
                );
            }
        }
    );
}


/* ============================================================
   UPDATE NAVIGATION BUTTONS
   ============================================================ */

function updateNavigationButtons() {

    /*
     * Previous
     */

    if (elements.previousButton) {

        elements.previousButton.hidden =
            currentStep === 1;
    }


    /*
     * --------------------------------------------------------
     * CONTINUE BUTTON
     * --------------------------------------------------------
     *
     * Step 1 → Continue
     * Step 2 → Continue
     * Step 3 → Continue
     * Step 4 → Review & Save
     */

    if (elements.continueButton) {

        elements.continueButton.hidden =
            false;


        if (currentStep === TOTAL_STEPS) {

            elements.continueButton.textContent =
                "Review & Save →";

        } else {

            elements.continueButton.textContent =
                "Continue →";
        }
    }


    /*
     * Finish Setup is NEVER shown on normal wizard steps.
     */

    if (elements.saveSetupButton) {

        elements.saveSetupButton.hidden =
            true;
    }
}


/* ============================================================
   COLLECT CURRENT STEP DATA
   ============================================================ */

function collectCurrentStepData() {

    /* --------------------------------------------------------
       STEP 1
       -------------------------------------------------------- */

    if (currentStep === 1) {

        wizardData.businessName =
            getInputValue(
                elements.businessName
            );

        wizardData.businessEmail =
            getInputValue(
                elements.businessEmail
            );

        wizardData.businessPhone =
            getInputValue(
                elements.businessPhone
            );

        wizardData.businessType =
            getInputValue(
                elements.businessType
            );

        wizardData.businessAddress =
            getInputValue(
                elements.businessAddress
            );

        wizardData.currency =
            getInputValue(
                elements.currency
            );

        wizardData.currencySymbol =
            getCurrencySymbol(
                wizardData.currency
            );

        wizardData.dateFormat =
            getInputValue(
                elements.dateFormat
            );
    }


    /* --------------------------------------------------------
       STEP 2
       -------------------------------------------------------- */

    if (currentStep === 2) {

        wizardData.logoUrl =
            getInputValue(
                elements.logoUrl
            );

        wizardData.primaryColor =
            getInputValue(
                elements.primaryColor
            );

        wizardData.accentColor =
            getInputValue(
                elements.accentColor
            );

        wizardData.theme =
            getInputValue(
                elements.theme
            );
    }


    /* --------------------------------------------------------
       STEP 3
       -------------------------------------------------------- */

    if (currentStep === 3) {

        wizardData.defaultRentalDuration =
            getInputValue(
                elements.defaultRentalDuration
            );

        wizardData.gracePeriodDays =
            getNumberValue(
                elements.gracePeriodDays,
                0
            );

        wizardData.reminderDaysBeforeDue =
            getNumberValue(
                elements.reminderDaysBeforeDue,
                3
            );
    }


    /* --------------------------------------------------------
       STEP 4
       -------------------------------------------------------- */

    if (currentStep === 4) {

        wizardData.receiptPrefix =
            getInputValue(
                elements.receiptPrefix
            );

        wizardData.receiptFooter =
            getInputValue(
                elements.receiptFooter
            );
    }
}


/* ============================================================
   VALIDATE CURRENT STEP
   ============================================================ */

function validateCurrentStep() {

    /* --------------------------------------------------------
       STEP 1
       -------------------------------------------------------- */

    if (currentStep === 1) {

        const businessName =
            getInputValue(
                elements.businessName
            );


        if (!businessName) {

            showMessage(
                "Please enter the business or system name.",
                "error"
            );

            elements.businessName?.focus();

            return false;
        }


        const email =
            getInputValue(
                elements.businessEmail
            );


        if (
            email &&
            !isValidEmail(email)
        ) {

            showMessage(
                "Please enter a valid business email address.",
                "error"
            );

            elements.businessEmail?.focus();

            return false;
        }
    }


    /* --------------------------------------------------------
       STEP 2
       -------------------------------------------------------- */

    if (currentStep === 2) {

        const logoUrl =
            getInputValue(
                elements.logoUrl
            );


        if (logoUrl) {

            try {

                new URL(logoUrl);

            } catch {

                showMessage(
                    "Please enter a valid logo URL or leave it empty.",
                    "error"
                );

                elements.logoUrl?.focus();

                return false;
            }
        }
    }


    /* --------------------------------------------------------
       STEP 3
       -------------------------------------------------------- */

    if (currentStep === 3) {

        const gracePeriod =
            getNumberValue(
                elements.gracePeriodDays,
                0
            );


        const reminderDays =
            getNumberValue(
                elements.reminderDaysBeforeDue,
                3
            );


        if (
            gracePeriod < 0 ||
            gracePeriod > 365
        ) {

            showMessage(
                "Grace period must be between 0 and 365 days.",
                "error"
            );

            elements.gracePeriodDays?.focus();

            return false;
        }


        if (
            reminderDays < 0 ||
            reminderDays > 365
        ) {

            showMessage(
                "Reminder days must be between 0 and 365 days.",
                "error"
            );

            elements.reminderDaysBeforeDue?.focus();

            return false;
        }
    }


    /* --------------------------------------------------------
       STEP 4
       -------------------------------------------------------- */

    if (currentStep === 4) {

        const prefix =
            getInputValue(
                elements.receiptPrefix
            );


        if (!prefix) {

            showMessage(
                "Please enter a receipt prefix.",
                "error"
            );

            elements.receiptPrefix?.focus();

            return false;
        }
    }


    clearMessage();

    return true;
}


/* ============================================================
   SHOW REVIEW
   ============================================================ */
function showReview() {
  // Hide all wizard steps
  document.querySelectorAll("[data-step]").forEach((step) => {
    step.classList.remove("active");
    step.hidden = true;
  });

  // Hide normal navigation
  continueButton.hidden = true;

  // Show review
  setupReview.hidden = false;

  // Collect the latest data
  collectCurrentStepData();

  const data = wizardData;

  const displayValue = (value, fallback = "Not provided") => {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return fallback;
    }

    return String(value);
  };

  const escapeHTML = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  /*
   * Creates one clean review row.
   *
   * IMPORTANT:
   * review-label and review-value are kept separate
   * so CSS can create a proper visual gap.
   */
  const reviewRow = (label, value) => {
    return `
      <div class="review-item">
        <div class="review-label">
          ${escapeHTML(label)}
        </div>

        <div class="review-value">
          ${escapeHTML(displayValue(value))}
        </div>
      </div>
    `;
  };

  /*
   * Creates a review section
   */
  const reviewSection = (title, rows) => {
    return `
      <section class="review-section">
        <h3>${escapeHTML(title)}</h3>

        <div class="review-section-body">
          ${rows}
        </div>
      </section>
    `;
  };

  /* =========================================================
     BUSINESS INFORMATION
     ========================================================= */

  const businessSection = reviewSection(
    "Business Information",

    reviewRow("Business Name", data.businessName) +
    reviewRow("Email", data.businessEmail) +
    reviewRow("Phone", data.businessPhone) +
    reviewRow("Business Type", data.businessType) +
    reviewRow("Address", data.businessAddress) +
    reviewRow("Currency", data.currency) +
    reviewRow("Date Format", data.dateFormat)
  );


  /* =========================================================
     BRANDING & APPEARANCE
     ========================================================= */

  const logoValue =
    data.logoUrl && data.logoUrl.trim()
      ? "Custom logo"
      : "Default HomeRent logo";

  const appearanceValue =
    data.theme === "system"
      ? "Follow device"
      : displayValue(data.theme, "Follow device");

  const brandingSection = reviewSection(
    "Branding & Appearance",

    reviewRow("Logo", logoValue) +
    reviewRow("Primary Color", data.primaryColor) +
    reviewRow("Accent Color", data.accentColor) +
    reviewRow("Appearance", appearanceValue)
  );


  /* =========================================================
     RENTAL RULES
     ========================================================= */

  const rentalDuration =
    data.defaultRentalDuration &&
    String(data.defaultRentalDuration).trim()
      ? `${data.defaultRentalDuration} month(s)`
      : "Not provided";

  const gracePeriod =
    data.gracePeriodDays !== undefined &&
    data.gracePeriodDays !== null &&
    String(data.gracePeriodDays).trim() !== ""
      ? `${data.gracePeriodDays} day(s)`
      : "0 day(s)";

  const reminderDays =
    data.reminderDaysBeforeDue !== undefined &&
    data.reminderDaysBeforeDue !== null &&
    String(data.reminderDaysBeforeDue).trim() !== ""
      ? `${data.reminderDaysBeforeDue} day(s) before due`
      : "Not provided";

  const rentalSection = reviewSection(
    "Rental Rules",

    reviewRow("Rental Duration", rentalDuration) +
    reviewRow("Grace Period", gracePeriod) +
    reviewRow("Reminder", reminderDays)
  );


  /* =========================================================
     RECEIPTS & DOCUMENTS
     ========================================================= */

  const receiptPrefix =
    data.receiptPrefix && data.receiptPrefix.trim()
      ? data.receiptPrefix
      : "Not provided";

  const receiptFooter =
    data.receiptFooter && data.receiptFooter.trim()
      ? data.receiptFooter
      : "Not provided";

  const receiptSection = reviewSection(
    "Receipts & Documents",

    reviewRow("Receipt Prefix", receiptPrefix) +
    reviewRow("Footer Text", receiptFooter)
  );


  /* =========================================================
     FINAL REVIEW CONTENT
     ========================================================= */

  reviewContent.innerHTML = `
    <div class="review-introduction">
      <div class="review-eyebrow">
        <span></span>
        FINAL REVIEW
      </div>

      <h2>Review Your Setup</h2>

      <p>
        Review the information you entered before completing
        your HomeRent setup.
      </p>
    </div>

    ${businessSection}

    ${brandingSection}

    ${rentalSection}

    ${receiptSection}
  `;

  /*
   * Review is now active.
   */
  setupReview.classList.add("active");

  /*
   * Keep Step 4 highlighted in the progress navigation.
   */
  document.querySelectorAll("[data-step-button]").forEach((button) => {
    const step = Number(button.dataset.stepButton);

    button.classList.toggle("active", step === 4);
  });

  /*
   * Update header indicator.
   */
  if (currentStepNumber) {
    currentStepNumber.textContent = "4";
  }

  /*
   * Make sure Finish Setup is visible only on Review.
   */
  saveSetupButton.hidden = false;

  /*
   * Make sure normal Continue button stays hidden.
   */
  continueButton.hidden = true;

  /*
   * Previous button becomes the Edit/Back button.
   */
  previousButton.hidden = false;

  /*
   * Change its text while reviewing.
   */
  previousButton.textContent = "← Back / Edit";

  /*
   * Finish Setup button text.
   */
  if (saveSetupButtonText) {
    saveSetupButtonText.textContent = "Finish Setup";
  }
}


/* ============================================================
   RENDER REVIEW
   ============================================================ */

function renderReview() {

    if (!elements.reviewContent) {

        return;
    }


    const currencySymbol =
        wizardData.currencySymbol ||
        getCurrencySymbol(
            wizardData.currency
        );


    elements.reviewContent.innerHTML = `

        <!-- BUSINESS INFORMATION -->

        <section class="review-section">

            <h3>
                Business Information
            </h3>

            ${createReviewRow(
                "Business Name",
                wizardData.businessName
            )}

            ${createReviewRow(
                "Email",
                wizardData.businessEmail ||
                "Not provided"
            )}

            ${createReviewRow(
                "Phone",
                wizardData.businessPhone ||
                "Not provided"
            )}

            ${createReviewRow(
                "Business Type",
                wizardData.businessType
            )}

            ${createReviewRow(
                "Address",
                wizardData.businessAddress ||
                "Not provided"
            )}

            ${createReviewRow(
                "Currency",
                `${wizardData.currency || "GHS"} ${currencySymbol}`
            )}

            ${createReviewRow(
                "Date Format",
                wizardData.dateFormat
            )}

        </section>


        <!-- BRANDING -->

        <section class="review-section">

            <h3>
                Branding & Appearance
            </h3>

            ${createReviewRow(
                "Logo",
                wizardData.logoUrl
                    ? "Custom logo configured"
                    : "Default HomeRent logo"
            )}

            ${createReviewRow(
                "Primary Color",
                wizardData.primaryColor
            )}

            ${createReviewRow(
                "Accent Color",
                wizardData.accentColor
            )}

            ${createReviewRow(
                "Appearance",
                getThemeLabel(
                    wizardData.theme
                )
            )}

        </section>


        <!-- RENTAL RULES -->

        <section class="review-section">

            <h3>
                Rental Rules
            </h3>

            ${createReviewRow(
                "Rental Duration",
                wizardData.defaultRentalDuration
            )}

            ${createReviewRow(
                "Grace Period",
                `${wizardData.gracePeriodDays} day(s)`
            )}

            ${createReviewRow(
                "Rent Reminder",
                `${wizardData.reminderDaysBeforeDue} day(s) before due`
            )}

        </section>


        <!-- RECEIPTS -->

        <section class="review-section">

            <h3>
                Receipts
            </h3>

            ${createReviewRow(
                "Receipt Prefix",
                wizardData.receiptPrefix
            )}

            ${createReviewRow(
                "Receipt Footer",
                wizardData.receiptFooter ||
                "Not provided"
            )}

        </section>

    `;
}


/* ============================================================
   REVIEW ROW
   ============================================================ */

function createReviewRow(
    label,
    value
) {

    return `

        <div class="review-row">

            <span class="review-label">
                ${escapeHTML(label)}
            </span>

            <span class="review-value">
                ${escapeHTML(
                    value === undefined ||
                    value === null ||
                    value === ""
                        ? "Not provided"
                        : String(value)
                )}
            </span>

        </div>

    `;
}


/* ============================================================
   FINISH SETUP
   ============================================================ */

async function handleSaveSetup() {

    /*
     * At this point we are on the REVIEW screen.
     *
     * Step 4 has already been collected.
     */

    if (
        !elements.setupReview ||
        elements.setupReview.hidden
    ) {

        return;
    }


    /*
     * Validate the complete configuration.
     */

    if (!validateAllSteps()) {

        return;
    }


    /*
     * Start loading state.
     */

    setSaveLoading(true);

    clearMessage();


    try {

        /*
         * Prepare final settings.
         */

        const settingsToSave = {

            ...wizardData,

            setupCompleted:
                true,

            timezone:
                wizardData.timezone ||
                "Africa/Accra",

            systemVersion:
                wizardData.systemVersion ||
                "1.0.0"
        };


        /*
         * Save to Firestore.
         */

        const result =
            await saveSettings(
                settingsToSave
            );


        /*
         * Verify save result.
         */

        if (
            !result ||
            !result.success
        ) {

            throw (
                result?.error ||
                new Error(
                    "Settings could not be saved."
                )
            );
        }


        /*
         * Update local state.
         */

        wizardData = {

            ...wizardData,

            ...result.settings,

            setupCompleted:
                true
        };


        /*
         * Apply branding.
         */

        await applyGlobalBranding();


        /*
         * Apply theme.
         */

        applyTheme(
            wizardData.theme
        );


        /*
         * Show success.
         */

        showMessage(
            "Setup completed successfully.",
            "success"
        );


        /*
         * Disable controls after successful save.
         */

        if (elements.previousButton) {

            elements.previousButton.disabled =
                true;
        }


        if (elements.saveSetupButton) {

            elements.saveSetupButton.disabled =
                true;
        }


        /*
         * Go to dashboard.
         */

        setTimeout(
            () => {

                window.location.replace(
                    "../../pages/dashboard/index.html"
                );

            },
            700
        );


    } catch (error) {

        console.error(
            "HomeRent Setup: Save failed.",
            error
        );


        showMessage(
            "We could not save your setup. Please check your connection and try again.",
            "error"
        );


    } finally {

        setSaveLoading(false);
    }
}


/* ============================================================
   VALIDATE EVERYTHING
   ============================================================ */

function validateAllSteps() {

    /* BUSINESS */

    if (
        !wizardData.businessName ||
        !wizardData.businessName.trim()
    ) {

        showMessage(
            "Business name is required.",
            "error"
        );

        return false;
    }


    /* EMAIL */

    if (
        wizardData.businessEmail &&
        !isValidEmail(
            wizardData.businessEmail
        )
    ) {

        showMessage(
            "Please enter a valid business email address.",
            "error"
        );

        return false;
    }


    /* LOGO */

    if (wizardData.logoUrl) {

        try {

            new URL(
                wizardData.logoUrl
            );

        } catch {

            showMessage(
                "The logo URL is not valid.",
                "error"
            );

            return false;
        }
    }


    /* GRACE PERIOD */

    if (
        wizardData.gracePeriodDays < 0 ||
        wizardData.gracePeriodDays > 365
    ) {

        showMessage(
            "Grace period must be between 0 and 365 days.",
            "error"
        );

        return false;
    }


    /* REMINDER */

    if (
        wizardData.reminderDaysBeforeDue < 0 ||
        wizardData.reminderDaysBeforeDue > 365
    ) {

        showMessage(
            "Reminder days must be between 0 and 365 days.",
            "error"
        );

        return false;
    }


    /* RECEIPT PREFIX */

    if (
        !wizardData.receiptPrefix
    ) {

        showMessage(
            "Receipt prefix is required.",
            "error"
        );

        return false;
    }


    return true;
}


/* ============================================================
   BRANDING PREVIEW
   ============================================================ */

function handleBrandingPreview() {

    if (elements.primaryColor) {

        document.documentElement.style.setProperty(
            "--primary-color",
            elements.primaryColor.value
        );
    }


    if (elements.accentColor) {

        document.documentElement.style.setProperty(
            "--accent-color",
            elements.accentColor.value
        );
    }
}


/* ============================================================
   THEME CHANGE
   ============================================================ */

function handleThemeChange() {

    const selectedTheme =
        getInputValue(
            elements.theme
        );


    applyTheme(
        selectedTheme
    );
}


/* ============================================================
   APPLY THEME
   ============================================================ */

function applyTheme(theme) {

    const root =
        document.documentElement;


    if (theme === "light") {

        root.dataset.theme =
            "light";

        return;
    }


    if (theme === "dark") {

        root.dataset.theme =
            "dark";

        return;
    }


    if (
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
    ) {

        root.dataset.theme =
            "dark";

    } else {

        root.dataset.theme =
            "light";
    }
}


/* ============================================================
   SAVE LOADING STATE
   ============================================================ */

function setSaveLoading(isLoading) {

    if (elements.saveSetupButton) {

        elements.saveSetupButton.disabled =
            isLoading;
    }


    if (elements.previousButton) {

        elements.previousButton.disabled =
            isLoading;
    }


    if (elements.saveSetupButtonText) {

        elements.saveSetupButtonText.textContent =
            isLoading
                ? "Saving..."
                : "Finish Setup";
    }


    if (elements.saveSetupSpinner) {

        elements.saveSetupSpinner.hidden =
            !isLoading;
    }
}


/* ============================================================
   GET INPUT VALUE
   ============================================================ */

function getInputValue(element) {

    if (!element) {

        return "";
    }


    return element.value.trim();
}


/* ============================================================
   GET NUMBER VALUE
   ============================================================ */

function getNumberValue(
    element,
    fallback = 0
) {

    if (!element) {

        return fallback;
    }


    const value =
        Number(
            element.value
        );


    if (Number.isNaN(value)) {

        return fallback;
    }


    return value;
}


/* ============================================================
   EMAIL VALIDATION
   ============================================================ */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}


/* ============================================================
   CURRENCY SYMBOL
   ============================================================ */

function getCurrencySymbol(currency) {

    const symbols = {

        GHS: "₵",

        USD: "$",

        GBP: "£",

        EUR: "€"
    };


    return (
        symbols[currency] ||
        ""
    );
}


/* ============================================================
   THEME LABEL
   ============================================================ */

function getThemeLabel(theme) {

    const labels = {

        system: "Follow device",

        light: "Light",

        dark: "Dark"
    };


    return (
        labels[theme] ||
        "Follow device"
    );
}


/* ============================================================
   MESSAGE
   ============================================================ */

function showMessage(
    message,
    type = "error"
) {

    if (!elements.setupMessage) {

        return;
    }


    elements.setupMessage.textContent =
        message;


    elements.setupMessage.dataset.type =
        type;


    elements.setupMessage.hidden =
        false;
}


/* ============================================================
   CLEAR MESSAGE
   ============================================================ */

function clearMessage() {

    if (!elements.setupMessage) {

        return;
    }


    elements.setupMessage.textContent =
        "";

    elements.setupMessage.hidden =
        true;

    delete elements.setupMessage.dataset.type;
}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


/* ============================================================
   END OF HOMERENT SETUP CONTROLLER
   ============================================================ */