// fire.ts (updated with transactions)
import { db, auth } from "./firebase";
import { 
  doc, setDoc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, getDocs 
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// ---------------- USER AUTH ----------------
export async function loginOrSignup(email: string, password: string, username: string, deviceId: string) {
  try {
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        username: username || "User",
        deviceId,
        wallet: 20,
        phone: "",
        pin: ""
      });
    }
    return { success: true, uid: userCredential.user.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ---------------- WALLET ----------------
export async function updateWallet(uid: string, newBalance: number) {
  await updateDoc(doc(db, "users", uid), { wallet: newBalance });
}

// ---------------- USER PROFILE ----------------
export async function getUserProfile(uid: string) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function updateUserProfile(uid: string, data: any) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function getUserByDeviceId(deviceId: string) {
  const snap = await getDocs(collection(db, "users"));
  for (const docSnap of snap.docs) {
    if (docSnap.data().deviceId === deviceId) return docSnap.data();
  }
  return null;
}

export async function getUserByPhone(phone: string) {
  const snap = await getDocs(collection(db, "users"));
  for (const docSnap of snap.docs) {
    if (docSnap.data().phone === phone) return docSnap.data();
  }
  return null;
}

export async function saveDeviceIdForUser(uid: string, deviceId: string) {
  await updateDoc(doc(db, "users", uid), { deviceId });
}

// ---------------- CHAT ----------------
export async function sendMessage(senderUid: string, receiverDeviceId: string, text: string) {
  const msgRef = collection(db, "messages");
  await addDoc(msgRef, {
    senderUid,
    receiverDeviceId,
    text,
    timestamp: new Date().toISOString(),
    id: Math.random().toString(36).substr(2, 9)
  });
}

export function listenForMessages(deviceId: string, callback: (msgs: any[]) => void) {
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  const unsubscribe = onSnapshot(q, snap => {
    const msgs = snap.docs
      .map(d => d.data())
      .filter(m => m.receiverDeviceId === deviceId || m.senderUid === deviceId);
    callback(msgs);
  });
  return unsubscribe;
}

// ---------------- CHAT USERS ----------------
export async function getChatUsers(uid: string) {
  const docRef = doc(db, "chatLists", uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data()?.users || [] : [];
}

export async function addChatUser(uid: string, deviceId: string, username: string, phone: string) {
  const docRef = doc(db, "chatLists", uid);
  const snap = await getDoc(docRef);
  let users = snap.exists() ? snap.data()?.users || [] : [];
  if (!users.find((u: any) => u.deviceId === deviceId)) {
    users.push({ deviceId, username, phone });
    await setDoc(docRef, { users });
  }
}

// ---------------- TRANSACTIONS ----------------
export async function addTransaction(uid: string, tx: { type: string; amount: number; to?: string; date: string }) {
  const txRef = collection(db, "transactions", uid, "txs");
  await addDoc(txRef, tx);
}

export async function getTransactions(uid: string) {
  const q = query(collection(db, "transactions", uid, "txs"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}
