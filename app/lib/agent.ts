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

const addTransaction = async (deviceId: string, tx: Omit<Transaction, "date">) => {
  await addDoc(collection(db, "users", deviceId, "transactions"), {
    ...tx,
    date: serverTimestamp(),
  });
};

// Helper to safely get current user data
const getUserData = async (deviceId: string) => {
  const userRef = getUserRef(deviceId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error("User document does not exist");
  }
  return snap.data();
};

// ================= DEPOSIT =================
export const depositMoney = async (deviceId: string, amount: number): Promise<boolean> => {
  if (amount <= 0) return false;

  try {
    const userRef = getUserRef(deviceId);

    await updateDoc(userRef, {
      balance: increment(amount),
      totalDeposited: increment(amount),
      lastTransactionAt: serverTimestamp(),
    });

    await addTransaction(deviceId, { type: "deposit", amount });

    sendLocalNotification("Deposit 💰", `UGX ${amount.toLocaleString()} added successfully`);
    return true;
  } catch (err) {
    console.error("Deposit failed:", err);
    sendLocalNotification("Deposit Failed ❌", "Please try again");
    return false;
  }
};

// ================= WITHDRAW =================
export const withdrawMoney = async (deviceId: string, amount: number): Promise<boolean> => {
  if (amount <= 0) return false;

  try {
    const user = await getUserData(deviceId);
    const currentBalance = user.balance || 0;

    if (currentBalance < amount) {
      sendLocalNotification("Insufficient Balance ❌", "Not enough funds to withdraw");
      return false;
    }

    const userRef = getUserRef(deviceId);

    await updateDoc(userRef, {
      balance: increment(-amount),
      totalWithdrawn: increment(amount),
      lastTransactionAt: serverTimestamp(),
    });

    await addTransaction(deviceId, { type: "withdraw", amount });

    sendLocalNotification("Withdraw 💸", `UGX ${amount.toLocaleString()} withdrawn`);
    return true;
  } catch (err) {
    console.error("Withdraw failed:", err);
    sendLocalNotification("Withdraw Failed ❌", "Transaction could not be completed");
    return false;
  }
};

// ================= FREEZE =================
export const freezeMoney = async (deviceId: string, amount: number): Promise<boolean> => {
  if (amount <= 0) return false;

  try {
    const user = await getUserData(deviceId);
    const currentBalance = user.balance || 0;

    if (currentBalance < amount) {
      sendLocalNotification("Freeze Failed ❌", "Not enough balance to freeze");
      return false;
    }

    const userRef = getUserRef(deviceId);

    await updateDoc(userRef, {
      balance: increment(-amount),
      frozenBalance: increment(amount),
      lastTransactionAt: serverTimestamp(),
    });

    await addTransaction(deviceId, { type: "freeze", amount });

    sendLocalNotification("Frozen ❄️", `UGX ${amount.toLocaleString()} has been frozen`);
    return true;
  } catch (err) {
    console.error("Freeze failed:", err);
    sendLocalNotification("Freeze Failed ❌", "Transaction could not be completed");
    return false;
  }
};

// ================= UNFREEZE =================
export const unfreezeMoney = async (deviceId: string, amount: number): Promise<boolean> => {
  if (amount <= 0) return false;

  try {
    const user = await getUserData(deviceId);
    const currentFrozen = user.frozenBalance || 0;

    if (currentFrozen < amount) {
      sendLocalNotification("Unfreeze Failed ❌", "Not enough frozen balance");
      return false;
    }

    const userRef = getUserRef(deviceId);

    await updateDoc(userRef, {
      balance: increment(amount),
      frozenBalance: increment(-amount),
      lastTransactionAt: serverTimestamp(),
    });

    await addTransaction(deviceId, { type: "unfreeze", amount });

    sendLocalNotification("Unfrozen ✅", `UGX ${amount.toLocaleString()} has been unfrozen`);
    return true;
  } catch (err) {
    console.error("Unfreeze failed:", err);
    sendLocalNotification("Unfreeze Failed ❌", "Transaction could not be completed");
    return false;
  }
};
