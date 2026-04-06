// agent.ts
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

import { app } from "../../firebase";
import { sendLocalNotification } from "./noti";

const db = getFirestore(app);

// ================= TYPES =================
export interface Transaction {
  type: "deposit" | "withdraw" | "freeze" | "unfreeze";
  amount: number;
  date: any;
}

// ================= HELPERS =================
const getUserRef = (deviceId: string) => doc(db, "users", deviceId);

// ================= ADD TRANSACTION =================
const addTransaction = async (deviceId: string, tx: Transaction) => {
  await addDoc(collection(db, "users", deviceId, "transactions"), {
    ...tx,
    date: serverTimestamp(),
  });
};

// ================= DEPOSIT =================
export const depositMoney = async (deviceId: string, amount: number) => {
  const userRef = getUserRef(deviceId);

  await updateDoc(userRef, {
    balance: increment(amount),
    totalDeposited: increment(amount),
  });

  await addTransaction(deviceId, {
    type: "deposit",
    amount,
    date: null,
  });

  sendLocalNotification("Deposit 💰", `UGX ${amount.toLocaleString()} added`);
};

// ================= WITHDRAW =================
export const withdrawMoney = async (deviceId: string, amount: number) => {
  const userRef = getUserRef(deviceId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const user = snap.data();

  if ((user.balance || 0) < amount) {
    sendLocalNotification("Failed ❌", "Insufficient balance");
    return;
  }

  await updateDoc(userRef, {
    balance: increment(-amount),
    totalWithdrawn: increment(amount),
  });

  await addTransaction(deviceId, {
    type: "withdraw",
    amount,
    date: null,
  });

  sendLocalNotification("Withdraw 💸", `UGX ${amount.toLocaleString()} withdrawn`);
};

// ================= FREEZE =================
export const freezeMoney = async (deviceId: string, amount: number) => {
  const userRef = getUserRef(deviceId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const user = snap.data();

  if ((user.balance || 0) < amount) {
    sendLocalNotification("Freeze Failed ❌", "Not enough balance");
    return;
  }

  await updateDoc(userRef, {
    balance: increment(-amount),
    frozenBalance: increment(amount),
  });

  await addTransaction(deviceId, {
    type: "freeze",
    amount,
    date: null,
  });

  sendLocalNotification("Frozen ❄️", `UGX ${amount.toLocaleString()} frozen`);
};

// ================= UNFREEZE =================
export const unfreezeMoney = async (deviceId: string, amount: number) => {
  const userRef = getUserRef(deviceId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const user = snap.data();

  if ((user.frozenBalance || 0) < amount) {
    sendLocalNotification("Error ❌", "Not enough frozen balance");
    return;
  }

  await updateDoc(userRef, {
    balance: increment(amount),
    frozenBalance: increment(-amount),
  });

  await addTransaction(deviceId, {
    type: "unfreeze",
    amount,
    date: null,
  });

  sendLocalNotification("Unfrozen ✅", `UGX ${amount.toLocaleString()} returned`);
};
