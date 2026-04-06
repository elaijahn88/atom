// fire.ts (UPDATED FOR NEW FINTECH STRUCTURE)

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  where,
  serverTimestamp,
} from "firebase/firestore";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

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
  deviceId?: string;

  balance: number;
  frozenBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;

  expoPushToken?: string;
}

// =================== AUTH ===================
export async function loginOrSignup(
  email: string,
  password: string,
  name: string,
  deviceId: string
) {
  try {
    let user;

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      user = res.user;
    } catch {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      user = res.user;

      // ✅ CREATE USER WITH NEW STRUCTURE
      await setDoc(doc(db, "users", deviceId), {
        uid: user.uid,
        email,
        username: name,
        deviceId,

        balance: 0,
        frozenBalance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,

        createdAt: serverTimestamp(),
      });
    }

    return { success: true, uid: user.uid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =================== GET USER ===================
export async function getUserProfile(deviceId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", deviceId));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.log("getUserProfile error:", err);
    return null;
  }
}

// =================== UPDATE PROFILE ===================
export async function updateUserProfile(deviceId: string, data: Partial<UserProfile>) {
  try {
    await updateDoc(doc(db, "users", deviceId), data);
  } catch (err) {
    console.log("updateUserProfile error:", err);
  }
}

// =================== TRANSACTION HELPER ===================
async function addTransaction(
  deviceId: string,
  type: "deposit" | "withdraw" | "freeze" | "unfreeze",
  amount: number
) {
  await addDoc(collection(db, "users", deviceId, "transactions"), {
    type,
    amount,
    date: serverTimestamp(),
  });
}

// =================== WALLET ===================
export async function deposit(deviceId: string, amount: number) {
  const refDoc = doc(db, "users", deviceId);
  const snap = await getDoc(refDoc);
  const data = snap.data() as UserProfile;

  const newBalance = data.balance + amount;

  await updateDoc(refDoc, {
    balance: newBalance,
    totalDeposited: data.totalDeposited + amount,
  });

  await addTransaction(deviceId, "deposit", amount);

  return newBalance;
}

export async function withdraw(deviceId: string, amount: number) {
  const refDoc = doc(db, "users", deviceId);
  const snap = await getDoc(refDoc);
  const data = snap.data() as UserProfile;

  if (data.balance < amount) throw new Error("Insufficient balance");

  const newBalance = data.balance - amount;

  await updateDoc(refDoc, {
    balance: newBalance,
    totalWithdrawn: data.totalWithdrawn + amount,
  });

  await addTransaction(deviceId, "withdraw", amount);

  return newBalance;
}

export async function freeze(deviceId: string, amount: number) {
  const refDoc = doc(db, "users", deviceId);
  const snap = await getDoc(refDoc);
  const data = snap.data() as UserProfile;

  if (data.balance < amount) throw new Error("Insufficient balance");

  await updateDoc(refDoc, {
    balance: data.balance - amount,
    frozenBalance: data.frozenBalance + amount,
  });

  await addTransaction(deviceId, "freeze", amount);
}

export async function unfreeze(deviceId: string, amount: number) {
  const refDoc = doc(db, "users", deviceId);
  const snap = await getDoc(refDoc);
  const data = snap.data() as UserProfile;

  if (data.frozenBalance < amount) throw new Error("Not enough frozen");

  await updateDoc(refDoc, {
    balance: data.balance + amount,
    frozenBalance: data.frozenBalance - amount,
  });

  await addTransaction(deviceId, "unfreeze", amount);
}

// =================== LIVE TRANSACTIONS ===================
export function listenForTransactions(deviceId: string, callback: (txs: any[]) => void) {
  const q = query(
    collection(db, "users", deviceId, "transactions"),
    orderBy("date", "desc")
  );

  return onSnapshot(q, (snap) => {
    const txs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(txs);
  });
}

// =================== USER LOOKUP ===================
export async function getUserByPhone(phone: string) {
  const snapshot = await getDocs(collection(db, "users"));
  const u = snapshot.docs.find((d) => d.data().phone === phone);
  return u ? { id: u.id, ...u.data() } : null;
}

// =================== PUSH TOKEN ===================
export async function saveExpoPushToken(deviceId: string, token: string) {
  await updateDoc(doc(db, "users", deviceId), {
    expoPushToken: token,
  });
}

// =================== GET ALL USERS ===================
export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
