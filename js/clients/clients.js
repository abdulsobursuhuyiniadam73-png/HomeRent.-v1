// ============================================================
// HomeRent — Clients Page Controller
// File: js/clients/clients.js
//
// Responsibilities:
// - Load and display clients.
// - Search, filter, sort and paginate records.
// - Display directory statistics.
// - Add, edit and archive clients.
// - Export filtered client records to CSV.
// - Open individual client profiles.
// - Reuse the existing Add Room modal.
// - Support the existing mobile sidebar.
//
// Depends on:
// js/clients/clients-service.js
// components/add-room/add-room.js
// js/core/branding.js
// js/auth/auth-guard.js
// ============================================================

import {
  getClients,
  createClient,
  updateClient,
  archiveClient
} from "./clients-service.js";

import { initAddRoom } from "../../components/add-room/add-room.js";

const PAGE_SIZE = 10;

const state = {
  clients: [],
  filteredClients: [],
  page: 1,
  loading: false,
  initialized: false
};

const elements = {
  total: document.getElementById("totalClientsCount"),
  active: document.getElementById("activeClientsCount"),
  attention: document.getElementById("attentionClientsCount"),
  newThisMonth: document.getElementById("newClientsCount"),

  search: document.getElementById("clientSearch"),
  status: document.getElementById("clientStatusFilter"),
  sort: document.getElementById("clientSort"),

  tableBody: document.getElementById("clientsTableBody"),
  mobileList: document.getElementById("clientsMobileList"),
  tableWrap: document.getElementById("clientsTableWrap"),

  emptyState: document.getElementById("clientsEmptyState"),
  emptyTitle: document.getElementById("clientsEmptyTitle"),
  emptyMessage: document.getElementById("clientsEmptyMessage"),

  feedback: document.getElementById("clientsFeedback"),
  resultSummary: document.getElementById("clientsResultSummary"),

  pagination: document.getElementById("clientsPagination"),
  paginationSummary: document.getElementById("clientsPaginationSummary"),
  pageNumber: document.getElementById("clientsPageNumber"),
  previousPage: document.getElementById("previousClientsPageButton"),
  nextPage: document.getElementById("nextClientsPageButton"),

  addButton: document.getElementById("addClientButton"),
  emptyAddButton: document.getElementById("emptyStateAddClientButton"),
  refreshButton: document.getElementById("refreshClientsButton"),
  resetButton: document.getElementById("resetClientFiltersButton"),
  exportButton: document.getElementById("exportClientsButton"),

  mobileAddRoomButton: document.getElementById("mobileAddRoomButton"),
  mobileMenuButton: document.getElementById("mobileMenuButton"),
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  logoutButton: document.getElementById("logoutButton")
};

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function displayName(client) {
  return client.fullName || "Unnamed client";
}

