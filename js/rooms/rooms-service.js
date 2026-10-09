// File: js/rooms/rooms-service.js
//
// HomeRent — Rooms Firestore Service
// Handles room validation, loading, creation, updating and archiving.
//
// IMPORTANT:
// - Uses the existing Firebase configuration.
// - Does not permanently delete room records.
// - Keeps database operations separate from the UI.
// - Stores prices as numbers.
// - Uses the existing rooms collection.

import { db } from "../firebase.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// --------------------------------------------------
// COLLECTION
// --------------------------------------------------

const ROOMS_COLLECTION = "rooms";

function roomsCollection() {
  return collection(db, ROOMS_COLLECTION);
}

function roomDocument(roomId) {
  return doc(db, ROOMS_COLLECTION, roomId);
}

// --------------------------------------------------
// NORMALIZATION HELPERS
// --------------------------------------------------

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRoomType(value) {
  const type = cleanText(value).toLowerCase();

  // Accept common alternative labels from forms.
  if (["living", "living room", "living-room"].includes(type)) {
    return "living";
  }

  if (["store", "storeroom", "store room", "store-room"].includes(type)) {
    return "store";
  }

  return type;
}

function normalizeRoomStatus(value) {
  return cleanText(value).toLowerCase();
}

function normalizeRoomNumber(value) {
  return cleanText(value).toUpperCase();
}

function toOptionalText(value) {
  const text = cleanText(value);
  return text || "";
}

// --------------------------------------------------
// VALIDATION
// Returns { valid, errors, data }
// --------------------------------------------------

export function validateRoomData(input = {}) {
  const errors = {};

  const data = {
    roomNumber: normalizeRoomNumber(input.roomNumber),
    type: normalizeRoomType(input.type),
    status: normalizeRoomStatus(input.status || "available"),
    size: toOptionalText(input.size),
    location: toOptionalText(input.location),
    conditionNotes: toOptionalText(input.conditionNotes),
    currentPrice: input.currentPrice,
    photoUrls: Array.isArray(input.photoUrls)
      ? input.photoUrls
          .filter((url) => typeof url === "string")
          .map((url) => url.trim())
          .filter(Boolean)
      : []
  };

  // Room number
  if (!data.roomNumber) {
    errors.roomNumber = "Enter a room number.";
  } else if (data.roomNumber.length > 50) {
    errors.roomNumber = "Room number must not exceed 50 characters.";
  }

  // Room type
  if (!["living", "store"].includes(data.type)) {
    errors.type = "Choose Living Room or Storeroom.";
  }

  // Room status
  const allowedStatuses = [
    "available",
    "occupied",
    "reserved",
    "maintenance"
  ];

  if (!allowedStatuses.includes(data.status)) {
    errors.status = "Choose a valid room status.";
  }

  // Rental price
  const price =
    data.currentPrice === "" ||
    data.currentPrice === null ||
    data.currentPrice === undefined
      ? NaN
      : Number(data.currentPrice);

  if (!Number.isFinite(price) || price < 0) {
    errors.currentPrice = "Enter a valid price of zero or more.";
  } else {
    data.currentPrice = price;
  }

  // Optional text limits
  if (data.size.length > 100) {
    errors.size = "Size must not exceed 100 characters.";
  }

  if (data.location.length > 200) {
    errors.location = "Location must not exceed 200 characters.";
  }

  if (data.conditionNotes.length > 2000) {
    errors.conditionNotes =
      "Condition notes must not exceed 2,000 characters.";
  }

  if (data.photoUrls.length > 10) {
    errors.photoUrls = "A room can have up to 10 photo URLs.";
  }

  // Only allow valid HTTP(S) photo URLs.
  for (const url of data.photoUrls) {
    try {
      const parsedUrl = new URL(url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        errors.photoUrls = "Room photo links must use HTTP or HTTPS.";
        break;
      }
    } catch {
      errors.photoUrls = "One or more room photo links are invalid.";
      break;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data
  };
}

// --------------------------------------------------
// LOAD ALL ACTIVE ROOMS
// Archived rooms are excluded by default.
// --------------------------------------------------

export async function getRooms(options = {}) {
  const includeArchived = options.includeArchived === true;

  try {
    const snapshot = await getDocs(roomsCollection());

    const rooms = snapshot.docs
      .map((roomSnapshot) => ({
        id: roomSnapshot.id,
        ...roomSnapshot.data()
      }))
      .filter((room) => {
        return includeArchived || room.isArchived !== true;
      });

    // Newest records first when timestamps are available.
    rooms.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });

    return rooms;
  } catch (error) {
    console.error("HomeRent: Could not load rooms.", error);
    throw new Error(
      "Unable to load rooms. Check your connection and access permissions."
    );
  }
}

