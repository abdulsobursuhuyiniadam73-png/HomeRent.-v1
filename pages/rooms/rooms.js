/* ============================================================
   HOMERENT — ROOMS CONTROLLER
   ============================================================ */

import { auth, db } from "../../firebase.js";

import {
    collection,
    doc,
    onSnapshot,
    getDoc,
    updateDoc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
    initAddRoom
} from "../../components/add-room/add-room.js";


/* ============================================================
   LOCKED FIRESTORE COLLECTIONS
   ============================================================ */

const ROOMS_COLLECTION = "rooms";
const ROOM_STATUS_HISTORY_COLLECTION = "roomStatusHistory";
const AUDIT_COLLECTION = "auditLogs";

const BUSINESS_SETTINGS_PATH = [
    "settings",
    "business"
];


/* ============================================================
   STATE
   ============================================================ */

let rooms = [];
let filteredRooms = [];

let activeFilter = "all";
let selectedRoomId = null;

let currentCurrency = "GH₵";

let roomsUnsubscribe = null;
let addRoomController = null;

let toastTimer = null;


/* ============================================================
   DOM
   ============================================================ */

const elements = {
    roomsGrid: document.getElementById("roomsGrid"),

    roomsLoading: document.getElementById("roomsLoading"),
    roomsEmpty: document.getElementById("roomsEmpty"),
    roomsError: document.getElementById("roomsError"),

    roomsErrorMessage:
        document.getElementById("roomsErrorMessage"),

    roomsEmptyMessage:
        document.getElementById("roomsEmptyMessage"),

    roomsRetry:
        document.getElementById("roomsRetry"),

    resultsLabel:
        document.getElementById("resultsLabel"),

    roomSearch:
        document.getElementById("roomSearch"),

    mobileRoomSearch:
        document.getElementById("mobileRoomSearch"),

    clearSearch:
        document.getElementById("clearSearch"),

    filterChips:
        document.querySelectorAll(".filter-chip"),

    totalRooms:
        document.getElementById("totalRooms"),

    availableRooms:
        document.getElementById("availableRooms"),

    occupiedRooms:
        document.getElementById("occupiedRooms"),

    maintenanceRooms:
        document.getElementById("maintenanceRooms"),

    desktopAddRoomButton:
        document.getElementById("desktopAddRoomButton"),

    topbarAddRoomButton:
        document.getElementById("topbarAddRoomButton"),

    mobileAddRoomButton:
        document.getElementById("mobileAddRoomButton"),

    emptyAddRoomButton:
        document.getElementById("emptyAddRoomButton"),

    detailsModal:
        document.getElementById("detailsModal"),

    detailsClose:
        document.getElementById("detailsClose"),

    detailsRoomTitle:
        document.getElementById("detailsRoomTitle"),

    detailsStatus:
        document.getElementById("detailsStatus"),

    detailsType:
        document.getElementById("detailsType"),

    detailsPrice:
        document.getElementById("detailsPrice"),

    detailsSize:
        document.getElementById("detailsSize"),

    detailsLocation:
        document.getElementById("detailsLocation"),

    detailsCondition:
        document.getElementById("detailsCondition"),

    detailsEdit:
        document.getElementById("detailsEdit"),

    detailsArchive:
        document.getElementById("detailsArchive"),

    toast:
        document.getElementById("toast"),

    brandLogo:
        document.getElementById("brandLogo"),

    brandSystemName:
        document.getElementById("brandSystemName"),

    topbarBusinessName:
        document.getElementById("topbarBusinessName"),

    sidebarFooterText:
        document.getElementById("sidebarFooterText")
};


/* ============================================================
   AUTH
   ============================================================ */

auth.onAuthStateChanged(user => {

    if (!user) {
        window.location.href =
            "../../login.html";

        return;
    }

    initializeRooms();
});


