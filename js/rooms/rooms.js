// File: js/rooms/rooms.js
//
// HomeRent — Rooms Page Controller
// Connects the Rooms page, Firestore service and shared Add/Edit modal.

import { auth } from "../firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getRooms,
  archiveRoom
} from "./rooms-service.js";

import { initAddRoom } from "../../components/add-room/add-room.js";

import { loadSettings } from "../core/settings-service.js";
import { applyGlobalBranding } from "../core/branding.js";

// --------------------------------------------------
// PAGE STATE
// --------------------------------------------------

let allRooms = [];
let activeFilter = "all";
let isLoading = false;

const addRoomController = initAddRoom();

const $ = (selector) => document.querySelector(selector);

const elements = {
  totalRooms: $("#totalRooms"),
  availableRooms: $("#availableRooms"),
  occupiedRooms: $("#occupiedRooms"),
  maintenanceRooms: $("#maintenanceRooms"),

  roomSearch: $("#roomSearch"),
  clearSearchButton: $("#clearSearchButton"),
  roomSort: $("#roomSort"),
  roomFilters: $("#roomFilters"),
  allRoomsCount: $("#allRoomsCount"),
  roomsResultsText: $("#roomsResultsText"),

  roomsLoading: $("#roomsLoading"),
  roomsGrid: $("#roomsGrid"),
  roomsEmptyState: $("#roomsEmptyState"),
  emptyStateTitle: $("#emptyStateTitle"),
  emptyStateMessage: $("#emptyStateMessage"),
  roomsErrorState: $("#roomsErrorState"),
  roomsErrorMessage: $("#roomsErrorMessage"),

  addRoomButton: $("#addRoomButton"),
  mobileAddRoomButton: $("#mobileAddRoomButton"),
  emptyStateAddButton: $("#emptyStateAddButton"),
  refreshRoomsButton: $("#refreshRoomsButton"),
  retryRoomsButton: $("#retryRoomsButton"),

  mobileMenuButton: $("#mobileMenuButton"),
  sidebar: $("#sidebar"),
  sidebarOverlay: $("#sidebarOverlay"),
  sidebarClose: $("#sidebarClose"),

  profileButton: $("#profileButton"),
  profileInitial: $("#profileInitial"),
  notificationsButton: $("#notificationsButton")
};

// --------------------------------------------------
// SAFE TEXT HELPERS
// Avoid injecting database text as HTML.
// --------------------------------------------------

function setText(element, value) {
  if (element) element.textContent = value ?? "";
}

function formatMoney(value) {
  const settingsCurrency = window.homeRentSettings?.currency || "GHS";

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Price not set";
  }

  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: settingsCurrency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `₵${amount.toFixed(2)}`;
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  let date;

  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

// --------------------------------------------------
// STATUS LABELS
// --------------------------------------------------

function statusLabel(status) {
  const labels = {
    available: "Available",
    occupied: "Occupied",
    reserved: "Reserved",
    maintenance: "Maintenance"
  };

  return labels[status] || "Unknown status";
}

function typeLabel(type) {
  if (type === "living") return "Living room";
  if (type === "store") return "Storeroom";

  return "Room";
}

// --------------------------------------------------
// FILTER AND SORT
// --------------------------------------------------

function getVisibleRooms() {
  const query = normalize(elements.roomSearch?.value);
  const sort = elements.roomSort?.value || "number-asc";

  let rooms = allRooms.filter((room) => {
    if (room.isArchived === true) return false;

    if (activeFilter === "living" && room.type !== "living") return false;
    if (activeFilter === "store" && room.type !== "store") return false;
    if (activeFilter === "vacant" && room.status !== "available") return false;
    if (activeFilter === "occupied" && room.status !== "occupied") return false;

    if (
      activeFilter === "maintenance" &&
      room.status !== "maintenance"
    ) {
      return false;
    }

    if (!query) return true;

    const searchableText = [
      room.roomNumber,
      room.type,
      room.status,
      room.size,
      room.location,
      room.conditionNotes
    ]
      .map(normalize)
      .join(" ");

    return searchableText.includes(query);
  });

  rooms = [...rooms];

  if (sort === "price-high") {
    rooms.sort((a, b) =>
      Number(b.currentPrice || 0) - Number(a.currentPrice || 0)
    );
  } else if (sort === "price-low") {
    rooms.sort((a, b) =>
      Number(a.currentPrice || 0) - Number(b.currentPrice || 0)
    );
  } else if (sort === "recent") {
    rooms.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });
  } else {
    rooms.sort((a, b) =>
      String(a.roomNumber || "").localeCompare(
        String(b.roomNumber || ""),
        undefined,
        { numeric: true, sensitivity: "base" }
      )
    );
  }

  return rooms;
}

// --------------------------------------------------
// SUMMARY COUNTS
// --------------------------------------------------

