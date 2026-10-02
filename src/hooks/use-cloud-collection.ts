import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { friendlyError } from '@/lib/errors';

/** Server-confirmed writes; no local fallback, offline queue or competing account cache. */
export function useCloudCollection<T>(fetchRows: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const revision = ++generation.current;
    if (mounted.current) setRefreshing(true);
    try {
      const data = await fetchRows();
      if (mounted.current && revision === generation.current) { setRows(data); setReady(true); setError(null); }
      return true;
    } catch (cause) {
      if (mounted.current && revision === generation.current) setError(friendlyError(cause));
      return false;
    } finally { if (mounted.current && revision === generation.current) setRefreshing(false); }
  }, [fetchRows]);
  useEffect(() => {
    mounted.current = true;
    // Loading state is synchronized with an external database request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    const refresh = () => { if (!busy.current) void reload(); };
    const timer = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => {
      mounted.current = false;
      // This request counter intentionally invalidates every outstanding response at cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++generation.current;
      clearInterval(timer); subscription.remove();
    };
  }, [reload]);
  async function mutate(action: () => Promise<void>): Promise<boolean> {
    if (busy.current || !mounted.current || !ready) return false;
    busy.current = true; ++generation.current; setSaving(true); setError(null);
    try {
      await action();
      if (mounted.current) await reload();
      return true;
    } catch (cause) {
      if (mounted.current) setError(friendlyError(cause));
      return false;
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  return { rows, ready, error, saving, refreshing, reload, mutate };
}
