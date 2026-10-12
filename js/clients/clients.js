/* ============================================================
   HOMERENT - CLIENTS PAGE CONTROLLER
   File: js/clients/clients.js

   Responsibilities:
   1. Protect the page using the existing authentication guard.
   2. Load global branding.
   3. Display, search, filter and sort clients.
   4. Add and edit clients.
   5. Archive and restore clients.
   6. Support mobile navigation and responsive client lists.
   ============================================================ */

import {
    protectPage,
    startInactivityProtection
} from "../auth/auth-guard.js";

import { logoutAdmin } from "../auth/auth.js";

import { applyGlobalBranding } from "../core/branding.js";

import {
    getClients,
    createClient,
    updateClient,
    archiveClient,
    restoreClient
} from "./clients-service.js";


/* ============================================================
   PAGE INITIALIZATION
   ============================================================ */

protectPage();
startInactivityProtection();

document.addEventListener("DOMContentLoaded", initializeClientsPage);

async function initializeClientsPage() {
    bindEvents();
    setCurrentYear();
    await applyGlobalBranding();
    await loadClients();
}


/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = (selector) => document.querySelector(selector);

const elements = {
    search: $("#clientSearch"),
    statusFilter: $("#statusFilter"),
    sort: $("#sortClients"),
    tableBody: $("#clientsTableBody"),
    mobileList: $("#mobileClientList"),
    tableWrap: $("#tableWrap"),
    loading: $("#loadingState"),
    error: $("#errorState"),
    errorMessage: $("#errorMessage"),
    empty: $("#emptyState"),
    emptyTitle: $("#emptyTitle"),
    emptyMessage: $("#emptyMessage"),
    pageMessage: $("#pageMessage"),
    dialog: $("#clientDialog"),
    form: $("#clientForm"),
    formError: $("#formError"),
    dialogTitle: $("#dialogTitle"),
    saveButton: $("#saveClientButton")
};

let clients = [];
let editingClientId = null;
let currentView = [];


/* ============================================================
   EVENT BINDING
   ============================================================ */

function bindEvents() {
    elements.search?.addEventListener("input", renderClients);
    elements.statusFilter?.addEventListener("change", renderClients);
    elements.sort?.addEventListener("change", renderClients);

    $("#refreshClientsButton")?.addEventListener("click", loadClients);
    $("#retryButton")?.addEventListener("click", loadClients);

    $("#addClientButton")?.addEventListener("click", () => openClientDialog());
    $("#emptyAddButton")?.addEventListener("click", () => openClientDialog());

    $("#closeDialogButton")?.addEventListener("click", closeClientDialog);
    $("#cancelDialogButton")?.addEventListener("click", closeClientDialog);

    elements.form?.addEventListener("submit", handleFormSubmit);

    $("#profileButton")?.addEventListener("click", handleLogout);

    $("#mobileMenuButton")?.addEventListener("click", openSidebar);
    $("#sidebarClose")?.addEventListener("click", closeSidebar);
    $("#sidebarOverlay")?.addEventListener("click", closeSidebar);

    // Close the dialog when the user clicks its backdrop.
    elements.dialog?.addEventListener("click", (event) => {
        if (event.target === elements.dialog) {
            closeClientDialog();
        }
    });

    // Delegate table and card actions to one event listener.
    elements.tableBody?.addEventListener("click", handleClientAction);
    elements.mobileList?.addEventListener("click", handleClientAction);
}


/* ============================================================
   LOAD CLIENTS
   ============================================================ */

async function loadClients() {
    showLoading();

    try {
        // The service excludes archived clients by default.
        clients = await getClients();

        renderSummary();
        renderClients();
        showPageMessage("");

    } catch (error) {
        console.error("HomeRent: Unable to load clients.", error);

        showError(
            error?.message ||
            "Unable to load clients. Check your internet connection and try again."
        );
    }
}


/* ============================================================
   SUMMARY CARDS
   ============================================================ */

