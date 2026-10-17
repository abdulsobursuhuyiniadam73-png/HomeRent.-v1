// HomeRent Tenancies Firestore service.
// Uses existing clients/rooms collections and preserves tenancy history.
import { db } from "../firebase.js";
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const TENANCIES = "tenancies";
const CLIENTS = "clients";
const ROOMS = "rooms";
const clean = (v) => typeof v === "string" ? v.trim() : "";
const asDate = (v) => { if (v?.toDate) return v.toDate(); const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };

export function calculateEndDate(startValue, durationValue, unit) {
  const start = asDate(`${startValue}T12:00:00`);
  const duration = Number(durationValue);
  if (!start || !Number.isInteger(duration) || duration < 1 || !["weeks", "months", "years"].includes(unit)) return "";
  const end = new Date(start);
  if (unit === "weeks") end.setDate(end.getDate() + duration * 7);
  if (unit === "months" || unit === "years") {
    const monthsToAdd = unit === "years" ? duration * 12 : duration;
    const originalDay = end.getDate();
    end.setDate(1);
    end.setMonth(end.getMonth() + monthsToAdd);
    const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    end.setDate(Math.min(originalDay, lastDay));
  }
  return `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,"0")}-${String(end.getDate()).padStart(2,"0")}`;
}

export async function getTenancies() {
  const snapshot = await getDocs(collection(db, TENANCIES));
  return snapshot.docs.map(s => ({ id: s.id, ...s.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function createTenancy(input) {
  const clientId = clean(input.clientId), roomId = clean(input.roomId), startDate = clean(input.startDate), unit = clean(input.durationUnit);
  const duration = Number(input.duration), rentAmount = Number(input.rentAmount);
  const endDate = calculateEndDate(startDate, duration, unit);
  if (!clientId || !roomId || !startDate || !endDate) throw new Error("Choose a client, available room, valid start date and duration.");
  if (!Number.isFinite(rentAmount) || rentAmount < 0) throw new Error("Enter a valid agreed rental amount.");
  const initial = input.initialPayment || null;
  if (initial && (!Number.isFinite(Number(initial.amount)) || Number(initial.amount) <= 0)) throw new Error("Enter a valid initial payment amount.");
  if (initial && Number(initial.amount) > rentAmount) throw new Error("Initial payment cannot exceed the agreed rental amount. Record any advance separately later.");
  const clientRef = doc(db, CLIENTS, clientId), roomRef = doc(db, ROOMS, roomId), newRef = doc(collection(db, TENANCIES));
  await runTransaction(db, async (tx) => {
    const [clientSnap, roomSnap] = await Promise.all([tx.get(clientRef), tx.get(roomRef)]);
    if (!clientSnap.exists() || clientSnap.data().isArchived === true) throw new Error("The selected client was not found or is archived.");
    if (!roomSnap.exists() || roomSnap.data().isArchived === true) throw new Error("The selected room was not found or is archived.");
    const room = roomSnap.data();
    if (String(room.status || "available").toLowerCase() !== "available") throw new Error("This room is no longer marked available. Refresh the page and choose another room.");
    const client = clientSnap.data();
    const initialPayment = initial ? { amount: Number(initial.amount), date: clean(initial.date) || startDate, method: clean(initial.method) || "cash", reference: clean(initial.reference), recordedAt: new Date().toISOString() } : null;
    tx.set(newRef, {
      clientId, clientName: clean(client.fullName) || "Client", clientNumber: clean(client.clientNumber),
      roomId, roomNumber: clean(room.roomNumber) || "Room", roomType: clean(room.type) || "living",
      startDate, duration, durationUnit: unit, endDate, rentAmount,
      initialPayment, status: "active", endedAt: null, endReason: "",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    tx.update(roomRef, { status: "occupied", updatedAt: serverTimestamp() });
  });
  return { id: newRef.id };
}

export async function endTenancy(tenancyId) {
  const tenancyRef = doc(db, TENANCIES, clean(tenancyId));
  await runTransaction(db, async tx => {
    const tenancySnap = await tx.get(tenancyRef);
    if (!tenancySnap.exists()) throw new Error("This tenancy record no longer exists.");
    const tenancy = tenancySnap.data();
    if (tenancy.status === "ended") throw new Error("This tenancy has already ended.");
    const roomRef = doc(db, ROOMS, clean(tenancy.roomId));
    const roomSnap = await tx.get(roomRef);
    tx.update(tenancyRef, { status: "ended", endedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    if (roomSnap.exists() && roomSnap.data().status === "occupied") {
      tx.update(roomRef, { status: "available", updatedAt: serverTimestamp() });
    }
  });
}
