import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_CATEGORIES } from './theme';

const KEY = 'lockin.state.v1';

export const EMPTY = {
  onboarded: false,
  goals: [],
  week: {},
  categories: DEFAULT_CATEGORIES,
  settings: { provider: 'anthropic', model: '' },
};

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

// ponytail: key lives in the OS keystore on-device. Each user brings their own,
// so there is nothing to protect with a server proxy until we add cross-device sync.
export async function getApiKey(provider) {
  try {
    return (await SecureStore.getItemAsync('lockin_key_' + provider)) || '';
  } catch {
    return '';
  }
}

export async function setApiKey(provider, key) {
  try {
    await SecureStore.setItemAsync('lockin_key_' + provider, key);
  } catch {}
}
