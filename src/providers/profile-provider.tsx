import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { ProfileRow } from '@/lib/database.types';
import { friendlyError } from '@/lib/errors';
import { fetchProfile, saveProfile } from '@/services/profile';
import type { ProfileFields } from '@/utils/profile';
type ProfileState = { profile: ProfileRow | null; loading: boolean; saving: boolean; error: string | null;
  reload: () => Promise<void>; save: (fields: ProfileFields, complete?: boolean) => Promise<boolean> };
const Context = createContext<ProfileState | null>(null);
/** Mounted with the auth user ID as its key, so requests cannot leak between accounts. */
export function ProfileProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false); const busy = useRef(false); const generation = useRef(0);
  const reload = useCallback(async () => {
    if (!userId || busy.current) return;
    const revision = ++generation.current;
    try {
      const data = await fetchProfile(userId);
      if (active.current && revision === generation.current) { setProfile(data); setError(null); }
    } catch (cause) { if (active.current && revision === generation.current) setError(friendlyError(cause)); }
    finally { if (active.current && revision === generation.current) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    active.current = true;
    // Load the external account profile on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void reload(); });
    const timer = setInterval(() => { void reload(); }, 30000);
    return () => { active.current = false; clearInterval(timer); subscription.remove(); };
  }, [reload]);
  async function save(fields: ProfileFields, complete = false) {
    if (!userId || busy.current || !active.current) return false;
    busy.current = true; ++generation.current; setSaving(true); setError(null);
    try {
      const saved = await saveProfile(userId, fields, complete);
      if (!active.current) return false;
      setProfile(saved); return true;
    } catch (cause) { if (active.current) setError(friendlyError(cause)); return false; }
    finally { busy.current = false; if (active.current) setSaving(false); }
  }
  return <Context.Provider value={{ profile, loading, saving, error, reload, save }}>{children}</Context.Provider>;
}
export function useProfile() {
  const value = useContext(Context); if (!value) throw new Error('ProfileProvider missing'); return value;
}
