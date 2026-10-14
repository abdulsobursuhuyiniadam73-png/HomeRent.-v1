// ============================================================
// HomeRent — Clients Firestore Service
// File: js/clients/clients-service.js
//
// Responsibilities:
// - Validate and normalize client information.
// - Load client records.
// - Generate readable client numbers.
// - Detect likely duplicate contacts.
// - Create, update and archive client records.
// - Preserve client history; never permanently delete records.
//
// IMPORTANT:
// - Reuses the existing Firebase configuration.
// - Does not initialize Firebase a second time.
// - Does not manage tenancies, rooms or payments directly.
// - Firestore security rules remain the final access-control layer.
// ============================================================

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

// ------------------------------------------------------------
// CONFIGURATION
// CHANGE HERE if your established client collection name differs.
// ------------------------------------------------------------

const CLIENTS_COLLECTION = "clients";
const CLIENT_NUMBER_PREFIX = "CLT";
const CLIENT_NUMBER_PADDING = 4;

// ------------------------------------------------------------
// FIRESTORE REFERENCES
// ------------------------------------------------------------

function clientsCollection() {
  return collection(db, CLIENTS_COLLECTION);
}

function clientDocument(clientId) {
  return doc(db, CLIENTS_COLLECTION, clientId);
}

// ------------------------------------------------------------
// NORMALIZATION HELPERS
// ------------------------------------------------------------

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value) {
  return cleanText(value).replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function normalizePhone(value) {
  // Preserve a leading + and remove spaces, brackets and hyphens.
  // This is normalization, not full international number validation.
  const phone = cleanText(value);
  const hasLeadingPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  return hasLeadingPlus ? `+${digits}` : digits;
}

function optionalText(value, maxLength = 500) {
  const text = cleanText(value);

  if (text.length > maxLength) {
    throw new Error(`A text field exceeds ${maxLength} characters.`);
  }

  return text;
}

function normalizeClientStatus(value) {
  const status = cleanText(value || "active").toLowerCase();

  if (!["active", "inactive"].includes(status)) {
    throw new Error("Choose a valid client status.");
  }

  return status;
}

function normalizeClientType(value) {
  const type = cleanText(value || "individual").toLowerCase();

  if (!["individual", "business"].includes(type)) {
    throw new Error("Choose Individual or Business.");
  }

  return type;
}

function isValidEmail(email) {
  if (!email) return true;

  // Basic format check. Email ownership is not verified here.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  // A phone is required by this initial service contract.
  // International numbers should include their country code.
  return /^\+?\d{7,15}$/.test(phone);
}

// ------------------------------------------------------------
// CLIENT DATA VALIDATION
//
// Returns:
// { valid, errors, data }
//
// Fields not recognized by this service are deliberately not
// copied into the record.
// ------------------------------------------------------------

export function validateClientData(input = {}) {
  const errors = {};

  const data = {
    fullName: normalizeName(input.fullName),
    clientType: cleanText(input.clientType || "individual").toLowerCase(),
    phone: normalizePhone(input.phone),
    alternativePhone: normalizePhone(input.alternativePhone),
    email: normalizeEmail(input.email),
    address: cleanText(input.address),
    identificationType: cleanText(input.identificationType),
    identificationNumber: cleanText(input.identificationNumber),
    emergencyContactName: cleanText(input.emergencyContactName),
    emergencyContactPhone: normalizePhone(input.emergencyContactPhone),
    notes: cleanText(input.notes),
    status: cleanText(input.status || "active").toLowerCase()
  };

  // Full name
  if (!data.fullName) {
    errors.fullName = "Enter the client's full name.";
  } else if (data.fullName.length > 150) {
    errors.fullName = "Full name must not exceed 150 characters.";
  }

  // Client type
  if (!["individual", "business"].includes(data.clientType)) {
    errors.clientType = "Choose Individual or Business.";
  }

  // Primary phone
  if (!data.phone) {
    errors.phone = "Enter a primary phone number.";
  } else if (!isValidPhone(data.phone)) {
    errors.phone =
      "Enter a valid phone number, including country code when needed.";
  }

  // Optional phone numbers
  if (
    data.alternativePhone &&
    !isValidPhone(data.alternativePhone)
  ) {
    errors.alternativePhone = "Enter a valid alternative phone number.";
  }

  if (
    data.emergencyContactPhone &&
    !isValidPhone(data.emergencyContactPhone)
  ) {
    errors.emergencyContactPhone =
      "Enter a valid emergency contact phone number.";
  }

  // Email
  if (!isValidEmail(data.email)) {
    errors.email = "Enter a valid email address.";
  } else if (data.email.length > 254) {
    errors.email = "Email address is too long.";
  }

  // Length limits
  if (data.address.length > 500) {
    errors.address = "Address must not exceed 500 characters.";
  }

  if (data.identificationType.length > 60) {
    errors.identificationType =
      "Identification type must not exceed 60 characters.";
  }

  if (data.identificationNumber.length > 100) {
    errors.identificationNumber =
      "Identification number must not exceed 100 characters.";
  }

  if (data.emergencyContactName.length > 150) {
    errors.emergencyContactName =
      "Emergency contact name must not exceed 150 characters.";
  }

  if (data.notes.length > 2000) {
    errors.notes = "Notes must not exceed 2,000 characters.";
  }

  if (!["active", "inactive"].includes(data.status)) {
    errors.status = "Choose Active or Inactive.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data
  };
}

// ------------------------------------------------------------
// CLIENT NUMBER GENERATION
//
// Readable examples:
// CLT-0001
// CLT-0002
//
// This scans existing records and chooses the next number.
// It is suitable for a single-admin workflow, but it is not an
// atomic sequence generator. If concurrent creation is ever
// introduced, use a Firestore transaction/counter instead.
// ------------------------------------------------------------

function formatClientNumber(number) {
  return `${CLIENT_NUMBER_PREFIX}-${String(number).padStart(
    CLIENT_NUMBER_PADDING,
    "0"
  )}`;
}

function clientNumberToInteger(clientNumber) {
  const match = cleanText(clientNumber).match(/^CLT-(\d+)$/i);

  return match ? Number(match[1]) : 0;
}

async function generateClientNumber() {
  const snapshot = await getDocs(clientsCollection());

  let highestNumber = 0;

  for (const clientSnapshot of snapshot.docs) {
    const client = clientSnapshot.data();
    const number = clientNumberToInteger(client.clientNumber);

    if (number > highestNumber) {
      highestNumber = number;
    }
  }

  return formatClientNumber(highestNumber + 1);
}

// ------------------------------------------------------------
// LOAD CLIENTS
//
// Archived clients are excluded unless explicitly requested.
// ------------------------------------------------------------

export async function getClients(options = {}) {
  const includeArchived = options.includeArchived === true;

  try {
    const snapshot = await getDocs(clientsCollection());

    const clients = snapshot.docs
      .map((clientSnapshot) => ({
        id: clientSnapshot.id,
        ...clientSnapshot.data()
      }))
      .filter((client) => {
        return includeArchived || client.isArchived !== true;
      });

    clients.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });

    return clients;
  } catch (error) {
    console.error("HomeRent: Could not load clients.", error);

    throw new Error(
      "Unable to load clients. Check your connection and access permissions."
    );
  }
}

