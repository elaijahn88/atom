// acc.ts
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { app } from "../../firebase";
import * as Device from "expo-device";
import { sendLocalNotification } from "./noti";
import { registerDevicePushToken, sendPushToAllUsers } from "./push";

const firestore = getFirestore(app);

export interface UserAccount {
  uid: string;
  deviceId: string;
  username: string;
  wallet: number;
  cart: any[];
  favorites: any[];
  orderHistory: any[];
}

// ================= GET USER =================
export const getUserByDevice = async (deviceId?: string): Promise<UserAccount | null> => {
  const devId = deviceId || Device.modelName || Device.brand + "-id";
  const q = doc(firestore, "users", devId);
  const snap = await getDoc(q);
  if (snap.exists()) return snap.data() as UserAccount;
  return null;
};

// ================= CREATE OR LOGIN USER =================
export const loginOrCreateUser = async (username?: string): Promise<UserAccount> => {
  const deviceId = Device.modelName || Device.brand + "-id";
  let user = await getUserByDevice(deviceId);

  if (!user) {
    const uid = deviceId; // simple UID by device for demo
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
    sendLocalNotification("Welcome 👋", `Account created for ${user.username}`);
  } else {
    sendLocalNotification("Welcome Back 👋", `${user.username}`);
  }

  // Register push token
  await registerDevicePushToken(user.uid);

  return user;
};

// ================= UPDATE WALLET =================
export const updateUserWallet = async (uid: string, amount: number) => {
  await updateDoc(doc(firestore, "users", uid), { wallet: amount });
  sendLocalNotification("Wallet Updated 💰", `New balance: UGX ${amount.toLocaleString()}`);
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
  if (snap.exists()) orderHistory = snap.data()?.orderHistory || [];
  orderHistory.push(order);
  await updateDoc(userRef, { orderHistory });
};

// ================= SEND GLOBAL NOTIFICATION =================
export const notifyAllUsers = async (title: string, body: string) => {
  await sendPushToAllUsers(title, body);
};

// ================= HELPER: CHECK ACCOUNT MATCH =================
export const isSameAccount = (user1: UserAccount, user2: UserAccount) => {
  return user1.uid === user2.uid;
};
