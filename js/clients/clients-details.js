/*
 * HOMERENT — CLIENT PROFILE
 * File: js/clients/clients-details.js
 *
 * Responsibilities:
 * 1. Load the selected client from Firestore.
 * 2. Display identity and contact details.
 * 3. Provide call and WhatsApp links.
 * 4. Connect profile action buttons.
 * 5. Display safe empty states until tenancy/payment/document
 *    records are connected to their real data services.
 *
 * CHANGE HERE:
 * If your clients-service.js exports different function names,
 * update the import and loadClient() function below.
 */

import { getClientById } from "./clients-service.js";
import { applyGlobalBranding } from "../core/branding.js";
import { initAddRoom } from "../../components/add-room/add-room.js";

/* ---------------------------------------------------------
   1. PAGE STATE
--------------------------------------------------------- */

let currentClient = null;
let currentClientId = "";
let addRoomController = null;

/* ---------------------------------------------------------
   2. SMALL HELPERS
--------------------------------------------------------- */

const $ = (selector) => document.querySelector(selector);

function setText(selector, value, fallback = "Not provided") {
  const element = $(selector);
  if (!element) return;

  const cleaned =
    value === null || value === undefined
      ? ""
      : String(value).trim();

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

  // Firestore Timestamp support.
  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getBusinessName() {
  const element = $("[data-setting='businessName']");
  return element?.textContent?.trim() || "our property office";
}

function normalisePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function makeWhatsAppNumber(phone) {
  // WhatsApp URLs require country code and digits.
  // CHANGE HERE if your stored phone numbers use another format.
  let number = normalisePhone(phone).replace(/\D/g, "");

  // Ghana local number example: 0241234567 -> 233241234567.
  if (number.startsWith("0") && number.length === 10) {
    number = `233${number.slice(1)}`;
  }

  return number;
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
   3. CLIENT ID FROM URL
--------------------------------------------------------- */

function getClientIdFromUrl() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("id") ||
    params.get("clientId") ||
    params.get("client")
  );
}

/* ---------------------------------------------------------
   4. CLIENT IDENTITY
--------------------------------------------------------- */

function renderAvatar(name) {
  const avatar = $("#profileAvatar");
  if (!avatar) return;

  // Use the Font Awesome user icon already supported by the page.
  avatar.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
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

  setText(
    "#profileRoomDetails",
    firstValue(client, [
      "roomName",
      "roomNumber",
      "currentRoomName",
      "roomType"
    ]),
    "No room linked"
  );

  const statusElement = $("#profileClientStatus");

  if (statusElement) {
    statusElement.textContent = active ? "Active client" : "Inactive client";
    statusElement.classList.toggle("is-active", active);
    statusElement.classList.toggle("is-inactive", !active);
  }

  renderAvatar(fullName);
  configureContactActions(phone, fullName);

  // Avoid treating missing financial records as zero.
  setText("#profileRentPaid", "Not linked");
  setText(
    "#profileRentPaidCaption",
    "Connect verified rent records to calculate this amount."
  );

  setText("#profileOutstandingBalance", "Not linked");
  setText(
    "#profileBalanceStatus",
    "Connect tenancy charges and payments to calculate the balance."
  );
}

function configureContactActions(phone, fullName) {
  const callButton = $("#profileCallButton");
  const whatsappButton = $("#profileWhatsAppButton");

  if (callButton) {
    if (phone) {
      callButton.href = `tel:${normalisePhone(phone)}`;
      callButton.removeAttribute("aria-disabled");
      callButton.classList.remove("is-disabled");
    } else {
      callButton.removeAttribute("href");
      callButton.setAttribute("aria-disabled", "true");
      callButton.classList.add("is-disabled");
    }
  }

  if (whatsappButton) {
    const whatsappNumber = makeWhatsAppNumber(phone);

    if (whatsappNumber) {
      const businessName = getBusinessName();
      const message =
        `Hello ${fullName}, this is ${businessName}. ` +
        "I am contacting you regarding your room or storeroom records.";

      whatsappButton.href =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      whatsappButton.target = "_blank";
      whatsappButton.rel = "noopener noreferrer";
      whatsappButton.removeAttribute("aria-disabled");
      whatsappButton.classList.remove("is-disabled");
    } else {
      whatsappButton.removeAttribute("href");
      whatsappButton.setAttribute("aria-disabled", "true");
      whatsappButton.classList.add("is-disabled");
    }
  }
}