// --------------------------------------------------
// LOAD ONE ROOM
// --------------------------------------------------

export async function getRoomById(roomId) {
  const id = cleanText(roomId);

  if (!id) {
    throw new Error("A room ID is required.");
  }

  try {
    const snapshot = await getDoc(roomDocument(id));

    if (!snapshot.exists()) {
      throw new Error("This room could not be found.");
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    };
  } catch (error) {
    console.error("HomeRent: Could not load room.", error);

    if (error.message === "This room could not be found.") {
      throw error;
    }

    throw new Error("Unable to load this room. Please try again.");
  }
}

// --------------------------------------------------
// CHECK FOR DUPLICATE ROOM NUMBERS
// --------------------------------------------------

async function ensureUniqueRoomNumber(roomNumber, excludeRoomId = null) {
  const snapshot = await getDocs(roomsCollection());
  const targetNumber = normalizeRoomNumber(roomNumber);

  const duplicate = snapshot.docs.some((roomSnapshot) => {
    const room = roomSnapshot.data();

    if (roomSnapshot.id === excludeRoomId) {
      return false;
    }

    if (room.isArchived === true) {
      return false;
    }

    return normalizeRoomNumber(room.roomNumber) === targetNumber;
  });

  if (duplicate) {
    throw new Error(
      `Room number "${targetNumber}" is already in use. Choose another number.`
    );
  }
}

// --------------------------------------------------
// CREATE ROOM
// --------------------------------------------------

export async function createRoom(input) {
  const result = validateRoomData(input);

  if (!result.valid) {
    const error = new Error("Please correct the room details.");
    error.validationErrors = result.errors;
    throw error;
  }

  try {
    await ensureUniqueRoomNumber(result.data.roomNumber);

    const now = serverTimestamp();

    const roomData = {
      ...result.data,
      vacancyHistory: [],
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };

    const newRoom = await addDoc(roomsCollection(), roomData);

    return {
      id: newRoom.id,
      ...result.data,
      vacancyHistory: [],
      isArchived: false
    };
  } catch (error) {
    console.error("HomeRent: Could not create room.", error);

    if (
      error.validationErrors ||
      error.message.includes("already in use")
    ) {
      throw error;
    }

    throw new Error(
      "Unable to save the room. Check your connection and access permissions."
    );
  }
}

// --------------------------------------------------
// UPDATE EXISTING ROOM
// --------------------------------------------------

export async function updateRoom(roomId, input) {
  const id = cleanText(roomId);

  if (!id) {
    throw new Error("A room ID is required for updating.");
  }

  const result = validateRoomData(input);

  if (!result.valid) {
    const error = new Error("Please correct the room details.");
    error.validationErrors = result.errors;
    throw error;
  }

  try {
    const existingRoom = await getDoc(roomDocument(id));

    if (!existingRoom.exists()) {
      throw new Error("This room no longer exists.");
    }

    if (existingRoom.data().isArchived === true) {
      throw new Error("Archived rooms cannot be edited.");
    }

    await ensureUniqueRoomNumber(result.data.roomNumber, id);

    await updateDoc(roomDocument(id), {
      ...result.data,
      updatedAt: serverTimestamp()
    });

    return {
      id,
      ...result.data
    };
  } catch (error) {
    console.error("HomeRent: Could not update room.", error);

    if (
      error.validationErrors ||
      error.message.includes("already in use") ||
      error.message === "This room no longer exists." ||
      error.message === "Archived rooms cannot be edited."
    ) {
      throw error;
    }

    throw new Error(
      "Unable to update the room. Check your connection and access permissions."
    );
  }
}

// --------------------------------------------------
// ARCHIVE ROOM
// Keeps the record instead of permanently deleting it.
// --------------------------------------------------

export async function archiveRoom(roomId) {
  const id = cleanText(roomId);

  if (!id) {
    throw new Error("A room ID is required for archiving.");
  }

  try {
    const existingRoom = await getDoc(roomDocument(id));

    if (!existingRoom.exists()) {
      throw new Error("This room no longer exists.");
    }

    if (existingRoom.data().isArchived === true) {
      throw new Error("This room is already archived.");
    }

    await updateDoc(roomDocument(id), {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id,
      isArchived: true
    };
  } catch (error) {
    console.error("HomeRent: Could not archive room.", error);

    if (
      error.message === "This room no longer exists." ||
      error.message === "This room is already archived."
    ) {
      throw error;
    }

    throw new Error(
      "Unable to archive the room. Check your connection and access permissions."
    );
  }
}