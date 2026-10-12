/*
 * HomeRent — Clients Management Controller
 * File: js/clients/clients.js
 *
 * Uses:
 *   ../firebase.js
 *   ../core/branding.js
 *   ../core/settings.js
 *   ./clients-service.js
 *
 * Does not create a second branding system.
 * Does not delete client records.
 */

import { auth, db } from "../firebase.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  getClients,
  addClient,
  updateClient,
  archiveClient,
  restoreClient
} from "./clients-service.js";

import { applyGlobalBranding } from "../core/branding.js";
import { getSettings } from "../core/settings.js";

/* =====================================================
   CONFIGURATION — CHANGE HERE IF REQUIRED
   ===================================================== */

const CLIENTS_PER_PAGE = 8;
const LOGIN_PAGE = "../login.html";
const PROFILE_PAGE = "details.html";

/* =====================================================
   PAGE STATE
   ===================================================== */

let clients = [];
let filteredClients = [];
let currentPage = 1;
let currentFilter = "all";
let editingClientId = null;
let settings = {};
let isInitialized = false;

/* =====================================================
   DOM HELPERS
   ===================================================== */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "—";

  let date;

  if (typeof value.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "—";

  const dateFormat = settings.dateFormat || "dd/MM/yyyy";

  // Display a readable date while respecting the configured locale.
  if (dateFormat === "MM/dd/yyyy") {
    return new Intl.DateTimeFormat("en-US").format(date);
  }

  return new Intl.DateTimeFormat("en-GB").format(date);
}

function showToast(message, type = "success") {
  let toast = $("#clientsToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "clientsToast";
    toast.className = "clients-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type;
  toast.hidden = false;

  // No timer is required; the next message replaces this one.
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = escapeHTML(loadingText);
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

function errorMessage(error) {
  if (error?.code === "permission-denied") {
    return "Access denied. Check your administrator login and Firestore rules.";
  }

  if (error?.code === "unavailable") {
    return "Firebase is temporarily unavailable. Check your internet connection.";
  }

  return error?.message || "An unexpected error occurred. Please try again.";
}

/* =====================================================
   AUTHENTICATION AND INITIALIZATION
   ===================================================== */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace(LOGIN_PAGE);
    return;
  }

  if (isInitialized) return;

  try {
    showLoading(true);
    hideError();

    // Existing global branding remains the single source of branding.
    settings = (await getSettings()) || {};
    await applyGlobalBranding();

    // Verify that the current signed-in user can read client records.
    // Firestore rules remain the actual security boundary.
    await getDocs(
      query(
        collection(db, "clients"),
        orderBy("createdAt", "desc")
      )
    );

    initializeControls();
    initializeNavigation();

    await loadClients();

    isInitialized = true;
  } catch (error) {
    console.error("Clients page initialization failed:", error);
    showError(errorMessage(error));
  } finally {
    showLoading(false);
  }
});

/* =====================================================
   LOAD CLIENT RECORDS
   ===================================================== */

async function loadClients() {
  showLoading(true);
  hideError();

  try {
    // Includes archived and legacy records so summary counts are accurate.
    clients = await getClients(true);

    // Compatibility with older records.
    clients = clients.map((client) => ({
      ...client,
      fullName:
        client.fullName ||
        [client.firstName, client.otherNames, client.lastName]
          .filter(Boolean)
          .join(" ") ||
        "Unnamed client",
      isArchived: client.isArchived === true,
      clientType: client.clientType || "prospective",
      status: client.status || "active"
    }));

    updateSummary();
    applyFilters();
  } catch (error) {
    console.error("Unable to load clients:", error);
    showError(errorMessage(error));
  } finally {
    showLoading(false);
  }
}

/* =====================================================
   SUMMARY CARDS
   ===================================================== */

function updateSummary() {
  const visibleClients = clients.filter((client) => !client.isArchived);

  setText("totalClients", clients.length);
  setText(
    "activeClients",
    visibleClients.filter((client) => client.status === "active").length
  );
  setText(
    "prospectiveClients",
    visibleClients.filter((client) => client.clientType === "prospective").length
  );
  setText(
    "archivedClients",
    clients.filter((client) => client.isArchived).length
  );

  setText(
    "allClientsCount",
    clients.filter((client) => !client.isArchived).length
  );
}

/* =====================================================
   SEARCH, FILTERS, SORTING AND PAGINATION
   ===================================================== */