/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initializeRooms() {

    try {

        await loadApplicationSettings();

        addRoomController = await initAddRoom({
            mountId: "addRoomMount",

            onSaved: async room => {

                showToast(
                    `${displayRoomName(room)} was added successfully.`
                );

                /*
                 * onSnapshot() will update the Rooms grid
                 * automatically. No manual refresh is required.
                 */
            }
        });

        bindEvents();

        subscribeToRooms();

    } catch (error) {

        console.error(
            "HomeRent Rooms initialization error:",
            error
        );

        showRoomsError(
            error?.message ||
            "Unable to initialize the Rooms module."
        );
    }
}


/* ============================================================
   SETTINGS / BRANDING
   ============================================================ */

async function loadApplicationSettings() {

    try {

        const settingsRef = doc(
            db,
            ...BUSINESS_SETTINGS_PATH
        );

        const snapshot =
            await getDoc(settingsRef);

        if (!snapshot.exists()) {
            return;
        }

        const settings = snapshot.data();

        const businessName =
            settings.businessName ||
            settings.systemName ||
            "HomeRent";

        currentCurrency =
            settings.currencySymbol ||
            settings.currency ||
            settings.currencyCode ||
            "GH₵";

        document.title =
            `${businessName} — Rooms`;

        if (elements.brandSystemName) {
            elements.brandSystemName.textContent =
                businessName;
        }

        if (elements.topbarBusinessName) {
            elements.topbarBusinessName.textContent =
                businessName;
        }

        if (elements.sidebarFooterText) {
            elements.sidebarFooterText.textContent =
                businessName;
        }

        if (
            settings.logoUrl &&
            elements.brandLogo
        ) {

            elements.brandLogo.innerHTML = "";

            const image =
                document.createElement("img");

            image.src = settings.logoUrl;

            image.alt = `${businessName} logo`;

            image.onerror = () => {
                elements.brandLogo.textContent = "RM";
            };

            elements.brandLogo.appendChild(image);
        }

    } catch (error) {

        console.warn(
            "HomeRent: settings could not be loaded.",
            error
        );

        /*
         * Settings failure should not prevent
         * Rooms from loading.
         */
    }
}


/* ============================================================
   LIVE FIRESTORE LISTENER
   ============================================================ */

function subscribeToRooms() {

    showLoadingState();

    if (roomsUnsubscribe) {
        roomsUnsubscribe();
    }

    const roomsRef =
        collection(db, ROOMS_COLLECTION);

    roomsUnsubscribe = onSnapshot(
        roomsRef,

        snapshot => {

            rooms = snapshot.docs
                .map(documentSnapshot => ({
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                }))
                .filter(room =>
                    room.isArchived !== true
                );

            updateSummary();

            applyFilters();

            hideLoadingState();
        },

        error => {

            console.error(
                "HomeRent Rooms Firestore error:",
                error
            );

            showRoomsError(
                getFirestoreErrorMessage(error)
            );
        }
    );
}


/* ============================================================
   SEARCH / FILTER
   ============================================================ */

function bindEvents() {

    elements.roomSearch?.addEventListener(
        "input",
        handleSearch
    );

    elements.mobileRoomSearch?.addEventListener(
        "input",
        handleMobileSearch
    );

    elements.clearSearch?.addEventListener(
        "click",
        clearSearch
    );

    elements.filterChips.forEach(chip => {

        chip.addEventListener(
            "click",
            () => {

                activeFilter =
                    chip.dataset.filter || "all";

                elements.filterChips.forEach(item => {
                    item.classList.toggle(
                        "active",
                        item === chip
                    );
                });

                applyFilters();
            }
        );
    });


    [
        elements.desktopAddRoomButton,
        elements.topbarAddRoomButton,
        elements.mobileAddRoomButton,
        elements.emptyAddRoomButton
    ].forEach(button => {

        button?.addEventListener(
            "click",
            openAddRoom
        );
    });


    elements.roomsRetry?.addEventListener(
        "click",
        () => {

            subscribeToRooms();
        }
    );


    elements.detailsClose?.addEventListener(
        "click",
        closeDetails
    );


    elements.detailsModal?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                elements.detailsModal
            ) {
                closeDetails();
            }
        }
    );


    elements.detailsEdit?.addEventListener(
        "click",
        editSelectedRoom
    );


    elements.detailsArchive?.addEventListener(
        "click",
        archiveSelectedRoom
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                elements.detailsModal &&
                !elements.detailsModal.hidden
            ) {
                closeDetails();
            }
        }
    );
}


