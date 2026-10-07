/* =========================================================
   HOMERENT - ROOMS MODULE
========================================================= */

import { auth, db } from "../../firebase.js";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    orderBy,
    setDoc,
    updateDoc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================================================
   COLLECTIONS
========================================================= */

const ROOMS_COLLECTION = "rooms";
const ROOM_HISTORY_COLLECTION = "roomStatusHistory";
const AUDIT_COLLECTION = "auditLogs";


/* =========================================================
   STATE
========================================================= */

let rooms = [];
let filteredRooms = [];

let activeFilter = "all";
let editingRoomId = null;
let selectedRoomId = null;

let currentSettings = {
    currencySymbol: "₵",
    currency: "GHS"
};


/* =========================================================
   DOM
========================================================= */

const roomSearch =
    document.getElementById("roomSearch");

const clearSearch =
    document.getElementById("clearSearch");

const roomsGrid =
    document.getElementById("roomsGrid");

const roomsLoading =
    document.getElementById("roomsLoading");

const roomsEmpty =
    document.getElementById("roomsEmpty");

const resultsLabel =
    document.getElementById("resultsLabel");

const roomModal =
    document.getElementById("roomModal");

const detailsModal =
    document.getElementById("detailsModal");

const roomForm =
    document.getElementById("roomForm");

const roomModalTitle =
    document.getElementById("roomModalTitle");

const roomModalDescription =
    document.getElementById("roomModalDescription");

const editingRoomId =
    document.getElementById("editingRoomId");

const roomType =
    document.getElementById("roomType");

const roomNumber =
    document.getElementById("roomNumber");

const roomSize =
    document.getElementById("roomSize");

const roomLocation =
    document.getElementById("roomLocation");

const roomPrice =
    document.getElementById("roomPrice");

const roomStatus =
    document.getElementById("roomStatus");

const conditionNotes =
    document.getElementById("conditionNotes");

const photoUrls =
    document.getElementById("photoUrls");

const saveRoomButton =
    document.getElementById("saveRoomButton");

const formMessage =
    document.getElementById("formMessage");

const detailsTitle =
    document.getElementById("detailsTitle");

const roomDetailsContent =
    document.getElementById("roomDetailsContent");

const detailsEditButton =
    document.getElementById("detailsEditButton");

const detailsArchiveButton =
    document.getElementById("detailsArchiveButton");

const toast =
    document.getElementById("toast");


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeRooms();
});


async function initializeRooms() {

    bindEvents();

    await loadApplicationSettings();

    await loadRooms();
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

    roomSearch?.addEventListener(
        "input",
        handleSearch
    );


    clearSearch?.addEventListener(
        "click",
        () => {
            roomSearch.value = "";
            handleSearch();
            roomSearch.focus();
        }
    );


    document
        .querySelectorAll(".filter-chip")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    activeFilter =
                        button.dataset.filter || "all";

                    document
                        .querySelectorAll(".filter-chip")
                        .forEach(item =>
                            item.classList.remove("active")
                        );

                    button.classList.add("active");

                    applyFilters();
                }
            );

        });


    document
        .getElementById("addRoomButton")
        ?.addEventListener(
            "click",
            () => openRoomModal()
        );


    document
        .getElementById("emptyAddRoomButton")
        ?.addEventListener(
            "click",
            () => openRoomModal()
        );


    document
        .getElementById("mobileAddRoomButton")
        ?.addEventListener(
            "click",
            () => openRoomModal()
        );


    document
        .getElementById("closeRoomModal")
        ?.addEventListener(
            "click",
            closeRoomModal
        );


    document
        .getElementById("cancelRoomButton")
        ?.addEventListener(
            "click",
            closeRoomModal
        );


    document
        .getElementById("closeDetailsModal")
        ?.addEventListener(
            "click",
            closeDetailsModal
        );


    detailsEditButton?.addEventListener(
        "click",
        handleDetailsEdit
    );


    detailsArchiveButton?.addEventListener(
        "click",
        handleDetailsArchive
    );


    roomForm?.addEventListener(
        "submit",
        handleRoomSubmit
    );


    roomModal?.addEventListener(
        "click",
        event => {

            if (event.target === roomModal) {
                closeRoomModal();
            }

        }
    );


    detailsModal?.addEventListener(
        "click",
        event => {

            if (event.target === detailsModal) {
                closeDetailsModal();
            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") return;

            if (!roomModal.classList.contains("hidden")) {
                closeRoomModal();
            }

            if (!detailsModal.classList.contains("hidden")) {
                closeDetailsModal();
            }

        }
    );

}


