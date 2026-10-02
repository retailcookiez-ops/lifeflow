import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { coachHandler } from './handler.ts';
import { generateAdvice } from './model.ts';
import { localDay, minimizeContext } from './context.ts';
import type { CoachUsage } from '../_shared/coach-contract.ts';
const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
const options = { auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) } };
const auth = createClient(url, anonKey, options);
// Admin client is used ONLY for the usage-counter RPC, never for task/habit data.
const quota = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
Deno.serve(coachHandler({
  configured: () => !!apiKey,
  authenticate: async token => {
    const { data, error } = await auth.auth.getUser(token);
    if (error) return null;
    return data.user?.id ?? null;
  },
  reserve: async userId => {
    const { data, error } = await quota.rpc('reserve_ai_coach_request', { p_user_id: userId });
    if (error) throw new Error('quota unavailable');
    return data as CoachUsage;
  },
  context: async (userId, token, timezone) => {
    // All private reads use the caller's JWT AND ownership filters; RLS stays active.
    const client = createClient(url, anonKey, { ...options, global: { ...options.global, headers: { Authorization: `Bearer ${token}` } } });
    const today = localDay(timezone);
    const nextDay = new Date(`${today}T12:00:00Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const tomorrow = nextDay.toISOString().slice(0, 10);
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const [profile, tasks, habits] = await Promise.all([
      client.from('profiles').select('display_name,goals,wake_time,sleep_time').eq('id', userId).single(),
      client.from('tasks').select('title,status,priority,due_at').eq('user_id', userId)
        .or(`due_at.is.null,due_at.lt.${tomorrow}T00:00:00Z`).order('status', { ascending: false }).order('due_at', { ascending: true, nullsFirst: false }).order('id').limit(13),
      client.from('habits').select('id,name').eq('user_id', userId).eq('is_active', true)
        .lte('created_on', today).contains('schedule_days', [weekday]).order('created_at').order('id').limit(13),
    ]);
    if (profile.error || tasks.error || habits.error || !profile.data) throw new Error('context unavailable');
    const ids = (habits.data ?? []).slice(0, 12).map(habit => habit.id);
    let completions: string[] = [];
    if (ids.length) {
      const result = await client.from('habit_completions').select('habit_id').eq('user_id', userId).eq('completed_on', today).in('habit_id', ids).limit(12);
      if (result.error) throw new Error('context unavailable');
      completions = (result.data ?? []).map(row => row.habit_id);
    }
    return minimizeContext(today, timezone, profile.data, tasks.data ?? [], habits.data ?? [], completions);
  },
  generate: (message, context) => generateAdvice(apiKey, model, message, context),
}));
