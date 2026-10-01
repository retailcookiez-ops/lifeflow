import { getSupabase } from '@/lib/supabase';
import { object, validReply, validUsage, type CoachRequest, type CoachUsage } from '../../supabase/functions/_shared/coach-contract';
export class CoachError extends Error {
  constructor(message: string, public usage?: CoachUsage) { super(message); }
}
const messages: Record<string, string> = {
  auth: 'Your session has expired. Log in again.', auth_unavailable: 'Could not verify your session. Please retry.',
  input: 'Enter a request of 1–1200 characters.', setup: 'AI Coach needs its server-side API key. See the AI Coach setup guide.',
  usage_setup: 'AI usage limits are unavailable. Check that the AI Coach SQL migration has been run.',
  rate_limit: 'Usage limit reached. Wait before trying again.', context: 'Could not load today’s context. Retry or turn context sharing off.',
  timeout: 'AI Coach took too long. Please retry.', invalid_response: 'The suggestion could not be validated. Nothing changed. Please retry.',
  refused: 'Try a day-planning, task or habit question.', provider_unavailable: 'AI Coach is temporarily unavailable. Please try again later.',
};
export async function requestCoach(body: CoachRequest, signal: AbortSignal) {
  const { data, error } = await getSupabase().functions.invoke('ai-coach', { body, signal, timeout: 60000 });
  if (error) {
    let payload: unknown;
    try { if (error.context instanceof Response) payload = await error.context.json(); } catch { /* Use a safe fallback. */ }
    if (object(payload)) throw new CoachError(messages[String(payload.code)] ?? 'AI Coach is unavailable. Please retry.', validUsage(payload.usage) ? payload.usage : undefined);
    throw new CoachError('Could not reach AI Coach. Check your connection and that the ai-coach Edge Function is deployed.');
  }
  if (!validReply(data)) throw new CoachError('The suggestion could not be validated. Nothing changed. Please retry.');
  return data;
}