/* =========================================================
   SETTINGS
========================================================= */

async function loadApplicationSettings() {

    try {

        const settingsRef =
            doc(db, "settings", "business");

        const snapshot =
            await getDoc(settingsRef);

        if (!snapshot.exists()) {
            return;
        }

        const data = snapshot.data();

        currentSettings = {
            ...currentSettings,
            ...data
        };


        const currencyPrefix =
            document.getElementById("currencyPrefix");

        if (currencyPrefix) {
            currencyPrefix.textContent =
                currentSettings.currencySymbol || "₵";
        }


        document.title =
            `Rooms | ${currentSettings.businessName || "HomeRent"}`;

    } catch (error) {

        console.warn(
            "HomeRent: Could not load settings.",
            error
        );

    }

}


/* =========================================================
   LOAD ROOMS
========================================================= */

async function loadRooms() {

    showLoading(true);

    try {

        const roomsRef =
            collection(db, ROOMS_COLLECTION);

        let snapshot;

        try {

            const roomsQuery =
                query(
                    roomsRef,
                    orderBy("roomNumber", "asc")
                );

            snapshot =
                await getDocs(roomsQuery);

        } catch (queryError) {

            console.warn(
                "Room ordered query failed. Loading without order.",
                queryError
            );

            snapshot =
                await getDocs(roomsRef);

        }


        rooms =
            snapshot.docs
                .map(documentSnapshot => ({
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                }))
                .filter(room => room.isArchived !== true);


        applyFilters();

    } catch (error) {

        console.error(
            "HomeRent: Failed to load rooms.",
            error
        );

        showToast(
            getFirebaseErrorMessage(error),
            "error"
        );

        rooms = [];

        applyFilters();

    } finally {

        showLoading(false);

    }

}


/* =========================================================
   SEARCH
========================================================= */

function handleSearch() {

    const hasSearch =
        roomSearch.value.trim().length > 0;

    clearSearch?.classList.toggle(
        "hidden",
        !hasSearch
    );

    applyFilters();
}


/* =========================================================
   FILTERING
========================================================= */

