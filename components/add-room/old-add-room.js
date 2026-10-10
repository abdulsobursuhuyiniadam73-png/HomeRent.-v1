// File: components/add-room/add-room.js
//
// HomeRent — Reusable Add/Edit Room Modal
// Works with the Dashboard and Rooms page.
//
// Public API:
// const addRoomController = initAddRoom();
// addRoomController.open();       // Add a room
// addRoomController.open(roomId); // Edit a room
// addRoomController.close();      // Close the modal

import  {applyGlobalBranding} from 
"../../js/core/branding.js" ;

import {
  createRoom,
  updateRoom,
  getRoomById
} from "../../js/rooms/rooms-service.js";

const STYLE_ID = "homerent-room-modal-styles";
const MODAL_ID = "homerent-room-modal";

let activeController = null;

// --------------------------------------------------
// MODAL STYLES
// Injected once so the component works on any page.
// --------------------------------------------------
function installStyles() {
  // Reuse the existing style element so updated CSS is applied.
  let style = document.getElementById(STYLE_ID);

  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.id = STYLE_ID;

  style.textContent = `
    #${MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(15, 23, 42, .58);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }

    #${MODAL_ID}.is-open {
      display: flex;
    }

    #${MODAL_ID} *,
    #${MODAL_ID} *::before,
    #${MODAL_ID} *::after {
      box-sizing: border-box;
    }

    #${MODAL_ID} .hr-modal-panel {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(100%, 650px);
      max-height: min(92dvh, 850px);
      overflow: hidden;
      background: #fff;
      color: #172033;
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, .25);
      animation: hrModalEnter .18s ease-out;
    }

    @keyframes hrModalEnter {
      from { opacity: 0; transform: translateY(12px) scale(.99); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

#homerent-room-modal .hr-modal-panel {
  width: min(100%, 760px);
  max-height: min(92dvh, 900px);
  border: 1px solid #dbe7f5;
  border-radius: 24px;
  box-shadow: 0 32px 90px rgba(15, 35, 70, .30);
}

#homerent-room-modal .hr-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 28px;
  border-bottom: 1px solid #dce8f5;
  background: linear-gradient(120deg, #eaf4ff 0%, #ffffff 85%);
}

#homerent-room-modal .hr-modal-brand {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

#homerent-room-modal .hr-modal-logo {
  display: block;
  flex: 0 0 68px;
  width: 68px;
  height: 68px;
  object-fit: contain;
  padding: 8px;
  border: 1px solid #d9e6f5;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(8, 70, 140, .12);
}

#homerent-room-modal .hr-modal-heading {
  min-width: 0;
}

#homerent-room-modal .hr-modal-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #087fdf;
  font-size: .7rem;
  font-weight: 800;
  letter-spacing: .14em;
}

#homerent-room-modal .hr-modal-heading h2 {
  margin: 0;
  color: #12213a;
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.25;
}

#homerent-room-modal .hr-modal-heading p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: .92rem;
  line-height: 1.5;
}

#homerent-room-modal .hr-modal-close {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fff1f2;
  color: #dc2626;
  font-size: 1.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: background .2s, color .2s, transform .2s;
}

#homerent-room-modal .hr-modal-close:hover {
  border-color: #b91c1c;
  background: #b91c1c;
  color: #ffffff;
  transform: rotate(90deg);
}

#homerent-room-modal .hr-modal-close:focus-visible {
  outline: 3px solid rgba(220, 38, 38, .25);
  outline-offset: 3px;
}

    #${MODAL_ID} .hr-modal-body {
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 22px 25px;
    }

    #${MODAL_ID} .hr-form-section-title {
      margin: 0 0 14px;
      color: #334155;
      font-size: .82rem;
      font-weight: 800;
      letter-spacing: .055em;
      text-transform: uppercase;
    }

    #${MODAL_ID} .hr-form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 17px 16px;
    }

    #${MODAL_ID} .hr-form-field {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 7px;
    }

    #${MODAL_ID} .hr-form-field.hr-full {
      grid-column: 1 / -1;
    }

    #${MODAL_ID} .hr-form-field label {
      color: #344054;
      font-size: .87rem;
      font-weight: 650;
    }

    #${MODAL_ID} .hr-form-field label .hr-required {
      color: #dc2626;
    }

    #${MODAL_ID} .hr-form-field input,
    #${MODAL_ID} .hr-form-field select,
    #${MODAL_ID} .hr-form-field textarea {
      display: block;
      width: 100%;
      min-width: 0;
      min-height: 46px;
      padding: 11px 12px;
      border: 1px solid #d7deea;
      border-radius: 11px;
      outline: none;
      background: #fff;
      color: #172033;
      font: inherit;
      font-size: .94rem;
      transition: border-color .15s, box-shadow .15s;
    }

    #${MODAL_ID} .hr-form-field textarea {
      min-height: 90px;
      resize: vertical;
    }

    #${MODAL_ID} .hr-form-field input:focus,
    #${MODAL_ID} .hr-form-field select:focus,
    #${MODAL_ID} .hr-form-field textarea:focus {
      border-color: #087fdf;
      box-shadow: 0 0 0 3px rgba(8, 127, 223, .12);
    }

    #${MODAL_ID} .hr-form-field [aria-invalid="true"] {
      border-color: #dc2626;
    }

    #${MODAL_ID} .hr-field-error {
      min-height: 0;
      color: #b91c1c;
      font-size: .78rem;
      line-height: 1.4;
    }

    #${MODAL_ID} .hr-field-error:empty {
      display: none;
    }

    #${MODAL_ID} .hr-form-hint {
      margin: 0;
      color: #7b8798;
      font-size: .78rem;
      line-height: 1.45;
    }

    #${MODAL_ID} .hr-modal-message {
      display: none;
      margin: 0 0 18px;
      padding: 12px 14px;
      border: 1px solid #fecaca;
      border-radius: 11px;
      background: #fef2f2;
      color: #991b1b;
      font-size: .88rem;
      line-height: 1.5;
    }

    #${MODAL_ID} .hr-modal-message.is-visible {
      display: block;
    }

    #${MODAL_ID} .hr-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 11px;
      padding: 17px 25px;
      border-top: 1px solid #e9edf3;
      background: #fff;
    }

    #${MODAL_ID} .hr-modal-button {
      display: inline-flex;
      min-height: 45px;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      border: 1px solid transparent;
      border-radius: 11px;
      font: inherit;
      font-size: .91rem;
      font-weight: 700;
      cursor: pointer;
      transition: background .15s, transform .15s;
    }

    #${MODAL_ID} .hr-modal-button:active {
      transform: scale(.98);
    }

    #${MODAL_ID} .hr-modal-button:disabled {
      cursor: wait;
      opacity: .65;
    }

    #${MODAL_ID} .hr-modal-cancel {
      border-color: #dbe2ea;
      background: #fff;
      color: #344054;
    }

    #${MODAL_ID} .hr-modal-cancel:hover {
      background: #f8fafc;
    }

    #${MODAL_ID} .hr-modal-save {
      background: var(--primary-color, #087fdf);
      color: #fff;
    }

    #${MODAL_ID} .hr-modal-save:hover {
      filter: brightness(.94);
    }

    #${MODAL_ID} .hr-modal-save .hr-button-spinner {
      display: none;
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255,255,255,.45);
      border-top-color: #fff;
      border-radius: 50%;
      animation: hrSpin .7s linear infinite;
    }

    #${MODAL_ID} .hr-modal-save.is-saving .hr-button-spinner {
      display: inline-block;
    }

    @keyframes hrSpin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 600px) {
      #${MODAL_ID} {
        align-items: flex-end;
        padding: 0;
      }

      #${MODAL_ID} .hr-modal-panel {
        width: 100%;
        max-height: 94dvh;
        border-radius: 22px 22px 0 0;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        animation: hrModalMobileEnter .2s ease-out;
      }

      @keyframes hrModalMobileEnter {
        from { transform: translateY(24px); }
        to { transform: translateY(0); }
      }

      #${MODAL_ID} .hr-modal-header {
        padding: 20px 18px 16px;
      }

      #${MODAL_ID} .hr-modal-body {
        padding: 20px 18px;
      }

      #${MODAL_ID} .hr-form-grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 15px;
      }

      #${MODAL_ID} .hr-form-field.hr-full {
        grid-column: auto;
      }

      #${MODAL_ID} .hr-modal-footer {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        padding: 13px 18px;
        padding-bottom: max(13px, env(safe-area-inset-bottom, 0px));
      }

      #${MODAL_ID} .hr-modal-button {
        width: 100%;
        padding: 11px 12px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${MODAL_ID} *,
      #${MODAL_ID} *::before,
      #${MODAL_ID} *::after {
        animation-duration: .01ms !important;
        transition-duration: .01ms !important;
      }
    }
  `;

  document.head.appendChild(style);
}

