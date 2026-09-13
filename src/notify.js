import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { WEEK_ORDER, parseHM, weekdayFor } from './util';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ponytail: cancel-all then reschedule the week. At ~20 tasks that is 20 OS calls on save,
// cheap enough that diffing old vs new schedule would be pure complexity.
export async function syncReminders(week = {}) {
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return 0;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lockin', {
      name: 'Blocks',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#ff6a3d',
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  let n = 0;
  for (let i = 0; i < WEEK_ORDER.length; i++) {
    for (const t of week[WEEK_ORDER[i]] || []) {
      const hm = parseHM(t.time);
      if (!hm) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t.title,
          body: t.impact_miss || 'Starts now.',
          ...(Platform.OS === 'android' ? { channelId: 'lockin' } : null),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekdayFor(i),
          hour: hm.hour,
          minute: hm.minute,
        },
      });
      n++;
    }
  }
  return n;
}

export async function clearReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
