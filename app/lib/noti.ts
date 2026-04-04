// noti.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** ------------------ PUSH NOTIFICATIONS ------------------ */
export async function registerForPushNotifications(): Promise<string | undefined> {
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
    return tokenData.data;
  } catch (e) {
    console.log("Push registration error:", e);
  }
}

/** ------------------ LOCAL NOTIFICATIONS ------------------ */
export async function sendLocalNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null // immediately
    });
  } catch (e) {
    console.log("Local notification error:", e);
  }
}

// Configure notification behavior for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
