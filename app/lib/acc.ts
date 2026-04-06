// acc.ts
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  User,
} from "firebase/auth";

import { app } from "../../firebase";
import * as Device from "expo-device";

import { sendLocalNotification } from "./noti";
import { registerDevicePushToken, sendPushToAllUsers } from "./push";

const firestore = getFirestore(app);
const auth = getAuth(app);

// ================= INTERFACE =================
export interface UserAccount {
  uid: string;
  deviceId: string;
  username: string;
  wallet: number;
  cart: any[];
  favorites: any[];
  orderHistory: any[];
}

// ================= GET CURRENT AUTH USER =================
const getCurrentAuthUser = (): Promise<User> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        signInAnonymously(auth);
      }
    });
  });
};

// ================= GET USER =================
export const getUser = async (uid: string): Promise<UserAccount | null> => {
  const ref = doc(firestore, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserAccount;
  return null;
};

// ================= CREATE OR LOGIN USER =================
export const loginOrCreateUser = async (username?: string): Promise<UserAccount> => {
  const authUser = await getCurrentAuthUser();
  const uid = authUser.uid;

  const deviceId = Device.modelName || Device.brand + "-id";

  let user = await getUser(uid);

  if (!user) {
    user = {
      uid,
      deviceId,
      username: username || "User",
      wallet: 2000000,
      cart: [],
      favorites: [],
      orderHistory: [],
    };

    await setDoc(doc(firestore, "users", uid), user);

    sendLocalNotification(
      "Welcome 👋",
      `Account created for ${user.username}`
    );
  } else {
    sendLocalNotification("Welcome Back 👋", user.username);
  }

  // Register push token
  await registerDevicePushToken(uid);

  return user;
};

// ================= UPDATE WALLET =================
export const updateUserWallet = async (uid: string, amount: number) => {
  await updateDoc(doc(firestore, "users", uid), { wallet: amount });

  sendLocalNotification(
    "Wallet Updated 💰",
    `New balance: UGX ${amount.toLocaleString()}`
  );
};

// ================= UPDATE CART =================
export const updateUserCart = async (uid: string, cart: any[]) => {
  await updateDoc(doc(firestore, "users", uid), { cart });
};

// ================= UPDATE FAVORITES =================
export const updateUserFavorites = async (uid: string, favorites: any[]) => {
  await updateDoc(doc(firestore, "users", uid), { favorites });
};

// ================= ADD ORDER =================
export const addUserOrder = async (uid: string, order: any) => {
  const userRef = doc(firestore, "users", uid);
  const snap = await getDoc(userRef);

  let orderHistory: any[] = [];

  if (snap.exists()) {
    orderHistory = snap.data()?.orderHistory || [];
  }

  orderHistory.push(order);

  await updateDoc(userRef, { orderHistory });
};

// ================= SEND GLOBAL NOTIFICATION =================
export const notifyAllUsers = async (title: string, body: string) => {
  await sendPushToAllUsers(title, body);
};

// ================= HELPER =================
export const isSameAccount = (user1: UserAccount, user2: UserAccount) => {
  return user1.uid === user2.uid;
};
