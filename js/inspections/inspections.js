/* =========================================================
   HOMERENT — INSPECTIONS MODULE
   File: js/inspections/inspections.js

   Features:
   - Admin-only page protection
   - Global branding
   - Load rooms from Firestore
   - Create inspections linked to rooms
   - Search and filter inspection records
   - Live summary calculations on refresh
   - Follow-up status updates
   - View inspection details
   - Responsive sidebar navigation
   ========================================================= */

import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { db, auth } from "../firebase.js";
import { protectPage } from "../auth/auth-guard.js";
import { loadSettings } from "../core/settings-service.js";
import { applyGlobalBranding } from "../core/branding.js";


/* =========================================================
   1. CONSTANTS AND STATE
   ========================================================= */

const ROOMS_COLLECTION = "rooms";
const INSPECTIONS_COLLECTION = "inspections";

const $ = (id) => document.getElementById(id);

const state = {
  rooms: [],
  inspections: [],
  settings: {},
  loading: false
};


/* =========================================================
   2. STARTUP
   ========================================================= */

document.addEventListener("DOMContentLoaded", initInspections);

async function initInspections() {
  setupSidebar();
  setupPageEvents();
  protectPage();

  try {
    state.settings = (await loadSettings()) || {};
    await applyGlobalBranding();
  } catch (error) {
    console.error("HomeRent: Unable to load branding settings.", error);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      await refreshInspectionData();
    } catch (error) {
      console.error("HomeRent: Inspection startup failed.", error);
      showError(error);
    }
  });
}


/* =========================================================
   3. SIDEBAR
   ========================================================= */

function setupSidebar() {
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");

  // Support either ID used by existing HomeRent pages.
  const toggle =
    $("sidebarToggle") || $("mobileMenuButton");

  function openSidebar() {
    sidebar?.classList.add("open");
    overlay?.classList.add("active");
    toggle?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("active");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  toggle?.addEventListener("click", (event) => {
    event.preventDefault();

    if (sidebar?.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay?.addEventListener("click", closeSidebar);

  document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
      closeInspectionModal();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });
}


/* =========================================================
   4. PAGE EVENTS
   ========================================================= */

function setupPageEvents() {
  $("addInspectionButton")?.addEventListener(
    "click",
    openNewInspectionForm
  );

  $("emptyStateAddInspectionButton")?.addEventListener(
    "click",
    openNewInspectionForm
  );

  $("refreshInspectionsButton")?.addEventListener(
    "click",
    refreshInspectionData
  );

  $("retryInspectionsButton")?.addEventListener(
    "click",
    refreshInspectionData
  );

  $("inspectionSearch")?.addEventListener(
    "input",
    renderInspectionTable
  );

  $("inspectionTypeFilter")?.addEventListener(
    "change",
    renderInspectionTable
  );

  $("inspectionStatusFilter")?.addEventListener(
    "change",
    renderInspectionTable
  );

  $("clearInspectionFiltersButton")?.addEventListener(
    "click",
    clearFilters
  );

  $("inspectionTableBody")?.addEventListener(
    "click",
    handleTableAction
  );

  $("inspectionModalRoot")?.addEventListener(
    "click",
    handleModalClick
  );

  $("inspectionModalRoot")?.addEventListener(
    "submit",
    handleModalSubmit
  );
}


/* =========================================================
   5. LOAD DATA
   ========================================================= */

async function refreshInspectionData() {
  if (state.loading) return;

  state.loading = true;
  showLoading();

  const refreshButton = $("refreshInspectionsButton");

  if (refreshButton) {
    refreshButton.disabled = true;
  }

  try {
    const [roomsSnapshot, inspectionsSnapshot] = await Promise.all([
      getDocs(collection(db, ROOMS_COLLECTION)),
      getDocs(collection(db, INSPECTIONS_COLLECTION))
    ]);

    state.rooms = roomsSnapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data()
      }))
      .filter((room) => room.isArchived !== true)
      .sort((a, b) =>
        String(a.roomNumber || "").localeCompare(
          String(b.roomNumber || ""),
          undefined,
          { numeric: true, sensitivity: "base" }
        )
      );

    state.inspections = inspectionsSnapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data()
      }))
      .sort((a, b) =>
        getDateValue(b.inspectionDate) -
        getDateValue(a.inspectionDate)
      );

    updateSummary();
    renderInspectionTable();
    hideError();
  } catch (error) {
    console.error("HomeRent: Failed to load inspections.", error);
    showError(error);
  } finally {
    state.loading = false;

    if (refreshButton) {
      refreshButton.disabled = false;
    }
  }
}


