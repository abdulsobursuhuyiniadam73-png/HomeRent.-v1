/* =========================================================
   HOMERENT DASHBOARD
   =========================================================

   PURPOSE
   -------
   Connects the approved dashboard UI to real Firestore data.

   FIRESTORE COLLECTIONS USED
   --------------------------
   settings/business
   rooms
   clients
   tenancies
   payments

   IMPORTANT
   ---------
   This file does NOT create or modify the Firestore schema.

   It reads the existing HomeRent data structure and renders
   it into the approved dashboard.

   Firebase initialization remains centralized in firebase.js.
   ========================================================= */


/* =========================================================
   IMPORTS
   ========================================================= */

import { collection, getDocs } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { signOut } from
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { db, auth } from "../firebase.js";

import { loadSettings } from "../core/settings-service.js";

import {
  getSettings
} from "../core/settings.js";

import {
  applyGlobalBranding
} from "../core/branding.js";


/* =========================================================
   DOM
   ========================================================= */

const sidebar =
  document.getElementById("sidebar");

const sidebarOverlay =
  document.getElementById("sidebarOverlay");

const mobileMenuButton =
  document.getElementById("mobileMenuButton");

const systemLogo =
  document.getElementById("systemLogo");

const systemName =
  document.getElementById("systemName");

const mobileBrandName =
  document.getElementById("mobileBrandName");

const profileAvatar =
  document.getElementById("profileAvatar");

const profileName =
  document.getElementById("profileName");

const mobileAddButton =
  document.getElementById("mobileAddButton");

const quickSheetOverlay =
  document.getElementById("quickSheetOverlay");

const quickSheetClose =
  document.getElementById("quickSheetClose");


/* =========================================================
   DASHBOARD STATE
   ========================================================= */

let dashboardData = {

  rooms: [],
  clients: [],
  tenancies: [],
  payments: [],

  settings: null

};


/* =========================================================
   INITIALISE
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initDashboard
);


async function initDashboard() {

  setupSidebar();

  setupMobileNavigation();

  setupQuickActions();

  setupDesktopNavigation();

  setupLogout();

  setupProfile();

  /*
   * Load saved business settings before rendering
   * dashboard information.
   */
  await loadDashboardBranding();


  /*
   * Load the actual Firestore data.
   */
  await loadDashboardData();


  /*
   * Render everything from the real data.
   */
  renderDashboard();

}


/* =========================================================
   BRANDING
   ========================================================= */

async function loadDashboardBranding() {

  /*
   * First load the Firestore settings into the
   * central settings state.
   */
  try {

    await loadSettings();

  } catch (error) {

    console.warn(
      "HomeRent: Could not load dashboard settings.",
      error
    );

  }


  /*
   * Reuse the existing global branding system.
   */
  try {

    await applyGlobalBranding();

  } catch (error) {

    console.warn(
      "HomeRent: Global branding could not be applied.",
      error
    );

  }


  /*
   * Get the final settings after loading Firestore.
   */
  try {

    const settings = getSettings();

    dashboardData.settings = settings;


    const businessName =
      settings.businessName ||
      settings.systemName ||
      "HomeRent";


    const logoUrl =
      settings.logoUrl ||
      settings.systemLogo ||
      "";


    if (systemName) {

      systemName.textContent =
        businessName;

    }


    if (mobileBrandName) {

      mobileBrandName.textContent =
        businessName;

    }


    if (logoUrl && systemLogo) {

      systemLogo.src =
        logoUrl;

    }


    document.title =
      `${businessName} — Dashboard`;


  } catch (error) {

    console.warn(
      "HomeRent: Dashboard settings could not be applied.",
      error
    );

  }

}


/* =========================================================
   FIRESTORE DATA
   ========================================================= */

async function loadDashboardData() {

  try {

    const [
      roomsSnapshot,
      clientsSnapshot,
      tenanciesSnapshot,
      paymentsSnapshot
    ] = await Promise.all([

      getDocs(
        collection(db, "rooms")
      ),

      getDocs(
        collection(db, "clients")
      ),

      getDocs(
        collection(db, "tenancies")
      ),

      getDocs(
        collection(db, "payments")
      )

    ]);


    dashboardData.rooms =
      roomsSnapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data()
        })
      );


    dashboardData.clients =
      clientsSnapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data()
        })
      );


    dashboardData.tenancies =
      tenanciesSnapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data()
        })
      );


    dashboardData.payments =
      paymentsSnapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data()
        })
      );


  } catch (error) {

    console.error(
      "HomeRent: Failed to load dashboard data.",
      error
    );


    /*
     * Keep the dashboard usable even when
     * Firestore cannot be reached.
     */
    dashboardData.rooms = [];
    dashboardData.clients = [];
    dashboardData.tenancies = [];
    dashboardData.payments = [];


    showDashboardError();

  }

}


