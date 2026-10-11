// ============================================================
// HOMERENT — CLIENTS SERVICE
// File: js/clients/clients-service.js
// Purpose: All client-related Firestore operations.
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
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ------------------------------------------------------------
// COLLECTION
// ------------------------------------------------------------

const CLIENTS_COLLECTION = "clients";

const clientsCollection = collection(db, CLIENTS_COLLECTION);

// ------------------------------------------------------------
// GET ALL CLIENTS
// includeArchived = true returns archived and non-archived clients.
// ------------------------------------------------------------

export async function getClients(includeArchived = false) {
  try {
    let clientsQuery;

    if (includeArchived) {
      clientsQuery = query(
        clientsCollection,
        orderBy("createdAt", "desc")
      );
    } else {
      clientsQuery = query(
        clientsCollection,
        where("isArchived", "==", false),
        orderBy("createdAt", "desc")
      );
    }

    const snapshot = await getDocs(clientsQuery);

    return snapshot.docs.map((clientDoc) => ({
      id: clientDoc.id,
      ...clientDoc.data()
    }));
  } catch (error) {
    console.error("Error loading clients:", error);
    throw error;
  }
}

// ------------------------------------------------------------
// GET ONE CLIENT
// ------------------------------------------------------------

export async function getClientById(clientDocumentId) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  const clientRef = doc(db, CLIENTS_COLLECTION, clientDocumentId);
  const snapshot = await getDoc(clientRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

// ------------------------------------------------------------
// GENERATE CLIENT ID
// Example: CLT/0001/26
//
// Note: This basic generator assumes sequential records.
// A transaction-backed counter is safer if numbering must
// remain unique under concurrent creation.
// ------------------------------------------------------------

export async function generateClientId() {
  const year = String(new Date().getFullYear()).slice(-2);

  const snapshot = await getDocs(
    query(clientsCollection, orderBy("createdAt", "desc"))
  );

  let highestNumber = 0;

  snapshot.docs.forEach((clientDoc) => {
    const existingId = clientDoc.data().clientId || "";
    const match = existingId.match(/^CLT\/(\d+)\/\d{2}$/);

    if (match) {
      highestNumber = Math.max(highestNumber, Number(match[1]));
    }
  });

  return `CLT/${String(highestNumber + 1).padStart(4, "0")}/${year}`;
}

// ------------------------------------------------------------
// PREPARE CLIENT DATA
// ------------------------------------------------------------

function prepareClientData(data) {
  const firstName = (data.firstName || "").trim();
  const lastName = (data.lastName || "").trim();
  const otherNames = (data.otherNames || "").trim();

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required.");
  }

  const email = (data.email || "").trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  return {
    firstName,
    lastName,
    otherNames,

    fullName: [firstName, otherNames, lastName]
      .filter(Boolean)
      .join(" "),

    phone: (data.phone || "").trim(),
    alternativePhone: (data.alternativePhone || "").trim(),
    email,
    address: (data.address || "").trim(),
    city: (data.city || "").trim(),
    occupation: (data.occupation || "").trim(),

    clientType: data.clientType || "prospective",
    status: data.status || "active",

    emergencyContact: {
      name: (data.emergencyContact?.name || "").trim(),
      relationship: (data.emergencyContact?.relationship || "").trim(),
      phone: (data.emergencyContact?.phone || "").trim()
    },

    notes: (data.notes || "").trim()
  };
}

// ------------------------------------------------------------
// ADD CLIENT
// ------------------------------------------------------------

export async function addClient(clientData) {
  try {
    const cleanData = prepareClientData(clientData);
    const clientId = await generateClientId();

    const newClient = {
      ...cleanData,
      clientId,
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      archivedAt: null
    };

    const result = await addDoc(clientsCollection, newClient);

    return {
      id: result.id,
      ...newClient,
      clientId
    };
  } catch (error) {
    console.error("Error adding client:", error);
    throw error;
  }
}

// ------------------------------------------------------------
// UPDATE CLIENT
// ------------------------------------------------------------

export async function updateClient(clientDocumentId, clientData) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  try {
    const cleanData = prepareClientData(clientData);
    const clientRef = doc(db, CLIENTS_COLLECTION, clientDocumentId);

    await updateDoc(clientRef, {
      ...cleanData,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("Error updating client:", error);
    throw error;
  }
}

// ------------------------------------------------------------
// ARCHIVE CLIENT
// Keeps the record in Firestore.
// ------------------------------------------------------------

export async function archiveClient(clientDocumentId) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  const clientRef = doc(db, CLIENTS_COLLECTION, clientDocumentId);

  await updateDoc(clientRef, {
    isArchived: true,
    status: "archived",
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return true;
}

// ------------------------------------------------------------
// RESTORE CLIENT
// ------------------------------------------------------------

export async function restoreClient(clientDocumentId) {
  if (!clientDocumentId) {
    throw new Error("Client document ID is required.");
  }

  const clientRef = doc(db, CLIENTS_COLLECTION, clientDocumentId);

  await updateDoc(clientRef, {
    isArchived: false,
    status: "active",
    archivedAt: null,
    updatedAt: serverTimestamp()
  });

  return true;
}