function renderSummary() {
    const activeCount = clients.filter(
        (client) => client.status === "active"
    ).length;

    const inactiveCount = clients.filter(
        (client) => client.status === "inactive"
    ).length;

    setText("#totalClients", clients.length);
    setText("#activeClients", activeCount);
    setText("#formerClients", inactiveCount);
    setText("#recentClients", clients.filter(isRecentClient).length);
}

function isRecentClient(client) {
    const createdAt = toDate(client.createdAt);

    if (!createdAt) return false;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return createdAt >= thirtyDaysAgo;
}


/* ============================================================
   SEARCH, FILTER AND SORT
   ============================================================ */

function getVisibleClients() {
    const query = (elements.search?.value || "")
        .trim()
        .toLowerCase();

    const selectedStatus = elements.statusFilter?.value || "all";
    const sortBy = elements.sort?.value || "newest";

    let result = clients.filter((client) => {
        const searchableText = [
            client.fullName,
            client.phone,
            client.email,
            client.address,
            client.clientType
        ].filter(Boolean).join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(query);

        const matchesStatus =
            selectedStatus === "all" ||
            client.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
        if (sortBy === "name") {
            return (a.fullName || "").localeCompare(b.fullName || "");
        }

        if (sortBy === "oldest") {
            return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
        }

        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    });

    return result;
}


/* ============================================================
   RENDER CLIENTS
   ============================================================ */

function renderClients() {
    currentView = getVisibleClients();

    if (elements.tableBody) {
        elements.tableBody.innerHTML = currentView
            .map(renderTableRow)
            .join("");
    }

    if (elements.mobileList) {
        elements.mobileList.innerHTML = currentView
            .map(renderMobileCard)
            .join("");
    }

    const hasClients = currentView.length > 0;

    if (elements.tableWrap) {
        elements.tableWrap.hidden = !hasClients;
    }

    if (elements.mobileList) {
        elements.mobileList.hidden = !hasClients;
    }

    if (elements.empty) {
        elements.empty.hidden = hasClients;
    }

    if (!hasClients) {
        const hasSearch = Boolean(elements.search?.value.trim());

        setText(
            "#emptyTitle",
            hasSearch ? "No matching clients" : "No clients yet"
        );

        setText(
            "#emptyMessage",
            hasSearch
                ? "Try another search term or change the filters."
                : "Add your first client to start managing your rental records."
        );

        const emptyAddButton = $("#emptyAddButton");
        if (emptyAddButton) {
            emptyAddButton.hidden = hasSearch;
        }
    }
}


/* ============================================================
   CLIENT TABLE ROW
   ============================================================ */

