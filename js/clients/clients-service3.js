// ============================================================
// HomeRent — Clients Service
// File: js/clients/clients-service.js
//
// PURPOSE
// Central place for reading, creating, updating, archiving,
// and restoring client records in Firestore.
//
// IMPORTANT
// - Preserves the existing "clients" collection.
// - Preserves existing Firestore document IDs and client IDs.
// - Does not delete client records.
// - Keeps fullName for compatibility with existing pages.
// ============================================================

import { db } from "../firebase.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ------------------------------------------------------------
// 1. COLLECTION CONFIGURATION
// CHANGE HERE only if the database collection is intentionally
// renamed after reviewing every dependent module.
// ------------------------------------------------------------

const CLIENTS_COLLECTION = "clients";

const clientsCollection = collection(
  db,
  CLIENTS_COLLECTION
);


// ------------------------------------------------------------
// 2. SHARED HELPERS
// ------------------------------------------------------------

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseStatus(value) {
  const allowedStatuses = [
    "active",
    "inactive",
    "prospective"
  ];

  const status = cleanText(value).toLowerCase();

  return allowedStatuses.includes(status)
    ? status
    : "prospective";
}

function normaliseClientType(value) {
  const allowedTypes = [
    "prospective",
    "tenant",
    "former"
  ];

  const type = cleanText(value).toLowerCase();

  return allowedTypes.includes(type)
    ? type
    : "prospective";
}

function timestampToMillis(value) {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}


// ------------------------------------------------------------
// 3. NORMALISE EXISTING RECORDS
//
// Older records may not contain every field used by the new UI.
// This function supplies safe display defaults without writing
// changes to Firestore.
// ------------------------------------------------------------

function normaliseClientRecord(snapshotDocument) {
  const data = snapshotDocument.data();

  const firstName = cleanText(data.firstName);
  const lastName = cleanText(data.lastName);
  const otherNames = cleanText(data.otherNames);

  const fullName =
    cleanText(data.fullName) ||
    [firstName, otherNames, lastName]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed client";

  const isArchived = data.isArchived === true;

  return {
    ...data,

    // Real Firestore document ID used by profile URLs.
    id: snapshotDocument.id,

    // Keep the existing business-facing client ID.
    clientId: cleanText(data.clientId),

    firstName,
    lastName,
    otherNames,
    fullName,

    phone: cleanText(data.phone),
    alternativePhone: cleanText(data.alternativePhone),
    email: cleanText(data.email),
    address: cleanText(data.address),
    city: cleanText(data.city),
    occupation: cleanText(data.occupation),
    notes: cleanText(data.notes),

    clientType: normaliseClientType(data.clientType),

    // Do not change a client's status just because the record
    // is archived. Archive state is handled separately.
    status: isArchived
      ? cleanText(data.status) || "inactive"
      : normaliseStatus(data.status),

    isArchived,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    archivedAt: data.archivedAt || null,

    emergencyContact: {
      name: cleanText(data.emergencyContact?.name),
      relationship: cleanText(
        data.emergencyContact?.relationship
      ),
      phone: cleanText(data.emergencyContact?.phone)
    }
  };
}


// ------------------------------------------------------------
// 4. GET ALL CLIENTS
//
// We fetch the collection and filter in JavaScript so records
// created before isArchived was introduced are not accidentally
// excluded by a Firestore "where isArchived == false" query.
//
// This also avoids requiring a new composite index for this
// particular operation.
// ------------------------------------------------------------

export async function getClients(includeArchived = false) {
  try {
    const snapshot = await getDocs(clientsCollection);

    const clients = snapshot.docs.map(normaliseClientRecord);

    const filteredClients = includeArchived
      ? clients
      : clients.filter(client => !client.isArchived);

    // Sort safely even when older records have no createdAt.
    filteredClients.sort((a, b) => {
      const timeDifference =
        timestampToMillis(b.createdAt) -
        timestampToMillis(a.createdAt);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return a.fullName.localeCompare(b.fullName);
    });

    return filteredClients;
  } catch (error) {
    console.error("HomeRent: failed to load clients.", error);
    throw error;
  }
}


// ------------------------------------------------------------
// 5. GET ONE CLIENT BY FIRESTORE DOCUMENT ID
//
// Example:
// details.html?id=FIRESTORE_DOCUMENT_ID
//
// Never use the visible clientId as the Firestore document ID.
// ------------------------------------------------------------

