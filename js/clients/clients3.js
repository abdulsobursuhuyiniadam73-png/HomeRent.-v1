// ============================================================
// HomeRent — Clients Management Controller
// File: js/clients/clients.js
//
// RESPONSIBILITIES
// - Admin authentication
// - Shared branding
// - Client loading and summaries
// - Search, filtering, sorting and pagination
// - Add/edit/archive/restore
// - Navigation to individual client profiles
//
// CHANGE HERE: CLIENTS_PER_PAGE controls pagination.
// ============================================================

import { auth } from "../firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  addClient,
  getClients,
  updateClient,
  archiveClient,
  restoreClient
} from "./clients-service.js";

import {
  applyGlobalBranding
} from "../core/branding.js";


// ------------------------------------------------------------
// 1. CONFIGURATION AND STATE
// ------------------------------------------------------------

const CLIENTS_PER_PAGE = 8;

// CHANGE HERE if your profile page is stored elsewhere.
const PROFILE_PAGE = "./details.html";

let allClients = [];
let filteredClients = [];
let currentPage = 1;
let currentFilter = "all";
let currentSort = "newest";
let searchTerm = "";
let editingClientId = null;
let isSaving = false;


// ------------------------------------------------------------
// 2. DOM HELPERS
// ------------------------------------------------------------

const $ = selector => document.querySelector(selector);

const byId = id => document.getElementById(id);

