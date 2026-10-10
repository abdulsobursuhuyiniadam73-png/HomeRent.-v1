// File: js/rooms/room-details.js
//
// HomeRent — Room Details Controller
// Loads one room from Firestore and displays its real stored data.

import { auth } from "../firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getRoomById
} from "./rooms-service.js";

import {
  loadSettings
} from "../core/settings-service.js";

import {
  applyGlobalBranding
} from "../core/branding.js";

// --------------------------------------------------
// ELEMENTS
// --------------------------------------------------

const $ = (selector) => document.querySelector(selector);

const elements = {
  loading: $("#roomDetailsLoading"),
  error: $("#roomDetailsError"),
  errorText: $("#roomDetailsErrorText"),
  retryButton: $("#retryRoomDetailsButton"),
  content: $("#roomDetailsContent"),

  headingNumber: $("#roomDetailsNumber"),
  headingType: $("#roomDetailsType"),
  headingStatus: $("#roomDetailsStatus"),

  roomNumber: $("#detailRoomNumber"),
  roomType: $("#detailRoomType"),
  roomPrice: $("#detailRoomPrice"),
  roomSize: $("#detailRoomSize"),
  roomLocation: $("#detailRoomLocation"),
  archiveStatus: $("#detailArchiveStatus"),
  roomCondition: $("#detailRoomCondition"),
  roomCreated: $("#detailRoomCreated"),
  roomUpdated: $("#detailRoomUpdated"),
  roomPhotos: $("#detailRoomPhotos"),

  editButton: $("#editRoomDetailsButton")
};

const params = new URLSearchParams(window.location.search);
const roomId = params.get("id");

let currentRoom = null;
let authReady = false;
let signedInUser = null;
let isLoading = false;

// --------------------------------------------------
// DISPLAY HELPERS
// --------------------------------------------------

function setText(element, value) {
  if (element) {
    element.textContent = value ?? "";
  }
}

function formatRoomType(type) {
  if (type === "living") return "Living Room";
  if (type === "store") return "Storeroom";

  return "Room";
}

function formatStatus(status) {
  const labels = {
    available: "Available",
    occupied: "Occupied",
    reserved: "Reserved",
    maintenance: "Maintenance"
  };

  return labels[status] || "Unknown status";
}

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Price not set";
  }

  const currency = window.homeRentSettings?.currency || "GHS";

  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `₵${amount.toFixed(2)}`;
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "Not recorded";

  let date;

  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

// --------------------------------------------------
// PAGE STATES
// --------------------------------------------------

function showLoading() {
  elements.loading.hidden = false;
  elements.error.hidden = true;
  elements.content.hidden = true;
}

function showError(message) {
  elements.loading.hidden = true;
  elements.content.hidden = true;
  elements.error.hidden = false;

  setText(elements.errorText, message);
}

function showContent() {
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.content.hidden = false;
}

// --------------------------------------------------
// RENDER ROOM
// --------------------------------------------------

function renderRoom(room) {
  currentRoom = room;

  const number = room.roomNumber || "Unnamed room";
  const type = formatRoomType(room.type);
  const status = formatStatus(room.status);

  setText(elements.headingNumber, number);
  setText(elements.headingType, type);

  setText(elements.headingStatus, status);

  elements.headingStatus.className =
    `room-details-status ${room.status || ""}`;

  setText(elements.roomNumber, number);
  setText(elements.roomType, type);
  setText(elements.roomPrice, formatMoney(room.currentPrice));
  setText(elements.roomSize, room.size || "Not recorded");
  setText(elements.roomLocation, room.location || "Not recorded");

  setText(
    elements.archiveStatus,
    room.isArchived === true ? "Archived" : "Active"
  );

  setText(
    elements.roomCondition,
    room.conditionNotes || "No condition notes recorded."
  );

  setText(elements.roomCreated, formatDate(room.createdAt));
  setText(elements.roomUpdated, formatDate(room.updatedAt));

  const photos = Array.isArray(room.photoUrls)
    ? room.photoUrls.filter(Boolean)
    : [];

  if (photos.length === 0) {
    setText(elements.roomPhotos, "No room photos recorded.");
  } else {
    setText(
      elements.roomPhotos,
      `${photos.length} photo link${photos.length === 1 ? "" : "s"} recorded.`
    );
  }

  // Existing room-edit modal is not imported here yet.
  // We will connect this button to the shared modal in the next step.
  elements.editButton.disabled = room.isArchived === true;

  showContent();
}

// --------------------------------------------------
// LOAD ROOM FROM FIRESTORE
// --------------------------------------------------

async function loadRoomDetails() {
  if (isLoading) return;

  if (!authReady) return;

  if (!signedInUser) {
    window.location.href = "../../login.html";
    return;
  }

  if (!roomId) {
    showError(
      "No room ID was supplied. Return to Rooms and select View Details."
    );
    return;
  }

  isLoading = true;
  showLoading();

  try {
    const room = await getRoomById(roomId);

    renderRoom(room);
  } catch (error) {
    console.error("HomeRent: Could not display room details.", error);

    showError(
      error.message || "Unable to load this room. Please try again."
    );
  } finally {
    isLoading = false;
  }
}

// --------------------------------------------------
// EVENTS
// --------------------------------------------------

elements.retryButton?.addEventListener("click", loadRoomDetails);

elements.editButton?.addEventListener("click", () => {
  if (!currentRoom) return;

  // Intentionally disabled until connected to the existing shared modal.
  // Avoid presenting a button that silently does nothing.
  window.alert(
    "Room editing from this page has not been connected yet. " +
    "Return to Rooms and use the existing Edit button."
  );
});

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

async function initializeBranding() {
  try {
    await loadSettings();
    applyGlobalBranding();
  } catch (error) {
    console.error("HomeRent: Could not initialize branding.", error);
  }
}

async function initializePage() {
  await initializeBranding();

  onAuthStateChanged(auth, async (user) => {
    signedInUser = user;
    authReady = true;

    await loadRoomDetails();
  });
}

initializePage();