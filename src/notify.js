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

// How long after the start time we come back to ask whether it actually happened.
const NAG_MINUTES = [25, 90];

const addMinutes = (hm, mins) => {
  const total = hm.hour * 60 + hm.minute + mins;
  return { hour: Math.floor(total / 60) % 24, minute: total % 60, spilled: total >= 1440 };
};

export function nagCopy(task, round) {
  if (round === 0) return 'Started? ' + (task.impact_done || 'This is the one that counts.');
  return 'Still open. ' + (task.impact_miss || 'Every skipped block is borrowed from a deadline.');
}

// ponytail: cancel-all then rebuild. At ~20 tasks that is a few dozen OS calls on save,
// cheaper than tracking a diff. Done tasks get no nag, so marking one done and letting the
// week re-sync silences it.
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
    const day = WEEK_ORDER[i];
    const tasks = week[day] || [];

    for (let k = 0; k < tasks.length; k++) {
      const t = tasks[k];
      const hm = parseHM(t.time);
      if (!hm) continue;

      const fire = async (at, title, body, suffix) => {
        // A nag that spills past midnight would land on the wrong weekday. Drop it.
        if (at.spilled) return;
        await Notifications.scheduleNotificationAsync({
          identifier: `${day}-${k}${suffix}`,
          content: { title, body, ...(Platform.OS === 'android' ? { channelId: 'lockin' } : null) },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: weekdayFor(i),
            hour: at.hour,
            minute: at.minute,
          },
        });
        n++;
      };

      await fire(hm, t.title, t.time + ' — ' + (t.impact_miss || 'Starts now.'), '');

      if ((t.state || 'pending') !== 'done') {
        for (let r = 0; r < NAG_MINUTES.length; r++) {
          await fire(addMinutes(hm, NAG_MINUTES[r]), t.title, nagCopy(t, r), '-nag' + r);
        }
      }
    }
  }
  return n;
}

export async function clearReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
