// ============================================================
// HomeRent — Professional Add/Edit Room Modal
// File: components/add-room/add-room.js
//
// Features:
// - Responsive professional modal
// - Fixed mobile scrolling
// - Accessible Save Room footer
// - System settings business name and logo
// - Default logo fallback
// - Add and edit room functionality
// - Form validation
// - Saving indicator
// - Success/error notifications
// - Rooms page update event
// ============================================================

import {
  createRoom,
  updateRoom,
  getRoomById
} from "../../js/rooms/rooms-service.js";

import { getSettings } from "../../js/core/settings.js";
import { applyGlobalBranding } from "../../js/core/branding.js";

const MODAL_ID = "homerent-room-modal";
const STYLE_ID = "homerent-room-modal-styles";
const TOAST_ID = "homerent-room-toast";

let activeController = null;

// ============================================================
// UTILITIES
// ============================================================

function getSettingsSafely() {
  try {
    return getSettings() || {};
  } catch (error) {
    console.warn("HomeRent: Unable to read settings.", error);
    return {};
  }
}

function getCurrencySymbol(settings = {}) {
  if (settings.currencySymbol) {
    return settings.currencySymbol;
  }

  const symbols = {
    GHS: "₵",
    USD: "$",
    GBP: "£",
    EUR: "€",
    NGN: "₦"
  };

  return symbols[settings.currency || "GHS"] || "₵";
}

function getDefaultLogoUrl() {
  // Keep this path aligned with the existing default logo asset.
  return new URL(
    "../../assets/images/default-logo.svg",
    import.meta.url
  ).href;
}

// ============================================================
// MODAL STYLES
// ============================================================

