// fire.ts
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, orderBy, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { app, auth, db } from "../../firebase"; // adjust path as needed

const firestore = getFirestore(app);

// =================== TYPES ===================
export interface UserProfile {
  uid: string;
  username?: string;
  phone?: string;
  wallet?: number;
  cart?: any[];
  favorites?: any[];
  orderHistory?: any[];
  pin?: string;
  deviceId?: string;
  email?: string;
}

// =================== AUTH ===================
export async function loginOrSignup(email: string, password: string, name: string, deviceId: string) {
  try {
    let user;
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      user = res.user;
    } catch {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      user = res.user;
      await setDoc(doc(db, "users", user.uid), { email, name, deviceId, wallet: 20, cart: [], favorites: [], orderHistory: [] });
    }
    return { success: true, uid: user.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =================== USER PROFILE ===================
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function getUserByDeviceId(deviceId: string) {
  const snap = await getDocs(collection(db, "users"));
  const u = snap.docs.find(d => d.data().deviceId === deviceId);
  return u ? { uid: u.id, ...u.data() } : null;
}

export async function getUserByPhone(phone: string) {
  const snap = await getDocs(collection(db, "users"));
  const u = snap.docs.find(d => d.data().phone === phone);
  return u ? { uid: u.id, ...u.data() } : null;
}

export async function saveDeviceIdForUser(uid: string, deviceId: string) {
  await updateDoc(doc(db, "users", uid), { deviceId });
}

// =================== WALLET / CART / FAVORITES ===================
export async function updateWallet(uid: string, amount: number) {
  await updateDoc(doc(db, "users", uid), { wallet: amount });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function addToFavorites(uid: string, product: any) {
  await updateDoc(doc(db, "users", uid), { favorites: arrayUnion(product) });
}

export async function addToCart(uid: string, product: any) {
  await updateDoc(doc(db, "users", uid), { cart: arrayUnion(product) });
}

export async function addOrderHistory(uid: string, order: any) {
  await updateDoc(doc(db, "users", uid), { orderHistory: arrayUnion(order) });
}

// =================== CHAT ===================
export async function sendMessage(senderUid: string, receiverDeviceId: string, text: string) {
  await addDoc(collection(db, "messages"), { senderUid, receiverDeviceId, text, date: new Date().toISOString() });
}

export function listenForMessages(deviceId: string, callback: (msgs: any[]) => void) {
  const q = query(collection(db, "messages"), orderBy("date", "asc"));
  return onSnapshot(q, snap => {
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

// =================== TRANSACTIONS ===================
export async function addTransaction(uid: string, tx: { type: string, amount: number, date: string, to?: string }) {
  await addDoc(collection(db, "transactions"), { uid, ...tx });
}

export async function getTransactions(uid: string) {
  const snap = await getDocs(query(collection(db, "transactions"), orderBy("date", "desc")));
  return snap.docs.filter(d => d.data().uid === uid).map(d => d.data());
}

export function listenForTransactions(uid: string, callback: (txs: any[]) => void) {
  const q = query(collection(db, "transactions"), orderBy("date", "desc"));
  return onSnapshot(q, snap => {
    const txs = snap.docs.filter(d => d.data().uid === uid).map(d => d.data());
    callback(txs);
  });
}

// =================== CREATE USER IF NOT EXISTS ===================
export async function createUserIfNotExists(uid: string, data: Partial<UserProfile>) {
  const refUser = doc(db, "users", uid);
  const snap = await getDoc(refUser);
  if (!snap.exists()) {
    await setDoc(refUser, { wallet: 5000000, cart: [], favorites: [], orderHistory: [], ...data });
  }
}