/* =========================================================
   6. SUMMARY COUNTS
   ========================================================= */

function updateSummary() {
  const inspections = state.inspections;

  const pending = inspections.filter((item) =>
    normalizeStatus(item.followUpStatus) === "pending" ||
    normalizeStatus(item.followUpStatus) === "in_progress"
  ).length;

  const issues = inspections.reduce((total, item) => {
    return total + countIssues(item);
  }, 0);

  const resolved = inspections.filter((item) =>
    normalizeStatus(item.followUpStatus) === "resolved"
  ).length;

  setText("totalInspections", inspections.length);
  setText("pendingInspections", pending);
  setText("inspectionIssues", issues);
  setText("resolvedInspections", resolved);
}

function countIssues(inspection) {
  if (Array.isArray(inspection.issues)) {
    return inspection.issues.filter(Boolean).length;
  }

  if (typeof inspection.issuesCount === "number") {
    return inspection.issuesCount;
  }

  return inspection.hasIssues === true ? 1 : 0;
}


/* =========================================================
   7. SEARCH AND FILTER
   ========================================================= */

function getFilteredInspections() {
  const search = ($("inspectionSearch")?.value || "")
    .trim()
    .toLocaleLowerCase();

  const roomType = $("inspectionTypeFilter")?.value || "";
  const followUpStatus = $("inspectionStatusFilter")?.value || "";

  return state.inspections.filter((inspection) => {
    const room = state.rooms.find(
      (item) => item.id === inspection.roomId
    );

    const roomNumber =
      inspection.roomNumber ||
      room?.roomNumber ||
      "Unknown room";

    const searchableText = [
      inspection.inspectionNumber,
      roomNumber,
      inspection.notes,
      inspection.defects,
      inspection.inspectorName,
      ...(Array.isArray(inspection.issues) ? inspection.issues : [])
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

    const matchesSearch =
      !search || searchableText.includes(search);

    const matchesType =
      !roomType || inspection.roomType === roomType;

    const matchesStatus =
      !followUpStatus ||
      normalizeStatus(inspection.followUpStatus) === followUpStatus;

    return matchesSearch && matchesType && matchesStatus;
  });
}

function clearFilters() {
  if ($("inspectionSearch")) {
    $("inspectionSearch").value = "";
  }

  if ($("inspectionTypeFilter")) {
    $("inspectionTypeFilter").value = "";
  }

  if ($("inspectionStatusFilter")) {
    $("inspectionStatusFilter").value = "";
  }

  renderInspectionTable();
}


/* =========================================================
   8. RENDER TABLE
   ========================================================= */

function renderInspectionTable() {
  const tbody = $("inspectionTableBody");
  if (!tbody) return;

  const filtered = getFilteredInspections();

  tbody.replaceChildren();

  const hasInspections = state.inspections.length > 0;
  const hasResults = filtered.length > 0;

  $("inspectionLoading").hidden = true;
  $("inspectionEmpty").hidden = true;
  $("inspectionNoResults").hidden = true;
  $("inspectionTableContainer").hidden = true;
  $("inspectionTableFooter").hidden = true;

  if (!hasInspections) {
    $("inspectionEmpty").hidden = false;
    return;
  }

  if (!hasResults) {
    $("inspectionNoResults").hidden = false;
    return;
  }

  const fragment = document.createDocumentFragment();

  filtered.forEach((inspection) => {
    const room = state.rooms.find(
      (item) => item.id === inspection.roomId
    );

    const roomNumber =
      inspection.roomNumber ||
      room?.roomNumber ||
      "Room unavailable";

    const roomType =
      inspection.roomType ||
      room?.type ||
      "";

    const tr = document.createElement("tr");

    appendCell(
      tr,
      inspection.inspectionNumber || shortId(inspection.id)
    );

    const roomCell = document.createElement("td");
    const roomName = document.createElement("strong");
    roomName.textContent = roomNumber;
    roomCell.appendChild(roomName);

    if (roomType) {
      const typeLabel = document.createElement("div");
      typeLabel.className = "muted-text";
      typeLabel.textContent = formatRoomType(roomType);
      roomCell.appendChild(typeLabel);
    }

    tr.appendChild(roomCell);

    appendCell(
      tr,
      formatDate(inspection.inspectionDate)
    );

    const conditionCell = document.createElement("td");
    const condition = document.createElement("span");
    condition.className =
      "status-badge " + getConditionClass(inspection.condition);
    condition.textContent = formatCondition(inspection.condition);
    conditionCell.appendChild(condition);
    tr.appendChild(conditionCell);

    appendCell(tr, countIssues(inspection));

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className =
      "status-badge " +
      normalizeStatus(inspection.followUpStatus);
    status.textContent =
      formatFollowUpStatus(inspection.followUpStatus);
    statusCell.appendChild(status);
    tr.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "table-actions";

    actions.appendChild(createActionButton(
      "view",
      inspection.id,
      "View inspection",
      "fa-eye"
    ));

    if (
      normalizeStatus(inspection.followUpStatus) !== "resolved"
    ) {
      actions.appendChild(createActionButton(
        "resolve",
        inspection.id,
        "Mark resolved",
        "fa-check"
      ));
    }

    actionsCell.appendChild(actions);
    tr.appendChild(actionsCell);

    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);

  $("inspectionTableContainer").hidden = false;
  $("inspectionTableFooter").hidden = false;

  setText(
    "inspectionResultCount",
    `${filtered.length} inspection${filtered.length === 1 ? "" : "s"}`
  );
}

function appendCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";
  row.appendChild(cell);
}

function createActionButton(action, id, label, icon) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "table-action-button";
  button.dataset.action = action;
  button.dataset.id = id;
  button.title = label;
  button.setAttribute("aria-label", label);

  const iconElement = document.createElement("i");
  iconElement.className = `fa-solid ${icon}`;
  iconElement.setAttribute("aria-hidden", "true");

  button.appendChild(iconElement);
  return button;
}