function getDateValue(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = getDateValue(value);

  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getInitials(name) {
  return String(name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function isArchived(client) {
  return client.isArchived === true;
}

function isClientActive(client) {
  return !isArchived(client) && client.status === "active";
}

function getRegistrationDate(client) {
  return getDateValue(client.createdAt);
}

function showFeedback(message, type = "info") {
  if (!elements.feedback) return;

  elements.feedback.hidden = !message;
  elements.feedback.textContent = message || "";
  elements.feedback.dataset.type = type;
}

function setLoading(isLoading) {
  state.loading = isLoading;

  if (elements.refreshButton) {
    elements.refreshButton.disabled = isLoading;
    elements.refreshButton.innerHTML = isLoading
      ? '<i class="fa-solid fa-spinner fa-spin"></i>'
      : '<i class="fa-solid fa-rotate"></i>';
  }
}

function getActiveClients() {
  return state.clients.filter(isClientActive);
}

function getCurrentMonthCount() {
  const now = new Date();

  return state.clients.filter((client) => {
    const date = getRegistrationDate(client);

    return date &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth();
  }).length;
}

// ------------------------------------------------------------
// DIRECTORY STATISTICS
//
// Important:
// "Needs attention" cannot yet be calculated reliably because
// tenancy and financial records are not integrated here.
// We show an unavailable marker instead of a false zero.
// ------------------------------------------------------------

function renderStatistics() {
  if (elements.total) {
    elements.total.textContent = state.clients.length.toLocaleString();
  }

  if (elements.active) {
    elements.active.textContent =
      getActiveClients().length.toLocaleString();
  }

  if (elements.newThisMonth) {
    elements.newThisMonth.textContent =
      getCurrentMonthCount().toLocaleString();
  }

  if (elements.attention) {
    elements.attention.textContent = "—";
    elements.attention.title =
      "Requires integration with tenancy and payment records.";
  }
}

// ------------------------------------------------------------
// SEARCH, FILTERS AND SORTING
// ------------------------------------------------------------

function applyFilters() {
  const query = normalizeSearch(elements.search?.value);
  const statusFilter = elements.status?.value || "all";
  const sortOrder = elements.sort?.value || "newest";

  let result = state.clients.filter((client) => {
    const searchableText = [
      client.clientNumber,
      client.fullName,
      client.phone,
      client.alternativePhone,
      client.email,
      client.address
    ].join(" ").toLowerCase();

    if (query && !searchableText.includes(query)) {
      return false;
    }

    if (statusFilter === "active" && !isClientActive(client)) {
      return false;
    }

    if (
      statusFilter === "inactive" &&
      (isArchived(client) || client.status !== "inactive")
    ) {
      return false;
    }

    if (
      statusFilter === "attention" &&
      !client.needsAttention
    ) {
      // This filter becomes meaningful after tenancy/payment
      // integration. No attention status is invented here.
      return false;
    }

    return true;
  });

  result.sort((a, b) => {
    if (sortOrder === "name-asc") {
      return displayName(a).localeCompare(displayName(b));
    }

    if (sortOrder === "name-desc") {
      return displayName(b).localeCompare(displayName(a));
    }

    const aTime = getRegistrationDate(a)?.getTime() || 0;
    const bTime = getRegistrationDate(b)?.getTime() || 0;

    return sortOrder === "oldest"
      ? aTime - bTime
      : bTime - aTime;
  });

  state.filteredClients = result;
  state.page = 1;

  renderDirectory();
}

// ------------------------------------------------------------
// STATUS BADGES
// ------------------------------------------------------------

function statusMarkup(client) {
  if (isArchived(client)) {
    return '<span class="client-status client-status-archived">Archived</span>';
  }

  if (client.status === "inactive") {
    return '<span class="client-status client-status-inactive">Inactive</span>';
  }

  return '<span class="client-status client-status-active">Active</span>';
}

// ------------------------------------------------------------
// CLIENT ACTION MENU
// ------------------------------------------------------------

function actionsMarkup(client) {
  const id = escapeHTML(client.id);

  return `
    <div class="client-row-actions">
      <button
        type="button"
        class="client-action-button"
        data-action="details"
        data-client-id="${id}"
        aria-label="View client profile"
        title="View profile"
      >
        <i class="fa-solid fa-eye"></i>
      </button>

      <button
        type="button"
        class="client-action-button"
        data-action="edit"
        data-client-id="${id}"
        aria-label="Edit client"
        title="Edit client"
        ${isArchived(client) ? "disabled" : ""}
      >
        <i class="fa-solid fa-pen"></i>
      </button>

      <button
        type="button"
        class="client-action-button"
        data-action="archive"
        data-client-id="${id}"
        aria-label="Archive client"
        title="Archive client"
        ${isArchived(client) ? "disabled" : ""}
      >
        <i class="fa-solid fa-box-archive"></i>
      </button>
    </div>
  `;
}

// ------------------------------------------------------------
// DESKTOP TABLE
// ------------------------------------------------------------

function renderTable(clients) {
  if (!elements.tableBody) return;

  if (!clients.length) {
    elements.tableBody.innerHTML = "";
    return;
  }

  elements.tableBody.innerHTML = clients.map((client) => `
    <tr>
      <td>
        <button
          type="button"
          class="client-identity-button"
          data-action="details"
          data-client-id="${escapeHTML(client.id)}"
        >
          <span class="client-avatar">
            ${escapeHTML(getInitials(displayName(client)))}
          </span>

          <span class="client-identity-text">
            <strong>${escapeHTML(displayName(client))}</strong>
            <small>${escapeHTML(client.clientNumber || "ID unavailable")}</small>
          </span>
        </button>
      </td>

      <td>
        <div class="client-contact">
          <span>${escapeHTML(client.phone || "No phone recorded")}</span>
          <small>${escapeHTML(client.email || "No email recorded")}</small>
        </div>
      </td>

      <td>${statusMarkup(client)}</td>

      <td>${escapeHTML(formatDate(client.createdAt))}</td>

      <td>${actionsMarkup(client)}</td>
    </tr>
  `).join("");
}

// ------------------------------------------------------------
// MOBILE CARDS
// ------------------------------------------------------------

function renderMobileCards(clients) {
  if (!elements.mobileList) return;

  elements.mobileList.innerHTML = clients.map((client) => `
    <article class="client-mobile-card">

      <div class="client-mobile-card-header">
        <span class="client-avatar">
          ${escapeHTML(getInitials(displayName(client)))}
        </span>

        <div class="client-identity-text">
          <strong>${escapeHTML(displayName(client))}</strong>
          <small>${escapeHTML(client.clientNumber || "ID unavailable")}</small>
        </div>

        ${statusMarkup(client)}
      </div>

      <div class="client-mobile-contact">
        <p>
          <i class="fa-solid fa-phone"></i>
          ${escapeHTML(client.phone || "No phone recorded")}
        </p>

        <p>
          <i class="fa-solid fa-envelope"></i>
          ${escapeHTML(client.email || "No email recorded")}
        </p>
      </div>

      <div class="client-mobile-card-footer">
        <span>
          Registered ${escapeHTML(formatDate(client.createdAt))}
        </span>

        ${actionsMarkup(client)}
      </div>

    </article>
  `).join("");
}

// ------------------------------------------------------------
// EMPTY STATE
// ------------------------------------------------------------

function renderEmptyState(show) {
  if (elements.emptyState) {
    elements.emptyState.hidden = !show;
  }

  if (elements.tableWrap) {
    elements.tableWrap.hidden = show;
  }

  if (elements.mobileList) {
    elements.mobileList.hidden = show;
  }

  if (show && elements.emptyTitle && elements.emptyMessage) {
    const hasAnyClients = state.clients.length > 0;

    elements.emptyTitle.textContent = hasAnyClients
      ? "No matching clients"
      : "No clients yet";

    elements.emptyMessage.textContent = hasAnyClients
      ? "Try changing your search or filters."
      : "Register your first client to begin building the directory.";

    if (elements.emptyAddButton) {
      elements.emptyAddButton.hidden = hasAnyClients;
    }
  }
}

// ------------------------------------------------------------
// PAGINATION
// ------------------------------------------------------------

function renderPagination(total) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  state.page = Math.min(state.page, pageCount);

  if (elements.pagination) {
    elements.pagination.hidden = total <= PAGE_SIZE;
  }

  if (elements.pageNumber) {
    elements.pageNumber.textContent = `${state.page} / ${pageCount}`;
  }

  if (elements.paginationSummary) {
    const first = total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
    const last = Math.min(state.page * PAGE_SIZE, total);

    elements.paginationSummary.textContent =
      `${first}–${last} of ${total} clients`;
  }

  if (elements.previousPage) {
    elements.previousPage.disabled = state.page <= 1;
  }

  if (elements.nextPage) {
    elements.nextPage.disabled = state.page >= pageCount;
  }
}

// ------------------------------------------------------------
// RENDER DIRECTORY
// ------------------------------------------------------------

function renderDirectory() {
  const allFiltered = state.filteredClients;
  const total = allFiltered.length;

  const start = (state.page - 1) * PAGE_SIZE;
  const pageClients = allFiltered.slice(start, start + PAGE_SIZE);

  if (elements.resultSummary) {
    elements.resultSummary.textContent =
      `${total.toLocaleString()} ${total === 1 ? "client" : "clients"} found`;
  }

  renderEmptyState(total === 0);

  renderTable(pageClients);
  renderMobileCards(pageClients);
  renderPagination(total);
}

// ------------------------------------------------------------
// LOAD CLIENTS
// ------------------------------------------------------------

async function loadClients() {
  if (state.loading) return;

  setLoading(true);
  showFeedback("Loading client records…");

  try {
    // The service excludes archived clients by default.
    state.clients = await getClients();
    renderStatistics();
    applyFilters();

    showFeedback(
      state.clients.length
        ? ""
        : "No client records have been registered yet."
    );
  } catch (error) {
    console.error("HomeRent: Unable to load clients.", error);

    state.clients = [];
    state.filteredClients = [];

    renderStatistics();
    renderDirectory();

    showFeedback(
      error.message || "Unable to load clients. Please try again.",
      "error"
    );
  } finally {
    setLoading(false);
  }
}

// ------------------------------------------------------------
// CLIENT FORM
// ------------------------------------------------------------

function closeClientForm() {

  document.getElementById("clientFormModal")?.remove();
  document.body.classList.remove("client-form-open");
}

function openClientForm(client = null) {
  if (client && isArchived(client)) {
    window.alert("Archived clients cannot be edited.");
    return;
  }

  closeClientForm();

  const editing = Boolean(client);

  const modal = document.createElement("div");
  modal.id = "clientFormModal";
  modal.className = "client-form-modal";
  modal.setAttribute("role", "presentation");

  modal.innerHTML = `
    <section
      class="client-form-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clientFormTitle"
    >
      <header class="client-form-header">
        <div>
          <p class="page-eyebrow">CLIENT MANAGEMENT</p>
          <h2 id="clientFormTitle">
            ${editing ? "Edit client" : "Add new client"}
          </h2>
          <p>
            ${editing
              ? "Update this client's contact information."
              : "Enter the client's information to create a record."}
          </p>
        </div>

        <button
          type="button"
          class="icon-button"
          data-close-form
          aria-label="Close form"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <form id="clientForm" novalidate>
        <div class="client-form-body">

          <div class="client-form-field">
            <label for="clientFullName">Full name *</label>
            <input
              id="clientFullName"
              name="fullName"
              maxlength="150"
              required
              autocomplete="name"
              value="${escapeHTML(client?.fullName || "")}"
              placeholder="Enter full name"
            >
          </div>

          <div class="client-form-grid">
            <div class="client-form-field">
              <label for="clientType">Client type *</label>
              <select id="clientType" name="clientType" required>
                <option value="individual"
                  ${client?.clientType !== "business" ? "selected" : ""}>
                  Individual
                </option>
                <option value="business"
                  ${client?.clientType === "business" ? "selected" : ""}>
                  Business
                </option>
              </select>
            </div>

            <div class="client-form-field">
              <label for="clientPhone">Primary phone *</label>
              <input
                id="clientPhone"
                name="phone"
                type="tel"
                maxlength="20"
                required
                autocomplete="tel"
                value="${escapeHTML(client?.phone || "")}"
                placeholder="+233..."
              >
            </div>
          </div>

          <div class="client-form-grid">
            <div class="client-form-field">
              <label for="clientAlternativePhone">Alternative phone</label>
              <input
                id="clientAlternativePhone"
                name="alternativePhone"
                type="tel"
                maxlength="20"
                value="${escapeHTML(client?.alternativePhone || "")}"
              >
            </div>

            <div class="client-form-field">
              <label for="clientEmail">Email address</label>
              <input
                id="clientEmail"
                name="email"
                type="email"
                maxlength="254"
                autocomplete="email"
                value="${escapeHTML(client?.email || "")}"
              >
            </div>
          </div>

          <div class="client-form-field">
            <label for="clientAddress">Contact address</label>
            <textarea
              id="clientAddress"
              name="address"
              rows="2"
              maxlength="500"
            >${escapeHTML(client?.address || "")}</textarea>
          </div>

          <div class="client-form-grid">
            <div class="client-form-field">
              <label for="clientIdType">Identification type</label>
              <input
                id="clientIdType"
                name="identificationType"
                maxlength="60"
                value="${escapeHTML(client?.identificationType || "")}"
                placeholder="Optional"
              >
            </div>

            <div class="client-form-field">
              <label for="clientIdNumber">Identification number</label>
              <input
                id="clientIdNumber"
                name="identificationNumber"
                maxlength="100"
                value="${escapeHTML(client?.identificationNumber || "")}"
                placeholder="Optional"
              >
            </div>
          </div>

          <div class="client-form-grid">
            <div class="client-form-field">
              <label for="clientEmergencyName">Emergency contact name</label>
              <input
                id="clientEmergencyName"
                name="emergencyContactName"
                maxlength="150"
                value="${escapeHTML(client?.emergencyContactName || "")}"
              >
            </div>

            <div class="client-form-field">
              <label for="clientEmergencyPhone">Emergency contact phone</label>
              <input
                id="clientEmergencyPhone"
                name="emergencyContactPhone"
                type="tel"
                maxlength="20"
                value="${escapeHTML(client?.emergencyContactPhone || "")}"
              >
            </div>
          </div>

          <div class="client-form-field">
            <label for="clientStatus">Client record status</label>
            <select id="clientStatus" name="status">
              <option value="active"
                ${client?.status !== "inactive" ? "selected" : ""}>
                Active
              </option>
              <option value="inactive"
                ${client?.status === "inactive" ? "selected" : ""}>
                Inactive
              </option>
            </select>
          </div>

          <div class="client-form-field">
            <label for="clientNotes">Internal notes</label>
            <textarea
              id="clientNotes"
              name="notes"
              rows="3"
              maxlength="2000"
              placeholder="Optional notes for management"
            >${escapeHTML(client?.notes || "")}</textarea>
          </div>

          <p class="client-form-error" id="clientFormError" role="alert" hidden></p>
        </div>

        <footer class="client-form-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-close-form
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            id="saveClientButton"
          >
            <i class="fa-solid fa-floppy-disk"></i>
            <span>${editing ? "Save changes" : "Register client"}</span>
          </button>
        </footer>
      </form>
    </section>
  `;

  document.body.appendChild(modal);
  document.body.classList.add("client-form-open");

  const form = modal.querySelector("#clientForm");
  const errorElement = modal.querySelector("#clientFormError");
  const saveButton = modal.querySelector("#saveClientButton");

  modal.querySelectorAll("[data-close-form]").forEach((button) => {
    button.addEventListener("click", closeClientForm);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeClientForm();
    }
  });

  form.querySelector("#clientFullName")?.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saveButton.disabled) return;

    const formData = new FormData(form);
    const clientData = Object.fromEntries(formData.entries());

    errorElement.hidden = true;
    errorElement.textContent = "";

    saveButton.disabled = true;
    saveButton.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving…</span>';

    try {
      if (editing) {
        await updateClient(client.id, clientData);
      } else {
        await createClient(clientData);
      }

      closeClientForm();
      document.body.classList.remove("client-form-open");

      showFeedback(
        editing
          ? "Client details updated successfully."
          : "Client registered successfully.",
        "success"
      );

      await loadClients();
    } catch (error) {
      console.error("HomeRent: Unable to save client.", error);

      errorElement.textContent =
        error.message || "Unable to save the client.";

      errorElement.hidden = false;
    } finally {
      if (saveButton.isConnected) {
        saveButton.disabled = false;
        saveButton.innerHTML = editing
          ? '<i class="fa-solid fa-floppy-disk"></i><span>Save changes</span>'
          : '<i class="fa-solid fa-floppy-disk"></i><span>Register client</span>';
      }
    }
  });

}

