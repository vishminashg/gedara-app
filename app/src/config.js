// Works out where the Gedara API lives. Order: user override (saved) > EXPO_PUBLIC_API_URL > the dev machine Expo is running on.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gedara.server';
const PORT = 4000;

export function defaultBase() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:${PORT}`;
  // Expo Go on a real phone: the bundler address is the laptop's LAN address, so the API is on the same machine.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${PORT}`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${PORT}`;
  return `http://localhost:${PORT}`;
}

export async function loadBase() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    return saved || defaultBase();
  } catch { return defaultBase(); }
}
export async function saveBase(url) {
  const clean = url.trim().replace(/\/$/, '');
  try { if (clean) await AsyncStorage.setItem(KEY, clean); else await AsyncStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  return clean || defaultBase();
}
