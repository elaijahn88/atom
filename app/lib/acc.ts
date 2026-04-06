// acc.ts
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import * as Device from "expo-device";
import { app } from "../../firebase";

import { sendLocalNotification } from "./noti";

const db = getFirestore(app);

// ================= GET DEVICE ID =================
export const getDeviceId = () => {
  return Device.modelName || Device.brand + "-id";
};

// ================= USER =================
export interface UserAccount {
  deviceId: string;
  username: string;
  balance: number;
  frozenBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
}

// ================= CREATE OR LOGIN =================
export const loginOrCreateUser = async (
  username?: string
): Promise<UserAccount> => {
  const deviceId = getDeviceId();

  const ref = doc(db, "users", deviceId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newUser: UserAccount = {
      deviceId,
      username: username || "User",
      balance: 0,
      frozenBalance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
    };

    await setDoc(ref, {
      ...newUser,
      createdAt: new Date(),
    });

    sendLocalNotification("Welcome 👋", "Account created");
    return newUser;
  }

  return snap.data() as UserAccount;
};

// ================= GET USER =================
export const getUser = async (deviceId: string) => {
  const snap = await getDoc(doc(db, "users", deviceId));
  return snap.exists() ? snap.data() : null;
};
