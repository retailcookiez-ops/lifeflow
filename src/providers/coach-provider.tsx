import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CoachError, requestCoach } from '@/services/coach';
import { MAX_PROMPT, type CoachReply, type CoachUsage } from '../../supabase/functions/_shared/coach-contract';
type Entry = { id: number; prompt: string; reply: CoachReply };
function useCoachState() {
  const [history, setHistory] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [includeContext, setIncludeContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<CoachUsage>();
  const [retryAt, setRetryAt] = useState<number>(0);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  async function send() {
    const message = draft.trim();
    if (active.current) return;
    if (!message || message.length > MAX_PROMPT) { setError('Enter a request of 1–1200 characters.'); return; }
    const controller = new AbortController(); active.current = controller; setBusy(true); setError(null); setRetryAt(0);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const reply = await requestCoach({ message, includeContext, timezone }, controller.signal);
      if (active.current !== controller) return;
      setHistory(previous => [...previous.slice(-9), { id: Date.now(), prompt: message, reply }]);
      setUsage(reply.usage); setRetryAt(Date.now() + reply.usage.retryAfterSeconds * 1000); setDraft('');
    } catch (failure) {
      if (active.current !== controller) return;
      setError(failure instanceof CoachError ? failure.message : 'Could not reach AI Coach. Please retry.');
      if (failure instanceof CoachError && failure.usage) { setUsage(failure.usage); setRetryAt(Date.now() + failure.usage.retryAfterSeconds * 1000); }
    } finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }
  return { history, draft, setDraft, includeContext, setIncludeContext, busy, error, usage, retryAt, send,
    clear: () => { setHistory([]); setError(null); setDraft(''); } };
}
const Context = createContext<ReturnType<typeof useCoachState> | null>(null);
export function CoachProvider({ children }: { children: ReactNode }) { return <Context.Provider value={useCoachState()}>{children}</Context.Provider>; }
export function useCoach() { const value = useContext(Context); if (!value) throw new Error('CoachProvider is missing'); return value; }