function applyFilters() {
  const search = ($("#clientSearch")?.value || "")
    .trim()
    .toLowerCase();

  const sort = $("#clientSort")?.value || "name-asc";

  filteredClients = clients.filter((client) => {
    const archived = client.isArchived;
    const matchesSearch = [
      client.clientId,
      client.fullName,
      client.firstName,
      client.lastName,
      client.otherNames,
      client.phone,
      client.alternativePhone,
      client.email
    ].some((value) =>
      String(value || "").toLowerCase().includes(search)
    );

    if (!matchesSearch) return false;

    switch (currentFilter) {
      case "active":
        return !archived && client.status === "active";

      case "prospective":
        return !archived && client.clientType === "prospective";

      case "inactive":
        return !archived && client.status === "inactive";

      case "archived":
        return archived;

      default:
        return !archived;
    }
  });

  filteredClients.sort((a, b) => {
    const nameA = a.fullName.toLowerCase();
    const nameB = b.fullName.toLowerCase();

    const dateA = a.createdAt?.toMillis?.() ?? 0;
    const dateB = b.createdAt?.toMillis?.() ?? 0;

    switch (sort) {
      case "name-desc":
        return nameB.localeCompare(nameA);

      case "recent":
        return dateB - dateA;

      case "oldest":
        return dateA - dateB;

      default:
        return nameA.localeCompare(nameB);
    }
  });

  currentPage = 1;
  renderClients();
}

function getCurrentPageClients() {
  const start = (currentPage - 1) * CLIENTS_PER_PAGE;

  return filteredClients.slice(start, start + CLIENTS_PER_PAGE);
}