function applyFilters() {

    const searchTerm =
        roomSearch?.value
            ?.trim()
            .toLowerCase() || "";


    filteredRooms =
        rooms.filter(room => {

            const type =
                normalizeRoomType(room.type);

            const status =
                normalizeStatus(room.status);


            const searchableText =
                [
                    room.roomNumber,
                    room.type,
                    type,
                    room.size,
                    room.location,
                    room.conditionNotes,
                    room.currentPrice,
                    room.status
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


            const matchesSearch =
                !searchTerm ||
                searchableText.includes(searchTerm);


            let matchesFilter = true;


            switch (activeFilter) {

                case "living":
                    matchesFilter =
                        type === "living";
                    break;

                case "store":
                    matchesFilter =
                        type === "store";
                    break;

                case "available":
                    matchesFilter =
                        status === "available";
                    break;

                case "occupied":
                    matchesFilter =
                        status === "occupied";
                    break;

                case "maintenance":
                    matchesFilter =
                        status === "maintenance";
                    break;

                default:
                    matchesFilter = true;

            }


            return (
                matchesSearch &&
                matchesFilter
            );

        });


    renderRooms();
    updateStatistics();

}


/* =========================================================
   RENDER
========================================================= */

function renderRooms() {

    if (!roomsGrid) return;

    roomsGrid.innerHTML = "";


    if (filteredRooms.length === 0) {

        roomsGrid.classList.add("hidden");
        roomsEmpty.classList.remove("hidden");

        resultsLabel.textContent =
            "0 rooms";

        return;
    }


    roomsEmpty.classList.add("hidden");
    roomsGrid.classList.remove("hidden");


    resultsLabel.textContent =
        `${filteredRooms.length} ${
            filteredRooms.length === 1
                ? "room"
                : "rooms"
        }`;


    filteredRooms.forEach(room => {

        roomsGrid.appendChild(
            createRoomCard(room)
        );

    });

}


/* =========================================================
   ROOM CARD
========================================================= */

function createRoomCard(room) {

    const card =
        document.createElement("article");

    card.className = "room-card";


    const type =
        normalizeRoomType(room.type);

    const status =
        normalizeStatus(room.status);


    const typeLabel =
        type === "store"
            ? "Storeroom"
            : "Living Room";


    const statusInfo =
        getStatusInfo(status);


    const price =
        formatCurrency(room.currentPrice);


    card.innerHTML = `
        <div class="room-card-top">

            <div>
                <h3 class="room-number">
                    ${escapeHtml(
                        formatRoomName(room.roomNumber)
                    )}
                </h3>

                <div class="room-type">
                    ${typeLabel}
                    ${room.size
                        ? ` • ${escapeHtml(room.size)}`
                        : ""
                    }
                </div>
            </div>

            <span class="status-badge ${statusInfo.className}">
                ${statusInfo.label}
            </span>

        </div>


        <div class="room-price">

            <strong>
                ${price}
            </strong>

            <span>
                / ${type === "store"
                    ? "period"
                    : "month"
                }
            </span>

        </div>


        <div class="room-meta">

            <div class="room-meta-row">

                <span>Location</span>

                <span>
                    ${escapeHtml(
                        room.location || "Not specified"
                    )}
                </span>

            </div>


            <div class="room-meta-row">

                <span>Condition</span>

                <span>
                    ${escapeHtml(
                        room.conditionNotes
                            ? getShortCondition(
                                room.conditionNotes
                            )
                            : "Not recorded"
                    )}
                </span>

            </div>

        </div>


        <div class="room-card-actions">

            <button
                type="button"
                class="view-button"
                data-action="view"
                data-room-id="${escapeAttribute(room.id)}"
            >
                View
            </button>

            <button
                type="button"
                data-action="edit"
                data-room-id="${escapeAttribute(room.id)}"
            >
                Edit
            </button>

        </div>
    `;


    card
        .querySelectorAll("button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const roomId =
                        button.dataset.roomId;

                    const action =
                        button.dataset.action;

                    const selected =
                        rooms.find(
                            room => room.id === roomId
                        );

                    if (!selected) return;


                    if (action === "view") {
                        openDetailsModal(selected);
                    }


                    if (action === "edit") {
                        openRoomModal(selected);
                    }

                }
            );

        });


    return card;

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const total =
        rooms.length;

    const living =
        rooms.filter(
            room =>
                normalizeRoomType(room.type)
                === "living"
        ).length;

    const store =
        rooms.filter(
            room =>
                normalizeRoomType(room.type)
                === "store"
        ).length;

    const available =
        rooms.filter(
            room =>
                normalizeStatus(room.status)
                === "available"
        ).length;

    const occupied =
        rooms.filter(
            room =>
                normalizeStatus(room.status)
                === "occupied"
        ).length;

    const maintenance =
        rooms.filter(
            room =>
                normalizeStatus(room.status)
                === "maintenance"
        ).length;


    setText("allCount", total);
    setText("livingCount", living);
    setText("storeCount", store);
    setText("availableCount", available);
    setText("occupiedCount", occupied);
    setText("maintenanceCount", maintenance);

    setText("summaryTotal", total);
    setText("summaryAvailable", available);
    setText("summaryOccupied", occupied);
    setText("summaryMaintenance", maintenance);

}


/* =========================================================
   OPEN ADD / EDIT
========================================================= */