// ------------------------------------------------------------
// CLIENT ACTIONS
// ------------------------------------------------------------

async function handleClientAction(action, clientId, button) {
  const client = state.clients.find((item) => item.id === clientId);

  if (!client) {
    showFeedback("This client record is no longer available.", "error");
    await loadClients();
    return;
  }

  if (action === "details") {
    // The detail page will be added in the next module step.
    window.location.href =
      `clients-details.html?id=${encodeURIComponent(client.id)}`;
    return;
  }

  if (action === "edit") {
    openClientForm(client);
    return;
  }

  if (action === "archive") {
    const confirmed = window.confirm(
      `Archive ${displayName(client)}?\n\n` +
      "The client record will be retained for historical reference. " +
      "Before archiving, verify that no active tenancy or unresolved " +
      "financial obligation remains."
    );

    if (!confirmed) return;

    if (button) button.disabled = true;

    try {
      await archiveClient(client.id);

      showFeedback("Client archived successfully.", "success");
      await loadClients();
    } catch (error) {
      console.error("HomeRent: Unable to archive client.", error);

      showFeedback(
        error.message || "Unable to archive this client.",
        "error"
      );
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  }
}

// ------------------------------------------------------------
// EXPORT FILTERED CLIENTS
// ------------------------------------------------------------

function exportClients() {
  const clients = state.filteredClients;

  if (!clients.length) {
    showFeedback("There are no client records to export.", "info");
    return;
  }

  const columns = [
    ["Client ID", "clientNumber"],
    ["Full name", "fullName"],
    ["Client type", "clientType"],
    ["Phone", "phone"],
    ["Alternative phone", "alternativePhone"],
    ["Email", "email"],
    ["Address", "address"],
    ["Status", "status"],
    ["Registration date", "createdAt"]
  ];

  const csvEscape = (value) => {
    const text = String(value ?? "");

    // Prevent spreadsheet formula execution from untrusted fields.
    const safeText = /^[\s]*[=+\-@]/.test(text)
      ? `'${text}`
      : text;

    return `"${safeText.replace(/"/g, '""')}"`;
  };

  const rows = [
    columns.map(([label]) => csvEscape(label)).join(","),
    ...clients.map((client) =>
      columns.map(([, key]) => {
        return csvEscape(
          key === "createdAt"
            ? formatDate(client.createdAt)
            : client[key]
        );
      }).join(",")
    )
  ];

  const blob = new Blob(
    ["\uFEFF" + rows.join("\r\n")],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `homerent-clients-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showFeedback("Client export prepared successfully.", "success");
}

// ------------------------------------------------------------
// MOBILE SIDEBAR
// ------------------------------------------------------------

function closeSidebar() {
  elements.sidebar?.classList.remove("is-open");
  elements.sidebarOverlay?.classList.remove("is-visible");

  elements.mobileMenuButton?.setAttribute("aria-expanded", "false");
}

function initSidebar() {
  elements.mobileMenuButton?.addEventListener("click", () => {
    const open = !elements.sidebar?.classList.contains("is-open");

    elements.sidebar?.classList.toggle("is-open", open);
    elements.sidebarOverlay?.classList.toggle("is-visible", open);

    elements.mobileMenuButton.setAttribute(
      "aria-expanded",
      String(open)
    );
  });

  elements.sidebarOverlay?.addEventListener("click", closeSidebar);

  elements.sidebar?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });
}

// ------------------------------------------------------------
// ADD ROOM MODAL INTEGRATION
//
// The existing component exports initAddRoom(), which returns
// a controller with open() and close() methods.
// ------------------------------------------------------------

function initAddRoomButton() {
  let controller;

  try {
    controller = initAddRoom();
  } catch (error) {
    console.error("HomeRent: Add Room modal could not initialize.", error);
  }

  elements.mobileAddRoomButton?.addEventListener("click", () => {
    if (controller?.open) {
      controller.open();
    } else {
      showFeedback(
        "The Add Room modal could not be opened. Please reload the page.",
        "error"
      );
    }
  });
}

// ------------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------------

function initEvents() {
  elements.search?.addEventListener("input", applyFilters);
  elements.status?.addEventListener("change", applyFilters);
  elements.sort?.addEventListener("change", applyFilters);

  elements.addButton?.addEventListener("click", () => {
    openClientForm();
  });

  elements.emptyAddButton?.addEventListener("click", () => {
    openClientForm();
  });

  elements.refreshButton?.addEventListener("click", loadClients);

  elements.resetButton?.addEventListener("click", () => {
    if (elements.search) elements.search.value = "";
    if (elements.status) elements.status.value = "all";
    if (elements.sort) elements.sort.value = "newest";

    applyFilters();
  });

  elements.exportButton?.addEventListener("click", exportClients);

  elements.previousPage?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      renderDirectory();
    }
  });

  elements.nextPage?.addEventListener("click", () => {
    const pageCount = Math.max(
      1,
      Math.ceil(state.filteredClients.length / PAGE_SIZE)
    );

    if (state.page < pageCount) {
      state.page += 1;
      renderDirectory();
    }
  });

  // Delegate actions for both desktop rows and mobile cards.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action][data-client-id]");

    if (!button) return;

    const action = button.dataset.action;
    const clientId = button.dataset.clientId;

    if (!["details", "edit", "archive"].includes(action)) return;

    handleClientAction(action, clientId, button);
  });

  // Refresh when another HomeRent module announces client changes.
  window.addEventListener("homerent:clients-changed", loadClients);

  elements.logoutButton?.addEventListener("click", async () => {
    const confirmed = window.confirm("Do you want to log out?");

    if (!confirmed) return;

    // Use the existing Firebase Auth instance.
    try {
      const { auth } = await import("../../js/firebase.js");
      const { signOut } = await import(
        "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"
      );

      await signOut(auth);
      window.location.href = "../auth/login.html";
    } catch (error) {
      console.error("HomeRent: Logout failed.", error);
      showFeedback("Unable to log out. Please try again.", "error");
    }
  });
}

// ------------------------------------------------------------
// INITIALIZE
//
// Authentication protection and shared branding are already
// initialized by Clients.html. This file handles the directory.
// ------------------------------------------------------------

async function initializeClientsPage() {
  if (state.initialized) return;

  state.initialized = true;

  initEvents();
  initSidebar();
  initAddRoomButton();

  await loadClients();
}

initializeClientsPage();