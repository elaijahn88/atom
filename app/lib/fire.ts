// fire.ts
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, orderBy, onSnapshot, addDoc, getDocs, where } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, update } from "firebase/database";
import { app } from "../../firebase";

const db = getFirestore(app);
const auth = getAuth(app);
const realtime = getDatabase(app);

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
  expoPushToken?: string;
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
      await setDoc(doc(db, "users", user.uid), {
        email,
        username: name,
        deviceId,
        wallet: 5000000,
        cart: [],
        favorites: [],
        orderHistory: [],
      });
    }
    return { success: true, uid: user.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =================== USER PROFILE ===================
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { uid, ...(snap.data() as UserProfile) } : null;
  } catch (err) {
    console.log("getUserProfile error:", err);
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  try {
    await updateDoc(doc(db, "users", uid), data);
  } catch (err) {
    console.log("updateUserProfile error:", err);
  }
}

// =================== WALLET ===================
export async function updateWallet(uid: string, amount: number) {
  try {
    await updateDoc(doc(db, "users", uid), { wallet: amount });
    await update(ref(realtime, `users/${uid}`), { wallet: amount });
  } catch (err) {
    console.log("updateWallet error:", err);
  }
}

// =================== CART ===================
export async function addToCart(uid: string, product: any) {
  try {
    await updateDoc(doc(db, "users", uid), { cart: arrayUnion(product) });
  } catch (err) {
    console.log("addToCart error:", err);
  }
}

// =================== CHAT ===================
export async function sendMessage(senderUid: string, receiverDeviceId: string, text: string) {
  await addDoc(collection(db, "messages"), { senderUid, receiverDeviceId, text, date: new Date().toISOString() });
}

export function listenForMessages(deviceId: string, userUid: string, callback: (msgs: any[]) => void) {
  const q = query(collection(db, "messages"), orderBy("date", "asc"));
  return onSnapshot(q, snap => {
    const msgs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.receiverDeviceId === deviceId || m.senderUid === userUid);
    callback(msgs);
  });
}

export async function getChatUsers(uid: string) {
  const snap = await getDocs(query(collection(db, "chatUsers"), where("uid", "==", uid)));
  return snap.docs.map(d => d.data());
}

// Prevent duplicate chat users
export async function addChatUser(uid: string, deviceId: string, username: string, phone: string) {
  try {
    const q = query(collection(db, "chatUsers"), where("uid", "==", uid), where("deviceId", "==", deviceId));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, "chatUsers"), { uid, deviceId, username, phone });
    }
  } catch (err) {
    console.log("addChatUser error:", err);
  }
}

// =================== TRANSACTIONS ===================
export async function addTransaction(uid: string, tx: { type: string; amount: number; date: string; to?: string }) {
  await addDoc(collection(db, "transactions"), { uid, ...tx });
}

export function listenForTransactions(uid: string, callback: (txs: any[]) => void) {
  const q = query(collection(db, "transactions"), orderBy("date", "desc"));
  return onSnapshot(q, snap => {
    const txs = snap.docs.filter(d => d.data().uid === uid).map(d => d.data());
    callback(txs);
  });
}

// =================== USER LOOKUP ===================
export async function getUserByDeviceId(deviceId: string) {
  const snapshot = await getDocs(collection(db, "users"));
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

// =================== EXPO PUSH TOKENS ===================
export async function saveExpoPushToken(uid: string, token: string) {
  await updateDoc(doc(db, "users", uid), { expoPushToken: token });
}

export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
}