/* =========================================================
   9. NEW INSPECTION FORM
   ========================================================= */

function openNewInspectionForm() {
  if (state.rooms.length === 0) {
    showNotice(
      "No available rooms",
      "Add a room on the Rooms page before recording an inspection."
    );
    return;
  }

  const roomOptions = state.rooms.map((room) => {
    const number = escapeHTML(room.roomNumber || room.id);
    const type = escapeHTML(formatRoomType(room.type));
    const status = escapeHTML(room.status || "unknown");

    return `
      <option value="${escapeHTML(room.id)}">
        ${number} — ${type} (${status})
      </option>
    `;
  }).join("");

  $("inspectionModalRoot").innerHTML = `
    <div class="inspection-modal-backdrop" data-modal-close>
      <section
        class="inspection-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspectionModalTitle"
      >
        <header class="inspection-modal-header">
          <div>
            <h2 id="inspectionModalTitle">New Inspection</h2>
            <p>Record a room's condition and any issues found.</p>
          </div>

          <button
            type="button"
            class="table-action-button"
            data-modal-close
            aria-label="Close form"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <form id="newInspectionForm">
          <div class="inspection-modal-body">

            <div class="form-field">
              <label for="inspectionRoom">Room or storeroom *</label>
              <select id="inspectionRoom" name="roomId" required>
                <option value="">Select a room</option>
                ${roomOptions}
              </select>
            </div>

            <div class="form-grid">
              <div class="form-field">
                <label for="inspectionDateInput">Inspection date *</label>
                <input
                  type="date"
                  id="inspectionDateInput"
                  name="inspectionDate"
                  required
                  value="${getLocalDateInputValue()}"
                >
              </div>

              <div class="form-field">
                <label for="inspectorName">Inspector name *</label>
                <input
                  type="text"
                  id="inspectorName"
                  name="inspectorName"
                  maxlength="100"
                  required
                  placeholder="Name of inspector"
                >
              </div>
            </div>

            <div class="form-field">
              <label for="inspectionCondition">Overall condition *</label>
              <select
                id="inspectionCondition"
                name="condition"
                required
              >
                <option value="good">Good</option>
                <option value="fair">Fair — minor issues</option>
                <option value="poor">Poor — repairs needed</option>
                <option value="critical">Critical — urgent attention</option>
              </select>
            </div>

            <div class="form-field">
              <label for="inspectionAreas">Areas checked</label>
              <div class="inspection-checklist">
                ${[
                  "Walls and ceiling",
                  "Floor",
                  "Doors and locks",
                  "Windows",
                  "Electrical fittings",
                  "Water and plumbing",
                  "Roof and drainage",
                  "General cleanliness"
                ].map((area, index) => `
                  <label class="inspection-check-option">
                    <input
                      type="checkbox"
                      name="areasChecked"
                      value="${escapeHTML(area)}"
                      ${index < 4 ? "checked" : ""}
                    >
                    <span>${escapeHTML(area)}</span>
                  </label>
                `).join("")}
              </div>
            </div>

            <div class="form-field">
              <label for="inspectionDefects">
                Issues or defects found
              </label>
              <textarea
                id="inspectionDefects"
                name="defects"
                rows="3"
                maxlength="3000"
                placeholder="Describe damage, faults, or maintenance needs..."
              ></textarea>
            </div>

            <div class="form-field">
              <label for="inspectionNotes">Inspector notes</label>
              <textarea
                id="inspectionNotes"
                name="notes"
                rows="3"
                maxlength="3000"
                placeholder="Additional observations..."
              ></textarea>
            </div>

            <div class="form-field">
              <label for="inspectionFollowUp">Follow-up status *</label>
              <select
                id="inspectionFollowUp"
                name="followUpStatus"
                required
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved — no action outstanding</option>
              </select>
              <small>
                Use Resolved only when no outstanding issue requires attention.
              </small>
            </div>

            <div class="form-field">
              <label for="inspectionFollowUpNotes">
                Follow-up action
              </label>
              <textarea
                id="inspectionFollowUpNotes"
                name="followUpNotes"
                rows="2"
                maxlength="2000"
                placeholder="What needs to be done, if anything?"
              ></textarea>
            </div>

            <p class="inspection-form-error" id="inspectionFormError" hidden></p>
          </div>

          <footer class="inspection-modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-modal-close
            >
              Cancel
            </button>

            <button type="submit" class="btn btn-primary" id="saveInspectionButton">
              <i class="fa-solid fa-floppy-disk"></i>
              Save Inspection
            </button>
          </footer>
        </form>
      </section>
    </div>
  `;

  document.body.style.overflow = "hidden";

  $("inspectionRoom")?.focus();
}


