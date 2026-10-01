import { validRequest, validUsage, type CoachAnswer, type CoachUsage } from '../_shared/coach-contract.ts';
import type { CoachContext } from './context.ts';
import { ModelError } from './model.ts';
type Dependencies = {
  configured: () => boolean;
  authenticate: (token: string) => Promise<string | null>;
  reserve: (userId: string) => Promise<CoachUsage>;
  context: (userId: string, token: string, timezone: string) => Promise<CoachContext>;
  generate: (message: string, context: CoachContext | null) => Promise<CoachAnswer>;
};
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Expose-Headers': 'Retry-After' };
function reply(status: number, value: object, retry?: number) {
  return new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(retry ? { 'Retry-After': String(retry) } : {}) } });
}
async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader(); if (!reader) throw new Error('empty');
  const decoder = new TextDecoder(); let text = ''; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > 8192) { await reader.cancel(); throw new Error('large'); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
export function coachHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { code: 'method', error: 'Use POST.' });
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply(401, { code: 'auth', error: 'Log in to use AI Coach.' });
    const token = authorization.slice(7);
    let userId: string | null;
    try { userId = await deps.authenticate(token); } catch { return reply(503, { code: 'auth_unavailable', error: 'Could not verify your session. Please retry.' }); }
    if (!userId) return reply(401, { code: 'auth', error: 'Your session has expired. Log in again.' });
    let body: unknown;
    try { body = await readBody(request); } catch { return reply(400, { code: 'input', error: 'Enter a request of 1–1200 characters.' }); }
    if (!validRequest(body)) return reply(400, { code: 'input', error: 'Enter a request of 1–1200 characters and a valid device timezone.' });
    if (!deps.configured()) return reply(503, { code: 'setup', error: 'AI Coach is not configured yet. The project owner needs to set the server-side AI key.' });
    let usage: CoachUsage;
    try {
      usage = await deps.reserve(userId);
      if (!validUsage(usage)) throw new Error('invalid usage');
    } catch { return reply(503, { code: 'usage_setup', error: 'AI usage limits are unavailable. The project owner should check the AI usage migration.' }); }
    if (!usage.allowed) return reply(429, { code: 'rate_limit', error: 'AI usage limit reached. Try again after the indicated wait.', usage }, usage.retryAfterSeconds);
    let context: CoachContext | null = null;
    if (body.includeContext) {
      try { context = await deps.context(userId, token, body.timezone); }
      catch { return reply(503, { code: 'context', error: 'Could not load your selected context. Retry or turn context sharing off.', usage }); }
    }
    try {
      const answer = await deps.generate(body.message.trim(), context);
      return reply(200, { answer, usage, contextIncluded: body.includeContext,
        contextSummary: { tasks: context?.tasks.length ?? 0, habits: context?.habits.length ?? 0, truncated: context?.truncated ?? false }, generatedAt: new Date().toISOString() });
    } catch (error) {
      const code = error instanceof ModelError ? error.code : 'provider_unavailable';
      const messages = { timeout: 'AI Coach took too long. Please retry.', invalid_response: 'AI Coach returned an unusable suggestion. Nothing was changed. Please retry.', refused: 'AI Coach could not help with that request. Try a day-planning or habit question.', provider_unavailable: 'AI Coach is temporarily unavailable. Please try again later.' };
      return reply(code === 'timeout' ? 504 : 502, { code, error: messages[code], usage });
    }
  };
}
