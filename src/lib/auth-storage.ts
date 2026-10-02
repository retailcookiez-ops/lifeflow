import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Static web exports have no window/localStorage. Never read a device session on the server.
const server = Platform.OS === 'web' && typeof window === 'undefined';
export const authStorage = {
  getItem: (key: string): Promise<string | null> => server ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> => server ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => server ? Promise.resolve() : AsyncStorage.removeItem(key),
};