function renderTableRow(client) {
    const id = escapeAttribute(client.id);
    const name = escapeHTML(client.fullName || "Unnamed client");
    const initials = escapeHTML(getInitials(client.fullName));
    const phone = escapeHTML(client.phone || "—");
    const email = escapeHTML(client.email || "—");
    const type = escapeHTML(formatClientType(client.clientType));
    const status = escapeHTML(client.status || "active");

    return `
        <tr>
            <td>
                <div class="client-identity">
                    <span class="client-avatar">${initials}</span>
                    <div>
                        <strong>${name}</strong>
                        <small>${email}</small>
                    </div>
                </div>
            </td>
            <td>${phone}</td>
            <td>${type}</td>
            <td>
                <span class="status-badge status-${status}">
                    ${escapeHTML(capitalize(status))}
                </span>
            </td>
            <td>${escapeHTML(formatDate(client.createdAt))}</td>
            <td>
                <div class="client-actions">
                    <button class="icon-action" type="button"
                        data-action="edit" data-id="${id}"
                        aria-label="Edit ${name}" title="Edit client">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-action danger-action" type="button"
                        data-action="archive" data-id="${id}"
                        aria-label="Archive ${name}" title="Archive client">
                        <i class="fa-solid fa-box-archive"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}


/* ============================================================
   MOBILE CLIENT CARD
   ============================================================ */

function renderMobileCard(client) {
    const id = escapeAttribute(client.id);
    const name = escapeHTML(client.fullName || "Unnamed client");
    const initials = escapeHTML(getInitials(client.fullName));
    const status = escapeHTML(client.status || "active");

    return `
        <article class="mobile-client-card">
            <div class="mobile-client-heading">
                <span class="client-avatar">${initials}</span>
                <div class="mobile-client-info">
                    <strong>${name}</strong>
                    <span>${escapeHTML(client.phone || "No phone number")}</span>
                </div>
                <span class="status-badge status-${status}">
                    ${escapeHTML(capitalize(status))}
                </span>
            </div>

            <div class="mobile-client-details">
                <p>
                    <i class="fa-regular fa-envelope"></i>
                    ${escapeHTML(client.email || "No email provided")}
                </p>
                <p>
                    <i class="fa-solid fa-user-tag"></i>
                    ${escapeHTML(formatClientType(client.clientType))}
                </p>
                <p>
                    <i class="fa-regular fa-calendar"></i>
                    Added ${escapeHTML(formatDate(client.createdAt))}
                </p>
            </div>

            <div class="mobile-client-actions">
                <button type="button" data-action="edit" data-id="${id}">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
                <button type="button" data-action="archive" data-id="${id}">
                    <i class="fa-solid fa-box-archive"></i> Archive
                </button>
            </div>
        </article>
    `;
}


/* ============================================================
   OPEN ADD / EDIT DIALOG
   ============================================================ */

function openClientDialog(client = null) {
    editingClientId = client?.id || null;

    elements.form?.reset();

    if (elements.formError) {
        elements.formError.hidden = true;
        elements.formError.textContent = "";
    }

    setText(
        "#dialogTitle",
        client ? "Edit client" : "Add new client"
    );

    setFormValue("fullName", client?.fullName || "");
    setFormValue("phone", client?.phone || "");
    setFormValue("email", client?.email || "");
    setFormValue("clientType", client?.clientType || "individual");
    setFormValue("clientStatus", client?.status || "active");
    setFormValue("address", client?.address || "");
    setFormValue("notes", client?.notes || "");

    if (elements.saveButton) {
        elements.saveButton.disabled = false;
        elements.saveButton.innerHTML = client
            ? '<i class="fa-solid fa-floppy-disk"></i> Save changes'
            : '<i class="fa-solid fa-user-plus"></i> Add client';
    }

    if (elements.dialog?.showModal) {
        elements.dialog.showModal();
    } else if (elements.dialog) {
        elements.dialog.setAttribute("open", "");
    }
}

function closeClientDialog() {
    if (elements.dialog?.open && elements.dialog.close) {
        elements.dialog.close();
    } else {
        elements.dialog?.removeAttribute("open");
    }

    editingClientId = null;
}


/* ============================================================
   SAVE CLIENT
   ============================================================ */

async function handleFormSubmit(event) {
    event.preventDefault();

    const clientData = {
        fullName: getFormValue("fullName"),
        phone: getFormValue("phone"),
        email: getFormValue("email"),
        clientType: getFormValue("clientType") || "individual",
        status: getFormValue("clientStatus") || "active",
        address: getFormValue("address"),
        notes: getFormValue("notes")
    };

    if (!clientData.fullName || !clientData.phone) {
        showFormError("Client name and phone number are required.");
        return;
    }

    setSaving(true);

    try {
        if (editingClientId) {
            await updateClient(editingClientId, clientData);
            showPageMessage("Client details updated successfully.");
        } else {
            await createClient(clientData);
            showPageMessage("Client added successfully.");
        }

        closeClientDialog();
        await loadClients();

    } catch (error) {
        console.error("HomeRent: Unable to save client.", error);

        // Display validation errors returned by the service, if any.
        const validationMessages = error?.validationErrors
            ? Object.values(error.validationErrors).join(" ")
            : "";

        showFormError(
            validationMessages ||
            error?.message ||
            "Unable to save this client. Please try again."
        );

    } finally {
        setSaving(false);
    }
}

function setSaving(isSaving) {
    if (!elements.saveButton) return;

    elements.saveButton.disabled = isSaving;

    if (isSaving) {
        elements.saveButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }
}

function showFormError(message) {
    if (!elements.formError) {
        alert(message);
        return;
    }

    elements.formError.textContent = message;
    elements.formError.hidden = false;
}


/* ============================================================
   HANDLE EDIT / ARCHIVE / RESTORE ACTIONS
   ============================================================ */

async function handleClientAction(event) {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;
    const client = clients.find((item) => item.id === id);

    if (!id) return;

    if (action === "edit") {
        if (client) openClientDialog(client);
        return;
    }

    if (action === "archive") {
        await handleArchive(id);
        return;
    }

    if (action === "restore") {
        await handleRestore(id);
    }
}

async function handleArchive(clientId) {
    const client = clients.find((item) => item.id === clientId);

    if (!client) return;

    const confirmed = window.confirm(
        `Archive ${client.fullName || "this client"}?\n\n` +
        "The client will be removed from the active directory. " +
        "This should not be used to delete financial or tenancy history."
    );

    if (!confirmed) return;

    try {
        await archiveClient(clientId);
        showPageMessage("Client archived successfully.");
        await loadClients();
    } catch (error) {
        console.error("HomeRent: Unable to archive client.", error);
        showPageMessage(
            error?.message || "Unable to archive this client.",
            true
        );
    }
}

async function handleRestore(clientId) {
    try {
        await restoreClient(clientId);
        showPageMessage("Client restored successfully.");
        await loadClients();
    } catch (error) {
        console.error("HomeRent: Unable to restore client.", error);
        showPageMessage(
            error?.message || "Unable to restore this client.",
            true
        );
    }
}


/* ============================================================
   SIDEBAR / MOBILE NAVIGATION
   ============================================================ */

function openSidebar() {
    document.body.classList.add("sidebar-open");
    $("#sidebarOverlay")?.removeAttribute("hidden");
}

function closeSidebar() {
    document.body.classList.remove("sidebar-open");

    const overlay = $("#sidebarOverlay");
    if (overlay) overlay.setAttribute("hidden", "");
}


/* ============================================================
   SIGN OUT
   ============================================================ */

async function handleLogout() {
    const confirmed = window.confirm("Do you want to sign out of HomeRent?");

    if (!confirmed) return;

    try {
        await logoutAdmin();
        window.location.href = "../../pages/auth/login.html";
    } catch (error) {
        console.error("HomeRent: Sign out failed.", error);
        showPageMessage("Unable to sign out. Please try again.", true);
    }
}


/* ============================================================
   PAGE STATES
   ============================================================ */

function showLoading() {
    if (elements.loading) elements.loading.hidden = false;
    if (elements.error) elements.error.hidden = true;
    if (elements.empty) elements.empty.hidden = true;
    if (elements.tableWrap) elements.tableWrap.hidden = true;
    if (elements.mobileList) elements.mobileList.hidden = true;
}

function showError(message) {
    if (elements.loading) elements.loading.hidden = true;
    if (elements.error) elements.error.hidden = false;
    if (elements.empty) elements.empty.hidden = true;
    if (elements.tableWrap) elements.tableWrap.hidden = true;
    if (elements.mobileList) elements.mobileList.hidden = true;

    if (elements.errorMessage) {
        elements.errorMessage.textContent = message;
    }
}

function showPageMessage(message, isError = false) {
    if (!elements.pageMessage) return;

    elements.pageMessage.textContent = message;
    elements.pageMessage.hidden = !message;
    elements.pageMessage.classList.toggle("message-error", isError);
    elements.pageMessage.classList.toggle("message-success", Boolean(message) && !isError);
}


/* ============================================================
   GENERAL HELPERS
   ============================================================ */

function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = String(value ?? "");
}

function setFormValue(name, value) {
    const field = elements.form?.elements.namedItem(name);
    if (field) field.value = value;
}

function getFormValue(name) {
    const field = elements.form?.elements.namedItem(name);
    return String(field?.va