/* =========================================================
   MAIN RENDER
   ========================================================= */

function renderDashboard() {

  renderOverview();

  renderCollectionSummary();

  renderOccupancy();

  renderAttention();

  renderRecentPayments();

  renderInsight();

}


/* =========================================================
   OVERVIEW
   ========================================================= */

function renderOverview() {

  const rooms =
    getActiveRooms();


  const total =
    rooms.length;


  const occupied =
    rooms.filter(
      (room) =>
        isRoomOccupied(room)
    ).length;


  const vacant =
    rooms.filter(
      (room) =>
        !isRoomOccupied(room)
    ).length;


  const rentDue =
    getRentDueTenancies().length;


  const monthlyIncome =
    getMonthlyCollectedAmount();


  const occupiedElement =
    document.getElementById(
      "occupiedCount"
    );


  const totalElement =
    document.getElementById(
      "totalRoomCount"
    );


  const vacantElement =
    document.getElementById(
      "vacantCount"
    );


  const rentDueElement =
    document.getElementById(
      "rentDueCount"
    );


  const monthlyIncomeElement =
    document.getElementById(
      "monthlyIncome"
    );


  if (occupiedElement) {

    occupiedElement.textContent =
      occupied;

  }


  if (totalElement) {

    totalElement.textContent =
      `/ ${total}`;

  }


  if (vacantElement) {

    vacantElement.textContent =
      vacant;

  }


  if (rentDueElement) {

    rentDueElement.textContent =
      rentDue;

  }


  if (monthlyIncomeElement) {

    monthlyIncomeElement.textContent =
      formatMoney(monthlyIncome);

  }

}


/* =========================================================
   COLLECTION SUMMARY
   ========================================================= */

function renderCollectionSummary() {

  const collected =
    getMonthlyCollectedAmount();


  const expected =
    getMonthlyExpectedAmount();


  let percentage = 0;


  if (expected > 0) {

    percentage =
      Math.round(
        (collected / expected) * 100
      );

  }


  /*
   * Prevent the progress bar from becoming
   * visually larger than 100%.
   */
  const progress =
    Math.min(
      Math.max(percentage, 0),
      100
    );


  const percentageElement =
    document.getElementById(
      "collectionPercentage"
    );


  const collectedElement =
    document.getElementById(
      "collectedAmount"
    );


  const expectedElement =
    document.getElementById(
      "expectedAmount"
    );


  const progressElement =
    document.getElementById(
      "collectionProgressBar"
    );


  if (percentageElement) {

    percentageElement.textContent =
      `${percentage}%`;

  }


  if (collectedElement) {

    collectedElement.textContent =
      formatMoney(collected);

  }


  if (expectedElement) {

    expectedElement.textContent =
      formatMoney(expected);

  }


  if (progressElement) {

    progressElement.style.width =
      `${progress}%`;

  }

}


/* =========================================================
   ACTIVE ROOMS
   ========================================================= */

function getActiveRooms() {

  return dashboardData.rooms.filter(
    (room) =>
      room.isArchived !== true
  );

}


/* =========================================================
   ACTIVE TENANCIES
   ========================================================= */

function getActiveTenancies() {

  return dashboardData.tenancies.filter(
    (tenancy) => {

      if (tenancy.isArchived === true) {

        return false;

      }


      /*
       * Common active states are supported,
       * but missing status does not automatically
       * make an existing tenancy invisible.
       */
      const status =
        String(
          tenancy.status || ""
        ).toLowerCase();


      if (!status) {

        return true;

      }


      return ![
        "ended",
        "terminated",
        "cancelled",
        "canceled",
        "inactive",
        "archived"
      ].includes(status);

    }
  );

}


/* =========================================================
   ROOM OCCUPANCY
   ========================================================= */

function isRoomOccupied(room) {

  /*
   * First use the room's own status if available.
   */
  const status =
    String(
      room.status || ""
    ).toLowerCase();


  if (
    [
      "occupied",
      "rented",
      "leased"
    ].includes(status)
  ) {

    return true;

  }


  if (
    [
      "vacant",
      "available",
      "empty"
    ].includes(status)
  ) {

    return false;

  }


  /*
   * Existing room records can also use
   * currentTenancyId.
   */
  if (room.currentTenancyId) {

    return true;

  }


  /*
   * Finally check active tenancies.
   */
  return getActiveTenancies().some(
    (tenancy) =>
      tenancy.roomId === room.id
  );

}