function handleSearch() {

    const value =
        elements.roomSearch.value;

    if (elements.mobileRoomSearch) {
        elements.mobileRoomSearch.value =
            value;
    }

    elements.clearSearch.hidden =
        !value.trim();

    applyFilters();
}


function handleMobileSearch() {

    const value =
        elements.mobileRoomSearch.value;

    if (elements.roomSearch) {
        elements.roomSearch.value =
            value;
    }

    elements.clearSearch.hidden =
        !value.trim();

    applyFilters();
}


function clearSearch() {

    if (elements.roomSearch) {
        elements.roomSearch.value = "";
    }

    if (elements.mobileRoomSearch) {
        elements.mobileRoomSearch.value = "";
    }

    elements.clearSearch.hidden = true;

    applyFilters();
}


function applyFilters() {

    const search =
        (
            elements.roomSearch?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    filteredRooms = rooms.filter(room => {

        const statusMatch =
            activeFilter === "all" ||
            room.status === activeFilter;

        if (!statusMatch) {
            return false;
        }

        if (!search) {
            return true;
        }

        const searchable = [
            room.roomNumber,
            room.type,
            room.location,
            room.size,
            room.conditionNotes,
            room.id
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchable.includes(search);
    });


    renderRooms();
}


/* ============================================================
   SUMMARY
   ============================================================ */

function updateSummary() {

    const available =
        rooms.filter(
            room => room.status === "available"
        ).length;

    const occupied =
        rooms.filter(
            room => room.status === "occupied"
        ).length;

    const maintenance =
        rooms.filter(
            room => room.status === "maintenance"
        ).length;


    elements.totalRooms.textContent =
        rooms.length;

    elements.availableRooms.textContent =
        available;

    elements.occupiedRooms.textContent =
        occupied;

    elements.maintenanceRooms.textContent =
        maintenance;
}


/* ============================================================
   RENDER
   ============================================================ */

function renderRooms() {

    elements.roomsGrid.innerHTML = "";

    if (!filteredRooms.length) {

        elements.roomsGrid.hidden = true;

        elements.roomsEmpty.hidden = false;

        elements.roomsEmptyMessage.textContent =
            rooms.length
                ? "No rooms match your current search or filter."
                : "There are no rooms in your records yet.";

        elements.resultsLabel.textContent =
            "0 rooms";

        return;
    }


    elements.roomsEmpty.hidden = true;

    elements.roomsGrid.hidden = false;


    filteredRooms.forEach(room => {

        elements.roomsGrid.appendChild(
            createRoomCard(room)
        );
    });


    elements.resultsLabel.textContent =
        `${filteredRooms.length} ${
            filteredRooms.length === 1
                ? "room"
                : "rooms"
        }`;
}


function createRoomCard(room) {

    const card =
        document.createElement("article");

    card.className = "room-card";

    const roomName =
        displayRoomName(room);

    const type =
        displayRoomType(room.type);

    const status =
        normalizeStatus(room.status);

    const price =
        formatCurrency(room.currentPrice);


    card.innerHTML = `
        <div class="room-card-header">

            <div>
                <div class="room-card-number">
                    ${escapeHtml(roomName)}
                </div>

                <div class="room-card-type">
                    ${escapeHtml(type)}
                </div>
            </div>

            <span class="room-status ${status}">
                ${escapeHtml(formatStatus(status))}
            </span>

        </div>


        <div class="room-card-price">

            <strong>
                ${escapeHtml(price)}
            </strong>

            <span>
                current price
            </span>

        </div>


        <div class="room-card-meta">

            <div class="room-meta-row">

                <span>Location</span>

                <span>
                    ${escapeHtml(
                        room.location || "Not specified"
                    )}
                </span>

            </div>


            <div class="room-meta-row">

                <span>Size</span>

                <span>
                    ${escapeHtml(
                        room.size || "Not specified"
                    )}
                </span>

            </div>

        </div>


        <div class="room-card-footer">

            <button
                type="button"
                class="room-action"
                data-action="view"
                data-room-id="${escapeHtml(room.id)}"
            >
                View
            </button>

            <button
                type="button"
                class="room-action primary"
                data-action="edit"
                data-room-id="${escapeHtml(room.id)}"
            >
                Edit
            </button>

        </div>
    `;


    card
        .querySelectorAll(".room-action")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const roomId =
                        button.dataset.roomId;

                    if (
                        button.dataset.action ===
                        "edit"
                    ) {
                        editRoom(roomId);
                    } else {
                        openDetails(roomId);
                    }
                }
            );
        });


    return card;
}