function setText(id, value) {
  const element = byId(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function setHidden(id, hidden) {
  const element = byId(id);

  if (element) {
    element.hidden = hidden;
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function normalise(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getTimestamp(value) {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
}

function formatDate(value) {
  const milliseconds = getTimestamp(value);

  if (!milliseconds) {
    return "—";
  }

  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function displayName(client) {
  return client.fullName ||
    [
      client.firstName,
      client.otherNames,
      client.lastName
    ].filter(Boolean).join(" ") ||
    "Unnamed client";
}

function clientStatus(client) {
  if (client.isArchived) {
    return "archived";
  }

  return client.status || "prospective";
}


// ------------------------------------------------------------
// 3. AUTHENTICATION AND INITIALISATION
// ------------------------------------------------------------

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  try {
    // CHANGE HERE only if your existing branding module
    // documents a different initialisation method.
    await applyGlobalBranding();

    await initialiseClientsPage();
  } catch (error) {
    console.error("Clients page initialisation failed:", error);

    showError(
      "The clients page could not be loaded. Check your connection and try again."
    );
  }
});

async function initialiseClientsPage() {
  initialiseNavigation();
  initialiseControls();

  showLoading(true);
  hideError();

  await loadClients();

  // Support profile links that return to this page to edit.
  await openRequestedEditClient();
}


// ------------------------------------------------------------
// 4. LOAD CLIENTS
// ------------------------------------------------------------

async function loadClients() {
  showLoading(true);
  hideError();

  try {
    // Include archived clients so the archive filter works.
    allClients = await getClients(true);

    updateSummaryCards();
    applyFilters();
  } catch (error) {
    console.error("Unable to load clients:", error);

    showError(
      "Unable to load client records. Please check your connection and access permissions."
    );
  } finally {
    showLoading(false);
  }
}


// ------------------------------------------------------------
// 5. SUMMARY CARDS
// ------------------------------------------------------------

function updateSummaryCards() {
  const visibleClients = allClients.filter(
    client => !client.isArchived
  );

  setText("totalClients", visibleClients.length);

  setText(
    "activeClients",
    visibleClients.filter(
      client => client.status === "active"
    ).length
  );

  setText(
    "prospectiveClients",
    visibleClients.filter(
      client => client.clientType === "prospective"
    ).length
  );

  setText(
    "archivedClients",
    allClients.filter(client => client.isArchived).length
  );
}


// ------------------------------------------------------------
// 6. FILTERING AND SEARCH
// ------------------------------------------------------------

function applyFilters() {
  const term = normalise(searchTerm);

  filteredClients = allClients.filter(client => {
    const archived = client.isArchived === true;

    if (currentFilter === "archived" && !archived) {
      return false;
    }

    if (currentFilter !== "archived" && archived) {
      return false;
    }

    if (
      currentFilter === "active" &&
      client.status !== "active"
    ) {
      return false;
    }

    if (
      currentFilter === "inactive" &&
      client.status !== "inactive"
    ) {
      return false;
    }

    if (
      currentFilter === "prospective" &&
      client.clientType !== "prospective"
    ) {
      return false;
    }

    if (!term) {
      return true;
    }

    const searchableFields = [
      client.clientId,
      client.fullName,
      client.firstName,
      client.otherNames,
      client.lastName,
      client.phone,
      client.alternativePhone,
      client.email,
      client.city
    ];

    return searchableFields.some(field =>
      normalise(field).includes(term)
    );
  });

  sortClients();

  currentPage = 1;
  renderClients();
}

function sortClients() {
  const sortFunctions = {
    newest: (a, b) =>
      getTimestamp(b.createdAt) - getTimestamp(a.createdAt),

    oldest: (a, b) =>
      getTimestamp(a.createdAt) - getTimestamp(b.createdAt),

    nameAsc: (a, b) =>
      displayName(a).localeCompare(displayName(b)),

    nameDesc: (a, b) =>
      displayName(b).localeCompare(displayName(a))
  };

  const sortFunction = sortFunctions[currentSort];

  if (sortFunction) {
    filteredClients.sort(sortFunction);
  }
}


// ------------------------------------------------------------
// 7. RENDER CLIENTS
// ------------------------------------------------------------

function renderClients() {
  const total = filteredClients.length;
  const totalPages = Math.max(
    1,
    Math.ceil(total / CLIENTS_PER_PAGE)
  );

  currentPage = Math.min(currentPage, totalPages);

  const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;

  const pageClients = filteredClients.slice(
    startIndex,
    startIndex + CLIENTS_PER_PAGE
  );

  setText("allClientsCount", total);

  setText(
    "clientsResultsText",
    total === 0
      ? "No clients found"
      : `Showing ${startIndex + 1}–${Math.min(
          startIndex + CLIENTS_PER_PAGE,
          total
        )} of ${total} clients`
  );

  setHidden("clientsEmpty", total !== 0);
  setHidden("clientsTableWrapper", total === 0);
  setHidden("clientCardsList", total === 0);

  if (total === 0) {
    const isSearching =
      Boolean(searchTerm) || currentFilter !== "all";

    setText(
      "clientsEmptyTitle",
      isSearching ? "No matching clients" : "No clients yet"
    );

    setText(
      "clientsEmptyMessage",
      isSearching
        ? "Try changing your search or filter."
        : "Add your first client to start building your records."
    );
  }

  renderTable(pageClients);
  renderCards(pageClients);
  renderPagination(total, totalPages);
}

function renderTable(clients) {
  const body = byId("clientsTableBody");

  if (!body) {
    return;
  }

  body.innerHTML = clients.map(renderTableRow).join("");
}

function renderTableRow(client) {
  const name = escapeHTML(displayName(client));
  const clientId = escapeHTML(client.clientId || "—");
  const phone = escapeHTML(client.phone || "—");
  const email = escapeHTML(client.email || "");
  const status = clientStatus(client);
  const archived = client.isArchived === true;

  return `
    <tr>
      <td>
        <div class="client-table-name">${name}</div>
        ${email ? `<small>${email}</small>` : ""}
      </td>

      <td>${clientId}</td>

      <td>
        ${phone}
        ${client.alternativePhone
          ? `<small>${escapeHTML(client.alternativePhone)}</small>`
          : ""}
      </td>

      <td>—</td>

      <td>
        <span class="status-badge status-${escapeHTML(status)}">
          ${escapeHTML(status)}
        </span>
      </td>

      <td>${formatDate(client.createdAt)}</td>

      <td>
        <div class="client-row-actions">
          <a
            class="client-action-button"
            href="${PROFILE_PAGE}?id=${encodeURIComponent(client.id)}"
          >View</a>

          ${archived ? `
            <button
              type="button"
              class="client-action-button"
              data-client-action="restore"
              data-client-id="${escapeHTML(client.id)}"
            >Restore</button>
          ` : `
            <button
              type="button"
              class="client-action-button"
              data-client-action="edit"
              data-client-id="${escapeHTML(client.id)}"
            >Edit</button>

            <button
              type="button"
              class="client-action-button"
              data-client-action="archive"
              data-client-id="${escapeHTML(client.id)}"
            >Archive</button>
          `}
        </div>
      </td>
    </tr>
  `;
}

function renderCards(clients) {
  const container = byId("clientCardsList");

  if (!container) {
    return;
  }

  container.innerHTML = clients.map(client => {
    const archived = client.isArchived === true;

    return `
      <article class="client-card">
        <div class="client-card-header">
          <div>
            <h3>${escapeHTML(displayName(client))}</h3>
            <p>${escapeHTML(client.clientId || "—")}</p>
          </div>

          <span class="status-badge status-${escapeHTML(clientStatus(client))}">
            ${escapeHTML(clientStatus(client))}
          </span>
        </div>

        <div class="client-card-details">
          <p><strong>Phone:</strong> ${escapeHTML(client.phone || "—")}</p>
          <p><strong>Email:</strong> ${escapeHTML(client.email || "—")}</p>
          <p><strong>Registered:</strong> ${formatDate(client.createdAt)}</p>
        </div>

        <div class="client-card-actions">
          <a
            class="client-action-button"
            href="${PROFILE_PAGE}?id=${encodeURIComponent(client.id)}"
          >View profile</a>

          ${archived ? `
            <button
              type="button"
              class="client-action-button"
              data-client-action="restore"
              data-client-id="${escapeHTML(client.id)}"
            >Restore</button>
          ` : `
            <button
              type="button"
              class="client-action-button"
              data-client-action="edit"
              data-client-id="${escapeHTML(client.id)}"
            >Edit</button>

            <button
              type="button"
              class="client-action-button"
              data-client-action="archive"
              data-client-id="${escapeHTML(client.id)}"
            >Archive</button>
          `}
        </div>
      </article>
    `;
  }).join("");
}


// ------------------------------------------------------------
// 8. PAGINATION
// ------------------------------------------------------------

function renderPagination(total, totalPages) {
  setText("clientsPageInfo", `Page ${currentPage} of ${totalPages}`);

  const previous = byId("previousClientsPage");
  const next = byId("nextClientsPage");

  if (previous) {
    previous.disabled = currentPage <= 1 || total === 0;
  }

  if (next) {
    next.disabled = currentPage >= totalPages || total === 0;
  }

  const pagination = byId("clientsPagination");

  if (pagination) {
    pagination.hidden = total <= CLIENTS_PER_PAGE;
  }
}


// ------------------------------------------------------------
// 9. ADD / EDIT MODAL
// ------------------------------------------------------------

function openClientModal(client = null) {
  const root = byId("clientModalRoot");

  if (!root) {
    showToast("The client form is missing from the page.", "error");
    return;
  }

  editingClientId = client?.id || null;

  const value = key => escapeHTML(client?.[key] || "");

  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <section
        class="client-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientModalTitle"
      >
        <header class="client-modal-header">
          <div>
            <h2 id="clientModalTitle">
              ${client ? "Edit client" : "Add new client"}
            </h2>
            <p>Enter the client's contact and personal details.</p>
          </div>

          <button type="button" data-close-modal aria-label="Close form">
            &times;
          </button>
        </header>

        <form id="clientForm">
          <div id="clientFormError" role="alert" hidden></div>

          <div class="client-form-grid">
            <label>
              First name *
              <input name="firstName" required maxlength="80"
                value="${value("firstName")}" autocomplete="given-name">
            </label>

            <label>
              Last name *
              <input name="lastName" required maxlength="80"
                value="${value("lastName")}" autocomplete="family-name">
            </label>

            <label>
              Other names
              <input name="otherNames" maxlength="100"
                value="${value("otherNames")}">
            </label>

            <label>
              Phone number
              <input name="phone" maxlength="30"
                value="${value("phone")}" autocomplete="tel">
            </label>

            <label>
              Alternative phone
              <input name="alternativePhone" maxlength="30"
                value="${value("alternativePhone")}">
            </label>

            <label>
              Email
              <input name="email" type="email" maxlength="150"
                value="${value("email")}" autocomplete="email">
            </label>

            <label>
              Occupation
              <input name="occupation" maxlength="100"
                value="${value("occupation")}">
            </label>

            <label>
              City
              <input name="city" maxlength="100"
                value="${value("city")}">
            </label>

            <label class="client-form-full">
              Address
              <textarea name="address" rows="2" maxlength="500">${value("address")}</textarea>
            </label>

            <label>
              Client type
              <select name="clientType">
                <option value="prospective"
                  ${client?.clientType === "prospective" ? "selected" : ""}>
                  Prospective
                </option>
                <option value="tenant"
                  ${client?.clientType === "tenant" ? "selected" : ""}>
                  Tenant
                </option>
                <option value="former"
                  ${client?.clientType === "former" ? "selected" : ""}>
                  Former tenant
                </option>
              </select>
            </label>

            <label>
              Client status
              <select name="status">
                <option value="active"
                  ${client?.status === "active" ? "selected" : ""}>
                  Active
                </option>
                <option value="inactive"
                  ${client?.status === "inactive" ? "selected" : ""}>
                  Inactive
                </option>
                <option value="prospective"
                  ${!client || client.status === "prospective" ? "selected" : ""}>
                  Prospective
                </option>
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
              <input name="emergencyPhone" maxlength="30"
                value="${escapeHTML(client?.emergencyContact?.phone || "")}">
            </label>

            <label class="client-form-full">
              Notes
              <textarea name="notes" rows="3" maxlength="2000">${value("notes")}</textarea>
            </label>
          </div>

          <footer class="client-modal-footer">
            <button type="button" class="client-cancel-button" data-close-modal>
              Cancel
            </button>

            <button type="submit" class="client-save-button">
              ${client ? "Save changes" : "Add client"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  `;

  root.hidden = false;
  document.body.classList.add("modal-open");

  root.querySelector('[name="firstName"]')?.focus();

  root.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", closeClientModal);
  });

  root.querySelector("[data-modal-backdrop]")?.addEventListener(
    "click",
    event => {
      if (event.target === event.currentTarget) {
        closeClientModal();
      }
    }
  );

  root.querySelector("#clientForm")?.addEventListener(
    "submit",
    handleClientFormSubmit
  );
}

function closeClientModal() {
  const root = byId("clientModalRoot");

  if (root) {
    root.hidden = true;
    root.innerHTML = "";
  }

  document.body.classList.remove("modal-open");

  editingClientId = null;
  isSaving = false;
}


// ------------------------------------------------------------
// 10. SAVE CLIENT FORM
// ------------------------------------------------------------

async function handleClientFormSubmit(event) {
  event.preventDefault();

  if (isSaving) {
    return;
  }

  const form = event.currentTarget;
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
    notes: formData.get("notes"),

    emergencyContact: {
      name: formData.get("emergencyName"),
      relationship: formData.get("emergencyRelationship"),
      phone: formData.get("emergencyPhone")
    }
  };

  const saveButton = form.querySelector('[type="submit"]');
  const errorBox = byId("clientFormError");

  isSaving = true;

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
  }

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  try {
    if (editingClientId) {
      await updateClient(editingClientId, clientData);
      showToast("Client details updated successfully.");
    } else {
      await addClient(clientData);
      showToast("Client added successfully.");
    }

    closeClientModal();

    await loadClients();
  } catch (error) {
    console.error("Unable to save client:", error);

    if (errorBox) {
      errorBox.textContent =
        error.message || "Unable to save this client.";
      errorBox.hidden = false;
    }

    isSaving = false;

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = editingClientId
        ? "Save changes"
        : "Add client";
    }
  }
}


// ------------------------------------------------------------
// 11. CLIENT ACTIONS
// ------------------------------------------------------------

async function handleClientAction(action, clientId) {
  const client = allClients.find(item => item.id === clientId);

  if (!client) {
    showToast("Client record not found. Refresh and try again.", "error");
    return;
  }

  if (action === "view") {
    window.location.href =
      `${PROFILE_PAGE}?id=${encodeURIComponent(client.id)}`;
    return;
  }

  if (action === "edit") {
    openClientModal(client);
    return;
  }

  if (action === "archive") {
    const confirmed = window.confirm(
      `Archive ${displayName(client)}? The record will be retained and can be restored later.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await archiveClient(client.id);
      showToast("Client archived.");
      await loadClients();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Unable to archive client.", "error");
    }

    return;
  }

  if (action === "restore") {
    const confirmed = window.confirm(
      `Restore ${displayName(client)}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await restoreClient(client.id);
      showToast("Client restored.");
      await loadClients();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Unable to restore client.", "error");
    }
  }
}


// ------------------------------------------------------------
// 12. CONNECT PAGE CONTROLS
// ------------------------------------------------------------

function initialiseControls() {
  byId("addClientButton")?.addEventListener("click", () => {
    openClientModal();
  });

  byId("emptyAddClientButton")?.addEventListener("click", () => {
    openClientModal();
  });

  byId("refreshClientsButton")?.addEventListener("click", loadClients);

  byId("retryClientsButton")?.addEventListener("click", loadClients);

  byId("clientSearch")?.addEventListener("input", event => {
    searchTerm = event.target.value;
    applyFilters();
  });

  byId("clientSort")?.addEventListener("change", event => {
    currentSort = event.target.value;
    applyFilters();
  });

  byId("clientFilters")?.addEventListener("click", event => {
    const filterButton = event.target.closest("[data-client-filter]");

    if (!filterButton) {
      return;
    }

    currentFilter = filterButton.dataset.clientFilter || "all";
    currentPage = 1;

    byId("clientFilters")
      .querySelectorAll("[data-client-filter]")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button === filterButton
        );

        button.setAttribute(
          "aria-pressed",
          String(button === filterButton)
        );
      });

    applyFilters();
  });

  byId("clientsTableBody")?.addEventListener("click", event => {
    const button = event.target.closest("[data-client-action]");

    if (!button) {
      return;
    }

    handleClientAction(
      button.dataset.clientAction,
      button.dataset.clientId
    );
  });

  byId("clientCardsList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-client-action]");

    if (!button) {
      return;
    }

    handleClientAction(
      button.dataset.clientAction,
      button.dataset.clientId
    );
  });

  byId("previousClientsPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderClients();
    }
  });

  byId("nextClientsPage")?.addEventListener("click", () => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredClients.length / CLIENTS_PER_PAGE)
    );

    if (currentPage < totalPages) {
      currentPage++;
      renderClients();
    }
  });

  // Keyboard support: Escape closes the modal.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !byId("clientModalRoot")?.hidden) {
      closeClientModal();
    }
  });
}


// ------------------------------------------------------------
// 13. PROFILE -> EDIT RETURN LINK
//
// Supports:
// clients/index.html?edit=FIRESTORE_DOCUMENT_ID
// ------------------------------------------------------------

async function openRequestedEditClient() {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("edit");

  if (!clientId) {
    return;
  }

  const client = allClients.find(item => item.id === clientId);

  if (!client || client.isArchived) {
    showToast("That client cannot be edited from this link.", "error");
    return;
  }

  openClientModal(client);
}


// ------------------------------------------------------------
// 14. MOBILE SIDEBAR
// ------------------------------------------------------------

function initialiseNavigation() {
  const sidebar = byId("sidebar");
  const overlay = byId("sidebarOverlay");
  const menuButton = byId("mobileMenuButton");

  if (!sidebar || !overlay || !menuButton) {
    return;
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("visible");
    document.body.classList.remove("sidebar-open");

    menuButton.setAttribute("aria-expanded", "false");
  }

  menuButton.addEventListener("click", () => {
    const opening = !sidebar.classList.contains("open");

    sidebar.classList.toggle("open", opening);
    overlay.classList.toggle("visible", opening);
    document.body.classList.toggle("sidebar-open", opening);

    menuButton.setAttribute("aria-expanded", String(opening));
  });

  overlay.addEventListener("click", closeSidebar);

  sidebar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeSidebar);
  });

  // Close after tapping outside the sidebar on mobile.
  document.addEventListener("click", event => {
    if (
      window.innerWidth <= 900 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      closeSidebar();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeSidebar();
    }
  });
}


// ------------------------------------------------------------
// 15. LOADING, ERROR AND TOAST MESSAGES
// ------------------------------------------------------------

function showLoading(show) {
  setHidden("clientsLoading", !show);

  if (show) {
    setHidden("clientsEmpty", true);
  }
}

function showError(message) {
  setText("clientsErrorMessage", message);
  setHidden("clientsError", false);
}

function hideError() {
  setHidden("clientsError", true);
}

function showToast(message, type = "success") {
  let toast = $(".clients-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "clients-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("visible");

  window.setTimeout(() => {
    toast?.classList.remove("visible");
  }, 3200);
}