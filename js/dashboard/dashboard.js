/* =========================================================
   HOMERENT DASHBOARD
   Clean foundation — no dependency on unfinished modules
   ========================================================= */

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { db, auth } from "../firebase.js";

import { loadSettings } from "../core/settings-service.js";
import { getSettings } from "../core/settings.js";


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

const sidebar = $("sidebar");
const sidebarOverlay = $("sidebarOverlay");
const mobileMenuButton = $("mobileMenuButton");
const quickSheetOverlay = $("quickSheetOverlay");
const quickSheetClose = $("quickSheetClose");

let settings = {};
let dashboardData = {
  rooms: [],
  clients: [],
  tenancies: [],
  payments: []
};


/* =========================================================
   STARTUP
   ========================================================= */

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  setupSidebar();
  setupMobileNavigation();
  setupDesktopNavigation();
  setupQuickActions();
  setupLogout();
  setupProfile();

  await loadDashboardBranding();
  await loadDashboardData();

  renderDashboard();
}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function setupSidebar() {
  if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", (event) => {
      event.preventDefault();
      openSidebar();
    });
  } else {
    console.warn("HomeRent: mobileMenuButton was not found.");
  }

  sidebarOverlay?.addEventListener("click", closeSidebar);

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 700) {
        closeSidebar();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
      closeQuickSheet();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) {
      closeSidebar();
    }
  });
}

function openSidebar() {
  if (!sidebar) {
    console.error("HomeRent: sidebar element was not found.");
    return;
  }

  sidebar.classList.add("open");
  sidebarOverlay?.classList.add("active");
  document.body.style.overflow = "hidden";

  console.log("HomeRent: Mobile sidebar opened.");
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("active");
  document.body.style.overflow = "";
}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {
  const routes = {
    home: "./index.html",
    rooms: "../rooms/index.html",
    tenants: "../clients/index.html",
    money: "../payments/index.html"
  };

  document.querySelectorAll("[data-mobile-page]").forEach((item) => {
    item.addEventListener("click", (event) => {
      const page = item.dataset.mobilePage;
      const route = routes[page];

      if (!route) {
        console.warn(`HomeRent: No mobile route for "${page}".`);
        return;
      }

      event.preventDefault();
      window.location.assign(route);
    });
  });
}


/* =========================================================
   DESKTOP NAVIGATION
   ========================================================= */

function setupDesktopNavigation() {
  const routes = {
    dashboard: "./index.html",
    rooms: "../rooms/index.html",
    tenancies: "../tenancies/index.html",
    payments: "../payments/index.html",
    receipts: "../receipts/index.html",
    finances: "../finances/index.html",
    reports: "../reports/index.html",
    documents: "../documents/index.html",
    settings: "../settings/index.html"
  };

  document.querySelectorAll("[data-page]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const page = link.dataset.page;
      const route = routes[page];

      if (!route) {
        console.warn(`HomeRent: No desktop route for "${page}".`);
        return;
      }

      event.preventDefault();
      window.location.assign(route);
    });
  });
}


/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function setupQuickActions() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      handleQuickAction(button.dataset.action);
    });
  });

  $("mobileAddButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    openQuickSheet();
  });

  quickSheetClose?.addEventListener("click", closeQuickSheet);

  quickSheetOverlay?.addEventListener("click", (event) => {
    if (event.target === quickSheetOverlay) {
      closeQuickSheet();
    }
  });
}