/* =========================================================
   10. MODAL ACTIONS
   ========================================================= */

function handleModalClick(event) {
  if (event.target.matches("[data-modal-close]")) {
    closeInspectionModal();
  }
}

function closeInspectionModal() {
  const root = $("inspectionModalRoot");
  if (!root) return;

  root.replaceChildren();
  document.body.style.overflow = "";
}


/* =========================================================
   11. SAVE NEW INSPECTION
   ========================================================= */

async function handleModalSubmit(event) {
  if (event.target.id !== "newInspectionForm") return;

  event.preventDefault();

  const form = event.target;
  const submitButton = $("saveInspectionButton");
  const errorElement = $("inspectionFormError");

  errorElement.hidden = true;

  const formData = new FormData(form);

  const roomId = String(formData.get("roomId") || "");
  const room = state.rooms.find((item) => item.id === roomId);

  if (!room) {
    showFormError("Select a valid room before saving.");
    return;
  }

  const inspectionDate = String(
    formData.get("inspectionDate") || ""
  );

  const inspectorName = String(
    formData.get("inspectorName") || ""
  ).trim();

  if (!inspectionDate || !inspectorName) {
    showFormError("Enter the inspection date and inspector name.");
    return;
  }

  const condition = String(
    formData.get("condition") || "good"
  );

  const defects = String(
    formData.get("defects") || ""
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  const followUpNotes = String(
    formData.get("followUpNotes") || ""
  ).trim();

  const followUpStatus = String(
    formData.get("followUpStatus") || "pending"
  );

  const areasChecked = formData
    .getAll("areasChecked")
    .map((value) => String(value));

  const issues = defects
    ? defects
        .split(/\n|;/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const hasIssues =
    issues.length > 0 ||
    condition === "poor" ||
    condition === "critical";

  if (
    hasIssues &&
    followUpStatus === "resolved" &&
    followUpNotes.trim() === ""
  ) {
    const confirmed = window.confirm(
      "This inspection records issues but is marked Resolved. " +
      "Continue only if the issues have already been addressed."
    );

    if (!confirmed) return;
  }

  submitButton.disabled = true;
  submitButton.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  try {
    const inspectionNumber =
      "INSP-" +
      new Date().getFullYear() +
      "-" +
      crypto.randomUUID().slice(0, 8).toUpperCase();

    const record = {
      inspectionNumber,
      roomId: room.id,
      roomNumber: String(room.roomNumber || ""),
      roomType: String(room.type || ""),
      inspectionDate,
      inspectorName,
      condition,
      areasChecked,
      defects,
      issues,
      notes,
      hasIssues,
      issuesCount: issues.length,
      followUpStatus,
      followUpNotes,
      createdBy: auth.currentUser?.uid || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(
      collection(db, INSPECTIONS_COLLECTION),
      record
    );

    closeInspectionModal();
    await refreshInspectionData();

    showNotice(
      "Inspection saved",
      `${inspectionNumber} was recorded successfully.`
    );
  } catch (error) {
    console.error("HomeRent: Unable to save inspection.", error);

    showFormError(
      getFriendlyError(error)
    );

    submitButton.disabled = false;
    submitButton.innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> Save Inspection';
  }
}

function showFormError(message) {
  const element = $("inspectionFormError");
  if (!element) return;

  element.textContent = message;
  element.hidden = false;
}


/* =========================================================
   12. VIEW INSPECTION DETAILS
   ========================================================= */

function handleTableAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "view") {
    viewInspection(id);
  }

  if (action === "resolve") {
    resolveInspection(id);
  }
}

function viewInspection(id) {
  const inspection = state.inspections.find(
    (item) => item.id === id
  );

  if (!inspection) return;

  const room = state.rooms.find(
    (item) => item.id === inspection.roomId
  );

  const roomNumber =
    inspection.roomNumber ||
    room?.roomNumber ||
    "Room unavailable";

  const areas = Array.isArray(inspection.areasChecked)
    ? inspection.areasChecked
    : [];

  const issues = Array.isArray(inspection.issues)
    ? inspection.issues
    : [];

  $("inspectionModalRoot").innerHTML = `
    <div class="inspection-modal-backdrop" data-modal-close>
      <section
        class="inspection-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspectionDetailsTitle"
      >
        <header class="inspection-modal-header">
          <div>
            <h2 id="inspectionDetailsTitle">Inspection Details</h2>
            <p>${escapeHTML(inspection.inspectionNumber || shortId(inspection.id))}</p>
          </div>

          <button
            type="button"
            class="table-action-button"
            data-modal-close
            aria-label="Close details"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div class="inspection-modal-body inspection-details-body">
          ${detailRow("Room", roomNumber)}
          ${detailRow("Room type", formatRoomType(inspection.roomType || room?.type))}
          ${detailRow("Inspection date", formatDate(inspection.inspectionDate))}
          ${detailRow("Inspector", inspection.inspectorName || "—")}
          ${detailRow("Condition", formatCondition(inspection.condition))}
          ${detailRow("Follow-up status", formatFollowUpStatus(inspection.followUpStatus))}

          <div class="inspection-detail-section">
            <h3>Areas checked</h3>
            <p>${areas.length ? escapeHTML(areas.join(", ")) : "No areas recorded."}</p>
          </div>

          <div class="inspection-detail-section">
            <h3>Issues or defects</h3>
            <p>${escapeHTML(inspection.defects || "No defect description recorded.")}</p>
          </div>

          <div class="inspection-detail-section">
            <h3>Inspector notes</h3>
            <p>${escapeHTML(inspection.notes || "No additional notes.")}</p>
          </div>

          <div class="inspection-detail-section">
            <h3>Follow-up action</h3>
            <p>${escapeHTML(inspection.followUpNotes || "No follow-up action recorded.")}</p>
          </div>
        </div>

        <footer class="inspection-modal-footer">
          <button type="button" class="btn btn-secondary" data-modal-close>
            Close
          </button>

          ${
            normalizeStatus(inspection.followUpStatus) !== "resolved"
              ? `<button
                  type="button"
                  class="btn btn-primary"
                  data-resolve-from-details="${escapeHTML(inspection.id)}"
                >
                  <i class="fa-solid fa-check"></i>
                  Mark Resolved
                </button>`
              : ""
          }
        </footer>
      </section>
    </div>
  `;

  const resolveButton = $("inspectionModalRoot")
    ?.querySelector("[data-resolve-from-details]");

  resolveButton?.addEventListener("click", () => {
    closeInspectionModal();
    resolveInspection(inspection.id);
  });

  document.body.style.overflow = "hidden";
}

function detailRow(label, value) {
  return `
    <div class="inspection-detail-row">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value || "—")}</strong>
    </div>
  `;
}


/* =========================================================
   13. RESOLVE FOLLOW-UP
   ========================================================= */

async function resolveInspection(id) {
  const inspection = state.inspections.find(
    (item) => item.id === id
  );

  if (!inspection) return;

  const confirmed = window.confirm(
    `Mark inspection ${inspection.inspectionNumber || shortId(id)} as resolved?`
  );

  if (!confirmed) return;

  try {
    await updateDoc(
      doc(db, INSPECTIONS_COLLECTION, id),
      {
        followUpStatus: "resolved",
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    await refreshInspectionData();

    showNotice(
      "Follow-up resolved",
      "The inspection record has been updated."
    );
  } catch (error) {
    console.error("HomeRent: Unable to resolve inspection.", error);

    showNotice(
      "Update failed",
      getFriendlyError(error)
    );
  }
}


/* =========================================================
   14. LOADING AND ERROR STATES
   ========================================================= */

function showLoading() {
  $("inspectionLoading").hidden = false;
  $("inspectionError").hidden = true;
  $("inspectionEmpty").hidden = true;
  $("inspectionNoResults").hidden = true;
  $("inspectionTableContainer").hidden = true;
  $("inspectionTableFooter").hidden = true;
}

function showError(error) {
  $("inspectionLoading").hidden = true;
  $("inspectionError").hidden = false;
  $("inspectionEmpty").hidden = true;
  $("inspectionNoResults").hidden = true;
  $("inspectionTableContainer").hidden = true;
  $("inspectionTableFooter").hidden = true;

  setText(
    "inspectionErrorMessage",
    getFriendlyError(error)
  );
}

function hideError() {
  $("inspectionError").hidden = true;
}


/* =========================================================
   15. NOTICES
   ========================================================= */

function showNotice(title, message) {
  // Use an existing HomeRent toast system if one is added later.
  // This fallback is intentionally simple and reliable.
  window.alert(`${title}\n\n${message}`);
}


/* =========================================================
   16. FORMATTING AND UTILITIES
   ========================================================= */

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = String(value);
}

function normalizeStatus(status) {
  const value = String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (value === "inprogress") return "in_progress";
  if (value === "complete" || value === "completed") return "resolved";

  return ["pending", "in_progress", "resolved"].includes(value)
    ? value
    : "pending";
}

function formatFollowUpStatus(status) {
  const value = normalizeStatus(status);

  return {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved"
  }[value];
}

function formatCondition(condition) {
  const value = String(condition || "not_recorded").toLowerCase();

  return {
    good: "Good",
    fair: "Fair",
    poor: "Poor",
    critical: "Critical",
    not_recorded: "Not recorded"
  }[value] || value.replace(/_/g, " ");
}

function getConditionClass(condition) {
  const value = String(condition || "").toLowerCase();

  if (value === "good") return "resolved";
  if (value === "fair") return "pending";
  if (value === "poor" || value === "critical") return "critical";

  return "pending";
}

function formatRoomType(type) {
  const value = String(type || "").toLowerCase();

  if (value === "living") return "Living room";
  if (value === "store") return "Storeroom";

  return type ? String(type) : "Room";
}

function getDateValue(value) {
  if (!value) return 0;

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (value?.toDate) {
    return value.toDate().getTime();
  }

  return 0;
}

function formatDate(value) {
  if (!value) return "—";

  let date;

  if (typeof value === "string") {
    date = new Date(`${value}T00:00:00`);
  } else if (value?.toDate) {
    date = value.toDate();
  } else {
    return "—";
  }

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getLocalDateInputValue() {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
}

function shortId(id) {
  return `INSP-${String(id).slice(0, 8).toUpperCase()}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getFriendlyError(error) {
  if (error?.code === "permission-denied") {
    return (
      "Firestore denied this request. Check the Firestore security rules " +
      "for the inspections collection and confirm the administrator is signed in."
    );
  }

  if (error?.code === "unavailable") {
    return "The service is temporarily unavailable. Check your connection and try again.";
  }

  return error?.message ||
    "Something went wrong. Please try again.";
}