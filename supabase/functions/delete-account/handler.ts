type Identity = { id: string; email?: string };
type Dependencies = {
  getUser: (token: string) => Promise<Identity | null>;
  verifyPassword: (email: string, password: string) => Promise<Identity | null>;
  deleteUser: (id: string) => Promise<boolean>;
};
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
function reply(status: number, value: object) { return new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
export function deletionHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return reply(401, { error: 'Log in again before deleting your account.' });
    try {
      const user = await deps.getUser(auth.slice(7));
      if (!user?.id || !user.email) return reply(401, { error: 'Log in again before deleting your account.' });
      const raw = await request.text();
      if (raw.length > 4096) return reply(400, { error: 'Invalid request.' });
      let body;
      try { body = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid request.' }); }
      if (!body || body.confirmation !== 'DELETE' || typeof body.password !== 'string' || !body.password || body.password.length > 1024) {
        return reply(400, { error: 'Enter your password and type DELETE to confirm.' });
      }
      // Reauthenticate the verified caller. Never accept an email or user ID from the request body.
      const verified = await deps.verifyPassword(user.email, body.password);
      if (!verified || verified.id !== user.id) return reply(403, { error: 'Password verification failed. Check your password and try again.' });
      if (!await deps.deleteUser(user.id)) return reply(500, { error: 'Account deletion failed. Your account has not been confirmed deleted. Please retry.' });
      return reply(200, { deleted: true });
    } catch { return reply(503, { error: 'Account deletion is temporarily unavailable. Please try again later.' }); }
  };
}