function openQuickSheet() {
  if (!quickSheetOverlay) {
    console.warn("HomeRent: Quick-action sheet was not found.");
    return;
  }

  quickSheetOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeQuickSheet() {
  if (quickSheetOverlay) {
    quickSheetOverlay.hidden = true;
  }

  document.body.style.overflow = "";
}

function handleQuickAction(action) {
  closeQuickSheet();

  const routes = {
    room: "../rooms/index.html?action=add",
    tenancy: "../tenancies/index.html?action=add",
    payment: "../payments/index.html?action=add",
    document: "../documents/index.html?action=add"
  };

  if (!routes[action]) {
    console.warn(`HomeRent: Unknown quick action "${action}".`);
    return;
  }

  window.location.assign(routes[action]);
}


/* =========================================================
   BRANDING AND SETTINGS
   ========================================================= */

async function loadDashboardBranding() {
  try {
    await loadSettings();
    settings = getSettings();

    const businessName =
      settings.businessName ||
      settings.systemName ||
      "HomeRent";

    const logoUrl =
      settings.logoUrl ||
      settings.systemLogo ||
      "";

    if ($("systemName")) {
      $("systemName").textContent = businessName;
    }

    if ($("mobileBrandName")) {
      $("mobileBrandName").textContent = businessName;
    }

    if ($("systemSubtitle")) {
      $("systemSubtitle").textContent =
        settings.businessType || "Property Management";
    }

    if ($("systemLogo") && logoUrl) {
      $("systemLogo").src = logoUrl;
    }

    document.title = `${businessName} — Dashboard`;

  } catch (error) {
    console.error("HomeRent: Settings failed to load.", error);
    settings = getSettings();
  }
}


/* =========================================================
   FIRESTORE DATA
   ========================================================= */

async function loadDashboardData() {
  const collections = [
    ["rooms", "rooms"],
    ["clients", "clients"],
    ["tenancies", "tenancies"],
    ["payments", "payments"]
  ];

  await Promise.all(collections.map(async ([key, name]) => {
    try {
      const snapshot = await getDocs(collection(db, name));

      dashboardData[key] = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

    } catch (error) {
      console.error(`HomeRent: Could not load ${name}.`, error);
      dashboardData[key] = [];
    }
  }));
}


/* =========================================================
   DASHBOARD RENDERING
   ========================================================= */

function renderDashboard() {
  renderOverview();
  renderCollectionSummary();
  renderOccupancy();
  renderAttention();
  renderRecentPayments();
  renderInsight();
}

function activeRooms() {
  return dashboardData.rooms.filter(
    (room) => room.isArchived !== true
  );
}

function activeTenancies() {
  const inactive = [
    "ended", "terminated", "cancelled",
    "canceled", "inactive", "archived"
  ];

  return dashboardData.tenancies.filter((item) => {
    if (item.isArchived === true) return false;

    return !inactive.includes(
      String(item.status || "").toLowerCase()
    );
  });
}

function isRoomOccupied(room) {
  const status = String(room.status || "").toLowerCase();

  if (["occupied", "rented", "leased"].includes(status)) {
    return true;
  }

  if (["available", "vacant", "empty", "maintenance"].includes(status)) {
    return false;
  }

  return activeTenancies().some((item) => item.roomId === room.id);
}

function getDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function monthlyPayments() {
  const now = new Date();

  return dashboardData.payments.filter((payment) => {
    if (payment.isArchived === true) return false;

    const date = getDate(
      payment.paymentDate || payment.date || payment.createdAt
    );

    return date &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth();
  });
}

function monthlyCollected() {
  return monthlyPayments().reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );
}

function monthlyExpected() {
  return activeTenancies().reduce((sum, tenancy) => {
    const amount = Number(
      tenancy.amount ?? tenancy.rentAmount ?? tenancy.rent ?? 0
    );

    if (!Number.isFinite(amount) || amount <= 0) return sum;

    const unit = String(
      tenancy.durationUnit || tenancy.unit || "month"
    ).toLowerCase();

    if (["week", "weeks", "weekly"].includes(unit)) {
      return sum + amount * 52 / 12;
    }

    if (["year", "years", "yearly", "annual"].includes(unit)) {
      return sum + amount / 12;
    }

    return sum + amount;
  }, 0);
}

function isDue(tenancy) {
  const end = getDate(tenancy.endDate);
  if (!end) return false;

  const reminderDays = Number(settings.reminderDaysBeforeDue ?? 3);
  const reminderDate = new Date(end);

  reminderDate.setDate(reminderDate.getDate() - reminderDays);

  return startOfDay(new Date()) >= startOfDay(reminderDate);
}