/* =========================================================
   ROOM DISPLAY STATUS
   ========================================================= */

function getRoomDisplayStatus(room) {

  if (!isRoomOccupied(room)) {

    return "vacant";

  }


  /*
   * Check whether the room's active tenancy
   * has a payment due/overdue situation.
   */
  const tenancy =
    getActiveTenancies().find(
      (item) =>
        item.roomId === room.id
    );


  if (
    tenancy &&
    isTenancyOverdue(tenancy)
  ) {

    return "overdue";

  }


  if (
    tenancy &&
    isTenancyDue(tenancy)
  ) {

    return "due";

  }


  return "paid";

}


/* =========================================================
   OCCUPANCY
   ========================================================= */

function renderOccupancy() {

  const grid =
    document.getElementById(
      "occupancyGrid"
    );


  const summary =
    document.getElementById(
      "occupancySummary"
    );


  if (!grid) {

    return;

  }


  const rooms =
    getActiveRooms();


  grid.innerHTML = "";


  rooms.forEach(
    (room, index) => {

      const status =
        getRoomDisplayStatus(room);


      const roomNumber =
        room.roomNumber ||
        room.name ||
        `Room ${index + 1}`;


      const roomButton =
        document.createElement(
          "button"
        );


      roomButton.type =
        "button";


      roomButton.className =
        `occupancy-room ${status}`;


      roomButton.title =
        `${roomNumber} — ${formatRoomStatus(status)}`;


      roomButton.setAttribute(
        "aria-label",
        roomButton.title
      );


      /*
       * Keep room interaction ready for
       * the future Rooms module.
       */
      roomButton.dataset.roomId =
        room.id;


      roomButton.addEventListener(
        "click",
        () => {

          console.log(
            "Room selected:",
            room.id
          );

        }
      );


      grid.appendChild(
        roomButton
      );

    }
  );


  const occupied =
    rooms.filter(
      (room) =>
        isRoomOccupied(room)
    ).length;


  if (summary) {

    summary.textContent =
      `${occupied} of ${rooms.length} rooms`;

  }

}


/* =========================================================
   STATUS LABEL
   ========================================================= */

function formatRoomStatus(status) {

  const names = {

    paid: "Paid",

    overdue: "Overdue",

    due: "Due",

    vacant: "Vacant"

  };


  return (
    names[status] ||
    "Unknown"
  );

}


/* =========================================================
   MONTHLY PAYMENTS
   ========================================================= */

function getMonthlyPayments() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    now.getMonth();


  return dashboardData.payments.filter(
    (payment) => {

      if (
        payment.isArchived === true
      ) {

        return false;

      }


      const date =
        getDateValue(
          payment.paymentDate ||
          payment.date ||
          payment.createdAt
        );


      if (!date) {

        return false;

      }


      return (
        date.getFullYear() === year &&
        date.getMonth() === month
      );

    }
  );

}


/* =========================================================
   MONTHLY COLLECTED
   ========================================================= */

function getMonthlyCollectedAmount() {

  return getMonthlyPayments()
    .reduce(
      (total, payment) => {

        const amount =
          Number(
            payment.amount || 0
          );


        return (
          total +
          (Number.isFinite(amount)
            ? amount
            : 0)
        );

      },
      0
    );

}


/* =========================================================
   MONTHLY EXPECTED
   ========================================================= */

function getMonthlyExpectedAmount() {

  const tenancies =
    getActiveTenancies();


  /*
   * For monthly/default rental arrangements,
   * the tenancy amount represents the expected
   * rental amount for the period.
   */
  return tenancies.reduce(
    (total, tenancy) => {

      const amount =
        Number(
          tenancy.amount || 0
        );


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        return total;

      }


      const unit =
        String(
          tenancy.durationUnit ||
          tenancy.unit ||
          ""
        ).toLowerCase();


      /*
       * Weekly rent converted approximately
       * to a monthly figure.
       */
      if (
        unit === "week" ||
        unit === "weeks" ||
        unit === "weekly"
      ) {

        return total +
          (amount * 52 / 12);

      }


      /*
       * Yearly rent converted to monthly.
       */
      if (
        unit === "year" ||
        unit === "years" ||
        unit === "yearly" ||
        unit === "annual"
      ) {

        return total +
          (amount / 12);

      }


      /*
       * Monthly/default.
       */
      return total + amount;

    },
    0
  );

}


