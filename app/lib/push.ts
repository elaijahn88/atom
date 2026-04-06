// push.ts
import { getFirestore, collection, doc, setDoc, getDocs } from "firebase/firestore";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { app } from "../../firebase";

const db = getFirestore(app);

export async function registerForPushNotificationsAsync(userId: string) {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Failed to get push token!");
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;

    await setDoc(doc(db, "pushTokens", userId), { token });
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = { to: expoPushToken, sound: "default", title, body, data: { title, body } };
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
}

export async function sendPushToAllUsers(title: string, body: string) {
  const tokensSnapshot = await getDocs(collection(db, "pushTokens"));
  tokensSnapshot.forEach((doc) => {
    const token = doc.data().token;
    if (token) sendPushNotification(token, title, body);
  });
}
