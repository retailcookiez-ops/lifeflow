import { getSupabase } from '@/lib/supabase';
import type { ProfileRow } from '@/lib/database.types';
import { validateProfile, type ProfileFields } from '@/utils/profile';
const columns = 'id,display_name,timezone,created_at,goals,modules,wake_time,sleep_time,week_start,onboarding_completed_at,updated_at';
function profileError(error: { message: string; code?: string }): Error {
  if (/schema cache|does not exist/i.test(error.message) || ['42703', '42P01', 'PGRST204'].includes(error.code ?? '')) {
    return new Error('Profile setup is missing. Run supabase/migrations/202609300002_profiles_onboarding.sql after the first LifeFlow migration, then tap Retry.');
  }
  return new Error(error.message);
}
export async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await getSupabase().from('profiles').select(columns).eq('id', userId).single();
  if (error) throw profileError(error);
  if (!data) throw new Error('Your profile is missing. Ask the project owner to check the profile signup trigger.');
  return data;
}
export function profileFields(profile: ProfileRow): ProfileFields {
  return { displayName: profile.display_name, timezone: profile.timezone, goals: profile.goals, modules: profile.modules,
    wakeTime: profile.wake_time?.slice(0, 5) ?? '', sleepTime: profile.sleep_time?.slice(0, 5) ?? '', weekStart: profile.week_start };
}
export async function saveProfile(userId: string, fields: ProfileFields, complete = false): Promise<ProfileRow> {
  const invalid = validateProfile(fields); if (invalid) throw new Error(invalid);
  const { data, error } = await getSupabase().from('profiles').update({
    display_name: fields.displayName.trim(), timezone: fields.timezone.trim(), goals: [...new Set(fields.goals)], modules: [...new Set(fields.modules)],
    wake_time: fields.wakeTime || null, sleep_time: fields.sleepTime || null, week_start: fields.weekStart,
    ...(complete ? { onboarding_completed_at: new Date().toISOString() } : {}),
  }).eq('id', userId).select(columns).single();
  if (error) throw profileError(error);
  if (!data) throw new Error('Profile was not saved. Please retry.');
  return data;
}