/* ============================================================
   DETAILS
   ============================================================ */

function openDetails(roomId) {

    const room =
        rooms.find(item =>
            item.id === roomId
        );

    if (!room) {
        showToast("Room could not be found.");
        return;
    }

    selectedRoomId = roomId;

    elements.detailsRoomTitle.textContent =
        displayRoomName(room);

    elements.detailsStatus.textContent =
        formatStatus(
            normalizeStatus(room.status)
        );

    elements.detailsType.textContent =
        displayRoomType(room.type);

    elements.detailsPrice.textContent =
        formatCurrency(room.currentPrice);

    elements.detailsSize.textContent =
        room.size || "Not specified";

    elements.detailsLocation.textContent =
        room.location || "Not specified";

    elements.detailsCondition.textContent =
        room.conditionNotes ||
        "No notes recorded.";

    elements.detailsModal.hidden = false;

    document.body.classList.add(
        "homerent-modal-open"
    );
}


function closeDetails() {

    elements.detailsModal.hidden = true;

    document.body.classList.remove(
        "homerent-modal-open"
    );

    selectedRoomId = null;
}


/* ============================================================
   ADD ROOM
   ============================================================ */

async function openAddRoom() {

    if (!addRoomController) {

        showToast(
            "Add Room is still loading. Please try again."
        );

        return;
    }

    await addRoomController.open();
}


/* ============================================================
   EDIT
   ============================================================ */

function editRoom(roomId) {

    const room =
        rooms.find(item =>
            item.id === roomId
        );

    if (!room) {
        showToast("Room could not be found.");
        return;
    }

    /*
     * Editing is deliberately kept separate from
     * Add Room. This prevents an Add Room form
     * accidentally overwriting an existing record.
     *
     * The edit interface can be connected here
     * when the Tenancy/Room editing workflow is
     * finalized.
     */

    showToast(
        `${displayRoomName(room)} is ready for editing.`
    );
}


function editSelectedRoom() {

    if (!selectedRoomId) {
        return;
    }

    editRoom(selectedRoomId);
}


/* ============================================================
   ARCHIVE
   ============================================================ */

async function archiveSelectedRoom() {

    if (!selectedRoomId) {
        return;
    }

    const room =
        rooms.find(item =>
            item.id === selectedRoomId
        );

    if (!room) {
        showToast("Room could not be found.");
        return;
    }


    if (room.status === "occupied") {

        showToast(
            "An occupied room cannot be archived."
        );

        return;
    }


    const confirmed =
        window.confirm(
            `Archive ${displayRoomName(room)}?\n\n` +
            "The room will remain in your historical records " +
            "but will no longer appear in active Rooms."
        );

    if (!confirmed) {
        return;
    }


    try {

        if (!auth.currentUser) {
            throw new Error(
                "Your session has expired. Please log in again."
            );
        }


        const roomRef =
            doc(
                db,
                ROOMS_COLLECTION,
                room.id
            );

        const auditRef =
            doc(
                collection(
                    db,
                    AUDIT_COLLECTION
                )
            );


        const batch =
            writeBatch(db);


        batch.update(
            roomRef,
            {
                isArchived: true,
                updatedAt: serverTimestamp()
            }
        );


        batch.set(
            auditRef,
            {
                action: "ARCHIVE_ROOM",
                collection: ROOMS_COLLECTION,
                documentId: room.id,
                roomId: room.id,
                roomNumber: room.roomNumber,
                performedBy:
                    auth.currentUser.uid,
                performedAt:
                    serverTimestamp()
            }
        );


        await batch.commit();


        closeDetails();

        showToast(
            `${displayRoomName(room)} was archived.`
        );

    } catch (error) {

        console.error(
            "HomeRent archive room error:",
            error
        );

        showToast(
            error?.message ||
            "Unable to archive this room."
        );
    }
}


