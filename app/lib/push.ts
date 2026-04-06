// push.ts
import { getFirestore, doc, updateDoc, getDocs, collection } from "firebase/firestore";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { app } from "../../firebase";

const db = getFirestore(app);

// Register device token and attach to user
export async function registerDevicePushToken(userId: string) {
  if (!userId) return;

  if (!Constants.isDevice) {
    alert("Push notifications require a physical device!");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push permissions!");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Save token under user's document
  await updateDoc(doc(db, "users", userId), { pushToken: token }).catch(async () => {
    // if user doc does not exist, create it
    await updateDoc(doc(db, "users", userId), { pushToken: token }).catch(() => null);
  });

  return token;
}

// Send push to a single token
export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = { to: expoPushToken, sound: "default", title, body, data: { title, body } };
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
}

// Send push to all registered users
export async function sendPushToAllUsers(title: string, body: string) {
  const usersSnapshot = await getDocs(collection(db, "users"));
  usersSnapshot.forEach((doc) => {
    const token = doc.data().pushToken;
    if (token) sendPushNotification(token, title, body);
  });
}
