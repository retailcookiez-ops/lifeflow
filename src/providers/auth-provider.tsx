import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { configurationError, getSupabase, supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { validateAuth } from '@/utils/auth';

type AuthState = { session: Session | null; loading: boolean; error: string | null; configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>; retry: () => Promise<void> };
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(configurationError);
  const retry = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await supabase.auth.getSession();
      if (result.error) throw result.error;
      setSession(result.data.session); setError(null);
    } catch (cause) { setSession(null); setError(friendlyError(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (!supabase) {
      // Configuration status is an external setup condition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    const client = supabase;
    let active = true;
    let observedEvent = false;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      observedEvent = true;
      setSession(next); setLoading(false); setError(null);
    });
    void client.auth.getSession().then(result => {
      if (!active || observedEvent) return;
      if (result.error) { setError(friendlyError(result.error)); setSession(null); }
      else setSession(result.data.session);
      setLoading(false);
    }).catch(cause => { if (active) { setError(friendlyError(cause)); setLoading(false); } });
    const subscription = Platform.OS !== 'web' ? AppState.addEventListener('change', state => {
      if (state === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh();
    }) : null;
    if (Platform.OS !== 'web') client.auth.startAutoRefresh();
    return () => { active = false; data.subscription.unsubscribe(); subscription?.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, []);
  async function signIn(email: string, password: string) {
    const invalid = validateAuth(email, password, false); if (invalid) throw new Error(invalid);
    const result = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) throw result.error;
    setSession(result.data.session);
  }
  async function signUp(email: string, password: string, displayName: string) {
    const invalid = validateAuth(email, password, true); if (invalid) throw new Error(invalid);
    if (displayName.trim().length > 80) throw new Error('Display name must be at most 80 characters.');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const result = await getSupabase().auth.signUp({ email: email.trim(), password,
      options: { data: { display_name: displayName.trim(), timezone } } });
    if (result.error) throw result.error;
    if (result.data.session) setSession(result.data.session);
    return result.data.session !== null;
  }
  async function signOut() {
    const result = await getSupabase().auth.signOut({ scope: 'local' });
    if (result.error) throw result.error;
    setSession(null);
  }
  return <Context.Provider value={{ session, loading, error, configured: !!supabase, signIn, signUp, signOut, retry }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
