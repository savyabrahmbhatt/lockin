import * as Haptics from 'expo-haptics';

// ponytail: fire-and-forget. A failed buzz must never break an interaction, and on a
// device with no taptic engine these are silent no-ops anyway.
const fire = (fn) => {
  try {
    fn();
  } catch {}
};

export const tap = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const bump = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const win = () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const nope = () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
