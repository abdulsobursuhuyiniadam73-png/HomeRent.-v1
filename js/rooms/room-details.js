/* ============================================================
   HOMERENT — ROOM DETAILS CONTROLLER
   File: js/rooms/room-details.js

   Uses:
   - Existing Firebase authentication
   - Existing Firestore database
   - Central branding loader
   - Central settings
   - Existing dashboard mobile sidebar behaviour
   ============================================================ */

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { auth, db } from "../firebase.js";

import { applyGlobalBranding } from "../core/branding.js";
import { getSettings } from "../core/settings.js";


const $ = (id) => document.getElementById(id);

const ui = {
  sidebar: $("sidebar"),
  overlay: $("sidebarOverlay"),
  menu: $("mobileMenuButton"),
  logout: $("logoutButton"),

  loading: $("detailsLoading"),
  error: $("detailsError"),
  errorText: $("detailsErrorText"),
  retry: $("retryDetails"),
  body: $("roomDetailsBody"),

  title: $("roomTitle"),
  name: $("roomName"),
  typeLabel: $("roomTypeLabel"),
  status: $("roomStatus"),

  roomNumber: $("fieldRoomNumber"),
  type: $("fieldType"),
  fieldStatus: $("fieldStatus"),
  price: $("fieldPrice"),
  period: $("fieldPeriod"),
  size: $("fieldSize"),
  location: $("fieldLocation"),
  id: $("fieldId"),
  notes: $("fieldNotes"),
  created: $("fieldCreated"),
  updated: $("fieldUpdated")
};

let currentRoomId = "";
let currentSettings = getSettings();
let authenticatedUser = null;


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  setupSidebar();
  setupLogout();

  ui.retry?.addEventListener("click", loadRoom);

  currentRoomId = new URLSearchParams(
    window.location.search
  ).get("id") || "";

  try {
    await applyGlobalBranding();
    currentSettings = getSettings();
  } catch (error) {
    console.error("HomeRent: Branding initialization failed.", error);
  }

  if (!currentRoomId) {
    showError(
      "No room ID was provided. Return to Rooms and select a room."
    );
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("../auth/login.html");
      return;
    }

    authenticatedUser = user;
    await loadRoom();
  });
}


/* ============================================================
   MOBILE SIDEBAR
   Matches the dashboard IDs and CSS classes.
   ============================================================ */

function setupSidebar() {
  ui.menu?.addEventListener("click", () => {
    const isOpen = ui.sidebar?.classList.contains("open");

    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  ui.overlay?.addEventListener("click", closeSidebar);

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) {
      closeSidebar();
    }
  });
}

function openSidebar() {
  if (!ui.sidebar) return;

  ui.sidebar.classList.add("open");
  ui.overlay?.classList.add("active");

  ui.menu?.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  ui.sidebar?.classList.remove("open");
  ui.overlay?.classList.remove("active");

  ui.menu?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}


/* ============================================================
   LOGOUT
   ============================================================ */

function setupLogout() {
  ui.logout?.addEventListener("click", async () => {
    ui.logout.disabled = true;

    try {
      await signOut(auth);
      window.location.replace("../auth/login.html");
    } catch (error) {
      console.error("HomeRent: Logout failed.", error);

      alert("Logout failed. Please try again.");
      ui.logout.disabled = false;
    }
  });
}


/* ============================================================
   LOAD ROOM FROM FIRESTORE
   ============================================================ */

async function loadRoom() {
  if (!authenticatedUser || !currentRoomId) return;

  showLoading();

  try {
    const roomRef = doc(db, "rooms", currentRoomId);
    const snapshot = await getDoc(roomRef);

    if (!snapshot.exists()) {
      throw new Error(
        "This room record no longer exists or could not be found."
      );
    }

    const room = {
      id: snapshot.id,
      ...snapshot.data()
    };

    if (room.isArchived === true) {
      throw new Error(
        "This room has been archived. Return to Rooms to review the available records."
      );
    }

    renderRoom(room);
    showDetails();

  } catch (error) {
    console.error("HomeRent: Could not load room details.", error);

    showError(
      error.message ||
      "Could not load the room. Check your connection and Firestore permissions."
    );
  }
}


/* ============================================================
   RENDER ROOM INFORMATION
   ============================================================ */

function renderRoom(room) {
  const roomNumber =
    room.roomNumber || room.name || "Unnamed room";

  const roomType = formatLabel(room.type || "Not specified");
  const roomStatus = formatLabel(room.status || "Unknown");

  if (ui.title) {
    ui.title.textContent = roomNumber;
  }

  if (ui.name) {
    ui.name.textContent = roomNumber;
  }

  if (ui.typeLabel) {
    ui.typeLabel.textContent = roomType;
  }

  if (ui.status) {
    ui.status.textContent = roomStatus;
    ui.status.className =
      `details-status status-${slugify(room.status || "unknown")}`;
  }

  setText(ui.roomNumber, roomNumber);
  setText(ui.type, roomType);
  setText(ui.fieldStatus, roomStatus);

  setText(
    ui.price,
    formatPrice(room.currentPrice)
  );

  setText(
    ui.period,
    formatLabel(room.rentalPeriod || "Not specified")
  );

  setText(
    ui.size,
    room.size || "Not specified"
  );

  setText(
    ui.location,
    room.location || "Not specified"
  );

  setText(ui.id, room.id);

  setText(
    ui.notes,
    room.conditionNotes || "No condition notes have been recorded."
  );

  setText(
    ui.created,
    formatDate(room.createdAt)
  );

  setText(
    ui.updated,
    formatDate(room.updatedAt)
  );

  document.title =
    `${currentSettings.businessName || "HomeRent"} — ${roomNumber}`;
}


/* ============================================================
   FORMATTING HELPERS
   ============================================================ */

function formatPrice(value) {
  if (value === undefined || value === null || value === "") {
    return "Not specified";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  const currency = currentSettings.currency || "GHS";

  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    const symbol = currentSettings.currencySymbol || "₵";

    return `${symbol}${amount.toLocaleString("en-GH", {
      maximumFractionDigits: 2
    })}`;
  }
}

function formatLabel(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function slugify(value) {
  return String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function setText(element, value) {
  if (element) {
    element.textContent = value ?? "Not specified";
  }
}

function formatDate(value) {
  if (!value) return "Not available";

  let date;

  if (typeof value.toDate === "function") {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value.seconds === "number") {
    date = new Date(value.seconds * 1000);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}


/* ============================================================
   PAGE STATES
   ============================================================ */

function showLoading() {
  if (ui.loading) ui.loading.hidden = false;
  if (ui.error) ui.error.hidden = true;
  if (ui.body) ui.body.hidden = true;
}

function showDetails() {
  if (ui.loading) ui.loading.hidden = true;
  if (ui.error) ui.error.hidden = true;
  if (ui.body) ui.body.hidden = false;
}

function showError(message) {
  if (ui.loading) ui.loading.hidden = true;
  if (ui.body) ui.body.hidden = true;
  if (ui.error) ui.error.hidden = false;

  setText(ui.errorText, message);

  // A retry cannot help when the URL has no room ID.
  if (ui.retry) {
    ui.retry.hidden = !currentRoomId;
  }
}