function updateSummary() {
  const activeRooms = allRooms.filter(
    (room) => room.isArchived !== true
  );

  setText(elements.totalRooms, activeRooms.length);

  setText(
    elements.availableRooms,
    activeRooms.filter((room) => room.status === "available").length
  );

  setText(
    elements.occupiedRooms,
    activeRooms.filter((room) => room.status === "occupied").length
  );

  setText(
    elements.maintenanceRooms,
    activeRooms.filter((room) => room.status === "maintenance").length
  );

  setText(elements.allRoomsCount, activeRooms.length);
}

// --------------------------------------------------
// BUILD ROOM CARD
// --------------------------------------------------

function createRoomCard(room) {
  const card = document.createElement("article");
  card.className = "room-card";
  card.dataset.roomId = room.id;

  const top = document.createElement("div");
  top.className = "room-card-top";

  const roomIdentity = document.createElement("div");
  roomIdentity.className = "room-card-identity";

  const icon = document.createElement("div");
  icon.className = "room-card-icon";
  icon.setAttribute("aria-hidden", "true");

  const iconElement = document.createElement("i");
  iconElement.className = room.type === "store"
    ? "fa-solid fa-box"
    : "fa-solid fa-house";

  icon.appendChild(iconElement);

  const identityText = document.createElement("div");

  const roomNumber = document.createElement("h3");
  roomNumber.className = "room-card-number";
  roomNumber.textContent = room.roomNumber || "Unnamed room";

  const roomType = document.createElement("p");
  roomType.className = "room-card-type";
  roomType.textContent = typeLabel(room.type);

  identityText.append(roomNumber, roomType);
  roomIdentity.append(icon, identityText);

  const status = document.createElement("span");
  status.className = `room-status status-${room.status || "unknown"}`;
  status.textContent = statusLabel(room.status);

  top.append(roomIdentity, status);

  const details = document.createElement("div");
  details.className = "room-card-details";

  const priceLabel = document.createElement("span");
  priceLabel.className = "room-detail-label";
  priceLabel.textContent = "Rental price";

  const price = document.createElement("strong");
  price.className = "room-card-price";
  price.textContent = formatMoney(room.currentPrice);

  details.append(priceLabel, price);

  if (room.size) {
    const size = document.createElement("p");
    size.className = "room-card-detail";
    size.textContent = `Size: ${room.size}`;
    details.appendChild(size);
  }

  if (room.location) {
    const location = document.createElement("p");
    location.className = "room-card-detail";
    location.textContent = `Location: ${room.location}`;
    details.appendChild(location);
  }

  if (room.conditionNotes) {
    const notes = document.createElement("p");
    notes.className = "room-card-notes";
    notes.textContent = room.conditionNotes;
    details.appendChild(notes);
  }

  const actions = document.createElement("div");
  actions.className = "room-card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "secondary-button";
  editButton.dataset.action = "edit";
  editButton.dataset.roomId = room.id;
  editButton.innerHTML = '<i class="fa-solid fa-pen"></i> Edit';

  const archiveButton = document.createElement("button");
  archiveButton.type = "button";
  archiveButton.className = "text-button room-archive-button";
  archiveButton.dataset.action = "archive";
  archiveButton.dataset.roomId = room.id;
  archiveButton.innerHTML = '<i class="fa-solid fa-box-archive"></i> Archive';

  actions.append(editButton, archiveButton);

  card.append(top, details, actions);

  return card;
}

// --------------------------------------------------
// RENDER ROOMS
// --------------------------------------------------

function renderRooms() {
  if (!elements.roomsGrid) return;

  const rooms = getVisibleRooms();

  elements.roomsGrid.replaceChildren();

  rooms.forEach((room) => {
    elements.roomsGrid.appendChild(createRoomCard(room));
  });

  if (elements.roomsLoading) {
    elements.roomsLoading.hidden = true;
  }

  elements.roomsGrid.setAttribute("aria-busy", "false");

  setText(
    elements.roomsResultsText,
    `${rooms.length} ${rooms.length === 1 ? "room" : "rooms"} found`
  );

  if (elements.clearSearchButton) {
    elements.clearSearchButton.hidden = !elements.roomSearch?.value;
  }

  const showEmpty = rooms.length === 0;

  if (elements.roomsEmptyState) {
    elements.roomsEmptyState.hidden = !showEmpty;
  }

  if (elements.roomsErrorState) {
    elements.roomsErrorState.hidden = true;
  }

  if (showEmpty) {
    const hasAnyRooms = allRooms.some(
      (room) => room.isArchived !== true
    );

    setText(
      elements.emptyStateTitle,
      hasAnyRooms ? "No matching rooms" : "No rooms yet"
    );

    setText(
      elements.emptyStateMessage,
      hasAnyRooms
        ? "Try another search or filter to find a room."
        : "Add your first room to begin managing your property."
    );
  }

  updateSummary();
}

// --------------------------------------------------
// LOAD DATA
// --------------------------------------------------

