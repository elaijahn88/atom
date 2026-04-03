// app/lib/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

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
  if (!Device.isDevice) {
    alert("Must use a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Permission not granted!");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
};

/**
 * Send local notification instantly
 */
export const sendLocalNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: null, // immediate
  });
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
