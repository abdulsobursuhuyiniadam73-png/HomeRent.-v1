// ============================================================
// HOMERENT — CLIENTS MANAGEMENT
// File: js/clients/clients.js
// ============================================================

import { auth, db } from "../firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  getClients,
  getClientById,
  addClient,
  updateClient,
  archiveClient,
  restoreClient
} from "./clients-service.js";

import {
  applyGlobalBranding
} from "../core/branding.js";

import {
  getSettings
} from "../core/settings.js";

// ------------------------------------------------------------
// CONFIGURATION — CHANGE HERE
// ------------------------------------------------------------

const CLIENTS_PER_PAGE = 8;

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------

let clients = [];
let filteredClients = [];
let currentPage = 1;
let currentFilter = "all";
let editingClientId = null;
let settings = {};
let isAdminVerified = false;

// ------------------------------------------------------------
// DOM HELPERS
// ------------------------------------------------------------

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
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

function getErrorMessage(error) {
  const messages = {
    "permission-denied": "You do not have permission to perform this action.",
    "unavailable": "Firebase is temporarily unavailable. Check your connection.",
    "failed-precondition": "The database needs an index or configuration update."
  };

  return messages[error?.code] ||
    error?.message ||
    "Something went wrong. Please try again.";
}

// ------------------------------------------------------------
// AUTHENTICATION
// ------------------------------------------------------------

async function initializeApplication(user) {
  try {
    // Keep the project's existing admin-only security model.
    // The Firestore rules must remain the final authority.
    const settingsData = await getSettings();
    settings = settingsData || {};

    await applyGlobalBranding();

    // Verify that the signed-in account is authorized by the
    // existing Firestore rules before loading client records.
    await getDocs(query(collection(db, "clients"), orderBy("createdAt", "desc")));

    isAdminVerified = true;

    await loadClients();
    initializeNavigation();
    initializeControls();
  } catch (error) {
    console.error("Clients initialization failed:", error);
    showError(getErrorMessage(error));
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  await initializeApplication(user);
});

// ------------------------------------------------------------
// LOAD CLIENTS
// ------------------------------------------------------------