// --------------------------------------------------
// CREATE MODAL MARKUP
// --------------------------------------------------

function createModalMarkup() {
  const root = document.getElementById("roomModalRoot") || (() => {
    const element = document.createElement("div");
    element.id = "roomModalRoot";
    document.body.appendChild(element);
    return element;
  })();

  let modal = document.getElementById(MODAL_ID);

  if (modal) return modal;

  root.insertAdjacentHTML("beforeend", `
    <section
      id="${MODAL_ID}"
      role="presentation"
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
    <img
      data-system-logo
      src=""
      alt="Business logo"
      class="hr-modal-logo"
    >

    <div class="hr-modal-heading">
      <span class="hr-modal-eyebrow">PROPERTY MANAGEMENT</span>
      <h2 id="hrRoomModalTitle">Add a room</h2>
      <p id="hrRoomModalDescription">
        Enter the details for this property space.
      </p>
    </div>
  </div>

  <button
    type="button"
    class="hr-modal-close"
    data-modal-close
    aria-label="Close room form"
    title="Close"
  >
    &times;
  </button>
</header>

        <form id="hrRoomForm" novalidate>
          <div class="hr-modal-body">
            <div
              class="hr-modal-message"
              id="hrRoomFormMessage"
              role="alert"
              aria-live="assertive"
            ></div>

            <h3 class="hr-form-section-title">Room information</h3>

            <div class="hr-form-grid">
              <div class="hr-form-field">
                <label for="hrRoomNumber">
                  Room number <span class="hr-required">*</span>
                </label>
                <input
                  id="hrRoomNumber"
                  name="roomNumber"
                  type="text"
                  maxlength="50"
                  placeholder="e.g. ROOM-001"
                  autocomplete="off"
                  required
                >
                <small class="hr-field-error" data-error-for="roomNumber"></small>
              </div>

              <div class="hr-form-field">
                <label for="hrRoomType">
                  Room type <span class="hr-required">*</span>
                </label>
                <select id="hrRoomType" name="type" required>
                  <option value="">Select type</option>
                  <option value="living">Living room</option>
                  <option value="store">Storeroom</option>
                </select>
                <small class="hr-field-error" data-error-for="type"></small>
              </div>

              <div class="hr-form-field">
                <label for="hrRoomSize">Size</label>
                <input
                  id="hrRoomSize"
                  name="size"
                  type="text"
                  maxlength="100"
                  placeholder="e.g. 20 × 15 ft"
                >
                <small class="hr-field-error" data-error-for="size"></small>
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
                <small class="hr-field-error" data-error-for="location"></small>
              </div>

              <div class="hr-form-field">
                <label for="hrRoomPrice">
                  Rental price (₵) <span class="hr-required">*</span>
                </label>
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
                <small class="hr-form-hint">
                  Enter the rental price for the applicable rental period.
                </small>
                <small class="hr-field-error" data-error-for="currentPrice"></small>
              </div>

              <div class="hr-form-field">
                <label for="hrRoomStatus">
                  Status <span class="hr-required">*</span>
                </label>
                <select id="hrRoomStatus" name="status" required>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <small class="hr-field-error" data-error-for="status"></small>
              </div>

              <div class="hr-form-field hr-full">
                <label for="hrRoomCondition">Condition and notes</label>
                <textarea
                  id="hrRoomCondition"
                  name="conditionNotes"
                  maxlength="2000"
                  placeholder="Describe the room's condition or any important notes..."
                ></textarea>
                <small class="hr-field-error" data-error-for="conditionNotes"></small>
              </div>
            </div>
          </div>

          <footer class="hr-modal-footer">
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
              <span class="hr-button-spinner" aria-hidden="true"></span>
              <span id="hrRoomSaveLabel">Save room</span>
            </button>
          </footer>
        </form>
      </div>
    </section>
  `);

  modal = document.getElementById(MODAL_ID);
  return modal;
}