/* =========================================================
   RENT DUE
   ========================================================= */

function getRentDueTenancies() {

  return getActiveTenancies()
    .filter(
      (tenancy) =>
        isTenancyDue(tenancy) ||
        isTenancyOverdue(tenancy)
    );

}


/* =========================================================
   TENANCY DUE
   ========================================================= */

function isTenancyDue(tenancy) {

  const endDate =
    getDateValue(
      tenancy.endDate
    );


  if (!endDate) {

    return false;

  }


  const today =
    startOfDay(
      new Date()
    );


  const dueWindow =
    Number(
      dashboardData.settings
        ?.reminderDaysBeforeDue ?? 3
    );


  const reminderDate =
    new Date(
      endDate
    );


  reminderDate.setDate(
    reminderDate.getDate() -
    dueWindow
  );


  return (
    today >=
    startOfDay(reminderDate)
  );

}


/* =========================================================
   TENANCY OVERDUE
   ========================================================= */

function isTenancyOverdue(tenancy) {

  const endDate =
    getDateValue(
      tenancy.endDate
    );


  if (!endDate) {

    return false;

  }


  return (
    startOfDay(new Date()) >
    startOfDay(endDate)
  );

}


/* =========================================================
   ATTENTION LIST
   ========================================================= */

function renderAttention() {

  const container =
    document.getElementById(
      "attentionList"
    );


  if (!container) {

    return;

  }


  const dueTenancies =
    getRentDueTenancies();


  if (
    dueTenancies.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <span class="empty-icon">✓</span>

        <strong>
          You're all caught up
        </strong>

        <p>
          No urgent property actions right now.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = "";


  dueTenancies
    .slice(0, 5)
    .forEach(
      (tenancy) => {

        const item =
          document.createElement(
            "div"
          );


        item.className =
          "attention-item";


        const room =
          getRoomForTenancy(
            tenancy
          );


        const roomName =
          room?.roomNumber ||
          tenancy.roomNumber ||
          "Room";


        const overdue =
          isTenancyOverdue(
            tenancy
          );


        item.innerHTML = `

          <div class="attention-item-icon">
            ${overdue ? "!" : "₵"}
          </div>

          <div class="attention-item-content">

            <strong>
              ${escapeHtml(roomName)}
            </strong>

            <p>
              ${
                overdue
                  ? "Rental period requires attention."
                  : "Rent is approaching its due date."
              }
            </p>

          </div>

        `;


        container.appendChild(
          item
        );

      }
    );

}


/* =========================================================
   RECENT PAYMENTS
   ========================================================= */

function renderRecentPayments() {

  const container =
    document.getElementById(
      "paymentList"
    );


  if (!container) {

    return;

  }


  const payments =
    [...dashboardData.payments]
      .filter(
        (payment) =>
          payment.isArchived !== true
      )
      .sort(
        (a, b) => {

          const dateA =
            getDateValue(
              a.paymentDate ||
              a.date ||
              a.createdAt
            );


          const dateB =
            getDateValue(
              b.paymentDate ||
              b.date ||
              b.createdAt
            );


          return (
            (dateB?.getTime() || 0) -
            (dateA?.getTime() || 0)
          );

        }
      )
      .slice(0, 5);


  if (
    payments.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <span class="empty-icon">₵</span>

        <strong>
          No payments yet
        </strong>

        <p>
          Recorded payments will appear here.
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML = "";


  payments.forEach(
    (payment) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "payment-item";


      const amount =
        Number(
          payment.amount || 0
        );


      const date =
        getDateValue(
          payment.paymentDate ||
          payment.date ||
          payment.createdAt
        );


      const room =
        getRoomForPayment(
          payment
        );


      const client =
        getClientForPayment(
          payment
        );


      const roomName =
        room?.roomNumber ||
        payment.roomNumber ||
        "Room";


      const clientName =
        client?.fullName ||
        payment.clientName ||
        "Client";


      item.innerHTML = `

        <div class="payment-item-icon">
          ₵
        </div>

        <div class="payment-item-content">

          <strong>
            ${escapeHtml(clientName)}
          </strong>

          <p>
            ${escapeHtml(roomName)}
            ${
              date
                ? ` · ${formatDate(date)}`
                : ""
            }
          </p>

        </div>

        <strong class="payment-item-amount">
          ${formatMoney(amount)}
        </strong>

      `;


      container.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   PROPERTY INSIGHT
   ========================================================= */

function renderInsight() {

  const title =
    document.getElementById(
      "insightTitle"
    );


  const text =
    document.getElementById(
      "insightText"
    );


  if (!title || !text) {

    return;

  }


  const rooms =
    getActiveRooms();


  const occupied =
    rooms.filter(
      (room) =>
        isRoomOccupied(room)
    ).length;


  const total =
    rooms.length;


  const due =
    getRentDueTenancies().length;


  if (total === 0) {

    title.textContent =
      "Add your first room";


    text.textContent =
      "Once your rooms are recorded, HomeRent will start showing occupancy and rental insights.";

    return;

  }


  const occupancyRate =
    Math.round(
      (occupied / total) * 100
    );


  if (due > 0) {

    title.textContent =
      `${due} rental record${due === 1 ? "" : "s"} need attention`;


    text.textContent =
      "Review upcoming or overdue rental periods so your collection records stay current.";

    return;

  }


  if (occupancyRate >= 90) {

    title.textContent =
      "Your property is highly occupied";


    text.textContent =
      `Current occupancy is ${occupancyRate}%. Keep your room and payment records up to date.`;

    return;

  }


  if (occupancyRate >= 70) {

    title.textContent =
      "Occupancy is looking healthy";


    text.textContent =
      `Your property is currently ${occupancyRate}% occupied.`;

    return;

  }


  title.textContent =
    "There is room to grow";


  text.textContent =
    `Current occupancy is ${occupancyRate}%. Your vacant rooms may be opportunities for new tenancies.`;

}


/* =========================================================
   ROOM / TENANCY LOOKUPS
   ========================================================= */

function getRoomForTenancy(tenancy) {

  return dashboardData.rooms.find(
    (room) =>
      room.id === tenancy.roomId
  );

}


function getRoomForPayment(payment) {

  if (payment.roomId) {

    return dashboardData.rooms.find(
      (room) =>
        room.id === payment.roomId
    );

  }


  if (payment.tenancyId) {

    const tenancy =
      dashboardData.tenancies.find(
        (item) =>
          item.id === payment.tenancyId
      );


    if (tenancy) {

      return getRoomForTenancy(
        tenancy
      );

    }

  }


  return null;

}


function getClientForPayment(payment) {

  if (payment.clientId) {

    return dashboardData.clients.find(
      (client) =>
        client.id === payment.clientId
    );

  }


  if (payment.tenancyId) {

    const tenancy =
      dashboardData.tenancies.find(
        (item) =>
          item.id === payment.tenancyId
      );


    if (
      tenancy &&
      tenancy.clientId
    ) {

      return dashboardData.clients.find(
        (client) =>
          client.id === tenancy.clientId
      );

    }

  }


  return null;

}


/* =========================================================
   SIDEBAR
   ========================================================= */

function setupSidebar() {

  if (!mobileMenuButton) {

    return;

  }


  mobileMenuButton.addEventListener(
    "click",
    openSidebar
  );


  sidebarOverlay?.addEventListener(
    "click",
    closeSidebar
  );


  document
    .querySelectorAll(".nav-link")
    .forEach(
      (link) => {

        link.addEventListener(
          "click",
          () => {

            if (
              window.innerWidth <= 700
            ) {

              closeSidebar();

            }

          }
        );

      }
    );

}


function openSidebar() {

  sidebar?.classList.add(
    "open"
  );


  sidebarOverlay?.classList.add(
    "active"
  );


  document.body.style.overflow =
    "hidden";

}


function closeSidebar() {

  sidebar?.classList.remove(
    "open"
  );


  sidebarOverlay?.classList.remove(
    "active"
  );


  document.body.style.overflow =
    "";

}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {

  document
    .querySelectorAll(
      "[data-mobile-page]"
    )
    .forEach(
      (item) => {

        item.addEventListener(
          "click",
          (event) => {

            event.preventDefault();


            document
              .querySelectorAll(
                ".mobile-nav-item"
              )
              .forEach(
                (nav) => {

                  nav.classList.remove(
                    "active"
                  );

                }
              );


            item.classList.add(
              "active"
            );


            /*
             * Actual module routing will be
             * connected when those pages exist.
             */

          }
        );

      }
    );

}


/* =========================================================
   DESKTOP NAVIGATION
   ========================================================= */

function setupDesktopNavigation() {

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(
      (link) => {

        link.addEventListener(
          "click",
          (event) => {

            event.preventDefault();


            document
              .querySelectorAll(
                ".nav-link"
              )
              .forEach(
                (nav) => {

                  nav.classList.remove(
                    "active"
                  );

                }
              );


            link.classList.add(
              "active"
            );


            /*
             * Actual module routing will be
             * connected as each page is built.
             */

          }
        );

      }
    );

}


/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function setupQuickActions() {

  mobileAddButton?.addEventListener(
    "click",
    openQuickSheet
  );


  quickSheetClose?.addEventListener(
    "click",
    closeQuickSheet
  );


  quickSheetOverlay?.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        quickSheetOverlay
      ) {

        closeQuickSheet();

      }

    }
  );


  document
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const action =
              button.dataset.action;


            handleQuickAction(
              action
            );

          }
        );

      }
    );

}


