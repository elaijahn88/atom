// agent.ts
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { app } from "../../firebase";
import { sendLocalNotification } from "./noti";

const db = getFirestore(app);

// ================= TYPES =================
export interface Transaction {
  type: "deposit" | "withdraw" | "freeze" | "unfreeze";
  amount: number;
  createdAt: any;
  status: "success" | "pending";
}

// ================= HELPERS =================
const getUserRef = (uid: string) => doc(db, "users", uid);

// ================= ADD TRANSACTION =================
const addTransaction = async (uid: string, tx: Transaction) => {
  await addDoc(collection(db, "users", uid, "transactions"), {
    ...tx,
    createdAt: serverTimestamp(),
  });
};

// ================= DEPOSIT =================
export const depositMoney = async (uid: string, amount: number) => {
  const userRef = getUserRef(uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const user = snap.data();

  const newBalance = (user.wallet || 0) + amount;

  await updateDoc(userRef, { wallet: newBalance });

  await addTransaction(uid, {
    type: "deposit",
    amount,
    createdAt: null,
    status: "success",
  });

  sendLocalNotification(
    "Deposit Successful 💰",
    `UGX ${amount.toLocaleString()} added`
  );
};

// ================= WITHDRAW =================
export const withdrawMoney = async (uid: string, amount: number) => {
  const userRef = getUserRef(uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const user = snap.data();

  if ((user.wallet || 0) < amount) {
    sendLocalNotification("Failed ❌", "Insufficient balance");
    return;
  }

  const newBalance = user.wallet - amount;

  await updateDoc(userRef, { wallet: newBalance });

  await addTransaction(uid, {
    type: "withdraw",
    amount,
    createdAt: null,
    status: "success",
  });

  sendLocalNotification(
    "Withdraw Successful 💸",
    `UGX ${amount.toLocaleString()} withdrawn`
  );
};

// ================= FREEZE MONEY =================
export const freezeMoney = async (uid: string, amount: number) => {
  const userRef = getUserRef(uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const user = snap.data();

  if ((user.wallet || 0) < amount) {
    sendLocalNotification("Freeze Failed ❌", "Not enough balance");
    return;
  }

  const frozen = user.frozen || 0;

  await updateDoc(userRef, {
    wallet: user.wallet - amount,
    frozen: frozen + amount,
  });

  await addTransaction(uid, {
    type: "freeze",
    amount,
    createdAt: null,
    status: "success",
  });

  sendLocalNotification(
    "Money Frozen ❄️",
    `UGX ${amount.toLocaleString()} frozen`
  );
};

// ================= UNFREEZE =================
export const unfreezeMoney = async (uid: string, amount: number) => {
  const userRef = getUserRef(uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const user = snap.data();

  if ((user.frozen || 0) < amount) {
    sendLocalNotification("Error ❌", "Not enough frozen balance");
    return;
  }

  await updateDoc(userRef, {
    wallet: user.wallet + amount,
    frozen: user.frozen - amount,
  });

  await addTransaction(uid, {
    type: "unfreeze",
    amount,
    createdAt: null,
    status: "success",
  });

  sendLocalNotification(
    "Unfrozen ✅",
    `UGX ${amount.toLocaleString()} returned to wallet`
  );
};
