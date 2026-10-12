// ============================================================
// HomeRent — Clients Service
// File: js/clients/clients-service.js
//
// PURPOSE
// Centralizes all client-related Firestore operations.
//
// RESPONSIBILITIES
// - Validate client data
// - Create client records
// - Retrieve client records
// - Retrieve one client by ID
// - Update existing clients
// - Archive and restore clients
//
// DESIGN RULES
// - Reuse the existing Firebase configuration
// - Never permanently delete client records
// - Preserve client IDs for future tenancy/payment references
// - Keep database logic separate from UI logic
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


// ============================================================
// 1. COLLECTION CONFIGURATION
// ============================================================

const CLIENTS_COLLECTION = "clients";

function clientsCollection() {
  return collection(db, CLIENTS_COLLECTION);
}

function clientDocument(clientId) {
  return doc(db, CLIENTS_COLLECTION, clientId);
}


// ============================================================
// 2. NORMALIZATION HELPERS
// ============================================================

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value) {
  return cleanText(value).replace(/\s+/g, " ");
}

function normalizePhone(value) {
  return cleanText(value).replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function normalizeStatus(value) {
  return cleanText(value).toLowerCase();
}

function normalizeClientType(value) {
  return cleanText(value).toLowerCase();
}

function optionalText(value) {
  return cleanText(value);
}


// ============================================================
// 3. CLIENT VALIDATION
//
// Returns:
// {
//   valid: true | false,
//   errors: {},
//   data: {}
// }
//
// The UI can display errors without duplicating validation.
// ============================================================

export function validateClientData(input = {}) {
  const errors = {};

  const data = {
    fullName: normalizeName(input.fullName),
    phone: normalizePhone(input.phone),
    email: normalizeEmail(input.email),

    clientType: normalizeClientType(
      input.clientType || "individual"
    ),

    status: normalizeStatus(input.status || "active"),

    address: optionalText(input.address),
    notes: optionalText(input.notes)
  };


  // ----------------------------------------------------------
  // Full name
  // ----------------------------------------------------------

  if (!data.fullName) {
    errors.fullName = "Enter the client's full name.";
  } else if (data.fullName.length > 120) {
    errors.fullName =
      "The client's name must not exceed 120 characters.";
  }


  // ----------------------------------------------------------
  // Phone number
  // ----------------------------------------------------------

  if (!data.phone) {
    errors.phone = "Enter a phone number.";
  } else if (data.phone.length > 30) {
    errors.phone =
      "The phone number must not exceed 30 characters.";
  }


  // ----------------------------------------------------------
  // Email address
  // ----------------------------------------------------------

  if (data.email && data.email.length > 160) {
    errors.email =
      "The email address must not exceed 160 characters.";
  } else if (
    data.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    errors.email = "Enter a valid email address.";
  }


  // ----------------------------------------------------------
  // Client type
  // ----------------------------------------------------------

  const allowedTypes = [
    "individual",
    "business"
  ];

  if (!allowedTypes.includes(data.clientType)) {
    errors.clientType = "Choose a valid client type.";
  }


  // ----------------------------------------------------------
  // Client status
  // ----------------------------------------------------------

  const allowedStatuses = [
    "active",
    "inactive"
  ];

  if (!allowedStatuses.includes(data.status)) {
    errors.status = "Choose a valid client status.";
  }


  // ----------------------------------------------------------
  // Optional fields
  // ----------------------------------------------------------

  if (data.address.length > 250) {
    errors.address =
      "The address must not exceed 250 characters.";
  }

  if (data.notes.length > 1500) {
    errors.notes =
      "Notes must not exceed 1,500 characters.";
  }


  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data
  };
}


// ============================================================
// 4. CONVERT FIRESTORE DOCUMENTS TO CLIENT OBJECTS
// ============================================================

function mapClient(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data()
  };
}


// ============================================================
// 5. LOAD CLIENTS
//
// Default:
// - Includes active and inactive clients
// - Excludes archived clients
//
// Options:
// getClients()
// getClients({ includeArchived: true })
// ============================================================

export async function getClients(options = {}) {
  const includeArchived =
    options.includeArchived === true;

  try {
    const snapshot = await getDocs(clientsCollection());

    const clients = snapshot.docs
      .map(mapClient)
      .filter((client) => {
        return (
          includeArchived ||
          client.isArchived !== true
        );
      });

    // Newest clients first.
    clients.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;

      return bTime - aTime;
    });

    return clients;

  } catch (error) {
    console.error(
      "HomeRent: Failed to load clients.",
      error
    );

    throw new Error(
      "Unable to load clients. Check your connection and database permissions."
    );
  }
}


// ============================================================
// 6. LOAD ONE CLIENT
//
// Used by the future clients-details.html page.
// ============================================================

export async function getClientById(clientId) {
  const id = cleanText(clientId);

  if (!id) {
    throw new Error("A client ID is required.");
  }

  try {
    const snapshot = await getDoc(
      clientDocument(id)
    );

    if (!snapshot.exists()) {
      throw new Error("Client not found.");
    }

    return mapClient(snapshot);

  } catch (error) {
    console.error(
      "HomeRent: Failed to load client.",
      error
    );

    if (error.message === "Client not found.") {
      throw error;
    }

    throw new Error(
      "Unable to load this client. Check your connection and access permissions."
    );
  }
}