async function loadRooms() {
  if (isLoading) return;

  isLoading = true;

  if (elements.roomsLoading) {
    elements.roomsLoading.hidden = false;
  }

  if (elements.roomsErrorState) {
    elements.roomsErrorState.hidden = true;
  }

  if (elements.roomsEmptyState) {
    elements.roomsEmptyState.hidden = true;
  }

  if (elements.roomsGrid) {
    elements.roomsGrid.setAttribute("aria-busy", "true");
  }

  setText(elements.roomsResultsText, "Loading rooms...");

  try {
    allRooms = await getRooms();

    renderRooms();
  } catch (error) {
    console.error("HomeRent: Rooms page failed to load.", error);

    if (elements.roomsLoading) {
      elements.roomsLoading.hidden = true;
    }

    if (elements.roomsGrid) {
      elements.roomsGrid.replaceChildren();
      elements.roomsGrid.setAttribute("aria-busy", "false");
    }

    if (elements.roomsErrorState) {
      elements.roomsErrorState.hidden = false;
    }

    setText(
      elements.roomsErrorMessage,
      error.message || "Check your connection and try again."
    );

    setText(elements.roomsResultsText, "Unable to load rooms.");
  } finally {
    isLoading = false;
  }
}

// --------------------------------------------------
// SIDEBAR — MOBILE
// Uses the existing sidebar class names.
// --------------------------------------------------

function openSidebar() {
  elements.sidebar?.classList.add("open");
  elements.sidebarOverlay?.classList.add("active");
  elements.mobileMenuButton?.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  elements.sidebar?.classList.remove("open");
  elements.sidebarOverlay?.classList.remove("active");
  elements.mobileMenuButton?.setAttribute("aria-expanded", "false");
}

function initSidebar() {
  elements.mobileMenuButton?.addEventListener("click", openSidebar);
  elements.sidebarClose?.addEventListener("click", closeSidebar);
  elements.sidebarOverlay?.addEventListener("click", closeSidebar);

  elements.sidebar?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
}

// --------------------------------------------------
// EVENT HANDLERS
// --------------------------------------------------

function initRoomActions() {
  elements.addRoomButton?.addEventListener("click", () => {
    addRoomController.open();
  });

  elements.mobileAddRoomButton?.addEventListener("click", () => {
    addRoomController.open();
  });

  elements.emptyStateAddButton?.addEventListener("click", () => {
    addRoomController.open();
  });

  elements.refreshRoomsButton?.addEventListener("click", loadRooms);
  elements.retryRoomsButton?.addEventListener("click", loadRooms);

  elements.roomSearch?.addEventListener("input", renderRooms);
  elements.roomSort?.addEventListener("change", renderRooms);

  elements.clearSearchButton?.addEventListener("click", () => {
    if (elements.roomSearch) {
      elements.roomSearch.value = "";
      elements.roomSearch.focus();
    }

    renderRooms();
  });

  elements.roomFilters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");

    if (!button) return;

    activeFilter = button.dataset.filter || "all";

    elements.roomFilters
      .querySelectorAll("[data-filter]")
      .forEach((filterButton) => {
        const isActive = filterButton === button;

        filterButton.classList.toggle("active", isActive);
        filterButton.setAttribute(
          "aria-pressed",
          String(isActive)
        );
      });

    renderRooms();
  });

  elements.roomsGrid?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const roomId = button.dataset.roomId;
    const action = button.dataset.action;

    if (!roomId) return;

    if (action === "edit") {
      addRoomController.open(roomId);
      return;
    }

    if (action === "archive") {
      const room = allRooms.find((item) => item.id === roomId);

      if (!room) return;

      const confirmed = window.confirm(
        `Archive ${room.roomNumber || "this room"}?\n\n` +
        "The record will be kept in the database, but hidden from the active Rooms list."
      );

      if (!confirmed) return;

      button.disabled = true;

      try {
        await archiveRoom(roomId);
        await loadRooms();
      } catch (error) {
        console.error("HomeRent: Could not archive room.", error);
        window.alert(error.message || "Unable to archive this room.");
      } finally {
        button.disabled = false;
      }
    }
  });

  // Refresh when the shared modal saves successfully.
  window.addEventListener("homerent:rooms-changed", loadRooms);

  // Keep account initial aligned with the signed-in user.
  const user = auth.currentUser;

  if (user && elements.profileInitial) {
    const initialSource = user.displayName || user.email || "A";
    elements.profileInitial.textContent =
      initialSource.trim().charAt(0).toUpperCase();
  }

  // A safe sign-out action for the profile control.
  // Replace this with the shared account menu if your dashboard already has one.
  elements.profileButton?.addEventListener("click", async () => {
    const confirmed = window.confirm("Do you want to sign out?");

    if (!confirmed) return;

    try {
      await signOut(auth);
      window.location.href = "../../login.html";
    } catch (error) {
      console.error("HomeRent: Sign-out failed.", error);
      window.alert("Unable to sign out. Please try again.");
    }
  });

  elements.notificationsButton?.addEventListener("click", () => {
    window.alert("Notifications will be connected in a later step.");
  });
}

// --------------------------------------------------
// INITIALIZE BRANDING AND PAGE
// --------------------------------------------------

async function initializeRoomsPage() {
  try {
    await loadSettings();
    applyGlobalBranding();
  } catch (error) {
    console.error("HomeRent: Could not initialize branding.", error);
  }

  initSidebar();
  initRoomActions();
  await loadRooms();
}

initializeRoomsPage();