// --------------------------------------------------
// INITIALIZE COMPONENT
// --------------------------------------------------

export function initAddRoom() {
  if (activeController) {
    return activeController;
  }

  installStyles();

  const modal = createModalMarkup();

  // Apply the current business logo and system branding to
// the dynamically created modal.
try {
  applyGlobalBranding();
} catch (error) {
  console.error("HomeRent: Could not apply modal branding.", error);
}

  const form = modal.querySelector("#hrRoomForm");
  const title = modal.querySelector("#hrRoomModalTitle");
  const description = modal.querySelector("#hrRoomModalDescription");
  const message = modal.querySelector("#hrRoomFormMessage");
  const saveButton = modal.querySelector("#hrRoomSaveButton");
  const saveLabel = modal.querySelector("#hrRoomSaveLabel");
  const roomNumberInput = modal.querySelector("#hrRoomNumber");

  let editingId = null;
  let saving = false;
  let previousFocus = null;

  function clearErrors() {
    modal.querySelectorAll("[data-error-for]").forEach((element) => {
      element.textContent = "";
    });

    form.querySelectorAll("[aria-invalid='true']").forEach((element) => {
      element.removeAttribute("aria-invalid");
    });

    message.textContent = "";
    message.classList.remove("is-visible");
  }

  function showMessage(text) {
    message.textContent = text;
    message.classList.add("is-visible");
  }

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

    if (firstInvalid) firstInvalid.focus();
  }

  function setSaving(isSaving) {
    saving = isSaving;
    saveButton.disabled = isSaving;
    saveButton.classList.toggle("is-saving", isSaving);

    form.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.disabled = isSaving;
    });

    saveLabel.textContent = isSaving
      ? "Saving..."
      : editingId
        ? "Save changes"
        : "Save room";
  }

  function resetForm() {
    form.reset();
    clearErrors();

    // Defaults for a new room.
    form.elements.namedItem("status").value = "available";
    form.elements.namedItem("type").value = "";
    form.elements.namedItem("currentPrice").value = "";
  }

  function close() {
    if (saving) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    editingId = null;
    resetForm();

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  async function open(roomId = null) {
    if (saving) return;

    previousFocus = document.activeElement;
    editingId = roomId || null;

    resetForm();

    title.textContent = editingId ? "Edit room" : "Add a room";
    description.textContent = editingId
      ? "Update the details for this property space."
      : "Enter the details for this property space.";

    saveLabel.textContent = editingId ? "Save changes" : "Save room";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (!editingId) {
      roomNumberInput.focus();
      return;
    }

    // Show the modal immediately, then load the room.
    showMessage("Loading room details...");
    saveButton.disabled = true;

    try {
      const room = await getRoomById(editingId);

      // Ignore the response if the modal has since closed or changed.
      if (
        !modal.classList.contains("is-open") ||
        editingId !== room.id
      ) {
        return;
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
      roomNumberInput.focus();
    } catch (error) {
      showMessage(error.message || "Unable to load room details.");
    } finally {
      if (modal.classList.contains("is-open")) {
        saveButton.disabled = false;
      }
    }
  }

  // Close buttons
  modal.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", close);
  });

  // Clicking the backdrop closes the modal.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  // Escape closes the modal.
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      modal.classList.contains("is-open")
    ) {
      close();
    }
  });

  // Remove an individual field error when its value changes.
  form.addEventListener("input", (event) => {
    const field = event.target.name;

    if (!field) return;

    const errorElement = modal.querySelector(
      `[data-error-for="${field}"]`
    );

    if (errorElement) errorElement.textContent = "";

    event.target.removeAttribute("aria-invalid");

    if (!Object.values(
      Array.from(modal.querySelectorAll("[data-error-for]"))
        .map((element) => element.textContent)
    ).some(Boolean)) {
      message.textContent = "";
      message.classList.remove("is-visible");
    }
  });

  // Save a new room or update an existing room.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saving) return;

    clearErrors();

    const formData = new FormData(form);

    const roomData = {
      roomNumber: formData.get("roomNumber"),
      type: formData.get("type"),
      size: formData.get("size"),
      location: formData.get("location"),
      currentPrice: formData.get("currentPrice"),
      status: formData.get("status"),
      conditionNotes: formData.get("conditionNotes"),
      photoUrls: []
    };

    setSaving(true);

    try {
      const savedRoom = editingId
        ? await updateRoom(editingId, roomData)
        : await createRoom(roomData);

      // Notify the page so it can refresh its room list and summary.
     window.dispatchEvent(
        new CustomEvent("homerent:rooms-changed", {
          detail: {
            action: editingId ? "updated" : "created",
            room: savedRoom
          }
        })
      );

      setSaving(false);
      close();
    } catch (error) {
      if (error.validationErrors) {
        showValidationErrors(error.validationErrors);
      } else {
        showMessage(error.message || "Unable to save this room.");
      }
    } finally {
      setSaving(false);
    }
  });

  activeController = {
    open,
    close
  };

  return activeController;
}