function openQuickSheet() {

  if (!quickSheetOverlay) {

    return;

  }


  quickSheetOverlay.hidden =
    false;


  document.body.style.overflow =
    "hidden";

}


function closeQuickSheet() {

  if (!quickSheetOverlay) {

    return;

  }


  quickSheetOverlay.hidden =
    true;


  document.body.style.overflow =
    "";

}


function handleQuickAction(action) {

  switch (action) {

    case "room":

      console.log(
        "Add Room selected"
      );

      break;


    case "tenancy":

      console.log(
        "New Tenancy selected"
      );

      break;


    case "payment":

      console.log(
        "Record Payment selected"
      );

      break;


    case "document":

      console.log(
        "Add Document selected"
      );

      break;


    default:

      break;

  }


  closeQuickSheet();

}


/* =========================================================
   PROFILE
   ========================================================= */

function setupProfile() {

  const user =
    auth.currentUser;


  if (!user) {

    return;

  }


  const displayName =
    user.displayName ||
    "Admin";


  if (profileName) {

    profileName.textContent =
      displayName;

  }


  if (profileAvatar) {

    profileAvatar.textContent =
      displayName
        .charAt(0)
        .toUpperCase();

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

  const logoutButton =
    document.getElementById(
      "logoutButton"
    );


  if (!logoutButton) {

    return;

  }


  logoutButton.addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);


        /*
         * Use the existing project login location.
         */
        window.location.href =
          "../auth/login.html";


      } catch (error) {

        console.error(
          "HomeRent: Logout failed.",
          error
        );

      }

    }
  );

}


