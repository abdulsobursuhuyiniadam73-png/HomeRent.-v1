/* ============================================================
   HOMERENT — REUSABLE ADD ROOM CONTROLLER
   ============================================================ */

import { auth, db } from "../../firebase.js";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    orderBy,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ROOMS_COLLECTION = "rooms";
const ROOM_STATUS_HISTORY_COLLECTION = "roomStatusHistory";
const AUDIT_COLLECTION = "auditLogs";
const BUSINESS_SETTINGS_PATH = ["settings", "business"];

let initialized = false;
let elements = {};
let currentCurrency = "GH₵";
let onSavedCallback = null;

function getElement(id) {
    return document.getElementById(id);
}

function cacheElements() {
    elements = {
        overlay: getElement("addRoomOverlay"),
        modal: getElement("addRoomModal"),
        close: getElement("addRoomClose"),
        cancel: getElement("addRoomCancel"),
        form: getElement("addRoomForm"),

        error: getElement("addRoomError"),
        errorMessage: getElement("addRoomErrorMessage"),

        number: getElement("addRoomNumber"),
        type: getElement("addRoomType"),
        size: getElement("addRoomSize"),
        location: getElement("addRoomLocation"),
        price: getElement("addRoomPrice"),
        status: getElement("addRoomStatus"),
        condition: getElement("addRoomCondition"),
        photos: getElement("addRoomPhotos"),

        currency: getElement("addRoomCurrency"),

        save: getElement("addRoomSave"),
        saveText: getElement("addRoomSaveText"),
        saveSpinner: getElement("addRoomSaveSpinner")
    };
}

async function loadComponentMarkup(mountElement) {
    if (!mountElement) {
        throw new Error("Add Room mount element was not found.");
    }

    if (!mountElement.querySelector("#addRoomOverlay")) {
        const htmlUrl = new URL("./add-room.html", import.meta.url);

        const response = await fetch(htmlUrl);

        if (!response.ok) {
            throw new Error(
                `Unable to load Add Room interface (${response.status}).`
            );
        }

        mountElement.innerHTML = await response.text();
    }

    if (!document.getElementById("addRoomComponentStyles")) {
        const link = document.createElement("link");

        link.id = "addRoomComponentStyles";
        link.rel = "stylesheet";
        link.href = new URL("./add-room.css", import.meta.url).href;

        document.head.appendChild(link);
    }
}

async function loadCurrency() {
    try {
        const businessRef = doc(db, ...BUSINESS_SETTINGS_PATH);
        const snapshot = await getDoc(businessRef);

        if (!snapshot.exists()) {
            return;
        }

        const data = snapshot.data();

        currentCurrency =
            data.currencySymbol ||
            data.currency ||
            data.currencyCode ||
            "GH₵";

        if (elements.currency) {
            elements.currency.textContent = currentCurrency;
        }

    } catch (error) {
        console.warn("HomeRent: unable to load currency.", error);
    }
}

function clearFieldErrors() {
    [
        "addRoomNumberError",
        "addRoomTypeError",
        "addRoomPriceError",
        "addRoomStatusError"
    ].forEach(id => {
        const element = getElement(id);

        if (element) {
            element.textContent = "";
        }
    });
}

function setFieldError(id, message) {
    const element = getElement(id);

    if (element) {
        element.textContent = message;
    }
}

function showError(message) {
    if (!elements.error || !elements.errorMessage) {
        return;
    }

    elements.errorMessage.textContent = message;
    elements.error.hidden = false;
}

function hideError() {
    if (elements.error) {
        elements.error.hidden = true;
    }
}

function setSaving(isSaving) {
    elements.save.disabled = isSaving;
    elements.saveText.textContent = isSaving
        ? "Saving..."
        : "Save Room";

    elements.saveSpinner.hidden = !isSaving;
}

