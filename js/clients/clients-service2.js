/*
 * HomeRent — Clients Service
 * Location: js/clients/clients-service.js
 *
 * Responsibilities:
 * - Read and search client records.
 * - Create and update clients.
 * - Archive and restore clients without deleting records.
 * - Prepare client data for future profile and tenancy links.
 *
 * IMPORTANT:
 * - Never delete or reset existing client records.
 * - Firestore document IDs remain the permanent record references.
 */

import { db } from "../firebase.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const CLIENTS_COLLECTION = "clients";

const clientsCollection = collection(db, CLIENTS_COLLECTION);

/* =====================================================
   READ CLIENTS
   ===================================================== */

/**
 * Load clients.
 * includeArchived = true includes archived and legacy records.
 */
export async function getClients(includeArchived = false) {
  try {
    const snapshot = await getDocs(clientsCollection);

    const clients = snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data()
    }));

    const visibleClients = includeArchived
      ? clients
      : clients.filter((client) => client.isArchived !== true);

    return visibleClients.sort((a, b) => {
      const aDate = a.createdAt?.toMillis?.() ?? 0;
      const bDate = b.createdAt?.toMillis?.() ?? 0;

      return bDate - aDate;
    });
  } catch (error) {
    console.error("HomeRent: unable to load clients.", error);
    throw error;
  }
}

/**
 * Get one client using the permanent Firestore document ID.
 */
export async function getClientById(clientDocumentId) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  const snapshot = await getDoc(
    doc(db, CLIENTS_COLLECTION, clientDocumentId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

/* =====================================================
   CLIENT NUMBER GENERATION
   ===================================================== */

/**
 * Generates the next display ID in the CLT/0001/26 format.
 *
 * Existing client IDs are preserved.
 *
 * NOTE:
 * This scan-based generator is suitable for a single-admin
 * workflow, but is not an atomic counter for simultaneous
 * creates. A transaction-backed counter can be introduced
 * after verifying that the current Firestore rules permit it.
 */
export async function generateClientId() {
  const year = String(new Date().getFullYear()).slice(-2);
  const snapshot = await getDocs(clientsCollection);

  let highestNumber = 0;

  for (const clientDocument of snapshot.docs) {
    const existingId = clientDocument.data().clientId || "";

    const match = existingId.match(/^CLT\/(\d+)\/\d{2}$/);

    if (match) {
      highestNumber = Math.max(
        highestNumber,
        Number(match[1])
      );
    }
  }

  return `CLT/${String(highestNumber + 1).padStart(4, "0")}/${year}`;
}

/* =====================================================
   VALIDATION AND DATA PREPARATION
   ===================================================== */

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function prepareClientData(data = {}) {
  const firstName = cleanText(data.firstName);
  const lastName = cleanText(data.lastName);
  const otherNames = cleanText(data.otherNames);
  const email = cleanText(data.email);

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required.");
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Please enter a valid email address.");
  }

  const allowedTypes = ["prospective", "tenant", "other"];
  const allowedStatuses = ["active", "inactive"];

  const clientType = allowedTypes.includes(data.clientType)
    ? data.clientType
    : "prospective";

  const status = allowedStatuses.includes(data.status)
    ? data.status
    : "active";

  return {
    firstName,
    lastName,
    otherNames,

    // Retained for compatibility with existing dashboard code.
    fullName: [firstName, otherNames, lastName]
      .filter(Boolean)
      .join(" "),

    phone: cleanText(data.phone),
    alternativePhone: cleanText(data.alternativePhone),
    email,
    address: cleanText(data.address),
    city: cleanText(data.city),
    occupation: cleanText(data.occupation),

    clientType,
    status,

    emergencyContact: {
      name: cleanText(data.emergencyContact?.name),
      relationship: cleanText(data.emergencyContact?.relationship),
      phone: cleanText(data.emergencyContact?.phone)
    },

    notes: cleanText(data.notes)
  };
}

/* =====================================================
   CREATE CLIENT
   ===================================================== */

export async function addClient(clientData) {
  try {
    const cleanData = prepareClientData(clientData);
    const clientId = await generateClientId();

    const newClient = {
      ...cleanData,

      clientId,

      // Future modules can link records through clientDocumentId.
      // The actual Firestore document ID is returned after creation.

      isArchived: false,
      archivedAt: null,

      // Reserved for future linked-record functionality.
      // These fields do not imply that a tenancy already exists.
      currentTenancyId: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const result = await addDoc(
      clientsCollection,
      newClient
    );

    return {
      id: result.id,
      ...newClient,
      clientId
    };
  } catch (error) {
    console.error("HomeRent: unable to add client.", error);
    throw error;
  }
}

/* =====================================================
   UPDATE CLIENT
   ===================================================== */

export async function updateClient(
  clientDocumentId,
  clientData
) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  const cleanData = prepareClientData(clientData);

  await updateDoc(
    doc(db, CLIENTS_COLLECTION, clientDocumentId),
    {
      ...cleanData,
      updatedAt: serverTimestamp()
    }
  );

  return true;
}

/* =====================================================
   ARCHIVE AND RESTORE
   ===================================================== */

/**
 * Archiving preserves the document and its history.
 * The client status is not changed to "archived"; archive state
 * is tracked separately through isArchived.
 */
export async function archiveClient(clientDocumentId) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  await updateDoc(
    doc(db, CLIENTS_COLLECTION, clientDocumentId),
    {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );

  return true;
}

export async function restoreClient(clientDocumentId) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  await updateDoc(
    doc(db, CLIENTS_COLLECTION, clientDocumentId),
    {
      isArchived: false,
      archivedAt: null,
      updatedAt: serverTimestamp()
    }
  );

  return true;
}