/* =========================================================
   MONEY
   ========================================================= */

function formatMoney(amount) {

  const settings =
    dashboardData.settings ||
    getSettings();


  const symbol =
    settings.currencySymbol ||
    settings.currency ||
    "₵";


  const numericAmount =
    Number(amount || 0);


  return (
    `${symbol} ` +
    numericAmount.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    )
  );

}


/* =========================================================
   DATE
   ========================================================= */

function getDateValue(value) {

  if (!value) {

    return null;

  }


  /*
   * Firestore Timestamp.
   */
  if (
    typeof value.toDate ===
    "function"
  ) {

    return value.toDate();

  }


  /*
   * JavaScript Date.
   */
  if (
    value instanceof Date
  ) {

    return value;

  }


  /*
   * Firestore timestamp-like object.
   */
  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {

    return new Date(
      value.seconds * 1000
    );

  }


  /*
   * String / numeric timestamp.
   */
  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date;

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(date) {

  const settings =
    dashboardData.settings ||
    getSettings();


  const format =
    settings.dateFormat ||
    "DD/MM/YYYY";


  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");


  const year =
    date.getFullYear();


  if (
    format ===
    "MM/DD/YYYY"
  ) {

    return `${month}/${day}/${year}`;

  }


  if (
    format ===
    "YYYY-MM-DD"
  ) {

    return `${year}-${month}-${day}`;

  }


  return `${day}/${month}/${year}`;

}


/* =========================================================
   START OF DAY
   ========================================================= */

function startOfDay(date) {

  const result =
    new Date(date);


  result.setHours(
    0,
    0,
    0,
    0
  );


  return result;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   DASHBOARD ERROR
   ========================================================= */

function showDashboardError() {

  const attention =
    document.getElementById(
      "attentionList"
    );


  if (!attention) {

    return;

  }


  attention.innerHTML = `

    <div class="empty-state">

      <span class="empty-icon">!</span>

      <strong>
        Could not load property data
      </strong>

      <p>
        Please check your connection and refresh the dashboard.
      </p>

    </div>

  `;

}