import 'react-native-url-polyfill/auto';
import { authStorage } from './auth-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
function validConfig(): boolean {
  if (!url || !key || !key.startsWith('sb_publishable_') || key.includes('REPLACE_ME')) return false;
  try { return new URL(url).protocol === 'https:' && !url.includes('YOUR_PROJECT'); } catch { return false; }
}
export const configurationError = validConfig() ? null : 'Supabase is not configured. Copy .env.example to .env, add your project URL and publishable key, then restart Expo.';
export const supabase = configurationError ? null : createClient<Database>(url!, key!, {
  auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
export function getSupabase() {
  if (!supabase) throw new Error(configurationError ?? 'Supabase unavailable');
  return supabase;
}