function isOverdue(tenancy) {
  const end = getDate(tenancy.endDate);
  return end && startOfDay(new Date()) > startOfDay(end);
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}


/* =========================================================
   OVERVIEW
   ========================================================= */

function renderOverview() {
  const rooms = activeRooms();
  const occupied = rooms.filter(isRoomOccupied).length;

  setText("occupiedCount", occupied);
  setText("totalRoomCount", `/ ${rooms.length}`);
  setText("vacantCount", rooms.length - occupied);

  setText(
    "rentDueCount",
    activeTenancies().filter((item) => isDue(item) || isOverdue(item)).length
  );

  setText("monthlyIncome", money(monthlyCollected()));
}


/* =========================================================
   COLLECTION SUMMARY
   ========================================================= */

function renderCollectionSummary() {
  const collected = monthlyCollected();
  const expected = monthlyExpected();

  const percentage = expected > 0
    ? Math.round(collected / expected * 100)
    : 0;

  setText("collectionPercentage", `${percentage}%`);
  setText("collectedAmount", money(collected));
  setText("expectedAmount", money(expected));

  const progress = $("collectionProgressBar");

  if (progress) {
    progress.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
  }
}


/* =========================================================
   OCCUPANCY GRID
   ========================================================= */

function renderOccupancy() {
  const grid = $("occupancyGrid");
  if (!grid) return;

  grid.replaceChildren();

  const rooms = activeRooms();

  rooms.forEach((room, index) => {
    const occupied = isRoomOccupied(room);

    const tenancy = activeTenancies().find(
      (item) => item.roomId === room.id
    );

    let status = occupied ? "paid" : "vacant";

    if (tenancy && isOverdue(tenancy)) {
      status = "overdue";
    } else if (tenancy && isDue(tenancy)) {
      status = "due";
    }

    const number = room.roomNumber || room.name || `Room ${index + 1}`;
    const button = document.createElement("button");

    button.type = "button";
    button.className = `occupancy-room ${status}`;
    button.title = `${number} — ${status}`;
    button.setAttribute("aria-label", button.title);

    button.addEventListener("click", () => {
      window.location.assign(
        `../rooms/index.html?room=${encodeURIComponent(room.id)}`
      );
    });

    grid.appendChild(button);
  });

  const occupied = rooms.filter(isRoomOccupied).length;
  setText("occupancySummary", `${occupied} of ${rooms.length} rooms`);
}


/* =========================================================
   ATTENTION LIST
   ========================================================= */

function renderAttention() {
  const container = $("attentionList");
  if (!container) return;

  const due = activeTenancies().filter(
    (item) => isDue(item) || isOverdue(item)
  );

  container.replaceChildren();

  if (due.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">✓</span>
        <strong>You're all caught up</strong>
        <p>No urgent property actions right now.</p>
      </div>
    `;
    return;
  }

  due.slice(0, 5).forEach((tenancy) => {
    const room = dashboardData.rooms.find(
      (item) => item.id === tenancy.roomId
    );

    const row = document.createElement("div");
    row.className = "attention-item";

    const icon = document.createElement("div");
    icon.className = "attention-item-icon";
    icon.textContent = isOverdue(tenancy) ? "!" : "₵";

    const content = document.createElement("div");
    content.className = "attention-item-content";

    const title = document.createElement("strong");
    title.textContent = room?.roomNumber || tenancy.roomNumber || "Room";

    const description = document.createElement("p");
    description.textContent = isOverdue(tenancy)
      ? "Rental period requires attention."
      : "Rental period is approaching its end date.";

    content.append(title, description);
    row.append(icon, content);
    container.appendChild(row);
  });
}


/* =========================================================
   RECENT PAYMENTS
   ========================================================= */

function renderRecentPayments() {
  const container = $("paymentList");
  if (!container) return;

  container.replaceChildren();

  const payments = [...dashboardData.payments]
    .filter((item) => item.isArchived !== true)
    .sort((a, b) => {
      const dateA = getDate(a.paymentDate || a.date || a.createdAt);
      const dateB = getDate(b.paymentDate || b.date || b.createdAt);

      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    })
    .slice(0, 5);

  if (payments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">₵</span>
        <strong>No payments yet</strong>
        <p>Recorded payments will appear here.</p>
      </div>
    `;
    return;
  }

  payments.forEach((payment) => {
    const room = dashboardData.rooms.find(
      (item) => item.id === payment.roomId
    );

    const tenancy = dashboardData.tenancies.find(
      (item) => item.id === payment.tenancyId
    );

    const clientId = payment.clientId || tenancy?.clientId;

    const client = dashboardData.clients.find(
      (item) => item.id === clientId
    );

    const row = document.createElement("div");
    row.className = "payment-item";

    const icon = document.createElement("div");
    icon.className = "payment-item-icon";
    icon.textContent = "₵";

    const content = document.createElement("div");
    content.className = "payment-item-content";

    const name = document.createElement("strong");
    name.textContent =
      client?.fullName || payment.clientName || "Client";

    const detail = document.createElement("p");
    const date = getDate(
      payment.paymentDate || payment.date || payment.createdAt
    );

    detail.textContent = [
      room?.roomNumber || payment.roomNumber || "Room",
      date ? formatDate(date) : ""
    ].filter(Boolean).join(" · ");

    const amount = document.createElement("strong");
    amount.className = "payment-item-amount";
    amount.textContent = money(payment.amount);

    content.append(name, detail);
    row.append(icon, content, amount);
    container.appendChild(row);
  });
}