// ============================================================
// 7. CHECK FOR DUPLICATE PHONE NUMBERS
//
// Phone matching ignores letter case and extra spaces.
// This is a basic duplicate check, not a unique database
// constraint. Firestore Security Rules must protect access.
// ============================================================

async function ensureUniquePhone(
  phone,
  excludeClientId = null
) {
  const snapshot = await getDocs(clientsCollection());

  const targetPhone = normalizePhone(phone);

  const duplicate = snapshot.docs.some((item) => {
    if (item.id === excludeClientId) {
      return false;
    }

    const client = item.data();

    // Archived records do not block a new client.
    if (client.isArchived === true) {
      return false;
    }

    return normalizePhone(client.phone) === targetPhone;
  });

  if (duplicate) {
    throw new Error(
      "This phone number already belongs to another client."
    );
  }
}


// ============================================================
// 8. CREATE CLIENT
//
// Creates a new client record with timestamps.
// The generated Firestore document ID becomes the client ID.
// ============================================================

export async function createClient(input) {
  const result = validateClientData(input);

  if (!result.valid) {
    const error = new Error(
      "Please correct the client details."
    );

    error.validationErrors = result.errors;

    throw error;
  }

  try {
    await ensureUniquePhone(result.data.phone);

    const now = serverTimestamp();

    const clientData = {
      ...result.data,

      // Reserved for a future avatar upload feature.
      avatarUrl: "",

      // Reserved for future tenancy/payment integration.
      // These are references, not duplicated financial data.
      currentTenancyId: null,

      // Record lifecycle.
      isArchived: false,

      // Firestore timestamps.
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
      avatarUrl: "",
      currentTenancyId: null,
      isArchived: false
    };

  } catch (error) {
    console.error(
      "HomeRent: Failed to create client.",
      error
    );

    if (
      error.validationErrors ||
      error.message.includes("already belongs")
    ) {
      throw error;
    }

    throw new Error(
      "Unable to save the client. Check your connection and database permissions."
    );
  }
}


// ============================================================
// 9. UPDATE CLIENT
//
// Existing IDs and creation timestamps are preserved.
// Archived clients cannot be edited through this operation.
// ============================================================

export async function updateClient(clientId, input) {
  const id = cleanText(clientId);

  if (!id) {
    throw new Error("A client ID is required.");
  }

  const result = validateClientData(input);

  if (!result.valid) {
    const error = new Error(
      "Please correct the client details."
    );

    error.validationErrors = result.errors;

    throw error;
  }

  try {
    const existing = await getDoc(
      clientDocument(id)
    );

    if (!existing.exists()) {
      throw new Error("Client not found.");
    }

    if (existing.data().isArchived === true) {
      throw new Error(
        "Restore this client before editing their details."
      );
    }

    await ensureUniquePhone(
      result.data.phone,
      id
    );

    await updateDoc(
      clientDocument(id),
      {
        ...result.data,
        updatedAt: serverTimestamp()
      }
    );

    return {
      id,
      ...existing.data(),
      ...result.data
    };

  } catch (error) {
    console.error(
      "HomeRent: Failed to update client.",
      error
    );

    if (
      error.validationErrors ||
      error.message === "Client not found." ||
      error.message.includes("already belongs") ||
      error.message.includes("Restore this client")
    ) {
      throw error;
    }

    throw new Error(
      "Unable to update this client. Check your connection and database permissions."
    );
  }
}


// ============================================================
// 10. ARCHIVE CLIENT
//
// Archiving does not delete the client or their history.
// Tenancy and payment records will remain available.
// ============================================================

export async function archiveClient(clientId) {
  const id = cleanText(clientId);

  if (!id) {
    throw new Error("A client ID is required.");
  }

  try {
    const reference = clientDocument(id);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
      throw new Error("Client not found.");
    }

    if (snapshot.data().isArchived === true) {
      throw new Error("This client is already archived.");
    }

    await updateDoc(reference, {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id,
      isArchived: true
    };

  } catch (error) {
    console.error(
      "HomeRent: Failed to archive client.",
      error
    );

    if (
      error.message === "Client not found." ||
      error.message === "This client is already archived."
    ) {
      throw error;
    }

    throw new Error(
      "Unable to archive this client. Check your connection and database permissions."
    );
  }
}


// ============================================================
// 11. RESTORE ARCHIVED CLIENT
//
// Restores a previously archived record without creating
// a new client or changing its original ID.
// ============================================================

export async function restoreClient(clientId) {
  const id = cleanText(clientId);

  if (!id) {
    throw new Error("A client ID is required.");
  }

  try {
    const reference = clientDocument(id);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
      throw new Error("Client not found.");
    }

    if (snapshot.data().isArchived !== true) {
      throw new Error("This client is not archived.");
    }

    await updateDoc(reference, {
      isArchived: false,
      archivedAt: null,
      updatedAt: serverTimestamp()
    });

    return {
      id,
      isArchived: false
    };

  } catch (error) {
    console.error(
      "HomeRent: Failed to restore client.",
      error
    );

    if (
      error.message === "Client not found." ||
      error.message === "This client is not archived."
    ) {
      throw error;
    }

    throw new Error(
      "Unable to restore this client. Check your connection and database permissions."
    );
  }
}