export async function getClientById(clientDocumentId) {
  const id = cleanText(clientDocumentId);

  if (!id) {
    throw new Error("Client document ID is required.");
  }

  try {
    const snapshot = await getDoc(
      doc(db, CLIENTS_COLLECTION, id)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return normaliseClientRecord(snapshot);
  } catch (error) {
    console.error("HomeRent: failed to load client profile.", error);
    throw error;
  }
}


// ------------------------------------------------------------
// 6. GENERATE CLIENT ID
//
// Format: CLT/0001/26
//
// Existing IDs are scanned so this function can continue from
// the highest existing sequence instead of restarting at 0001.
//
// NOTE: A read-then-write sequence is not concurrency-safe.
// For a multi-user system, replace it with an approved
// Firestore transaction/counter design after reviewing rules.
// HomeRent is currently designed for one administrator.
// ------------------------------------------------------------

export async function generateClientId() {
  try {
    const snapshot = await getDocs(clientsCollection);

    const year = String(new Date().getFullYear()).slice(-2);

    let highestNumber = 0;

    snapshot.docs.forEach(clientDocument => {
      const existingId = cleanText(
        clientDocument.data().clientId
      );

      const match = existingId.match(/^CLT\/(\d+)\/\d{2}$/);

      if (match) {
        highestNumber = Math.max(
          highestNumber,
          Number(match[1])
        );
      }
    });

    return `CLT/${String(highestNumber + 1).padStart(4, "0")}/${year}`;
  } catch (error) {
    console.error("HomeRent: failed to generate client ID.", error);
    throw error;
  }
}


// ------------------------------------------------------------
// 7. VALIDATE AND PREPARE CLIENT DATA
// ------------------------------------------------------------

function prepareClientData(data = {}) {
  const firstName = cleanText(data.firstName);
  const lastName = cleanText(data.lastName);
  const otherNames = cleanText(data.otherNames);
  const email = cleanText(data.email);

  if (!firstName || !lastName) {
    throw new Error(
      "First name and last name are required."
    );
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "Please enter a valid email address."
    );
  }

  return {
    firstName,
    lastName,
    otherNames,

    // Preserve the field expected by the clients page.
    fullName: [
      firstName,
      otherNames,
      lastName
    ].filter(Boolean).join(" "),

    phone: cleanText(data.phone),
    alternativePhone: cleanText(data.alternativePhone),
    email,
    address: cleanText(data.address),
    city: cleanText(data.city),
    occupation: cleanText(data.occupation),

    clientType: normaliseClientType(data.clientType),
    status: normaliseStatus(data.status),

    emergencyContact: {
      name: cleanText(data.emergencyContact?.name),
      relationship: cleanText(
        data.emergencyContact?.relationship
      ),
      phone: cleanText(data.emergencyContact?.phone)
    },

    notes: cleanText(data.notes)
  };
}


// ------------------------------------------------------------
// 8. ADD CLIENT
// ------------------------------------------------------------

export async function addClient(clientData) {
  try {
    const cleanData = prepareClientData(clientData);
    const clientId = await generateClientId();

    const newClient = {
      ...cleanData,
      clientId,

      isArchived: false,
      archivedAt: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const result = await addDoc(
      clientsCollection,
      newClient
    );

    return {
      ...newClient,
      id: result.id,
      clientId
    };
  } catch (error) {
    console.error("HomeRent: failed to add client.", error);
    throw error;
  }
}


// ------------------------------------------------------------
// 9. UPDATE CLIENT
//
// Does not change the client's document ID, clientId,
// creation date, archive state, or archive date.
// ------------------------------------------------------------

export async function updateClient(
  clientDocumentId,
  clientData
) {
  const id = cleanText(clientDocumentId);

  if (!id) {
    throw new Error("Client document ID is required.");
  }

  try {
    const clientReference = doc(
      db,
      CLIENTS_COLLECTION,
      id
    );

    const existing = await getDoc(clientReference);

    if (!existing.exists()) {
      throw new Error("This client record no longer exists.");
    }

    const cleanData = prepareClientData(clientData);

    await updateDoc(clientReference, {
      ...cleanData,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("HomeRent: failed to update client.", error);
    throw error;
  }
}


// ------------------------------------------------------------
// 10. ARCHIVE CLIENT
//
// Archiving is separate from the client's normal status.
// The client record remains in Firestore.
// ------------------------------------------------------------

export async function archiveClient(clientDocumentId) {
  const id = cleanText(clientDocumentId);

  if (!id) {
    throw new Error("Client document ID is required.");
  }

  try {
    const clientReference = doc(
      db,
      CLIENTS_COLLECTION,
      id
    );

    const existing = await getDoc(clientReference);

    if (!existing.exists()) {
      throw new Error("This client record no longer exists.");
    }

    if (existing.data().isArchived === true) {
      return true;
    }

    await updateDoc(clientReference, {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("HomeRent: failed to archive client.", error);
    throw error;
  }
}


// ------------------------------------------------------------
// 11. RESTORE CLIENT
//
// Restores the record without forcing its status to "active".
// Its previous client status is preserved.
// ------------------------------------------------------------

export async function restoreClient(clientDocumentId) {
  const id = cleanText(clientDocumentId);

  if (!id) {
    throw new Error("Client document ID is required.");
  }

  try {
    const clientReference = doc(
      db,
      CLIENTS_COLLECTION,
      id
    );

    const existing = await getDoc(clientReference);

    if (!existing.exists()) {
      throw new Error("This client record no longer exists.");
    }

    if (existing.data().isArchived !== true) {
      return true;
    }

    await updateDoc(clientReference, {
      isArchived: false,
      archivedAt: null,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("HomeRent: failed to restore client.", error);
    throw error;
  }
}