/* =========================================================
   INSIGHT
   ========================================================= */

function renderInsight() {
  const title = $("insightTitle");
  const text = $("insightText");

  if (!title || !text) return;

  const rooms = activeRooms();
  const occupied = rooms.filter(isRoomOccupied).length;
  const due = activeTenancies().filter(
    (item) => isDue(item) || isOverdue(item)
  ).length;

  if (rooms.length === 0) {
    title.textContent = "Your dashboard is ready";
    text.textContent =
      "Once you add your first room, HomeRent can show occupancy and rental insights.";
    return;
  }

  const rate = Math.round(occupied / rooms.length * 100);

  if (due > 0) {
    title.textContent = `${due} rental record${due === 1 ? "" : "s"} need attention`;
    text.textContent =
      "Review rental dates and keep your property records up to date.";
  } else if (rate >= 90) {
    title.textContent = "Your property is highly occupied";
    text.textContent = `Current occupancy is ${rate}%.`;
  } else if (rate >= 70) {
    title.textContent = "Occupancy is looking healthy";
    text.textContent = `Your property is currently ${rate}% occupied.`;
  } else {
    title.textContent = "There is room to grow";
    text.textContent =
      `Current occupancy is ${rate}%. Review your vacant rooms when the Rooms module is ready.`;
  }
}


/* =========================================================
   PROFILE AND AUTHENTICATION
   ========================================================= */

function setupProfile() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace("../auth/login.html");
      return;
    }

    const name = user.displayName || "Admin";

    setText("profileName", name);
    setText("profileAvatar", name.charAt(0).toUpperCase());

    if ($("profileAvatar")) {
      $("profileAvatar").textContent = name.charAt(0).toUpperCase();
    }
  });
}

function setupLogout() {
  $("logoutButton")?.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.replace("../auth/login.html");
    } catch (error) {
      console.error("HomeRent: Logout failed.", error);
      alert("Logout failed. Please try again.");
    }
  });
}


/* =========================================================
   FORMATTING HELPERS
   ========================================================= */

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = String(value ?? "");
}

function money(value) {
  const symbol = settings.currencySymbol ||
    (settings.currency === "GHS" ? "₵" : settings.currency) ||
    "₵";

  const amount = Number(value) || 0;

  return `${symbol} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

function formatDate(date) {
  const format = settings.dateFormat || "DD/MM/YYYY";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  if (format === "MM/DD/YYYY") return `${month}/${day}/${year}`;
  if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;

  return `${day}/${month}/${year}`;
}