function openRoomModal(room = null) {

    resetForm();


    if (room) {

        editingRoomId = room.id;

        editingRoomId.value =
            room.id;

        roomModalTitle.textContent =
            "Edit Room";

        roomModalDescription.textContent =
            "Update this property's information.";

        saveRoomButton.textContent =
            "Save Changes";


        roomType.value =
            normalizeRoomType(room.type);

        roomNumber.value =
            room.roomNumber || "";

        roomSize.value =
            room.size || "";

        roomLocation.value =
            room.location || "";

        roomPrice.value =
            room.currentPrice ?? "";

        roomStatus.value =
            normalizeStatus(room.status);

        conditionNotes.value =
            room.conditionNotes || "";

        photoUrls.value =
            Array.isArray(room.photoUrls)
                ? room.photoUrls.join(", ")
                : "";

    } else {

        editingRoomId = null;

        roomModalTitle.textContent =
            "Add Room";

        roomModalDescription.textContent =
            "Add a new property space to HomeRent.";

        saveRoomButton.textContent =
            "Save Room";

        roomStatus.value =
            "available";

    }


    roomModal.classList.remove("hidden");

    roomModal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(() => {
        roomType.focus();
    }, 50);

}


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {

    roomForm?.reset();

    editingRoomId.value = "";

    clearFormErrors();
    clearFormMessage();

    roomStatus.value =
        "available";

}


/* =========================================================
   CLOSE ADD / EDIT
========================================================= */

function closeRoomModal() {

    roomModal.classList.add("hidden");

    roomModal.setAttribute(
        "aria-hidden",
        "true"
    );

    resetForm();

}


/* =========================================================
   SUBMIT ROOM
========================================================= */

async function handleRoomSubmit(event) {

    event.preventDefault();

    clearFormMessage();
    clearFormErrors();


    const validation =
        validateRoomForm();

    if (!validation.valid) {

        showFormMessage(
            validation.message,
            "error"
        );

        return;
    }


    setSaveLoading(true);


    try {

        const existingRoomId =
            editingRoomId.value.trim();


        const normalizedRoomNumber =
            normalizeRoomNumber(
                roomNumber.value
            );


        const duplicate =
            rooms.find(room => {

                if (
                    existingRoomId &&
                    room.id === existingRoomId
                ) {
                    return false;
                }

                return (
                    normalizeRoomNumber(
                        room.roomNumber
                    ) === normalizedRoomNumber
                );

            });


        if (duplicate) {

            showFormMessage(
                `Room number ${normalizedRoomNumber} already exists.`,
                "error"
            );

            setSaveLoading(false);

            return;
        }


        const type =
            normalizeRoomType(
                roomType.value
            );


        const status =
            normalizeStatus(
                roomStatus.value
            );


        const parsedPrice =
            roomPrice.value.trim() === ""
                ? 0
                : Number(roomPrice.value);


        const photos =
            parsePhotoUrls(
                photoUrls.value
            );


        const nowData = {

            roomNumber:
                normalizedRoomNumber,

            type,

            status,

            size:
                roomSize.value.trim(),

            location:
                roomLocation.value.trim(),

            conditionNotes:
                conditionNotes.value.trim(),

            currentPrice:
                parsedPrice,

            photoUrls:
                photos

        };


        if (existingRoomId) {

            await updateExistingRoom(
                existingRoomId,
                nowData
            );

        } else {

            await createNewRoom(
                nowData
            );

        }


        closeRoomModal();

        await loadRooms();


        showToast(
            existingRoomId
                ? "Room updated successfully."
                : "Room added successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "HomeRent: Failed to save room.",
            error
        );

        showFormMessage(
            getFirebaseErrorMessage(error),
            "error"
        );

    } finally {

        setSaveLoading(false);

    }

}


/* =========================================================
   CREATE ROOM
========================================================= */

async function createNewRoom(roomData) {

    const roomId =
        await generateNextRoomId(
            roomData.type
        );


    const roomRef =
        doc(
            db,
            ROOMS_COLLECTION,
            roomId
        );


    const batch =
        writeBatch(db);


    batch.set(
        roomRef,
        {
            ...roomData,

            vacancyHistory:
                roomData.status === "available"
                    ? [
                        {
                            status: "available",
                            recordedAt: new Date().toISOString()
                        }
                    ]
                    : [],

            isArchived: false,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()
        }
    );


    const historyRef =
        doc(
            collection(
                db,
                ROOM_HISTORY_COLLECTION
            )
        );


    batch.set(
        historyRef,
        {
            roomId,

            roomNumber:
                roomData.roomNumber,

            previousStatus:
                null,

            newStatus:
                roomData.status,

            reason:
                "Room created",

            changedBy:
                getCurrentUserId(),

            createdAt:
                serverTimestamp()
        }
    );


    const auditRef =
        doc(
            collection(
                db,
                AUDIT_COLLECTION
            )
        );


    batch.set(
        auditRef,
        {
            action: "CREATE",

            module: "rooms",

            recordId: roomId,

            description:
                `Created room ${roomData.roomNumber}`,

            performedBy:
                getCurrentUserId(),

            createdAt:
                serverTimestamp()
        }
    );


    await batch.commit();

}