function installStyles() {
  let style = document.getElementById(STYLE_ID);

  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
    #${MODAL_ID},
    #${TOAST_ID},
    #${MODAL_ID} *,
    #${MODAL_ID} *::before,
    #${MODAL_ID} *::after {
      box-sizing: border-box;
    }

    /* --------------------------------------------------------
       MODAL OVERLAY
       The overlay itself can scroll when the form is taller
       than the available screen.
    -------------------------------------------------------- */

    #${MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 10000;

      display: none;
      align-items: flex-start;
      justify-content: center;

      padding: 16px;

      overflow-x: hidden;
      overflow-y: auto;

      -webkit-overflow-scrolling: touch;
      overscroll-behavior-y: contain;

      background: rgba(12, 25, 46, .66);

      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
    }

    #${MODAL_ID}.is-open {
      display: flex;
    }

    /* --------------------------------------------------------
       MODAL PANEL
    -------------------------------------------------------- */

    #${MODAL_ID} .hr-modal-panel {
      position: relative;

      display: flex;
      flex: 0 0 auto;
      flex-direction: column;

      width: min(100%, 760px);
      min-height: 0;
      max-height: none;

      margin: auto;

      overflow: visible;

      border: 1px solid #dce7f4;
      border-radius: 22px;

      background: #fff;
      color: #172033;

      box-shadow: 0 32px 100px rgba(0, 0, 0, .28);

      animation: hrModalEnter .2s ease-out;
    }

    @keyframes hrModalEnter {
      from {
        opacity: 0;
        transform: translateY(12px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* --------------------------------------------------------
       HEADER
    -------------------------------------------------------- */

    #${MODAL_ID} .hr-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 16px;
      padding: 23px 27px;

      border-bottom: 1px solid #e1eaf5;

      border-radius: 22px 22px 0 0;

      background:
        linear-gradient(125deg, #edf6ff 0%, #ffffff 80%);
    }

    #${MODAL_ID} .hr-modal-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    #${MODAL_ID} .hr-modal-logo-wrap {
      display: grid;
      flex: 0 0 58px;

      width: 58px;
      height: 58px;

      place-items: center;
      overflow: hidden;

      border: 1px solid #d8e6f5;
      border-radius: 15px;

      background: #fff;

      box-shadow: 0 5px 16px rgba(15, 75, 140, .09);
    }

    #${MODAL_ID} .hr-modal-logo {
      display: block;
      width: 100%;
      height: 100%;

      padding: 5px;

      object-fit: contain;
    }

    #${MODAL_ID} .hr-modal-heading {
      min-width: 0;
    }

    #${MODAL_ID} .hr-modal-business-name {
      display: block;

      margin-bottom: 5px;

      overflow: hidden;

      color: var(--primary-color, #087fdf);

      font-size: .75rem;
      font-weight: 800;
      letter-spacing: .07em;

      text-overflow: ellipsis;
      text-transform: uppercase;
      white-space: nowrap;
    }

    #${MODAL_ID} .hr-modal-heading h2 {
      margin: 0;

      color: #14233b;

      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -.025em;
    }

    #${MODAL_ID} .hr-modal-heading p {
      margin: 6px 0 0;

      color: #66758b;

      font-size: .88rem;
      line-height: 1.5;
    }

    #${MODAL_ID} .hr-modal-close {
      display: grid;
      flex: 0 0 42px;

      width: 42px;
      height: 42px;

      place-items: center;

      border: 1px solid #fecaca;
      border-radius: 12px;

      background: #fff1f2;
      color: #dc2626;

      font-size: 1.65rem;
      font-weight: 700;
      line-height: 1;

      cursor: pointer;

      transition:
        background .18s,
        color .18s,
        transform .18s;
    }

    #${MODAL_ID} .hr-modal-close:hover {
      border-color: #b91c1c;
      background: #dc2626;
      color: #fff;
      transform: rotate(90deg);
    }

    #${MODAL_ID} .hr-modal-close:focus-visible {
      outline: 3px solid rgba(220, 38, 38, .25);
      outline-offset: 3px;
    }

    /* --------------------------------------------------------
       FORM AND SCROLLING
       Important: form and body do not trap the footer inside
       a nested scrolling container.
    -------------------------------------------------------- */

    #${MODAL_ID} #hrRoomForm {
      display: flex;
      flex: 0 0 auto;
      flex-direction: column;

      min-height: 0;
      overflow: visible;
    }

    #${MODAL_ID} .hr-modal-body {
      flex: 0 0 auto;

      min-height: 0;

      padding: 24px 27px;

      overflow: visible;
      overscroll-behavior: contain;
    }

    /* --------------------------------------------------------
       INTRODUCTION
    -------------------------------------------------------- */

    #${MODAL_ID} .hr-modal-intro {
      margin: 0 0 23px;
      padding: 13px 15px;

      border: 1px solid #dbeafe;
      border-radius: 12px;

      background: #f5f9ff;
      color: #52647e;

      font-size: .86rem;
      line-height: 1.6;
    }

    #${MODAL_ID} .hr-modal-intro strong {
      color: #194d89;
    }

    #${MODAL_ID} .hr-required {
      color: #dc2626;
    }

    /* --------------------------------------------------------
       FORM SECTIONS
    -------------------------------------------------------- */

    #${MODAL_ID} .hr-form-section {
      margin: 0 0 25px;
    }

    #${MODAL_ID} .hr-form-section:last-child {
      margin-bottom: 0;
    }

    #${MODAL_ID} .hr-form-section-heading {
      display: flex;
      align-items: center;
      gap: 10px;

      margin: 0 0 16px;

      color: #1d2c43;

      font-size: .94rem;
      font-weight: 800;
    }

    #${MODAL_ID} .hr-section-icon {
      display: grid;
      flex: 0 0 34px;

      width: 34px;
      height: 34px;

      place-items: center;

      border-radius: 10px;

      background: #eaf4ff;
      color: var(--primary-color, #087fdf);

      font-size: .95rem;
    }

    #${MODAL_ID} .hr-form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));

      gap: 19px 17px;
    }

    #${MODAL_ID} .hr-form-field {
      display: flex;
      flex-direction: column;

      gap: 8px;
      min-width: 0;
    }

    #${MODAL_ID} .hr-form-field.hr-full {
      grid-column: 1 / -1;
    }

    #${MODAL_ID} .hr-form-field label {
      color: #344054;

      font-size: .85rem;
      font-weight: 700;
    }

    /* --------------------------------------------------------
       INPUTS
    -------------------------------------------------------- */

    #${MODAL_ID} .hr-input-wrap {
      position: relative;
    }

    #${MODAL_ID} .hr-input-icon {
      position: absolute;

      top: 50%;
      left: 14px;

      color: #8190a5;
      font-size: .9rem;

      pointer-events: none;

      transform: translateY(-50%);
    }

    #${MODAL_ID} .hr-form-field input,
    #${MODAL_ID} .hr-form-field select,
    #${MODAL_ID} .hr-form-field textarea {
      display: block;

      width: 100%;
      min-width: 0;
      min-height: 47px;

      padding: 12px 14px;

      border: 1px solid #d7e0eb;
      border-radius: 11px;

      outline: none;

      background: #fff;
      color: #172033;

      font-family: inherit;
      font-size: .92rem;

      transition:
        border-color .18s,
        box-shadow .18s,
        background .18s;
    }

    #${MODAL_ID} .hr-form-field .hr-input-icon + input {
      padding-left: 40px;
    }

    #${MODAL_ID} .hr-form-field textarea {
      min-height: 105px;
      resize: vertical;
    }

    #${MODAL_ID} .hr-form-field input::placeholder,
    #${MODAL_ID} .hr-form-field textarea::placeholder {
      color: #9aa6b6;
    }

    #${MODAL_ID} .hr-form-field input:focus,
    #${MODAL_ID} .hr-form-field select:focus,
    #${MODAL_ID} .hr-form-field textarea:focus {
      border-color: var(--primary-color, #087fdf);

      background: #fcfdff;

      box-shadow: 0 0 0 4px rgba(8, 127, 223, .11);
    }

    #${MODAL_ID} .hr-form-field [aria-invalid="true"] {
      border-color: #dc2626;
      background: #fffafa;
    }

    #${MODAL_ID} .hr-form-hint {
      margin: 0;

      color: #8490a2;

      font-size: .77rem;
      line-height: 1.5;
    }

    #${MODAL_ID} .hr-field-error {
      color: #b91c1c;

      font-size: .78rem;
      line-height: 1.45;
    }

    #${MODAL_ID} .hr-field-error:empty {
      display: none;
    }

    /* --------------------------------------------------------
       ERROR MESSAGE
    -------------------------------------------------------- */

    #${MODAL_ID} .hr-modal-message {
      display: none;

      margin: 0 0 18px;
      padding: 13px 15px;

      border: 1px solid #fecaca;
      border-radius: 12px;

      background: #fef2f2;
      color: #991b1b;

      font-size: .87rem;
      line-height: 1.5;
    }

    #${MODAL_ID} .hr-modal-message.is-visible {
      display: block;
    }

    /* --------------------------------------------------------
       FOOTER
       This remains in normal document flow, so it is reachable
       by scrolling the overlay.
    -------------------------------------------------------- */

    #${MODAL_ID} .hr-modal-footer {
      position: relative;
      z-index: 2;

      display: flex;
      flex-shrink: 0;

      align-items: center;
      justify-content: space-between;

      gap: 15px;

      padding: 17px 27px;

      border-top: 1px solid #e3eaf3;
      border-radius: 0 0 22px 22px;

      background: #fbfcfe;
    }

    #${MODAL_ID} .hr-footer-note {
      margin: 0;

      color: #7a879a;

      font-size: .78rem;
      line-height: 1.5;
    }

    #${MODAL_ID} .hr-modal-actions {
      display: flex;
      flex: 0 0 auto;
      gap: 10px;
    }

    #${MODAL_ID} .hr-modal-button {
      display: inline-flex;

      min-height: 46px;

      align-items: center;
      justify-content: center;
      gap: 9px;

      padding: 11px 18px;

      border: 1px solid transparent;
      border-radius: 11px;

      font-family: inherit;
      font-size: .9rem;
      font-weight: 750;

      cursor: pointer;

      transition:
        background .18s,
        box-shadow .18s,
        transform .18s;
    }

    #${MODAL_ID} .hr-modal-button:active {
      transform: scale(.98);
    }

    #${MODAL_ID} .hr-modal-button:disabled {
      cursor: wait;
      opacity: .65;
    }

    #${MODAL_ID} .hr-modal-cancel {
      border-color: #d7e0eb;

      background: #fff;
      color: #475569;
    }

    #${MODAL_ID} .hr-modal-cancel:hover {
      border-color: #b9c8d9;
      background: #f1f5f9;
    }

    #${MODAL_ID} .hr-modal-save {
      min-width: 145px;

      background: var(--primary-color, #087fdf);
      color: #fff;

      box-shadow: 0 5px 13px rgba(8, 127, 223, .2);
    }

    #${MODAL_ID} .hr-modal-save:hover {
      box-shadow: 0 7px 18px rgba(8, 127, 223, .28);
      filter: brightness(.95);
    }

    #${MODAL_ID} .hr-button-spinner {
      display: none;

      width: 16px;
      height: 16px;

      border: 2px solid rgba(255, 255, 255, .4);
      border-top-color: #fff;
      border-radius: 50%;

      animation: hrSpin .7s linear infinite;
    }

    #${MODAL_ID} .hr-modal-save.is-saving .hr-button-spinner {
      display: inline-block;
    }

    @keyframes hrSpin {
      to {
        transform: rotate(360deg);
      }
    }

    /* --------------------------------------------------------
       SUCCESS TOAST
    -------------------------------------------------------- */

    #${TOAST_ID} {
      position: fixed;
      z-index: 11000;

      top: 20px;
      right: 20px;

      display: flex;
      align-items: flex-start;
      gap: 12px;

      width: min(390px, calc(100vw - 32px));

      padding: 16px;

      border: 1px solid #bbf7d0;
      border-radius: 15px;

      background: #fff;
      color: #172033;

      box-shadow: 0 18px 55px rgba(15, 35, 70, .2);

      opacity: 0;
      pointer-events: none;

      transform: translateY(-12px);

      transition:
        opacity .22s,
        transform .22s;
    }

    #${TOAST_ID}.is-visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    #${TOAST_ID} .hr-toast-icon {
      display: grid;
      flex: 0 0 38px;

      width: 38px;
      height: 38px;

      place-items: center;

      border-radius: 11px;

      background: #dcfce7;
      color: #15803d;

      font-size: 1.1rem;
    }

    #${TOAST_ID} .hr-toast-copy {
      flex: 1;
      min-width: 0;
    }

    #${TOAST_ID} .hr-toast-title {
      margin: 0 0 4px;

      color: #166534;

      font-size: .93rem;
      font-weight: 800;
    }

    #${TOAST_ID} .hr-toast-message {
      margin: 0;

      color: #64748b;

      font-size: .84rem;
      line-height: 1.5;
    }

    #${TOAST_ID} .hr-toast-close {
      border: 0;
      background: transparent;

      color: #64748b;

      font-size: 1.15rem;
      cursor: pointer;
    }

    /* --------------------------------------------------------
       TABLETS AND PHONES
    -------------------------------------------------------- */

    @media (max-width: 600px) {
      #${MODAL_ID} {
        align-items: flex-start;
        justify-content: center;

        padding: 0;

        overflow-x: hidden;
        overflow-y: auto;
      }

      #${MODAL_ID} .hr-modal-panel {
        flex: 0 0 auto;

        width: 100%;
        max-height: none;
        min-height: 0;

        margin: 0;

        overflow: visible;

        border-radius: 0;
      }

      #${MODAL_ID} .hr-modal-header {
        gap: 10px;
        padding: 17px 15px;
        border-radius: 0;
      }

      #${MODAL_ID} .hr-modal-brand {
        gap: 11px;
      }

      #${MODAL_ID} .hr-modal-logo-wrap {
        flex-basis: 46px;
        width: 46px;
        height: 46px;

        border-radius: 12px;
      }

      #${MODAL_ID} .hr-modal-heading h2 {
        font-size: 1.22rem;
      }

      #${MODAL_ID} .hr-modal-heading p {
        margin-top: 5px;
        font-size: .79rem;
      }

      #${MODAL_ID} .hr-modal-business-name {
        font-size: .64rem;
      }

      #${MODAL_ID} .hr-modal-close {
        flex-basis: 37px;
        width: 37px;
        height: 37px;
      }

      #${MODAL_ID} .hr-modal-body {
        flex: 0 0 auto;
        padding: 18px 15px;
        overflow: visible;
      }

      #${MODAL_ID} .hr-modal-intro {
        margin-bottom: 20px;
      }

      #${MODAL_ID} .hr-form-grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 15px;
      }

      #${MODAL_ID} .hr-form-field.hr-full {
        grid-column: auto;
      }

      #${MODAL_ID} .hr-form-section {
        margin-bottom: 23px;
      }

      #${MODAL_ID} .hr-modal-footer {
        position: relative;

        display: flex;
        flex-direction: column;
        align-items: stretch;

        gap: 12px;

        padding: 14px 15px;
        padding-bottom: max(14px, env(safe-area-inset-bottom, 0px));

        border-radius: 0;
      }

      #${MODAL_ID} .hr-footer-note {
        text-align: center;
      }

      #${MODAL_ID} .hr-modal-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);

        width: 100%;
      }

      #${MODAL_ID} .hr-modal-button {
        width: 100%;
        min-width: 0;
        padding: 11px 8px;
      }

      #${MODAL_ID} .hr-modal-save {
        min-width: 0;
      }

      #${TOAST_ID} {
        top: 12px;
        right: 12px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${MODAL_ID} *,
      #${TOAST_ID} * {
        animation-duration: .01ms !important;
        transition-duration: .01ms !important;
      }
    }
  `;
}

// ============================================================
// BRANDING
// ============================================================

function applyModalBranding(modal) {
  const settings = getSettingsSafely();

  const businessName =
    settings.businessName ||
    settings.systemName ||
    "HomeRent";

  const nameElement = modal.querySelector(
    "[data-modal-business-name]"
  );

  const logo = modal.querySelector("[data-system-logo]");

  if (nameElement) {
    nameElement.textContent = businessName;
  }

  if (logo) {
    const defaultLogo = getDefaultLogoUrl();
    const configuredLogo = String(settings.logoUrl || "").trim();

    logo.onerror = () => {
      if (logo.dataset.fallbackApplied === "true") {
        logo.style.visibility = "hidden";
        return;
      }

      logo.dataset.fallbackApplied = "true";
      logo.src = defaultLogo;
    };

    logo.dataset.fallbackApplied = "false";
    logo.style.visibility = "visible";

    logo.src = configuredLogo || defaultLogo;
  }

  try {
    applyGlobalBranding();
  } catch (error) {
    console.warn("HomeRent: Unable to apply global branding.", error);
  }
}

// ============================================================
// SUCCESS NOTIFICATION
// ============================================================

function showSuccessToast(title, messageText) {
  let toast = document.getElementById(TOAST_ID);

  if (!toast) {
    toast = document.createElement("div");
    toast.id = TOAST_ID;

    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    toast.innerHTML = `
      <div class="hr-toast-icon" aria-hidden="true">✓</div>

      <div class="hr-toast-copy">
        <p class="hr-toast-title"></p>
        <p class="hr-toast-message"></p>
      </div>

      <button
        type="button"
        class="hr-toast-close"
        aria-label="Dismiss notification"
      >&times;</button>
    `;

    document.body.appendChild(toast);

    toast.querySelector(".hr-toast-close").addEventListener(
      "click",
      () => toast.classList.remove("is-visible")
    );
  }

  toast.querySelector(".hr-toast-title").textContent = title;
  toast.querySelector(".hr-toast-message").textContent = messageText;

  toast.classList.add("is-visible");

  clearTimeout(toast._hideTimer);

  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 4500);
}

// ============================================================
// MODAL MARKUP
// ============================================================

function createModalMarkup() {
  let root = document.getElementById("roomModalRoot");

  if (!root) {
    root = document.createElement("div");
    root.id = "roomModalRoot";
    document.body.appendChild(root);
  }

  const existing = document.getElementById(MODAL_ID);

  if (existing) {
    return existing;
  }

  root.insertAdjacentHTML("beforeend", `
    <section
      id="${MODAL_ID}"
      aria-hidden="true"
    >
      <div
        class="hr-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hrRoomModalTitle"
        aria-describedby="hrRoomModalDescription"
      >
        <header class="hr-modal-header">
          <div class="hr-modal-brand">
            <div class="hr-modal-logo-wrap">
              <img
                data-system-logo
                src=""
                alt="Business logo"
                class="hr-modal-logo"
              >
            </div>

            <div class="hr-modal-heading">
              <span
                class="hr-modal-business-name"
                data-modal-business-name
              >HomeRent</span>

              <h2 id="hrRoomModalTitle">Add New Room</h2>

              <p id="hrRoomModalDescription">
                Register a living room or storeroom.
              </p>
            </div>
          </div>

          <button
            type="button"
            class="hr-modal-close"
            data-modal-close
            aria-label="Close room form"
            title="Close"
          >&times;</button>
        </header>

        <form id="hrRoomForm" novalidate>
          <div class="hr-modal-body">
            <div
              class="hr-modal-message"
              id="hrRoomFormMessage"
              role="alert"
              aria-live="assertive"
            ></div>

            <p class="hr-modal-intro">
              <strong>Room setup:</strong>
              Enter the details of your property space.
              Fields marked <span class="hr-required">*</span> are required.
            </p>

            <section class="hr-form-section">
              <h3 class="hr-form-section-heading">
                <span class="hr-section-icon" aria-hidden="true">⌂</span>
                Room information
              </h3>

              <div class="hr-form-grid">
                <div class="hr-form-field">
                  <label for="hrRoomNumber">
                    Room number <span class="hr-required">*</span>
                  </label>

                  <div class="hr-input-wrap">
                    <span class="hr-input-icon" aria-hidden="true">#</span>

                    <input
                      id="hrRoomNumber"
                      name="roomNumber"
                      type="text"
                      maxlength="50"
                      placeholder="e.g. ROOM-001"
                      autocomplete="off"
                      required
                    >
                  </div>

                  <small
                    class="hr-field-error"
                    data-error-for="roomNumber"
                  ></small>
                </div>

                <div class="hr-form-field">
                  <label for="hrRoomType">
                    Room type <span class="hr-required">*</span>
                  </label>

                  <select id="hrRoomType" name="type" required>
                    <option value="">Choose room type</option>
                    <option value="living">Living room</option>
                    <option value="store">Storeroom</option>
                  </select>

                  <small
                    class="hr-field-error"
                    data-error-for="type"
                  ></small>
                </div>

                <div class="hr-form-field">
                  <label for="hrRoomSize">Room size</label>

                  <input
                    id="hrRoomSize"
                    name="size"
                    type="text"
                    maxlength="100"
                    placeholder="e.g. 20 × 15 ft"
                  >

                  <small
                    class="hr-field-error"
                    data-error-for="size"
                  ></small>
                </div>

                <div class="hr-form-field">
                  <label for="hrRoomLocation">Location</label>

                  <input
                    id="hrRoomLocation"
                    name="location"
                    type="text"
                    maxlength="200"
                    placeholder="e.g. Block A, ground floor"
                  >

                  <small
                    class="hr-field-error"
                    data-error-for="location"
                  ></small>
                </div>
              </div>
            </section>

            <section class="hr-form-section">
              <h3 class="hr-form-section-heading">
                <span class="hr-section-icon" aria-hidden="true">₵</span>
                Rental and availability
              </h3>

              <div class="hr-form-grid">
                <div class="hr-form-field">
                  <label for="hrRoomPrice">
                    Rental price <span class="hr-required">*</span>
                  </label>

                  <div class="hr-input-wrap">
                    <span
                      class="hr-input-icon"
                      id="hrRoomCurrencySymbol"
                      aria-hidden="true"
                    >₵</span>

                    <input
                      id="hrRoomPrice"
                      name="currentPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      inputmode="decimal"
                      placeholder="0.00"
                      required
                    >
                  </div>

                  <small class="hr-form-hint">
                    Enter the price for the agreed rental period.
                  </small>

                  <small
                    class="hr-field-error"
                    data-error-for="currentPrice"
                  ></small>
                </div>

                <div class="hr-form-field">
                  <label for="hrRoomStatus">
                    Room status <span class="hr-required">*</span>
                  </label>

                  <select id="hrRoomStatus" name="status" required>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </select>

                  <small
                    class="hr-field-error"
                    data-error-for="status"
                  ></small>
                </div>
              </div>
            </section>

            <section class="hr-form-section">
              <h3 class="hr-form-section-heading">
                <span class="hr-section-icon" aria-hidden="true">☷</span>
                Condition and notes
              </h3>

              <div class="hr-form-grid">
                <div class="hr-form-field hr-full">
                  <label for="hrRoomCondition">
                    Room condition / additional notes
                  </label>

                  <textarea
                    id="hrRoomCondition"
                    name="conditionNotes"
                    maxlength="2000"
                    placeholder="Describe the room condition or add important information..."
                  ></textarea>

                  <small
                    class="hr-field-error"
                    data-error-for="conditionNotes"
                  ></small>
                </div>
              </div>
            </section>
          </div>

          <footer class="hr-modal-footer">
            <p class="hr-footer-note">
              Changes are saved to your HomeRent database.
            </p>

            <div class="hr-modal-actions">
              <button
                type="button"
                class="hr-modal-button hr-modal-cancel"
                data-modal-close
              >Cancel</button>

              <button
                type="submit"
                class="hr-modal-button hr-modal-save"
                id="hrRoomSaveButton"
              >
                <span
                  class="hr-button-spinner"
                  aria-hidden="true"
                ></span>

                <span id="hrRoomSaveLabel">Save Room</span>
              </button>
            </div>
          </footer>
        </form>
      </div>
    </section>
  `);

  return document.getElementById(MODAL_ID);
}

// ============================================================
// INITIALIZE ADD/EDIT ROOM MODAL
// ============================================================

export function initAddRoom() {
  if (activeController) {
    return activeController;
  }

  installStyles();

  const modal = createModalMarkup();

  const form = modal.querySelector("#hrRoomForm");
  const title = modal.querySelector("#hrRoomModalTitle");
  const description = modal.querySelector("#hrRoomModalDescription");
  const message = modal.querySelector("#hrRoomFormMessage");
  const saveButton = modal.querySelector("#hrRoomSaveButton");
  const saveLabel = modal.querySelector("#hrRoomSaveLabel");
  const roomNumberInput = modal.querySelector("#hrRoomNumber");
  const currencySymbol = modal.querySelector("#hrRoomCurrencySymbol");

  let editingId = null;
  let saving = false;
  let previousFocus = null;
  let openSequence = 0;

  // ----------------------------------------------------------
  // CLEAR VALIDATION ERRORS
  // ----------------------------------------------------------

  function clearErrors() {
    modal.querySelectorAll("[data-error-for]").forEach((element) => {
      element.textContent = "";
    });

    form.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
      element.removeAttribute("aria-invalid");
    });

    message.textContent = "";
    message.classList.remove("is-visible");
  }

  // ----------------------------------------------------------
  // DISPLAY GENERAL ERROR
  // ----------------------------------------------------------

  function showMessage(text) {
    message.textContent = text;
    message.classList.add("is-visible");
  }

  // ----------------------------------------------------------
  // FIELD VALIDATION ERRORS
  // ----------------------------------------------------------

  function showValidationErrors(errors = {}) {
    let firstInvalid = null;

    Object.entries(errors).forEach(([field, text]) => {
      const errorElement = modal.querySelector(
        `[data-error-for="${field}"]`
      );

      const input = form.elements.namedItem(field);

      if (errorElement) {
        errorElement.textContent = text;
      }

      if (input && typeof input.setAttribute === "function") {
        input.setAttribute("aria-invalid", "true");
        firstInvalid ||= input;
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();

      // Bring the invalid field into view on mobile.
      firstInvalid.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    } else {
      showMessage("Please correct the highlighted fields.");
    }
  }

  // ----------------------------------------------------------
  // SAVING STATE
  // ----------------------------------------------------------

  function setSaving(isSaving) {
    saving = isSaving;

    saveButton.disabled = isSaving;
    saveButton.classList.toggle("is-saving", isSaving);

    modal.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.disabled = isSaving;
    });

    saveLabel.textContent = isSaving
      ? "Saving..."
      : editingId
        ? "Save Changes"
        : "Save Room";
  }

  // ----------------------------------------------------------
  // RESET FORM
  // ----------------------------------------------------------

  function resetForm() {
    form.reset();
    clearErrors();

    form.elements.namedItem("status").value = "available";
    form.elements.namedItem("type").value = "";
    form.elements.namedItem("currentPrice").value = "";
  }

  // ----------------------------------------------------------
  // CLOSE MODAL
  // ----------------------------------------------------------

  function close() {
    if (saving) return;

    openSequence++;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    editingId = null;

    resetForm();

    // Reset overlay scroll for the next opening.
    modal.scrollTop = 0;

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  // ----------------------------------------------------------
  // OPEN MODAL
  // ----------------------------------------------------------

  async function open(roomId = null) {
    if (saving) return;

    const currentSequence = ++openSequence;

    previousFocus = document.activeElement;
    editingId = roomId || null;

    resetForm();
    applyModalBranding(modal);

    const settings = getSettingsSafely();

    currencySymbol.textContent = getCurrencySymbol(settings);

    title.textContent = editingId ? "Edit Room" : "Add New Room";

    description.textContent = editingId
      ? "Update the information for this property space."
      : "Register a new living room or storeroom.";

    saveLabel.textContent = editingId ? "Save Changes" : "Save Room";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    // Lock background scrolling while the modal is open.
    document.body.style.overflow = "hidden";

    // Start at the top each time.
    modal.scrollTop = 0;

    if (!editingId) {
      requestAnimationFrame(() => {
        if (
          currentSequence === openSequence &&
          modal.classList.contains("is-open")
        ) {
          roomNumberInput.focus({ preventScroll: true });
        }
      });

      return;
    }

    showMessage("Loading room details...");
    saveButton.disabled = true;

    try {
      const room = await getRoomById(editingId);

      if (
        currentSequence !== openSequence ||
        !modal.classList.contains("is-open")
      ) {
        return;
      }

      if (!room) {
        throw new Error("The requested room could not be found.");
      }

      // Support services returning an ID as either id or document ID.
      const returnedId = room.id || room.roomId || editingId;

      if (String(editingId) !== String(returnedId)) {
        throw new Error("The returned room does not match the requested room.");
      }

      form.elements.namedItem("roomNumber").value =
        room.roomNumber || "";

      form.elements.namedItem("type").value =
        room.type || "";

      form.elements.namedItem("size").value =
        room.size || "";

      form.elements.namedItem("location").value =
        room.location || "";

      form.elements.namedItem("currentPrice").value =
        room.currentPrice ?? "";

      form.elements.namedItem("status").value =
        room.status || "available";

      form.elements.namedItem("conditionNotes").value =
        room.conditionNotes || "";

      clearErrors();

      requestAnimationFrame(() => {
        roomNumberInput.focus({ preventScroll: true });
      });
    } catch (error) {
      if (currentSequence === openSequence) {
        showMessage(error.message || "Unable to load room details.");
      }
    } finally {
      if (
        currentSequence === openSequence &&
        modal.classList.contains("is-open")
      ) {
        saveButton.disabled = false;
      }
    }
  }

  // ----------------------------------------------------------
  // CLOSE BUTTONS
  // ----------------------------------------------------------

  modal.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", close);
  });

  // ----------------------------------------------------------
  // CLICKING THE BACKDROP
  // ----------------------------------------------------------

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });

  // ----------------------------------------------------------
  // ESCAPE KEY
  // ----------------------------------------------------------

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      modal.classList.contains("is-open")
    ) {
      close();
    }
  });

  // ----------------------------------------------------------
  // CLEAR FIELD ERRORS WHILE TYPING
  // ----------------------------------------------------------

  form.addEventListener("input", (event) => {
    const field = event.target.name;

    if (!field) return;

    const errorElement = modal.querySelector(
      `[data-error-for="${field}"]`
    );

    if (errorElement) {
      errorElement.textContent = "";
    }

    event.target.removeAttribute("aria-invalid");
  });

  // ----------------------------------------------------------
  // SAVE ROOM
  // ----------------------------------------------------------

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saving) return;

    clearErrors();

    const formData = new FormData(form);

    const roomNumber = String(
      formData.get("roomNumber") || ""
    ).trim();

    const type = String(
      formData.get("type") || ""
    ).trim();

    const priceValue = String(
      formData.get("currentPrice") ?? ""
    ).trim();

    const status = String(
      formData.get("status") || ""
    ).trim();

    // Basic client-side validation.
    const validationErrors = {};

    if (!roomNumber) {
      validationErrors.roomNumber = "Room number is required.";
    }

    if (!type) {
      validationErrors.type = "Please select a room type.";
    }

    if (
      priceValue === "" ||
      !Number.isFinite(Number(priceValue)) ||
      Number(priceValue) < 0
    ) {
      validationErrors.currentPrice =
        "Enter a valid rental price of zero or more.";
    }

    if (!status) {
      validationErrors.status = "Please select a room status.";
    }

    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }

    const roomData = {
      roomNumber,
      type,

      size: String(
        formData.get("size") || ""
      ).trim(),

      location: String(
        formData.get("location") || ""
      ).trim(),

      currentPrice: Number(priceValue),

      status,

      conditionNotes: String(
        formData.get("conditionNotes") || ""
      ).trim(),

      photoUrls: []
    };

    const wasEditing = Boolean(editingId);
    const roomIdBeingEdited = editingId;

    setSaving(true);

    try {
      const savedRoom = wasEditing
        ? await updateRoom(roomIdBeingEdited, roomData)
        : await createRoom(roomData);

      const roomForNotification = {
        ...roomData,
        ...(savedRoom || {}),
        id:
          savedRoom?.id ||
          savedRoom?.roomId ||
          roomIdBeingEdited ||
          undefined
      };

      // Notify the Rooms page and dashboard.
      window.dispatchEvent(
        new CustomEvent("homerent:rooms-changed", {
          detail: {
            action: wasEditing ? "updated" : "created",
            room: roomForNotification
          }
        })
      );

      setSaving(false);

      close();

      showSuccessToast(
        wasEditing
          ? "Room Updated Successfully"
          : "Room Saved Successfully",

        wasEditing
          ? `${roomForNotification.roomNumber} has been updated.`
          : `${roomForNotification.roomNumber} has been added to your rooms.`
      );
    } catch (error) {
      console.error("HomeRent: Unable to save room.", error);

      if (error?.validationErrors) {
        showValidationErrors(error.validationErrors);
      } else {
        showMessage(
          error?.message ||
          "Unable to save this room. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  });

  // ----------------------------------------------------------
  // PUBLIC CONTROLLER
  // ----------------------------------------------------------

  activeController = {
    open,
    close
  };

  return activeController;
}