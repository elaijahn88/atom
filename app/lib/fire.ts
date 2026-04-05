// fire.ts
import { db, auth } from "./firebase";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, onSnapshot, addDoc, query, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// LOGIN / SIGNUP
export async function loginOrSignup(email: string, password: string, name: string, deviceId: string) {
  try {
    let user;
    try { user = await signInWithEmailAndPassword(auth, email, password); }
    catch { user = await createUserWithEmailAndPassword(auth, email, password); }
    return { success: true, uid: user.user.uid };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// SAVE DEVICE ID
export async function saveDeviceIdForUser(uid: string, deviceId: string) {
  await setDoc(doc(db, "users", uid), { deviceId }, { merge: true });
}

// GET USER BY DEVICE
export async function getUserByDeviceId(deviceId: string) {
  const usersCol = collection(db, "users");
  const snap = await getDocs(usersCol);
  const docData = snap.docs.map(d => ({ ...d.data(), uid: d.id })).find(d => d.deviceId === deviceId);
  return docData || null;
}

// UPDATE WALLET
export async function updateWallet(uid: string, amount: number) {
  await updateDoc(doc(db, "users", uid), { wallet: amount });
}

// GET USER PROFILE
export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// UPDATE USER PROFILE
export async function updateUserProfile(uid: string, data: any) {
  await updateDoc(doc(db, "users", uid), data);
}

// GET USER BY PHONE
export async function getUserByPhone(phone: string) {
  const usersCol = collection(db, "users");
  const snap = await getDocs(usersCol);
  const docData = snap.docs.map(d => ({ ...d.data(), uid: d.id })).find(d => d.phone === phone);
  return docData || null;
}

// CHAT MESSAGES
export async function sendMessage(senderUid: string, receiverDevice: string, text: string) {
  const msg = { id: Date.now().toString(), text, date: new Date().toISOString() };
  await addDoc(collection(db, "messages", senderUid, receiverDevice), msg);
  await addDoc(collection(db, "messages", receiverDevice, senderUid), msg);
}

// LISTEN FOR MESSAGES
export function listenForMessages(deviceId: string, callback: (msgs: any[]) => void) {
  const msgsCol = collection(db, "messages", deviceId);
  const q = query(msgsCol, orderBy("date"));
  const unsub = onSnapshot(q, snap => callback(snap.docs.map(d => d.data())));
  return unsub;
}

// CHAT LIST USERS
export async function addChatUser(uid: string, otherDeviceId: string, username: string, phone: string) {
  const chatRef = doc(db, "users", uid, "chats", otherDeviceId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) await setDoc(chatRef, { username, phone, deviceId: otherDeviceId });
}

export async function getChatUsers(uid: string) {
  const chatsCol = collection(db, "users", uid, "chats");
  const snap = await getDocs(chatsCol);
  return snap.docs.map(d => d.data());
}
