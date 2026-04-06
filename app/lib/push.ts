// push.ts (UPDATED)

import {
  getFirestore,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  collection,
} from "firebase/firestore";

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { app } from "../../firebase";

const db = getFirestore(app);

// =================== REGISTER PUSH TOKEN ===================
export async function registerDevicePushToken(deviceId: string) {
  try {
    if (!deviceId) return;

    if (!Constants.isDevice) {
      alert("Push notifications require a real device");
      return;
    }

    // Permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Permission denied for notifications");
      return;
    }

    // Get token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    const userRef = doc(db, "users", deviceId);

    // ✅ Save token safely
    await updateDoc(userRef, {
      expoPushToken: token,
    }).catch(async () => {
      // If user doesn't exist → create minimal doc
      await setDoc(userRef, {
        deviceId,
        expoPushToken: token,
        balance: 0,
        frozenBalance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
      });
    });

    return token;
  } catch (err) {
    console.log("Push token error:", err);
  }
}

// =================== SEND SINGLE PUSH ===================
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string
) {
  try {
    const message = {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data: { title, body },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.log("Push send error:", err);
  }
}

// =================== SEND TO ALL USERS ===================
export async function sendPushToAllUsers(
  title: string,
  body: string
) {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    snapshot.forEach((docSnap) => {
      const token = docSnap.data()?.expoPushToken;

      if (token) {
        sendPushNotification(token, title, body);
      }
    });
  } catch (err) {
    console.log("Broadcast error:", err);
  }
}