// ------------------------------------------------------------
// LOAD ONE CLIENT
// ------------------------------------------------------------

export async function getClientById(clientId) {
  const id = cleanText(clientId);

  if (!id) {
    throw new Error("A client ID is required.");
  }

  try {
    const snapshot = await getDoc(clientDocument(id));

    if (!snapshot.exists()) {
      throw new Error("This client could not be found.");
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    };
  } catch (error) {
    console.error("HomeRent: Could not load client.", error);

    if (error.message === "This client could not be found.") {
      throw error;
    }

    throw new Error(
      "Unable to load this client. Check your connection and access permissions."
    );
  }
}

// ------------------------------------------------------------
// DUPLICATE CONTACT CHECK
//
// This checks active, non-archived records for matching primary
// phone or email. It is a warning/prevention measure, not proof
// that two records belong to the same person.
// ------------------------------------------------------------

async function ensureUniqueClientContact(
  clientData,
  excludeClientId = null
) {
  const snapshot = await getDocs(clientsCollection());

  const duplicate = snapshot.docs.find((clientSnapshot) => {
    if (clientSnapshot.id === excludeClientId) {
      return false;
    }

    const existing = clientSnapshot.data();

    if (existing.isArchived === true) {
      return false;
    }

    const samePhone =
      clientData.phone &&
      normalizePhone(existing.phone) === clientData.phone;

    const sameEmail =
      clientData.email &&
      normalizeEmail(existing.email) === clientData.email;

    return samePhone || sameEmail;
  });

  if (duplicate) {
    const existing = duplicate.data();

    if (normalizePhone(existing.phone) === clientData.phone) {
      throw new Error(
        "A client with this phone number already exists. Check the existing record before continuing."
      );
    }

    throw new Error(
      "A client with this email address already exists. Check the existing record before continuing."
    );
  }
}