async function loadClients() {
  showLoading(true);
  hideError();

  try {
    // Include archived records so the Archived filter can work.
    clients = await getClients(true);

    // Defensive normalization for older records.
    clients = clients.map((client) => ({
      ...client,
      fullName: client.fullName ||
        [client.firstName, client.otherNames, client.lastName]
          .filter(Boolean)
          .join(" "),
      isArchived: client.isArchived === true
    }));

    updateSummaryCards();
    applyFilters();
  } catch (error) {
    console.error("Could not load clients:", error);
    showError(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

// ------------------------------------------------------------
// SUMMARY CARDS
// ------------------------------------------------------------

function updateSummaryCards() {
  const total = clients.length;
  const archived = clients.filter((client) => client.isArchived).length;
  const active = clients.filter(
    (client) => !client.isArchived && client.status === "active"
  ).length;
  const prospective = clients.filter(
    (client) => !client.isArchived && client.clientType === "prospective"
  ).length;

  setText("totalClients", total);
  setText("activeClients", active);
  setText("prospectiveClients", prospective);
  setText("archivedClients", archived);
  setText("allClientsCount", total);
}

// ------------------------------------------------------------
// SEARCH AND FILTERS
// ------------------------------------------------------------

function applyFilters() {
  const search = ($("#clientSearch")?.value || "")
    .trim()
    .toLowerCase();

  const sort = $("#clientSort")?.value || "newest";

  filteredClients = clients.filter((client) => {
    const searchable = [
      client.clientId,
      client.fullName,
      client.firstName,
      client.lastName,
      client.otherNames,
      client.phone,
      client.alternativePhone,
      client.email
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch = searchable.includes(search);

    let matchesFilter = true;

    switch (currentFilter) {
      case "active":
        matchesFilter = !client.isArchived && client.status === "active";
        break;

      case "prospective":
      case "prospects":
        matchesFilter = !client.isArchived &&
          client.clientType === "prospective";
        break;

      case "inactive":
        matchesFilter = !client.isArchived && client.status === "inactive";
        break;

      case "archived":
        matchesFilter = client.isArchived;
        break;

      case "all":
      default:
        matchesFilter = !client.isArchived;
        break;
    }

    return matchesSearch && matchesFilter;
  });

  filteredClients.sort((a, b) => {
    if (sort === "name") {
      return (a.fullName || "").localeCompare(b.fullName || "");
    }

    if (sort === "oldest") {
      return timestampValue(a.createdAt) - timestampValue(b.createdAt);
    }

    return timestampValue(b.createdAt) - timestampValue(a.createdAt);
  });

  currentPage = 1;
  renderClients();
}

function timestampValue(value) {
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

// ------------------------------------------------------------
// RENDER CLIENTS
// ------------------------------------------------------------

function renderClients() {
  const start = (currentPage - 1) * CLIENTS_PER_PAGE;
  const pageClients = filteredClients.slice(
    start,
    start + CLIENTS_PER_PAGE
  );

  const tableBody = $("#clientsTableBody");
  const cardsList = $("#clientCardsList");

  if (tableBody) {
    tableBody.innerHTML = pageClients.map(renderTableRow).join("");
  }

  if (cardsList) {
    cardsList.innerHTML = pageClients.map(renderClientCard).join("");
  }

  const count = filteredClients.length;
  setText(
    "clientsResultsText",
    count === 0
      ? "No clients found"
      : `Showing ${start + 1}–${Math.min(start + CLIENTS_PER_PAGE, count)} of ${count} clients`
  );

  const empty = $("#clientsEmpty");
  const table = $("#clientsTableWrapper");
  const pagination = $("#clientsPagination");

  if (empty) empty.hidden = count !== 0;
  if (table) table.hidden = count === 0;
  if (cardsList) cardsList.hidden = count === 0;
  if (pagination) pagination.hidden = count <= CLIENTS_PER_PAGE;

  updatePagination();
  updateFilterCounts();
}

function renderTableRow(client) {
  const archived = client.isArchived;
  const name = escapeHTML(client.fullName || "Unnamed client");

  return `
    <tr>
      <td>
        <div class="client-identity">
          <div class="client-avatar">${escapeHTML(getInitials(client.fullName))}</div>
          <div>
            <strong>${name}</strong>
            <small>${escapeHTML(client.clientId || "No client ID")}</small>
          </div>
        </div>
      </td>
      <td>${escapeHTML(client.phone || "—")}</td>
      <td>${escapeHTML(client.email || "—")}</td>
      <td>${escapeHTML(capitalize(client.clientType || "prospective"))}</td>
      <td><span class="client-status ${archived ? "archived" : escapeHTML(client.status || "active")}">
        ${archived ? "Archived" : escapeHTML(capitalize(client.status || "active"))}
      </span></td>
      <td>
        <div class="client-actions">
          <button class="client-action-button" data-action="edit" data-id="${escapeHTML(client.id)}" title="Edit client" aria-label="Edit ${name}">
            <i class="fa-solid fa-pen"></i>
          </button>
          ${
            archived
              ? `<button class="client-action-button" data-action="restore" data-id="${escapeHTML(client.id)}" title="Restore client" aria-label="Restore ${name}">
                  <i class="fa-solid fa-rotate-left"></i>
                </button>`
              : `<button class="client-action-button" data-action="archive" data-id="${escapeHTML(client.id)}" title="Archive client" aria-label="Archive ${name}">
                  <i class="fa-solid fa-box-archive"></i>
                </button>`
          }
        </div>
      </td>
    </tr>
  `;
}

function renderClientCard(client) {
  const archived = client.isArchived;
  const name = escapeHTML(client.fullName || "Unnamed client");

  return `
    <article class="client-card">
      <div class="client-card-header">
        <div class="client-identity">
          <div class="client-avatar">${escapeHTML(getInitials(client.fullName))}</div>
          <div>
            <strong>${name}</strong>
            <small>${escapeHTML(client.clientId || "No client ID")}</small>
          </div>
        </div>
        <span class="client-status ${archived ? "archived" : escapeHTML(client.status || "active")}">
          ${archived ? "Archived" : escapeHTML(capitalize(client.status || "active"))}
        </span>
      </div>

      <div class="client-card-details">
        <p><i class="fa-solid fa-phone"></i> ${escapeHTML(client.phone || "No phone recorded")}</p>
        <p><i class="fa-solid fa-envelope"></i> ${escapeHTML(client.email || "No email recorded")}</p>
        <p><i class="fa-solid fa-user-tag"></i> ${escapeHTML(capitalize(client.clientType || "prospective"))}</p>
      </div>

      <div class="client-card-actions">
        <button class="client-action-button" data-action="edit" data-id="${escapeHTML(client.id)}">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        ${
          archived
            ? `<button class="client-action-button" data-action="restore" data-id="${escapeHTML(client.id)}">
                <i class="fa-solid fa-rotate-left"></i> Restore
              </button>`
            : `<button class="client-action-button" data-action="archive" data-id="${escapeHTML(client.id)}">
                <i class="fa-solid fa-box-archive"></i> Archive
              </button>`
        }
      </div>
    </article>
  `;
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "CL";
}

function capitalize(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ------------------------------------------------------------
// FILTER COUNTS AND PAGINATION
// ------------------------------------------------------------

function updateFilterCounts() {
  const counts = {
    all: clients.filter((client) => !client.isArchived).length,
    active: clients.filter((client) => !client.isArchived && client.status === "active").length,
    prospective: clients.filter((client) => !client.isArchived && client.clientType === "prospective").length,
    archived: clients.filter((client) => client.isArchived).length
  };

  $$("[data-filter]").forEach((button) => {
    const filter = button.dataset.filter;
    const countElement = $("[data-filter-count]", button);

    if (countElement && counts[filter] !== undefined) {
      countElement.textContent = counts[filter];
    }

    button.classList.toggle("active", filter === currentFilter);
    button.setAttribute("aria-pressed", String(filter === currentFilter));
  });
}

function updatePagination() {
  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / CLIENTS_PER_PAGE)
  );

  if (currentPage > totalPages) currentPage = totalPages;

  setText("clientsPageInfo", `Page ${currentPage} of ${totalPages}`);

  const previous = $("#previousClientsPage");
  const next = $("#nextClientsPage");

  if (previous) previous.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

// ------------------------------------------------------------
// ADD / EDIT CLIENT MODAL
// ------------------------------------------------------------

function openClientModal(client = null) {
  editingClientId = client?.id || null;

  const root = $("#clientModalRoot");
  if (!root) {
    showError("The client modal container #clientModalRoot is missing from the HTML.");
    return;
  }

  const isEditing = Boolean(client);

  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <section class="client-modal" role="dialog" aria-modal="true" aria-labelledby="clientModalTitle">
        <header class="client-modal-header">
          <div>
            <h2 id="clientModalTitle">${isEditing ? "Edit Client" : "Add New Client"}</h2>
            <p>${isEditing ? "Update this client's details." : "Enter the client's contact information."}</p>
          </div>
          <button type="button" class="client-action-button" data-close-modal aria-label="Close form">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <form id="clientForm" novalidate>
          <div class="client-form-grid">
            <label>First name <span>*</span>
              <input name="firstName" required maxlength="80" value="${escapeHTML(client?.firstName || "")}" autocomplete="given-name">
            </label>

            <label>Last name <span>*</span>
              <input name="lastName" required maxlength="80" value="${escapeHTML(client?.lastName || "")}" autocomplete="family-name">
            </label>

            <label>Other names
              <input name="otherNames" maxlength="100" value="${escapeHTML(client?.otherNames || "")}">
            </label>

            <label>Phone number
              <input name="phone" type="tel" maxlength="30" value="${escapeHTML(client?.phone || "")}" autocomplete="tel">
            </label>

            <label>Alternative phone
              <input name="alternativePhone" type="tel" maxlength="30" value="${escapeHTML(client?.alternativePhone || "")}">
            </label>

            <label>Email address
              <input name="email" type="email" maxlength="150" value="${escapeHTML(client?.email || "")}" autocomplete="email">
            </label>

            <label>Occupation
              <input name="occupation" maxlength="100" value="${escapeHTML(client?.occupation || "")}">
            </label>

            <label>City / town
              <input name="city" maxlength="100" value="${escapeHTML(client?.city || "")}">
            </label>

            <label class="client-form-full">Residential address
              <input name="address" maxlength="250" value="${escapeHTML(client?.address || "")}" autocomplete="street-address">
            </label>

            <label>Client type
              <select name="clientType">
                <option value="prospective" ${client?.clientType === "prospective" ? "selected" : ""}>Prospective</option>
                <option value="tenant" ${client?.clientType === "tenant" ? "selected" : ""}>Tenant</option>
                <option value="other" ${client?.clientType === "other" ? "selected" : ""}>Other</option>
              </select>
            </label>

            <label>Status
              <select name="status">
                <option value="active" ${!client || client?.status === "active" ? "selected" : ""}>Active</option>
                <option value="inactive" ${client?.status === "inactive" ? "selected" : ""}>Inactive</option>
              </select>
            </label>

            <label>Emergency contact name
              <input name="emergencyName" maxlength="120" value="${escapeHTML(client?.emergencyContact?.name || "")}">
            </label>

            <label>Emergency contact relationship
              <input name="emergencyRelationship" maxlength="80" value="${escapeHTML(client?.emergencyContact?.relationship || "")}">
            </label>

            <label>Emergency contact phone
              <input name="emergencyPhone" type="tel" maxlength="30" value="${escapeHTML(client?.emergencyContact?.phone || "")}">
            </label>

            <label class="client-form-full">Notes
              <textarea name="notes" rows="3" maxlength="1500">${escapeHTML(client?.notes || "")}</textarea>
            </label>
          </div>

          <p class="client-form-error" id="clientFormError" role="alert" hidden></p>

          <footer class="client-modal-footer">
            <button type="button" class="client-cancel-button" data-close-modal>Cancel</button>
            <button type="submit" class="client-save-button" id="saveClientButton">
              ${isEditing ? "Save Changes" : "Save Client"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  `;

  root.hidden = false;
  document.body.classList.add("modal-open");

  const firstInput = $('input[name="firstName"]', root);
  firstInput?.focus();

  $("#clientForm", root)?.addEventListener("submit", handleClientFormSubmit);
  $$("[data-close-modal]", root).forEach((button) => {
    button.addEventListener("click", closeClientModal);
  });

  $("[data-modal-backdrop]", root)?.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-backdrop]")) {
      closeClientModal();
    }
  });
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

// ------------------------------------------------------------
// SAVE CLIENT
// ------------------------------------------------------------

async function handleClientFormSubmit(event) {
  event.preventDefault();

  if (!isAdminVerified) {
    showFormError("Your administrator session has not been verified.");
    return;
  }

  const form = event.currentTarget;
  const formData = new FormData(form);

  const clientData = {
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    otherNames: String(formData.get("otherNames") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    alternativePhone: String(formData.get("alternativePhone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    occupation: String(formData.get("occupation") || "").trim(),
    city: String(formData.get("city") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    clientType: String(formData.get("clientType") || "prospective"),
    status: String(formData.get("status") || "active"),
    emergencyContact: {
      name: String(formData.get("emergencyName") || "").trim(),
      relationship: String(formData.get("emergencyRelationship") || "").trim(),
      phone: String(formData.get("emergencyPhone") || "").trim()
    },
    notes: String(formData.get("notes") || "").trim()
  };

  if (!clientData.firstName || !clientData.lastName) {
    showFormError("Please enter the client's first name and last name.");
    return;
  }

  if (clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
    showFormError("Please enter a valid email address.");
    return;
  }

  const saveButton = $("#saveClientButton");
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
  }

  try {
    if (editingClientId) {
      await updateClient(editingClientId, clientData);
      showToast("Client updated successfully.");
    } else {
      await addClient(clientData);
      showToast("Client added successfully.");
    }

    closeClientModal();
    await loadClients();
  } catch (error) {
    console.error("Unable to save client:", error);
    showFormError(getErrorMessage(error));

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = editingClientId ? "Save Changes" : "Save Client";
    }
  }
}

function showFormError(message) {
  const errorElement = $("#clientFormError");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }
}

// ------------------------------------------------------------
// ARCHIVE / RESTORE
// ------------------------------------------------------------

async function handleClientAction(action, clientId) {
  const client = clients.find((item) => item.id === clientId);
  if (!client) return;

  if (action === "edit") {
    openClientModal(client);
    return;
  }

  if (action === "archive") {
    const confirmed = window.confirm(
      `Archive ${client.fullName || "this client"}? The record will be preserved.`
    );

    if (!confirmed) return;

    try {
      await archiveClient(clientId);
      showToast("Client archived successfully.");
      await loadClients();
    } catch (error) {
      console.error("Could not archive client:", error);
      showError(getErrorMessage(error));
    }

    return;
  }

  if (action === "restore") {
    const confirmed = window.confirm(
      `Restore ${client.fullName || "this client"}?`
    );

    if (!confirmed) return;

    try {
      await restoreClient(clientId);
      showToast("Client restored successfully.");
      await loadClients();
    } catch (error) {
      console.error("Could not restore client:", error);
      showError(getErrorMessage(error));
    }
  }
}

// ------------------------------------------------------------
// EVENT HANDLERS
// ------------------------------------------------------------

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

    currentFilter = button.dataset.filter || "all";
    applyFilters();
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

  $("#previousClientsPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderClients();
    }
  });

  $("#nextClientsPage")?.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredClients.length / CLIENTS_PER_PAGE);

    if (currentPage < totalPages) {
      currentPage++;
      renderClients();
    }
  });
}

// ------------------------------------------------------------
// MOBILE NAVIGATION
// ------------------------------------------------------------

function initializeNavigation() {
  const sidebar = $("#sidebar");
  const overlay = $("#sidebarOverlay");
  const menuButton = $("#mobileMenuButton");

  const closeSidebar = () => {
    sidebar?.classList.remove("is-open");
    overlay?.classList.remove("is-visible");
    menuButton?.setAttribute("aria-expanded", "false");
  };

  menuButton?.addEventListener("click", () => {
    const isOpen = sidebar?.classList.toggle("is-open");

    if (isOpen) {
      overlay?.classList.add("is-visible");
      menuButton.setAttribute("aria-expanded", "true");
    } else {
      overlay?.classList.remove("is-visible");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });

  overlay?.addEventListener("click", closeSidebar);

  sidebar?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  // Close the mobile drawer if the user taps outside it.
  document.addEventListener("click", (event) => {
    if (
      sidebar?.classList.contains("is-open") &&
      !sidebar.contains(event.target) &&
      !menuButton?.contains(event.target)
    ) {
      closeSidebar();
    }
  });
}

// ------------------------------------------------------------
// LOADING / ERROR / TOAST UI
// ------------------------------------------------------------

function showLoading(show) {
  const element = $("#clientsLoading");
  if (element) element.hidden = !show;
}

function showError(message) {
  const error = $("#clientsError");
  const messageElement = $("#clientsErrorMessage");

  if (error) error.hidden = false;
  if (messageElement) messageElement.textContent = message;
}

function hideError() {
  const error = $("#clientsError");
  if (error) error.hidden = true;
}

function showToast(message) {
  let toast = $("#homeRentToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "homeRentToast";
    toast.className = "home-rent-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.setTimeout(() => {
    toast?.classList.remove("is-visible");
  }, 2800);
}