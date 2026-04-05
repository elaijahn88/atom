// fire.ts
import { db, auth } from "./firebase";
import {
  doc, setDoc, getDoc, updateDoc,
  collection, query, orderBy, onSnapshot, addDoc, getDocs
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// ---------------- USER AUTH ----------------
export async function loginOrSignup(email: string, password: string, name: string, deviceId: string) {
  try {
    let user;
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      user = res.user;
    } catch {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      user = res.user;
      await setDoc(doc(db, "users", user.uid), { email, name, deviceId, wallet: 20 });
    }
    return { success: true, uid: user.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ---------------- WALLET ----------------
export async function updateWallet(uid: string, amount: number) {
  await updateDoc(doc(db, "users", uid), { wallet: amount });
}

export async function getUserProfile(uid: string) {
  const docSnap = await getDoc(doc(db, "users", uid));
  return docSnap.exists() ? docSnap.data() : null;
}

export async function getUserByDeviceId(deviceId: string) {
  const q = query(collection(db, "users"));
  const snapshot = await getDocs(q);
  const u = snapshot.docs.find(d => d.data().deviceId === deviceId);
  return u ? { uid: u.id, ...u.data() } : null;
}

export async function getUserByPhone(phone: string) {
  const snapshot = await getDocs(collection(db, "users"));
  const u = snapshot.docs.find(d => d.data().phone === phone);
  return u ? { uid: u.id, ...u.data() } : null;
}

export async function saveDeviceIdForUser(uid: string, deviceId: string) {
  await updateDoc(doc(db, "users", uid), { deviceId });
}

// ---------------- CHAT ----------------
export async function sendMessage(senderUid: string, receiverDeviceId: string, text: string) {
  await addDoc(collection(db, "messages"), { senderUid, receiverDeviceId, text, date: new Date().toISOString() });
}

export function listenForMessages(deviceId: string, callback: (msgs: any[]) => void) {
  const q = query(collection(db, "messages"), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.filter(d => d.data().receiverDeviceId === deviceId || d.data().senderUid === deviceId)
      .map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}

export async function getChatUsers(uid: string) {
  const snap = await getDocs(collection(db, "chatUsers"));
  return snap.docs.filter(d => d.data().uid === uid).map(d => d.data());
}

export async function addChatUser(uid: string, deviceId: string, username: string, phone: string) {
  await addDoc(collection(db, "chatUsers"), { uid, deviceId, username, phone });
}

// ---------------- TRANSACTIONS ----------------
export async function addTransaction(uid: string, tx: { type: string, amount: number, date: string, to?: string }) {
  await addDoc(collection(db, "transactions"), { uid, ...tx });
}

export async function getTransactions(uid: string) {
  const snap = await getDocs(query(collection(db, "transactions"), orderBy("date", "desc")));
  return snap.docs.filter(d => d.data().uid === uid).map(d => d.data());
}

export function listenForTransactions(uid: string, callback: (txs: any[]) => void) {
  const q = query(collection(db, "transactions"), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    const txs = snap.docs.filter(d => d.data().uid === uid).map(d => d.data());
    callback(txs);
  });
}