/* ============================================================
   LOADING / ERROR STATES
   ============================================================ */

function showLoadingState() {

    elements.roomsLoading.hidden = false;

    elements.roomsError.hidden = true;

    elements.roomsEmpty.hidden = true;

    elements.roomsGrid.hidden = true;

    elements.resultsLabel.textContent =
        "Loading rooms...";
}


function hideLoadingState() {

    elements.roomsLoading.hidden = true;
}


function showRoomsError(message) {

    elements.roomsLoading.hidden = true;

    elements.roomsGrid.hidden = true;

    elements.roomsEmpty.hidden = true;

    elements.roomsError.hidden = false;

    elements.roomsErrorMessage.textContent =
        message;

    elements.resultsLabel.textContent =
        "Unable to load rooms";
}


/* ============================================================
   HELPERS
   ============================================================ */

function normalizeStatus(status) {

    const allowed = [
        "available",
        "reserved",
        "occupied",
        "maintenance"
    ];

    return allowed.includes(status)
        ? status
        : "available";
}


function formatStatus(status) {

    const labels = {
        available: "Available",
        reserved: "Reserved",
        occupied: "Occupied",
        maintenance: "Maintenance"
    };

    return labels[status] || "Available";
}


function displayRoomType(type) {

    if (type === "storeroom") {
        return "Storeroom";
    }

    return "Living Room";
}


function displayRoomName(room) {

    if (!room) {
        return "Room";
    }

    const number =
        String(room.roomNumber || "")
            .trim();

    if (!number) {
        return room.id || "Room";
    }

    if (
        number.toUpperCase()
            .startsWith("ROOM-")
    ) {
        return number.toUpperCase();
    }

    return `Room ${number}`;
}


function formatCurrency(value) {

    const amount =
        Number(value);

    if (!Number.isFinite(amount)) {
        return `${currentCurrency} 0.00`;
    }

    try {

        return new Intl.NumberFormat(
            "en-GH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(amount)
            .replace(/^/, `${currentCurrency} `);

    } catch {

        return `${currentCurrency} ${amount.toFixed(2)}`;
    }
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getFirestoreErrorMessage(error) {

    if (!error) {
        return "An unknown error occurred.";
    }

    if (error.code === "permission-denied") {
        return (
            "Firebase denied access to the Rooms records. " +
            "Check that you are logged in with the HomeRent administrator account."
        );
    }

    if (
        error.code === "unavailable" ||
        error.code === "failed-precondition"
    ) {
        return (
            "Firebase is temporarily unavailable. " +
            "Check your internet connection and try again."
        );
    }

    return (
        error.message ||
        "Unable to load the Rooms records."
    );
}


function showToast(message) {

    if (!elements.toast) {
        return;
    }

    clearTimeout(toastTimer);

    elements.toast.textContent =
        message;

    elements.toast.classList.add("show");

    toastTimer =
        setTimeout(() => {

            elements.toast.classList.remove(
                "show"
            );

        }, 3500);
}


/* ============================================================
   CLEANUP
   ============================================================ */

window.addEventListener(
    "beforeunload",
    () => {

        if (roomsUnsubscribe) {
            roomsUnsubscribe();
        }
    }
);