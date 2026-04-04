// app/lib/noti.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// HOW notifications behave when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register device for push notifications
 */
export const registerForPushNotifications = async () => {
  try {
    if (!Device.isDevice) {
      alert("Use a real phone for notifications");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Permission denied!");
      return null;
    }

    // REQUIRED for Expo push
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // ANDROID FIX (VERY IMPORTANT)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
      });
    }

    return token;
  } catch (error) {
    console.log("Error registering:", error);
    return null;
  }
};

/**
 * Send local notification instantly
 */
export const sendLocalNotification = async (
  title: string,
  body: string
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default", // 🔥 ensures it shows + makes sound
      },
      trigger: null, // immediate
    });
  } catch (error) {
    console.log("Notification error:", error);
  }
};

/**
 * Listen to incoming notifications
 */
export const listenNotifications = (callback: any) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Listen when user taps notification
 */
export const listenNotificationResponse = (callback: any) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};