/* =========================================================
   UPDATE ROOM
========================================================= */

async function updateExistingRoom(
    roomId,
    roomData
) {

    const roomRef =
        doc(
            db,
            ROOMS_COLLECTION,
            roomId
        );


    const previousSnapshot =
        await getDoc(roomRef);


    if (!previousSnapshot.exists()) {

        throw new Error(
            "This room no longer exists."
        );

    }


    const previousData =
        previousSnapshot.data();


    const batch =
        writeBatch(db);


    batch.update(
        roomRef,
        {
            ...roomData,

            updatedAt:
                serverTimestamp()
        }
    );


    if (
        normalizeStatus(
            previousData.status
        ) !== roomData.status
    ) {

        const historyRef =
            doc(
                collection(
                    db,
                    ROOM_HISTORY_COLLECTION
                )
            );


        batch.set(
            historyRef,
            {
                roomId,

                roomNumber:
                    roomData.roomNumber,

                previousStatus:
                    normalizeStatus(
                        previousData.status
                    ),

                newStatus:
                    roomData.status,

                reason:
                    "Room status updated",

                changedBy:
                    getCurrentUserId(),

                createdAt:
                    serverTimestamp()
            }
        );

    }


    const auditRef =
        doc(
            collection(
                db,
                AUDIT_COLLECTION
            )
        );


    batch.set(
        auditRef,
        {
            action: "UPDATE",

            module: "rooms",

            recordId: roomId,

            description:
                `Updated room ${roomData.roomNumber}`,

            performedBy:
                getCurrentUserId(),

            createdAt:
                serverTimestamp()
        }
    );


    await batch.commit();

}


/* =========================================================
   GENERATE ROOM ID
========================================================= */

async function generateNextRoomId() {

    const snapshot =
        await getDocs(
            collection(
                db,
                ROOMS_COLLECTION
            )
        );


    let highestNumber = 0;


    snapshot.forEach(documentSnapshot => {

        const data =
            documentSnapshot.data();


        const roomNumber =
            String(
                data.roomNumber || ""
            );


        const matches =
            roomNumber.match(/\d+/);


        if (!matches) return;


        const number =
            Number(matches[0]);


        if (
            Number.isFinite(number) &&
            number > highestNumber
        ) {
            highestNumber = number;
        }

    });


    const nextNumber =
        highestNumber + 1;


    return `ROOM-${String(nextNumber).padStart(3, "0")}`;

}


/* =========================================================
   DETAILS MODAL
========================================================= */

function openDetailsModal(room) {

    selectedRoomId =
        room.id;


    const type =
        normalizeRoomType(room.type);

    const status =
        normalizeStatus(room.status);

    const statusInfo =
        getStatusInfo(status);


    detailsTitle.textContent =
        formatRoomName(
            room.roomNumber
        );


    roomDetailsContent.innerHTML = `
        <div class="details-content">

            <div class="detail-hero">

                <div>

                    <h3>
                        ${escapeHtml(
                            formatRoomName(
                                room.roomNumber
                            )
                        )}
                    </h3>

                    <p>
                        ${
                            type === "store"
                                ? "Storeroom"
                                : "Living Room"
                        }
                    </p>

                </div>

                <span class="status-badge ${statusInfo.className}">
                    ${statusInfo.label}
                </span>

            </div>


            <dl class="details-list">

                <div class="details-row">
                    <dt>Room number</dt>
                    <dd>
                        ${escapeHtml(
                            room.roomNumber || "—"
                        )}
                    </dd>
                </div>

                <div class="details-row">
                    <dt>Property type</dt>
                    <dd>
                        ${
                            type === "store"
                                ? "Storeroom"
                                : "Living Room"
                        }
                    </dd>
                </div>

                <div class="details-row">
                    <dt>Size</dt>
                    <dd>
                        ${escapeHtml(
                            room.size || "Not specified"
                        )}
                    </dd>
                </div>

                <div class="details-row">
                    <dt>Location</dt>
                    <dd>
                        ${escapeHtml(
                            room.location || "Not specified"
                        )}
                    </dd>
                </div>

                <div class="details-row">
                    <dt>Current price</dt>
                    <dd>
                        ${formatCurrency(
                            room.currentPrice
                        )}
                    </dd>
                </div>

                <div class="details-row">
                    <dt>Condition</dt>
                    <dd>
                        ${escapeHtml(
                            room.conditionNotes ||
                            "Not recorded"
                        )}
                    </dd>
                </div>

            </dl>

        </div>
    `;


    detailsArchiveButton.textContent =
        room.isArchived === true
            ? "Archived"
            : "Archive";


    detailsArchiveButton.disabled =
        room.isArchived === true;


    detailsModal.classList.remove("hidden");

    detailsModal.setAttribute(
        "aria-hidden",
        "false"
    );

}