// ------------------------------------------------------------
// CREATE CLIENT
// ------------------------------------------------------------

export async function createClient(input = {}) {
  const result = validateClientData(input);

  if (!result.valid) {
    const error = new Error("Please correct the client details.");
    error.validationErrors = result.errors;
    throw error;
  }

  try {
    await ensureUniqueClientContact(result.data);

    const clientNumber = await generateClientNumber();
    const now = serverTimestamp();

    const clientData = {
      ...result.data,
      clientNumber,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };

    const newClient = await addDoc(
      clientsCollection(),
      clientData
    );

    return {
      id: newClient.id,
      ...result.data,
      clientNumber,
      isArchived: false
    };
  } catch (error) {
    console.error("HomeRent: Could not create client.", error);

    if (
      error.validationErrors ||
      error.message.includes("already exists")
    ) {
      throw error;
    }

    throw new Error(
      "Unable to save the client. Check your connection and access permissions."
    );
  }
}

// ------------------------------------------------------------
// UPDATE CLIENT
//
// The client number and creation timestamp are preserved.
// Archived records cannot be edited through this operation.
// ------------------------------------------------------------

export async function updateClient(clientId, input = {}) {
  const id = cleanText(clientId);

  if (!id) {
    throw new Error("A client ID is required for updating.");
  }

  const result = validateClientData(input);

  if (!result.valid) {
    const error = new Error("Please correct the client details.");
    error.validationErrors = result.errors;
    throw error;
  }

  try {
    const existingSnapshot = await getDoc(clientDocument(id));

    if (!existingSnapshot.exists()) {
      throw new Error("This client no longer exists.");
    }

    const existingClient = existingSnapshot.data();

    if (existingClient.isArchived === true) {
      throw new Error("Archived clients cannot be edited.");
    }

    await ensureUniqueClientContact(result.data, id);

    await updateDoc(clientDocument(id), {
      ...result.data,
      updatedAt: serverTimestamp()
    });

    return {
      id,
      ...existingClient,
      ...result.data
    };
  } catch (error) {
    console.error("HomeRent: Could not update client.", error);

    if (
      error.validationErrors ||
      error.message.includes("already exists") ||
      error.message === "This client no longer exists." ||
      error.message === "Archived clients cannot be edited."
    ) {
      throw error;
    }

    throw new Error(
      "Unable to update the client. Check your connection and access permissions."
    );
  }
}

// ------------------------------------------------------------
// ARCHIVE CLIENT
//
// Keeps the client record for historical reference.
// This function does not delete tenancy/payment history.
// A later integration step should block archiving when active
// tenancies or unresolved financial obligations exist.
// ------------------------------------------------------------

export async function archiveClient(clientId) {
  const id = cleanText(clientId);

  if (!id) {
    throw new Error("A client ID is required for archiving.");
  }

  try {
    const existingSnapshot = await getDoc(clientDocument(id));

    if (!existingSnapshot.exists()) {
      throw new Error("This client no longer exists.");
    }

    if (existingSnapshot.data().isArchived === true) {
      throw new Error("This client is already archived.");
    }

    await updateDoc(clientDocument(id), {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id,
      isArchived: true
    };
  } catch (error) {
    console.error("HomeRent: Could not archive client.", error);

    if (
      error.message === "This client no longer exists." ||
      error.message === "This client is already archived."
    ) {
      throw error;
    }

    throw new Error(
      "Unable to archive the client. Check your connection and access permissions."
    );
  }
}