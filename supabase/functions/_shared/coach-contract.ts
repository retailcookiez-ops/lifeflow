// Pure contract shared by the app and Edge Function. No secrets or server imports.
export const MAX_PROMPT = 1200;
export type CoachRequest = { message: string; includeContext: boolean; timezone: string };
export type Suggestion = { title: string; reason: string; steps: string[] };
export type CoachAnswer = { summary: string; suggestions: Suggestion[] };
export type CoachUsage = { allowed: boolean; remaining: number; limit: number; resetAt: string; retryAfterSeconds: number };
export type CoachReply = { answer: CoachAnswer; usage: CoachUsage; contextIncluded: boolean; contextSummary: { tasks: number; habits: number; truncated: boolean }; generatedAt: string };
export function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
export function validRequest(value: unknown): value is CoachRequest {
  if (!object(value) || Object.keys(value).some(key => !['message','includeContext','timezone'].includes(key))) return false;
  if (!text(value.message, MAX_PROMPT) || typeof value.includeContext !== 'boolean' || !text(value.timezone, 100)) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format(); return true; } catch { return false; }
}
export function validAnswer(value: unknown): value is CoachAnswer {
  if (!object(value) || Object.keys(value).some(key => !['summary','suggestions'].includes(key)) || !text(value.summary, 700) || !Array.isArray(value.suggestions) || value.suggestions.length < 1 || value.suggestions.length > 4) return false;
  return value.suggestions.every(card => object(card) && Object.keys(card).every(key => ['title','reason','steps'].includes(key)) && text(card.title, 100) && text(card.reason, 400) && Array.isArray(card.steps) && card.steps.length >= 1 && card.steps.length <= 5 && card.steps.every(step => text(step, 240)));
}
export function validUsage(value: unknown): value is CoachUsage {
  return object(value) && typeof value.allowed === 'boolean' && Number.isInteger(value.remaining) && Number(value.remaining) >= 0 && Number.isInteger(value.limit) && Number(value.limit) > 0 && Number(value.remaining) <= Number(value.limit) && typeof value.resetAt === 'string' && Number.isFinite(Date.parse(value.resetAt)) && Number.isInteger(value.retryAfterSeconds) && Number(value.retryAfterSeconds) >= 0;
}
export function validReply(value: unknown): value is CoachReply {
  return object(value) && validAnswer(value.answer) && validUsage(value.usage) && typeof value.contextIncluded === 'boolean' && object(value.contextSummary) && ['tasks','habits'].every(key => Number.isInteger((value.contextSummary as Record<string,unknown>)[key]) && Number((value.contextSummary as Record<string,unknown>)[key]) >= 0 && Number((value.contextSummary as Record<string,unknown>)[key]) <= 12) && typeof value.contextSummary.truncated === 'boolean' && typeof value.generatedAt === 'string' && Number.isFinite(Date.parse(value.generatedAt));
}
export const answerSchema = {
  type: 'object', additionalProperties: false, required: ['summary','suggestions'], properties: {
    summary: { type: 'string', minLength: 1, maxLength: 700 },
    suggestions: { type: 'array', minItems: 1, maxItems: 4, items: {
      type: 'object', additionalProperties: false, required: ['title','reason','steps'], properties: {
        title: { type: 'string', minLength: 1, maxLength: 100 }, reason: { type: 'string', minLength: 1, maxLength: 400 },
        steps: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 240 } },
      },
    } },
  },
};