/* =========================================================
   CLOSE DETAILS
========================================================= */

function closeDetailsModal() {

    detailsModal.classList.add("hidden");

    detailsModal.setAttribute(
        "aria-hidden",
        "true"
    );

    selectedRoomId = null;

}


/* =========================================================
   DETAILS EDIT
========================================================= */

function handleDetailsEdit() {

    if (!selectedRoomId) return;


    const room =
        rooms.find(
            item =>
                item.id === selectedRoomId
        );


    if (!room) return;


    closeDetailsModal();

    openRoomModal(room);

}


/* =========================================================
   ARCHIVE
========================================================= */

async function handleDetailsArchive() {

    if (!selectedRoomId) return;


    const room =
        rooms.find(
            item =>
                item.id === selectedRoomId
        );


    if (!room) return;


    if (
        normalizeStatus(room.status)
        === "occupied"
    ) {

        showToast(
            "An occupied room cannot be archived.",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            `Archive ${formatRoomName(
                room.roomNumber
            )}?\n\nThe room will no longer appear in the active room list.`
        );


    if (!confirmed) return;


    try {

        detailsArchiveButton.disabled =
            true;


        const roomRef =
            doc(
                db,
                ROOMS_COLLECTION,
                selectedRoomId
            );


        const batch =
            writeBatch(db);


        batch.update(
            roomRef,
            {
                isArchived: true,

                updatedAt:
                    serverTimestamp()
            }
        );


        const auditRef =
            doc(
                collection(
                    db,
                    AUDIT_COLLECTION
                )
            );


        batch.set(
            auditRef,
            {
                action: "ARCHIVE",

                module: "rooms",

                recordId:
                    selectedRoomId,

                description:
                    `Archived room ${room.roomNumber}`,

                performedBy:
                    getCurrentUserId(),

                createdAt:
                    serverTimestamp()
            }
        );


        await batch.commit();


        closeDetailsModal();

        await loadRooms();


        showToast(
            "Room archived successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "HomeRent: Failed to archive room.",
            error
        );

        showToast(
            getFirebaseErrorMessage(error),
            "error"
        );

    } finally {

        detailsArchiveButton.disabled =
            false;

    }

}


/* =========================================================
   VALIDATION
========================================================= */

function validateRoomForm() {

    let valid = true;

    const type =
        roomType.value.trim();

    const number =
        normalizeRoomNumber(
            roomNumber.value
        );

    const price =
        roomPrice.value.trim();


    if (!type) {

        showFieldError(
            "roomTypeError",
            "Select a property type."
        );

        valid = false;
    }


    if (!number) {

        showFieldError(
            "roomNumberError",
            "Enter a room number."
        );

        valid = false;

    } else if (
        !/^[A-Z0-9][A-Z0-9\- /]*$/i.test(number)
    ) {

        showFieldError(
            "roomNumberError",
            "Use letters, numbers, spaces or hyphens."
        );

        valid = false;

    }


    if (
        price !== "" &&
        (
            Number.isNaN(Number(price)) ||
            Number(price) < 0
        )
    ) {

        showFieldError(
            "roomPriceError",
            "Enter a valid non-negative price."
        );

        valid = false;

    }


    return {
        valid,

        message:
            valid
                ? ""
                : "Please correct the highlighted fields."
    };

}


/* =========================================================
   FORM MESSAGES
========================================================= */

function showFieldError(
    id,
    message
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = message;
    }

}