function normalizeRoomNumber(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function normalizeRoomType(value) {
    return value === "storeroom"
        ? "storeroom"
        : "living";
}

function normalizeStatus(value) {
    const allowed = [
        "available",
        "reserved",
        "occupied",
        "maintenance"
    ];

    return allowed.includes(value)
        ? value
        : "available";
}

function parsePhotos(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map(url => url.trim())
        .filter(Boolean);
}

function validateForm() {
    clearFieldErrors();

    let valid = true;

    const roomNumber = normalizeRoomNumber(elements.number.value);
    const roomType = normalizeRoomType(elements.type.value);
    const price = Number(elements.price.value);

    if (!roomNumber) {
        setFieldError(
            "addRoomNumberError",
            "Room number is required."
        );

        valid = false;
    }

    if (!elements.type.value) {
        setFieldError(
            "addRoomTypeError",
            "Select a room type."
        );

        valid = false;
    }

    if (!Number.isFinite(price) || price < 0) {
        setFieldError(
            "addRoomPriceError",
            "Enter a valid price."
        );

        valid = false;
    }

    if (!elements.status.value) {
        setFieldError(
            "addRoomStatusError",
            "Select the room status."
        );

        valid = false;
    }

    return {
        valid,
        data: {
            roomNumber,
            type: roomType,
            size: elements.size.value.trim(),
            location: elements.location.value.trim(),
            currentPrice: price,
            status: normalizeStatus(elements.status.value),
            conditionNotes: elements.condition.value.trim(),
            photoUrls: parsePhotos(elements.photos.value)
        }
    };
}

async function roomNumberExists(roomNumber) {
    const snapshot = await getDocs(
        collection(db, ROOMS_COLLECTION)
    );

    const normalizedTarget = normalizeRoomNumber(roomNumber);

    return snapshot.docs.some(documentSnapshot => {
        const data = documentSnapshot.data();

        if (data.isArchived === true) {
            return false;
        }

        return normalizeRoomNumber(data.roomNumber) === normalizedTarget;
    });
}

async function generateNextRoomId() {
    const snapshot = await getDocs(
        query(
            collection(db, ROOMS_COLLECTION),
            orderBy("__name__")
        )
    );

    let highest = 0;

    snapshot.docs.forEach(documentSnapshot => {
        const match = documentSnapshot.id.match(/^ROOM-(\d+)$/i);

        if (match) {
            highest = Math.max(
                highest,
                Number(match[1])
            );
        }
    });

    return `ROOM-${String(highest + 1).padStart(3, "0")}`;
}

function getCurrentUser() {
    if (!auth.currentUser) {
        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    return auth.currentUser;
}

async function saveRoom(data) {
    const user = getCurrentUser();

    const exists = await roomNumberExists(
        data.roomNumber
    );

    if (exists) {
        throw new Error(
            `Room number "${data.roomNumber}" already exists.`
        );
    }

    const roomId = await generateNextRoomId();

    const roomRef = doc(
        db,
        ROOMS_COLLECTION,
        roomId
    );

    const historyRef = doc(
        collection(db, ROOM_STATUS_HISTORY_COLLECTION)
    );

    const auditRef = doc(
        collection(db, AUDIT_COLLECTION)
    );

    const batch = writeBatch(db);

    batch.set(roomRef, {
        roomNumber: data.roomNumber,
        type: data.type,
        status: data.status,
        size: data.size,
        location: data.location,
        conditionNotes: data.conditionNotes,
        currentPrice: data.currentPrice,
        photoUrls: data.photoUrls,
        vacancyHistory: [],

        isArchived: false,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    batch.set(historyRef, {
        roomId,
        roomNumber: data.roomNumber,
        previousStatus: null,
        newStatus: data.status,
        reason: "Room created",
        changedBy: user.uid,
        changedAt: serverTimestamp()
    });

    batch.set(auditRef, {
        action: "CREATE_ROOM",
        collection: ROOMS_COLLECTION,
        documentId: roomId,
        roomId,
        roomNumber: data.roomNumber,
        performedBy: user.uid,
        performedAt: serverTimestamp()
    });

    await batch.commit();

    return {
        id: roomId,
        ...data
    };
}

function resetForm() {
    elements.form.reset();

    elements.status.value = "available";

    clearFieldErrors();
    hideError();

    if (elements.currency) {
        elements.currency.textContent = currentCurrency;
    }
}

function close() {
    if (!elements.overlay) {
        return;
    }

    elements.overlay.hidden = true;
    document.body.classList.remove("homerent-modal-open");

    resetForm();
}

async function open() {
    if (!elements.overlay) {
        return;
    }

    hideError();
    clearFieldErrors();

    await loadCurrency();

    elements.overlay.hidden = false;

    document.body.classList.add("homerent-modal-open");

    requestAnimationFrame(() => {
        elements.number?.focus();
    });
}

async function handleSubmit(event) {
    event.preventDefault();

    hideError();

    const result = validateForm();

    if (!result.valid) {
        return;
    }

    setSaving(true);

    try {
        const room = await saveRoom(result.data);

        close();

        if (typeof onSavedCallback === "function") {
            await onSavedCallback(room);
        }

    } catch (error) {
        console.error("HomeRent Add Room error:", error);

        showError(
            error?.message ||
            "Something went wrong while saving the room. Please try again."
        );

    } finally {
        setSaving(false);
    }
}

function bindEvents() {
    elements.form.addEventListener(
        "submit",
        handleSubmit
    );

    elements.close.addEventListener(
        "click",
        close
    );

    elements.cancel.addEventListener(
        "click",
        close
    );

    elements.overlay.addEventListener(
        "click",
        event => {
            if (event.target === elements.overlay) {
                close();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                !elements.overlay.hidden
            ) {
                close();
            }
        }
    );
}

export async function initAddRoom({
    mountId = "addRoomMount",
    onSaved = null
} = {}) {

    if (initialized) {
        return {
            open,
            close
        };
    }

    const mount = document.getElementById(mountId);

    await loadComponentMarkup(mount);

    cacheElements();

    onSavedCallback = onSaved;

    bindEvents();

    initialized = true;

    return {
        open,
        close
    };
}