/*
 * HOMERENT — CLIENT PROFILE
 * File: js/clients/clients-details.js
 *
 * Responsibilities:
 * 1. Load the selected client from Firestore.
 * 2. Display identity and contact details.
 * 3. Provide Call and WhatsApp links.
 * 4. Display real tenancy information from Firestore.
 * 5. Show recorded initial payments without inventing balances.
 * 6. Preserve profile actions, branding and mobile navigation.
 */

import { getClientById } from "./clients-service.js";
import { getTenancies } from "../tenancies/tenancies-service.js";
import { applyGlobalBranding } from "../core/branding.js";
import { initAddRoom } from "../../components/add-room/add-room.js";

/* ---------------------------------------------------------
   1. PAGE STATE
--------------------------------------------------------- */

let currentClient = null;
let currentClientId = "";
let addRoomController = null;

/* ---------------------------------------------------------
   2. GENERAL HELPERS
--------------------------------------------------------- */

const $ = (selector) => document.querySelector(selector);

function setText(selector, value, fallback = "Not provided") {
  const element = $(selector);
  if (!element) return;

  const cleaned =
    value === null || value === undefined ? "" : String(value).trim();

  element.textContent = cleaned || fallback;
}

function firstValue(object, keys, fallback = "") {
  for (const key of keys) {
    const value = object?.[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return fallback;
}

function formatDate(value) {
  if (!value) return "Not recorded";

  let date;

  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function toDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  const text = String(value);
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function getBusinessName() {
  const element = $("[data-setting='businessName']");
  return element?.textContent?.trim() || "our property office";
}

function getCurrencyCode() {
  return window.homeRentSettings?.currency || "GHS";
}

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Not linked";

  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: getCurrencyCode(),
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${getCurrencyCode()} ${amount.toFixed(2)}`;
  }
}

function showFeedback(message, type = "info") {
  const element = $("#clientProfileFeedback");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = false;
}

function hideFeedback() {
  const element = $("#clientProfileFeedback");
  if (!element) return;

  element.textContent = "";
  element.hidden = true;
}

function isArchived(client) {
  return (
    client?.isArchived === true ||
    String(client?.status || "").toLowerCase() === "archived"
  );
}

/* ---------------------------------------------------------
   3. CALL AND WHATSAPP
   Ghanaian number examples:
   0241234567, 233241234567, +233241234567
--------------------------------------------------------- */

function normalisePhone(phone) {
  let number = String(phone || "").replace(/\D/g, "");

  if (number.length === 10 && number.startsWith("0")) {
    number = `233${number.slice(1)}`;
  }

  if (!/^233\d{9}$/.test(number)) {
    return "";
  }

  return `+${number}`;
}

function makeWhatsAppNumber(phone) {
  return normalisePhone(phone).replace(/\D/g, "");
}

function configureContactActions(phone, fullName) {
  const callButton = $("#profileCallButton");
  const whatsappButton = $("#profileWhatsAppButton");
  const phoneNumber = normalisePhone(phone);

  if (callButton) {
    if (phoneNumber) {
      callButton.href = `tel:${phoneNumber}`;
      callButton.hidden = false;
      callButton.removeAttribute("aria-disabled");
      callButton.classList.remove("is-disabled");
    } else {
      callButton.removeAttribute("href");
      callButton.hidden = true;
      callButton.setAttribute("aria-disabled", "true");
      callButton.classList.add("is-disabled");
    }
  }

  if (whatsappButton) {
    const whatsappNumber = makeWhatsAppNumber(phoneNumber);

    if (whatsappNumber) {
      const message =
        `Hello ${fullName || "there"}, this is ${getBusinessName()}. ` +
        "I am contacting you regarding your room or storeroom records.";

      whatsappButton.href =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      whatsappButton.target = "_blank";
      whatsappButton.rel = "noopener noreferrer";
      whatsappButton.hidden = false;
      whatsappButton.removeAttribute("aria-disabled");
      whatsappButton.classList.remove("is-disabled");
    } else {
      whatsappButton.removeAttribute("href");
      whatsappButton.hidden = true;
      whatsappButton.setAttribute("aria-disabled", "true");
      whatsappButton.classList.add("is-disabled");
    }
  }
}

/* ---------------------------------------------------------
   4. CLIENT IDENTITY
--------------------------------------------------------- */

function getClientIdFromUrl() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("id") ||
    params.get("clientId") ||
    params.get("client")
  );
}

function renderAvatar(name) {
  const avatar = $("#profileAvatar");
  if (!avatar) return;

  avatar.innerHTML =
    '<i class="fa-solid fa-user" aria-hidden="true"></i>';

  avatar.setAttribute("aria-label", `Avatar for ${name}`);
}

function renderClientIdentity(client) {
  const fullName = firstValue(
    client,
    ["fullName", "name", "clientName"],
    "Unnamed client"
  );

  const phone = firstValue(client, ["phone", "phoneNumber"]);
  const email = firstValue(client, ["email"]);

  const clientNumber = firstValue(
    client,
    ["clientNumber", "clientId", "clientCode"],
    currentClientId
  );

  const status = String(client.status || "active").toLowerCase();
  const active = status === "active" && !isArchived(client);

  setText("#profileClientName", fullName, "Unnamed client");
  setText("#profileClientNumber", clientNumber, "ID not assigned");
  setText("#profilePhone", phone, "No phone number recorded");
  setText("#profileEmail", email, "No email recorded");

  setText(
    "#profileRegistrationDate",
    formatDate(
      firstValue(client, [
        "createdAt",
        "dateCreated",
        "registrationDate"
      ])
    ),
    "Not recorded"
  );

  // Do not use an old client room field as the source of truth.
  // The room display is updated from actual tenancy records below.
  setText("#profileRoomDetails", "No room linked");

  const statusElement = $("#profileClientStatus");

  if (statusElement) {
    statusElement.textContent = active ? "Active client" : "Inactive client";
    statusElement.classList.toggle("is-active", active);
    statusElement.classList.toggle("is-inactive", !active);
  }

  renderAvatar(fullName);
  configureContactActions(phone, fullName);

  setText("#profileRentPaid", "Not linked");
  setText(
    "#profileRentPaidCaption",
    "Loading recorded initial payments..."
  );

  setText("#profileOutstandingBalance", "Not linked");
  setText(
    "#profileBalanceStatus",
    "Full payment history is not connected yet."
  );
}

/* ---------------------------------------------------------
   5. TENANCY DISPLAY HELPERS
--------------------------------------------------------- */

function getTenancyRoomLabel(tenancy) {
  const room = tenancy.roomNumber || tenancy.roomName || "Room";
  const type = String(tenancy.roomType || "").toLowerCase();

  const isStore =
    type === "store" ||
    type === "storeroom" ||
    type === "store room";

  return `${room}${isStore ? " (Storeroom)" : ""}`;
}

function tenancyDate(value) {
  return formatDate(value);
}

function isCurrentTenancy(tenancy, today) {
  if (String(tenancy.status || "").toLowerCase() === "ended") {
    return false;
  }

  const start = toDate(tenancy.startDate);
  const end = toDate(tenancy.endDate);

  if (start && start > today) return false;

  if (end) {
    end.setHours(23, 59, 59, 999);
    if (end < today) return false;
  }

  return true;
}

function renderTenancyPlaceholder() {
  setText("#profileRoomDetails", "No room linked");

  setText("#currentTenancyStatus", "Not linked");
  setText("#currentTenancyRoom", "No tenancy record linked");
  setText("#currentTenancyStartDate", "Not recorded");
  setText("#currentTenancyEndDate", "Not recorded");
  setText("#currentTenancyRate", "Not calculated");

  setText("#tenancyProgressTitle", "Tenancy progress unavailable");
  setText(
    "#tenancyProgressCaption",
    "Connect a verified tenancy record to show the rental period."
  );
  setText(
    "#tenancyProgressNote",
    "Days elapsed and days remaining will appear here."
  );

  const fill = $("#tenancyProgressFill");
  if (fill) fill.style.width = "0%";

  const track = $("#tenancyProgressTrack");
  if (track) track.setAttribute("aria-valuenow", "0");

  setText("#profileRentPaid", "Not linked");
  setText(
    "#profileRentPaidCaption",
    "No verified initial payments are linked to this profile."
  );

  setText("#profileOutstandingBalance", "Not linked");
  setText(
    "#profileBalanceStatus",
    "Full payment history is not connected yet."
  );
}

function renderClientTenancies(records) {
  const clientTenancies = records
    .filter(
      (item) =>
        String(item.clientId || "") === String(currentClientId)
    )
    .sort((a, b) => {
      const aDate = toDate(a.startDate)?.getTime() || 0;
      const bDate = toDate(b.startDate)?.getTime() || 0;
      return bDate - aDate;
    });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeTenancies = clientTenancies.filter(
    (item) => isCurrentTenancy(item, today)
  );

  // A client may rent several rooms using separate tenancy records.
  const roomSummary = activeTenancies.length
    ? [...new Set(activeTenancies.map(getTenancyRoomLabel))].join(", ")
    : "No room linked";

  setText("#profileRoomDetails", roomSummary, "No room linked");

  // Prefer a current tenancy. Otherwise show the most recent historical
  // tenancy so ended records remain visible on the client profile.
  const selected =
    activeTenancies[0] || clientTenancies[0] || null;

  if (!selected) {
    renderTenancyPlaceholder();
    return;
  }

  const status = String(selected.status || "").toLowerCase();

  const displayedStatus =
    status === "ended"
      ? "Ended"
      : activeTenancies.includes(selected)
        ? "Active"
        : "Upcoming / expired";

  setText("#currentTenancyStatus", displayedStatus);
  setText("#currentTenancyRoom", getTenancyRoomLabel(selected));
  setText("#currentTenancyStartDate", tenancyDate(selected.startDate));
  setText("#currentTenancyEndDate", tenancyDate(selected.endDate));
  setText("#currentTenancyRate", formatMoney(selected.rentAmount));

  // Calculate rental-period progress.
  const start = toDate(selected.startDate);
  const end = toDate(selected.endDate);
  const now = new Date();

  let percent = 0;

  if (start && end && end.getTime() > start.getTime()) {
    percent = Math.max(
      0,
      Math.min(
        100,
        ((now.getTime() - start.getTime()) /
          (end.getTime() - start.getTime())) *
          100
      )
    );
  }

  const roundedPercent = Math.round(percent);

  const fill = $("#tenancyProgressFill");
  if (fill) fill.style.width = `${roundedPercent}%`;

  const track = $("#tenancyProgressTrack");
  if (track) {
    track.setAttribute("aria-valuenow", String(roundedPercent));
  }

  setText("#tenancyProgressTitle", "Rental period");
  setText("#tenancyProgressCaption", `${roundedPercent}% elapsed`);

  let progressNote = "Tenancy dates are available.";

  if (end) {
    const endDay = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );

    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const days = Math.ceil(
      (endDay.getTime() - todayDay.getTime()) / 86400000
    );

    progressNote =
      days > 0
        ? `${days} day(s) remaining.`
        : days === 0
          ? "Tenancy end date is today."
          : `Tenancy ended ${Math.abs(days)} day(s) ago.`;
  }

  setText("#tenancyProgressNote", progressNote);

  // Only sum actual initial payments saved on tenancy records.
  // This is not a complete rent-payment history.
  const initialPaid = clientTenancies.reduce((sum, item) => {
    const amount = Number(item.initialPayment?.amount);

    return Number.isFinite(amount) && amount > 0
      ? sum + amount
      : sum;
  }, 0);

  const hasInitialPayments = clientTenancies.some(
    (item) => Number(item.initialPayment?.amount) > 0
  );

  setText(
    "#profileRentPaid",
    hasInitialPayments ? formatMoney(initialPaid) : "Not linked"
  );

  setText(
    "#profileRentPaidCaption",
    hasInitialPayments
      ? "Recorded initial payments across this client's tenancy records. Other payments will appear when the Payments module is connected."
      : "No initial payments are recorded in these tenancy records. Full payment history is not connected yet."
  );

  // Never calculate a misleading balance from initial payments alone.
  setText("#profileOutstandingBalance", "Not linked");
  setText(
    "#profileBalanceStatus",
    "Full payment history is not connected yet."
  );
}

/* ---------------------------------------------------------
   6. SAFE MODAL FRAMEWORK
--------------------------------------------------------- */

function closeProfileModal() {
  document.querySelectorAll(".client-profile-modal").forEach((modal) => {
    modal.remove();
  });

  document.body.classList.remove("client-profile-modal-open");
}

function openProfileModal({ title, subtitle = "", content = "" }) {
  closeProfileModal();

  const modal = document.createElement("div");
  modal.className = "client-profile-modal";
  modal.setAttribute("role", "presentation");

  const dialog = document.createElement("section");
  dialog.className = "client-profile-modal-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", title);

  const header = document.createElement("header");
  header.className = "client-profile-modal-header";

  const headingGroup = document.createElement("div");
  const heading = document.createElement("h2");
  heading.textContent = title;
  headingGroup.appendChild(heading);

  if (subtitle) {
    const description = document.createElement("p");
    description.textContent = subtitle;
    headingGroup.appendChild(description);
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "client-profile-modal-close";
  closeButton.setAttribute("aria-label", "Close dialog");
  closeButton.innerHTML = "&times;";
  closeButton.addEventListener("click", closeProfileModal);

  header.append(headingGroup, closeButton);

  const body = document.createElement("div");
  body.className = "client-profile-modal-body";

  if (content instanceof Node) {
    body.appendChild(content);
  } else {
    body.textContent = content;
  }

  dialog.append(header, body);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  document.body.classList.add("client-profile-modal-open");

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeProfileModal();
  });

  const onEscape = (event) => {
    if (event.key === "Escape") {
      closeProfileModal();
      document.removeEventListener("keydown", onEscape);
    }
  };

  document.addEventListener("keydown", onEscape);
  closeButton.focus();

  return { modal, body };
}

function createDetailRow(label, value) {
  const row = document.createElement("div");
  row.className = "client-profile-detail-row";

  const labelElement = document.createElement("span");
  labelElement.className = "client-profile-detail-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.className = "client-profile-detail-value";
  valueElement.textContent =
    value === null || value === undefined || String(value).trim() === ""
      ? "Not recorded"
      : String(value);

  row.append(labelElement, valueElement);
  return row;
}

function createEmptyState(title, description) {
  const wrapper = document.createElement("div");
  wrapper.className = "client-profile-empty-state";

  const icon = document.createElement("div");
  icon.className = "client-profile-empty-icon";
  icon.innerHTML =
    '<i class="fa-regular fa-folder-open" aria-hidden="true"></i>';

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = description;

  wrapper.append(icon, heading, paragraph);
  return wrapper;
}

/* ---------------------------------------------------------
   7. OVERVIEW MODAL
--------------------------------------------------------- */

function openOverviewModal() {
  if (!currentClient) return;

  const client = currentClient;
  const fullName = firstValue(
    client,
    ["fullName", "name"],
    "Unnamed client"
  );

  const container = document.createElement("div");
  container.className = "client-profile-overview";

  const personalSection = document.createElement("section");
  personalSection.className = "client-profile-modal-section";

  const personalHeading = document.createElement("h3");
  personalHeading.textContent = "Personal details";
  personalSection.appendChild(personalHeading);

  const personalRows = [
    ["Full name", fullName],
    [
      "Client number",
      firstValue(client, ["clientNumber", "clientId"], currentClientId)
    ],
    ["Client type", firstValue(client, ["clientType"])],
    ["Phone", firstValue(client, ["phone", "phoneNumber"])],
    ["Alternative phone", firstValue(client, ["alternativePhone"])],
    ["Email", firstValue(client, ["email"])],
    ["Address", firstValue(client, ["address"])],
    ["Identification type", firstValue(client, ["identificationType"])],
    ["Identification number", firstValue(client, ["identificationNumber"])],
    [
      "Date registered",
      formatDate(firstValue(client, ["createdAt", "registrationDate"]))
    ]
  ];

  personalRows.forEach(([label, value]) => {
    personalSection.appendChild(createDetailRow(label, value));
  });

  const emergencySection = document.createElement("section");
  emergencySection.className = "client-profile-modal-section";

  const emergencyHeading = document.createElement("h3");
  emergencyHeading.textContent = "Next of kin / emergency contact";
  emergencySection.appendChild(emergencyHeading);

  [
    ["Contact name", firstValue(client, ["emergencyContactName"])],
    ["Contact phone", firstValue(client, ["emergencyContactPhone"])]
  ].forEach(([label, value]) => {
    emergencySection.appendChild(createDetailRow(label, value));
  });

  const notesSection = document.createElement("section");
  notesSection.className = "client-profile-modal-section";

  const notesHeading = document.createElement("h3");
  notesHeading.textContent = "Notes";
  notesSection.appendChild(notesHeading);

  const notes = document.createElement("p");
  notes.className = "client-profile-notes";
  notes.textContent = firstValue(client, ["notes"], "No notes recorded.");
  notesSection.appendChild(notes);

  const tenancySection = document.createElement("section");
  tenancySection.className = "client-profile-modal-section";

  const tenancyHeading = document.createElement("h3");
  tenancyHeading.textContent = "Current tenancy";
  tenancySection.appendChild(tenancyHeading);

  tenancySection.appendChild(
    createDetailRow(
      "Room",
      $("#currentTenancyRoom")?.textContent || "No room linked"
    )
  );

  tenancySection.appendChild(
    createDetailRow(
      "Status",
      $("#currentTenancyStatus")?.textContent || "Not linked"
    )
  );

  tenancySection.appendChild(
    createDetailRow(
      "Start date",
      $("#currentTenancyStartDate")?.textContent || "Not recorded"
    )
  );

  tenancySection.appendChild(
    createDetailRow(
      "End date",
      $("#currentTenancyEndDate")?.textContent || "Not recorded"
    )
  );

  tenancySection.appendChild(
    createDetailRow(
      "Agreed rent",
      $("#currentTenancyRate")?.textContent || "Not calculated"
    )
  );

  container.append(
    personalSection,
    emergencySection,
    notesSection,
    tenancySection
  );

  openProfileModal({
    title: "Client overview",
    subtitle: fullName,
    content: container
  });
}

/* ---------------------------------------------------------
   8. RENT HISTORY, PAYMENTS AND DOCUMENTS
--------------------------------------------------------- */

function openRentHistoryModal() {
  if (!currentClient) return;

  const content = createEmptyState(
    "Full rent history not connected",
    "This profile currently shows tenancy information and recorded initial payments. The complete rent history will be available when the Payments module is connected."
  );

  openProfileModal({
    title: "Rent history",
    subtitle: firstValue(currentClient, ["fullName", "name"], "Client"),
    content
  });
}

function openPaymentsModal() {
  if (!currentClient) return;

  const content = createEmptyState(
    "Full payment history not connected",
    "The complete payment and receipt history will appear here when the Payments module is connected. Amounts will be calculated from actual payment records."
  );

  openProfileModal({
    title: "Payments and receipts",
    subtitle: firstValue(currentClient, ["fullName", "name"], "Client"),
    content
  });
}

function openDocumentsModal() {
  if (!currentClient) return;

  const content = createEmptyState(
    "No document records loaded",
    "Client-related documents will appear here when connected to the system's actual document records."
  );

  openProfileModal({
    title: "Client documents",
    subtitle: firstValue(currentClient, ["fullName", "name"], "Client"),
    content
  });
}

/* ---------------------------------------------------------
   9. PROFILE BUTTONS AND MOBILE NAVIGATION
--------------------------------------------------------- */

function bindProfileActions() {
  $("#openClientOverviewButton")?.addEventListener(
    "click",
    openOverviewModal
  );

  $("#openRentHistoryButton")?.addEventListener(
    "click",
    openRentHistoryModal
  );

  $("#openClientPaymentsButton")?.addEventListener(
    "click",
    openPaymentsModal
  );

  $("#openClientDocumentsButton")?.addEventListener(
    "click",
    openDocumentsModal
  );

  $("#mobileAddRoomButton")?.addEventListener("click", () => {
    if (addRoomController?.open) {
      addRoomController.open();
    } else {
      showFeedback(
        "The Add Room form is not available on this page.",
        "error"
      );
    }
  });

  const menuButton = $("#mobileMenuButton");
  const sidebar = $("#sidebar");
  const overlay = $("#sidebarOverlay");

  const closeSidebar = () => {
    sidebar?.classList.remove("is-open", "open", "active");
    overlay?.classList.remove("is-visible", "active");
    document.body.classList.remove("sidebar-open");
  };

  menuButton?.addEventListener("click", () => {
    const isOpen = sidebar?.classList.contains("is-open");

    sidebar?.classList.toggle("is-open", !isOpen);
    overlay?.classList.toggle("is-visible", !isOpen);
    document.body.classList.toggle("sidebar-open", !isOpen);
  });

  overlay?.addEventListener("click", closeSidebar);

  sidebar?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });
}

/* ---------------------------------------------------------
   10. LOAD CLIENT AND ITS TENANCIES
--------------------------------------------------------- */

async function loadClient() {
  currentClientId = getClientIdFromUrl();

  if (!currentClientId) {
    showFeedback(
      "No client ID was provided. Return to Clients and open a client profile.",
      "error"
    );

    setText("#profileClientName", "Client not selected");
    setText("#profileClientNumber", "Missing client ID");
    renderTenancyPlaceholder();
    return;
  }

  try {
    const result = await getClientById(currentClientId);

    // Support a plain client object or a service result containing data.
    const client =
      result?.data && typeof result.data === "object"
        ? { id: result.id || currentClientId, ...result.data }
        : result;

    if (!client || client.exists === false || isArchived(client)) {
      showFeedback(
        "This client could not be found or is archived.",
        "error"
      );

      setText("#profileClientName", "Client unavailable");
      setText("#profileClientNumber", currentClientId);
      renderTenancyPlaceholder();
      return;
    }

    currentClient = {
      ...client,
      id: client.id || currentClientId
    };

    hideFeedback();
    renderClientIdentity(currentClient);
    renderTenancyPlaceholder();

    // Load real records from the existing Tenancies service.
    // Failure to load tenancies must not break the client profile.
    try {
      const records = await getTenancies();

      renderClientTenancies(
        Array.isArray(records) ? records : []
      );
    } catch (tenancyError) {
      console.error(
        "HomeRent: failed to load client tenancy records.",
        tenancyError
      );

      renderTenancyPlaceholder();

      setText(
        "#profileRentPaidCaption",
        "Tenancy records could not be loaded. Check Firebase access and connection."
      );
    }
  } catch (error) {
    console.error("HomeRent: failed to load client profile.", error);

    showFeedback(
      "Unable to load this client. Check your connection and try again.",
      "error"
    );

    setText("#profileClientName", "Unable to load client");
    setText("#profileClientNumber", currentClientId);
    renderTenancyPlaceholder();
  }
}

/* ---------------------------------------------------------
   11. INITIALISE
--------------------------------------------------------- */

async function initialiseClientProfile() {
  try {
    await applyGlobalBranding();
  } catch (error) {
    console.warn(
      "HomeRent: branding could not be applied.",
      error
    );
  }

  try {
    addRoomController = initAddRoom();
  } catch (error) {
    console.warn(
      "HomeRent: Add Room form could not initialise.",
      error
    );
  }

  bindProfileActions();
  await loadClient();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseClientProfile,
    { once: true }
  );
} else {
  initialiseClientProfile();
}