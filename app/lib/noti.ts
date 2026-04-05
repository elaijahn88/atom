// noti.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { saveExpoPushToken, getAllUsers } from "./fire";

// ------------------ PUSH NOTIFICATIONS ------------------
export async function registerForPushNotifications(uid?: string): Promise<string | undefined> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notifications permission denied");
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (uid) await saveExpoPushToken(uid, token);

    return token;
  } catch (e) {
    console.log("Push registration error:", e);
  }
}

// ------------------ LOCAL NOTIFICATIONS ------------------
export async function sendLocalNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // immediately
    });
  } catch (e) {
    console.log("Local notification error:", e);
  }
}

// ------------------ BROADCAST PUSH TO ALL USERS ------------------
export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  try {
    const message = {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data: { someData: "goes here" },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.log("sendPushNotification error:", err);
  }
}

// Send notification to all users with saved Expo tokens
export async function notifyAllUsers(title: string, body: string) {
  const users = await getAllUsers();
  for (const u of users) {
    if (u.expoPushToken) await sendPushNotification(u.expoPushToken, title, body);
  }
}

// ------------------ FOREGROUND HANDLER ------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