function renderClients() {
  const pageClients = getCurrentPageClients();
  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / CLIENTS_PER_PAGE)
  );

  const hasClients = pageClients.length > 0;

  const tableWrapper = $("#clientsTableWrapper");
  const cardsList = $("#clientCardsList");
  const emptyState = $("#clientsEmpty");
  const pagination = $("#clientsPagination");

  if (tableWrapper) tableWrapper.hidden = !hasClients;
  if (cardsList) cardsList.hidden = !hasClients;
  if (emptyState) emptyState.hidden = hasClients;
  if (pagination) {
    pagination.hidden = !hasClients || filteredClients.length <= CLIENTS_PER_PAGE;
  }

  const tableBody = $("#clientsTableBody");

  if (tableBody) {
    tableBody.innerHTML = pageClients.map(renderTableRow).join("");
  }

  if (cardsList) {
    cardsList.innerHTML = pageClients.map(renderClientCard).join("");
  }

  setText(
    "clientsResultsText",
    filteredClients.length === 0
      ? "No matching client records."
      : `Showing ${(currentPage - 1) * CLIENTS_PER_PAGE + 1}–${Math.min(
          currentPage * CLIENTS_PER_PAGE,
          filteredClients.length
        )} of ${filteredClients.length} client(s).`
  );

  setText("clientsPageInfo", `Page ${currentPage} of ${totalPages}`);

  const previousButton = $("#previousClientsPage");
  const nextButton = $("#nextClientsPage");

  if (previousButton) previousButton.disabled = currentPage <= 1;
  if (nextButton) nextButton.disabled = currentPage >= totalPages;

  if (!hasClients) {
    const isSearching = Boolean($("#clientSearch")?.value.trim());
    const isArchived = currentFilter === "archived";

    setText(
      "clientsEmptyTitle",
      isSearching
        ? "No matching clients"
        : isArchived
          ? "No archived clients"
          : "No clients yet"
    );

    setText(
      "clientsEmptyMessage",
      isSearching
        ? "Try another name, client ID, phone number or email."
        : "Add a client to begin building your client records."
    );
  }

  $$("#clientFilters [data-filter]").forEach((button) => {
    const active = button.dataset.filter === currentFilter;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

/* =====================================================
   CLIENT ROW AND CARD RENDERING
   ===================================================== */

function clientStatus(client) {
  if (client.isArchived) return "Archived";

  return client.status === "inactive" ? "Inactive" : "Active";
}

function profileUrl(client) {
  // Use the Firestore document ID, never the display client ID.
  return `${PROFILE_PAGE}?id=${encodeURIComponent(client.id)}`;
}

function renderTableRow(client) {
  const archived = client.isArchived;

  return `
    <tr data-client-id="${escapeHTML(client.id)}">
      <td>
        <div class="client-table-name">
          <strong>${escapeHTML(client.fullName)}</strong>
          <small>${escapeHTML(client.email || "No email provided")}</small>
        </div>
      </td>

      <td>${escapeHTML(client.clientId || "—")}</td>

      <td>
        <span>${escapeHTML(client.phone || "No phone")}</span>
        ${
          client.alternativePhone
            ? `<small>${escapeHTML(client.alternativePhone)}</small>`
            : ""
        }
      </td>

      <td>
        <span class="client-room-placeholder">Not assigned</span>
      </td>

      <td>
        <span class="client-status-badge status-${archived ? "archived" : escapeHTML(client.status)}">
          ${escapeHTML(clientStatus(client))}
        </span>
      </td>

      <td>${escapeHTML(formatDate(client.createdAt))}</td>

      <td>
        <div class="client-row-actions">
          <a
            class="client-action-button view-profile-button"
            href="${escapeHTML(profileUrl(client))}"
            aria-label="View profile for ${escapeHTML(client.fullName)}"
          >
            View Profile
          </a>

          ${
            archived
              ? `<button type="button" class="client-action-button" data-action="restore" data-id="${escapeHTML(client.id)}">Restore</button>`
              : `
                <button type="button" class="client-action-button" data-action="edit" data-id="${escapeHTML(client.id)}">Edit</button>
                <button type="button" class="client-action-button danger" data-action="archive" data-id="${escapeHTML(client.id)}">Archive</button>
              `
          }
        </div>
      </td>
    </tr>
  `;
}

function renderClientCard(client) {
  const archived = client.isArchived;

  return `
    <article class="client-card" data-client-id="${escapeHTML(client.id)}">
      <div class="client-card-header">
        <div>
          <h3>${escapeHTML(client.fullName)}</h3>
          <p>${escapeHTML(client.clientId || "ID not available")}</p>
        </div>

        <span class="client-status-badge status-${archived ? "archived" : escapeHTML(client.status)}">
          ${escapeHTML(clientStatus(client))}
        </span>
      </div>

      <div class="client-card-details">
        <p><strong>Phone:</strong> ${escapeHTML(client.phone || "Not provided")}</p>
        <p><strong>Email:</strong> ${escapeHTML(client.email || "Not provided")}</p>
        <p><strong>Room:</strong> Not assigned</p>
        <p><strong>Registered:</strong> ${escapeHTML(formatDate(client.createdAt))}</p>
      </div>

      <div class="client-card-actions">
        <a class="client-action-button view-profile-button"
           href="${escapeHTML(profileUrl(client))}">
          View Profile
        </a>

        ${
          archived
            ? `<button type="button" class="client-action-button" data-action="restore" data-id="${escapeHTML(client.id)}">Restore</button>`
            : `
              <button type="button" class="client-action-button" data-action="edit" data-id="${escapeHTML(client.id)}">Edit</button>
              <button type="button" class="client-action-button danger" data-action="archive" data-id="${escapeHTML(client.id)}">Archive</button>
            `
        }
      </div>
    </article>
  `;
}

/* =====================================================
   ADD / EDIT CLIENT MODAL
   ===================================================== */

function openClientModal(client = null) {
  const root = $("#clientModalRoot");
  if (!root) return;

  editingClientId = client?.id || null;

  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <section class="client-modal"
               role="dialog"
               aria-modal="true"
               aria-labelledby="clientModalTitle">

        <header class="client-modal-header">
          <div>
            <p class="eyebrow">CLIENT RECORD</p>
            <h2 id="clientModalTitle">
              ${client ? "Edit Client" : "Add New Client"}
            </h2>
          </div>

          <button type="button"
                  class="modal-close-button"
                  data-close-modal
                  aria-label="Close form">
            &times;
          </button>
        </header>

        <form id="clientForm" novalidate>
          <div class="client-form-grid">

            <label>
              First name *
              <input name="firstName" required maxlength="80"
                     value="${escapeHTML(client?.firstName || "")}">
            </label>

            <label>
              Last name *
              <input name="lastName" required maxlength="80"
                     value="${escapeHTML(client?.lastName || "")}">
            </label>

            <label>
              Other names
              <input name="otherNames" maxlength="100"
                     value="${escapeHTML(client?.otherNames || "")}">
            </label>

            <label>
              Phone number
              <input name="phone" type="tel" maxlength="40"
                     value="${escapeHTML(client?.phone || "")}">
            </label>

            <label>
              Alternative phone
              <input name="alternativePhone" type="tel" maxlength="40"
                     value="${escapeHTML(client?.alternativePhone || "")}">
            </label>

            <label>
              Email address
              <input name="email" type="email" maxlength="150"
                     value="${escapeHTML(client?.email || "")}">
            </label>

            <label>
              Occupation
              <input name="occupation" maxlength="100"
                     value="${escapeHTML(client?.occupation || "")}">
            </label>

            <label>
              City / town
              <input name="city" maxlength="100"
                     value="${escapeHTML(client?.city || "")}">
            </label>

            <label class="client-form-full">
              Residential address
              <input name="address" maxlength="250"
                     value="${escapeHTML(client?.address || "")}">
            </label>

            <label>
              Client type
              <select name="clientType">
                <option value="prospective" ${client?.clientType === "prospective" ? "selected" : ""}>Prospective</option>
                <option value="tenant" ${client?.clientType === "tenant" ? "selected" : ""}>Tenant</option>
                <option value="other" ${client?.clientType === "other" ? "selected" : ""}>Other</option>
              </select>
            </label>

            <label>
              Status
              <select name="status">
                <option value="active" ${client?.status !== "inactive" ? "selected" : ""}>Active</option>
                <option value="inactive" ${client?.status === "inactive" ? "selected" : ""}>Inactive</option>
              </select>
            </label>

            <label>
              Emergency contact name
              <input name="emergencyName" maxlength="120"
                     value="${escapeHTML(client?.emergencyContact?.name || "")}">
            </label>

            <label>
              Emergency contact relationship
              <input name="emergencyRelationship" maxlength="80"
                     value="${escapeHTML(client?.emergencyContact?.relationship || "")}">
            </label>

            <label>
              Emergency contact phone
              <input name="emergencyPhone" type="tel" maxlength="40"
                     value="${escapeHTML(client?.emergencyContact?.phone || "")}">
            </label>

            <label class="client-form-full">
              Notes
              <textarea name="notes" rows="3" maxlength="2000">${escapeHTML(client?.notes || "")}</textarea>
            </label>

          </div>

          <p class="client-form-error" id="clientFormError" role="alert" hidden></p>

          <footer class="client-modal-footer">
            <button type="button" class="client-cancel-button" data-close-modal>
              Cancel
            </button>

            <button type="submit" class="client-save-button" id="saveClientButton">
              ${client ? "Save Changes" : "Save Client"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  `;

  root.hidden = false;
  document.body.classList.add("modal-open");

  $("#clientForm input[name='firstName']")?.focus();

  root.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeClientModal);
  });

  $("[data-modal-backdrop]", root)?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeClientModal();
    }
  });

  $("#clientForm", root)?.addEventListener("submit", handleClientFormSubmit);
}

function closeClientModal() {
  const root = $("#clientModalRoot");

  if (root) {
    root.hidden = true;
    root.innerHTML = "";
  }

  document.body.classList.remove("modal-open");
  editingClientId = null;
}

/* =====================================================
   SAVE CLIENT FORM
   ===================================================== */

async function handleClientFormSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const saveButton = $("#saveClientButton");
  const errorElement = $("#clientFormError");

  const formData = new FormData(form);

  const clientData = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    otherNames: formData.get("otherNames"),
    phone: formData.get("phone"),
    alternativePhone: formData.get("alternativePhone"),
    email: formData.get("email"),
    occupation: formData.get("occupation"),
    city: formData.get("city"),
    address: formData.get("address"),
    clientType: formData.get("clientType"),
    status: formData.get("status"),

    emergencyContact: {
      name: formData.get("emergencyName"),
      relationship: formData.get("emergencyRelationship"),
      phone: formData.get("emergencyPhone")
    },

    notes: formData.get("notes")
  };

  if (!clientData.firstName?.trim() || !clientData.lastName?.trim()) {
    errorElement.textContent = "First name and last name are required.";
    errorElement.hidden = false;
    return;
  }

  if (
    clientData.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email.trim())
  ) {
    errorElement.textContent = "Enter a valid email address.";
    errorElement.hidden = false;
    return;
  }

  try {
    if (errorElement) errorElement.hidden = true;

    setButtonLoading(saveButton, true, "Saving...");

    if (editingClientId) {
      await updateClient(editingClientId, clientData);
      showToast("Client record updated successfully.");
    } else {
      await addClient(clientData);
      showToast("Client added successfully.");
    }

    closeClientModal();
    await loadClients();
  } catch (error) {
    console.error("Unable to save client:", error);

    if (errorElement) {
      errorElement.textContent = errorMessage(error);
      errorElement.hidden = false;
    }

    setButtonLoading(saveButton, false);
  }
}

/* =====================================================
   CLIENT ACTIONS
   ===================================================== */

async function handleClientAction(action, clientDocumentId) {
  const client = clients.find((item) => item.id === clientDocumentId);

  if (!client) {
    showToast("That client record could not be found.", "error");
    return;
  }

  if (action === "edit") {
    openClientModal(client);
    return;
  }

  if (action === "archive") {
    const confirmed = window.confirm(
      `Archive ${client.fullName}? The record will be preserved and can be restored later.`
    );

    if (!confirmed) return;

    try {
      await archiveClient(clientDocumentId);
      showToast("Client archived. The record has been preserved.");
      await loadClients();
    } catch (error) {
      showToast(errorMessage(error), "error");
    }

    return;
  }

  if (action === "restore") {
    const confirmed = window.confirm(
      `Restore ${client.fullName} to the active client list?`
    );

    if (!confirmed) return;

    try {
      await restoreClient(clientDocumentId);
      showToast("Client restored successfully.");
      await loadClients();
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  }
}

/* =====================================================
   PAGE CONTROL EVENTS
   ===================================================== */

function initializeControls() {
  $("#addClientButton")?.addEventListener("click", () => openClientModal());
  $("#emptyAddClientButton")?.addEventListener("click", () => openClientModal());

  $("#refreshClientsButton")?.addEventListener("click", loadClients);
  $("#retryClientsButton")?.addEventListener("click", loadClients);

  $("#clientSearch")?.addEventListener("input", applyFilters);
  $("#clientSort")?.addEventListener("change", applyFilters);

  $("#clientFilters")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");

    if (!button) return;

    currentFilter = button.dataset.filter;
    applyFilters();
  });

  $("#previousClientsPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderClients();
    }
  });

  $("#nextClientsPage")?.addEventListener("click", () => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredClients.length / CLIENTS_PER_PAGE)
    );

    if (currentPage < totalPages) {
      currentPage++;
      renderClients();
    }
  });

  $("#clientsTableBody")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    handleClientAction(button.dataset.action, button.dataset.id);
  });

  $("#clientCardsList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    handleClientAction(button.dataset.action, button.dataset.id);
  });

  // Escape closes the modal while it is open.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#clientModalRoot")?.hidden) {
      closeClientModal();
    }
  });
}

/* =====================================================
   MOBILE SIDEBAR
   ===================================================== */

function initializeNavigation() {
  const sidebar = $("#sidebar");
  const overlay = $("#sidebarOverlay");
  const menuButton = $("#mobileMenuButton");

  if (!sidebar || !overlay || !menuButton) return;

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    menuButton.setAttribute("aria-expanded", "false");
    overlay.setAttribute("aria-hidden", "true");
  }

  menuButton.addEventListener("click", () => {
    const opening = !sidebar.classList.contains("is-open");

    sidebar.classList.toggle("is-open", opening);
    overlay.classList.toggle("is-visible", opening);
    menuButton.setAttribute("aria-expanded", String(opening));
    overlay.setAttribute("aria-hidden", String(!opening));
  });

  overlay.addEventListener("click", closeSidebar);

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
}

/* =====================================================
   LOADING AND ERROR STATES
   ===================================================== */

function showLoading(show) {
  const loading = $("#clientsLoading");

  if (loading) loading.hidden = !show;
}

function showError(message) {
  const error = $("#clientsError");

  if (error) error.hidden = false;

  setText("clientsErrorMessage", message);

  const table = $("#clientsTableWrapper");
  const cards = $("#clientCardsList");
  const empty = $("#clientsEmpty");

  if (table) table.hidden = true;
  if (cards) cards.hidden = true;
  if (empty) empty.hidden = true;
}

function hideError() {
  const error = $("#clientsError");

  if (error) error.hidden = true;
}