import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { deletionHandler } from './handler.ts';
// These secrets exist ONLY in the Supabase Edge Function environment.
const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(deletionHandler({
  getUser: async token => {
    const { data, error } = await admin.auth.getUser(token);
    return error ? null : data.user;
  },
  verifyPassword: async (email, password) => {
    // Per-request client prevents concurrent callers from sharing sessions.
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return null;
    await client.auth.signOut({ scope: 'local' });
    return data.user;
  },
  deleteUser: async id => {
    const { error } = await admin.auth.admin.deleteUser(id);
    return !error;
  },
}));
