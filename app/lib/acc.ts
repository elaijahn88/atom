// acc.ts
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "../../firebase";
import * as Device from "expo-device";

const db = getFirestore(app);

export interface UserAccount {
  deviceId: string;
  username: string;
  balance: number;
  frozenBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  createdAt: any;
}

// ================= GET DEVICE ID =================
export const getDeviceId = () =>
  Device.modelName || Device.brand + "-id";

// ================= GET USER =================
export const getUser = async (): Promise<UserAccount | null> => {
  const deviceId = getDeviceId();
  const ref = doc(db, "users", deviceId);
  const snap = await getDoc(ref);

  if (snap.exists()) return snap.data() as UserAccount;
  return null;
};

// ================= CREATE USER =================
export const createUser = async (username: string) => {
  const deviceId = getDeviceId();

  const user: UserAccount = {
    deviceId,
    username,
    balance: 0,
    frozenBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", deviceId), user);
  return user;
};

// ================= LOGIN =================
export const loginOrCreateUser = async (username: string) => {
  let user = await getUser();
  if (!user) {
    user = await createUser(username);
  }
  return user;
};

// ================= TRANSACTION LOGGER =================
const addTransaction = async (
  deviceId: string,
  type: "deposit" | "withdraw" | "freeze" | "unfreeze",
  amount: number
) => {
  const ref = collection(db, "users", deviceId, "transactions");

  await addDoc(ref, {
    type,
    amount,
    date: serverTimestamp(),
  });
};

// ================= WALLET ACTIONS =================
export const depositMoney = async (amount: number) => {
  const deviceId = getDeviceId();
  const ref = doc(db, "users", deviceId);
  const snap = await getDoc(ref);
  const data = snap.data() as UserAccount;

  const newBalance = data.balance + amount;

  await updateDoc(ref, {
    balance: newBalance,
    totalDeposited: data.totalDeposited + amount,
  });

  await addTransaction(deviceId, "deposit", amount);

  return newBalance;
};

export const withdrawMoney = async (amount: number) => {
  const deviceId = getDeviceId();
  const ref = doc(db, "users", deviceId);
  const snap = await getDoc(ref);
  const data = snap.data() as UserAccount;

  if (data.balance < amount) throw new Error("Insufficient balance");

  const newBalance = data.balance - amount;

  await updateDoc(ref, {
    balance: newBalance,
    totalWithdrawn: data.totalWithdrawn + amount,
  });

  await addTransaction(deviceId, "withdraw", amount);

  return newBalance;
};

export const freezeMoney = async (amount: number) => {
  const deviceId = getDeviceId();
  const ref = doc(db, "users", deviceId);
  const snap = await getDoc(ref);
  const data = snap.data() as UserAccount;

  if (data.balance < amount) throw new Error("Insufficient balance");

  await updateDoc(ref, {
    balance: data.balance - amount,
    frozenBalance: data.frozenBalance + amount,
  });

  await addTransaction(deviceId, "freeze", amount);
};

export const unfreezeMoney = async (amount: number) => {
  const deviceId = getDeviceId();
  const ref = doc(db, "users", deviceId);
  const snap = await getDoc(ref);
  const data = snap.data() as UserAccount;

  if (data.frozenBalance < amount) throw new Error("Not enough frozen");

  await updateDoc(ref, {
    balance: data.balance + amount,
    frozenBalance: data.frozenBalance - amount,
  });

  await addTransaction(deviceId, "unfreeze", amount);
};