function clearFormErrors() {

    document
        .querySelectorAll(".field-error")
        .forEach(element => {
            element.textContent = "";
        });

}


function showFormMessage(
    message,
    type = "error"
) {

    formMessage.textContent =
        message;

    formMessage.className =
        `form-message ${type}`;

}


function clearFormMessage() {

    formMessage.textContent = "";

    formMessage.className =
        "form-message hidden";

}


/* =========================================================
   LOADING
========================================================= */

function setSaveLoading(isLoading) {

    saveRoomButton.disabled =
        isLoading;

    saveRoomButton.textContent =
        isLoading
            ? "Saving..."
            : editingRoomId.value
                ? "Save Changes"
                : "Save Room";

}


function showLoading(show) {

    roomsLoading.classList.toggle(
        "hidden",
        !show
    );

    if (show) {

        roomsGrid.classList.add("hidden");
        roomsEmpty.classList.add("hidden");

    }

}


/* =========================================================
   HELPERS
========================================================= */

function normalizeRoomType(type) {

    const value =
        String(type || "")
            .trim()
            .toLowerCase();


    if (
        value === "store" ||
        value === "storeroom" ||
        value === "store room" ||
        value === "storage"
    ) {
        return "store";
    }


    return "living";

}


function normalizeStatus(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase();


    if (
        value === "vacant" ||
        value === "available"
    ) {
        return "available";
    }


    if (value === "occupied") {
        return "occupied";
    }


    if (value === "reserved") {
        return "reserved";
    }


    if (
        value === "maintenance" ||
        value === "under_maintenance"
    ) {
        return "maintenance";
    }


    if (value === "archived") {
        return "archived";
    }


    return "available";

}


function getStatusInfo(status) {

    switch (status) {

        case "occupied":
            return {
                label: "Occupied",
                className: "status-occupied"
            };

        case "reserved":
            return {
                label: "Reserved",
                className: "status-reserved"
            };

        case "maintenance":
            return {
                label: "Maintenance",
                className: "status-maintenance"
            };

        case "archived":
            return {
                label: "Archived",
                className: "status-archived"
            };

        default:
            return {
                label: "Vacant",
                className: "status-available"
            };

    }

}


function normalizeRoomNumber(value) {

    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

}


function formatRoomName(value) {

    const room =
        String(value || "")
            .trim();


    if (!room) {
        return "Unnamed Room";
    }


    return /^ROOM-/i.test(room)
        ? room.toUpperCase()
        : `Room ${room}`;

}


function formatCurrency(value) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {
        return `${currentSettings.currencySymbol || "₵"}0`;
    }


    return new Intl.NumberFormat(
        "en-GH",
        {
            style: "currency",
            currency:
                currentSettings.currency || "GHS",

            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(number);

}


function parsePhotoUrls(value) {

    return String(value || "")
        .split(",")
        .map(url => url.trim())
        .filter(Boolean);

}


function getShortCondition(value) {

    const text =
        String(value || "")
            .trim();


    if (!text) {
        return "Not recorded";
    }


    return text.length > 30
        ? `${text.slice(0, 30)}…`
        : text;

}


function getCurrentUserId() {

    return auth.currentUser?.uid || null;

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = String(value);
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


function escapeAttribute(value) {

    return escapeHtml(value);

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(
    message,
    type = "success"
) {

    if (!toast) return;


    toast.textContent =
        message;


    toast.style.background =
        type === "error"
            ? "#991b1b"
            : "#172033";


    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove("show");
            },
            3500
        );

}


/* =========================================================
   FIREBASE ERRORS
========================================================= */

function getFirebaseErrorMessage(error) {

    const code =
        error?.code || "";


    switch (code) {

        case "permission-denied":
            return "You do not have permission to perform this action.";

        case "failed-precondition":
            return "Firebase could not complete this operation.";

        case "unavailable":
            return "Firebase is temporarily unavailable. Check your internet connection.";

        case "network-request-failed":
            return "Network error. Please check your internet connection.";

        default:
            return (
                error?.message ||
                "Something went wrong. Please try again."
            );

    }

}