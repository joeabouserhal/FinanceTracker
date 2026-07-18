import { useEffect } from "react";
import { Platform } from "react-native";

export function useDailyReminder(hour = 20, minute = 0) {
  useEffect(() => {
    // Local notifications are not supported in Expo Go on SDK 53+.
    // This will work in a development build. Skip silently in Expo Go.
    if (Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      try {
        const Notifications = require("expo-notifications");

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted" || cancelled) return;

        await Notifications.cancelAllScheduledNotificationsAsync();

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Log today's spending",
            body: "Don't forget to track your expenses today.",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
      } catch {
        // Expo Go — silently skip, notifications need a dev build
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hour, minute]);
}