/* ---------------------------------------------------------
   5. SAFE MODAL FRAMEWORK
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

  // Content is created as plain text/DOM by this module.
  // Do not insert user-supplied notes as raw HTML.
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
  icon.innerHTML = '<i class="fa-regular fa-folder-open" aria-hidden="true"></i>';

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = description;

  wrapper.append(icon, heading, paragraph);
  return wrapper;
}

/* ---------------------------------------------------------
   6. OVERVIEW MODAL
--------------------------------------------------------- */

function openOverviewModal() {
  if (!currentClient) return;

  const client = currentClient;
  const fullName = firstValue(client, ["fullName", "name"], "Unnamed client");

  const container = document.createElement("div");
  container.className = "client-profile-overview";

  const personalSection = document.createElement("section");
  personalSection.className = "client-profile-modal-section";

  const personalHeading = document.createElement("h3");
  personalHeading.textContent = "Personal details";
  personalSection.appendChild(personalHeading);

  const personalRows = [
    ["Full name", fullName],
    ["Client number", firstValue(client, ["clientNumber", "clientId"], currentClientId)],
    ["Client type", firstValue(client, ["clientType"])],
    ["Phone", firstValue(client, ["phone"])],
    ["Alternative phone", firstValue(client, ["alternativePhone"])],
    ["Email", firstValue(client, ["email"])],
    ["Address", firstValue(client, ["address"])],
    ["Identification type", firstValue(client, ["identificationType"])],
    ["Identification number", firstValue(client, ["identificationNumber"])],
    ["Date registered", formatDate(firstValue(client, ["createdAt", "registrationDate"]))]
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
    createEmptyState(
      "Tenancy details not connected",
      "The current room, tenancy dates, rental rate and days remaining will appear here once the profile is connected to the verified tenancy records."
    )
  );

  container.append(personalSection, emergencySection, notesSection, tenancySection);

  openProfileModal({
    title: "Client overview",
    subtitle: fullName,
    content: container
  });
}

/* ---------------------------------------------------------
   7. RENT HISTORY, PAYMENTS AND DOCUMENTS
--------------------------------------------------------- */

function openRentHistoryModal() {
  if (!currentClient) return;

  const content = createEmptyState(
    "No verified rent history loaded",
    "Rent periods will appear here after the profile is connected to your existing tenancy and rent records. No rent periods have been invented."
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
    "Payment records not connected",
    "Verified receipts will appear here with receipt ID, date, payment method, reference, amount and time. The total will be calculated from recorded payments only."
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
    "Client-related documents will appear here when connected to the system's actual document records. Download or bundle actions will be enabled once those files and permissions are available."
  );

  openProfileModal({
    title: "Client documents",
    subtitle: firstValue(currentClient, ["fullName", "name"], "Client"),
    content
  });
}

/* ---------------------------------------------------------
   8. CURRENT TENANCY EMPTY STATE
--------------------------------------------------------- */

function renderTenancyPlaceholder() {
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
}

/* ---------------------------------------------------------
   9. PAGE BUTTONS AND MOBILE NAVIGATION
--------------------------------------------------------- */

function bindProfileActions() {
  $("#openClientOverviewButton")?.addEventListener("click", openOverviewModal);
  $("#openRentHistoryButton")?.addEventListener("click", openRentHistoryModal);
  $("#openClientPaymentsButton")?.addEventListener("click", openPaymentsModal);
  $("#openClientDocumentsButton")?.addEventListener("click", openDocumentsModal);

  $("#mobileAddRoomButton")?.addEventListener("click", () => {
    if (addRoomController?.open) {
      addRoomController.open();
    } else {
      showFeedback("The Add Room form is not available on this page.", "error");
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
   10. LOAD CLIENT
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

    // Support services that return a Firestore document object
    // or a plain client data object.
    const client = result?.data && typeof result.data === "object"
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
    // Branding failure should not prevent the client profile loading.
    console.warn("HomeRent: branding could not be applied.", error);
  }

  try {
    addRoomController = initAddRoom();
  } catch (error) {
    console.warn("HomeRent: Add Room form could not initialise.", error);
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