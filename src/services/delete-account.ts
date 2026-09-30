import { getSupabase } from '@/lib/supabase';
export async function deleteAccount(password: string, confirmation: string): Promise<void> {
  if (!password || confirmation !== 'DELETE') throw new Error('Enter your password and type DELETE to confirm.');
  const { data, error } = await getSupabase().functions.invoke('delete-account', { body: { password, confirmation } });
  if (error) {
    let message = 'Account deletion is unavailable. The project owner must deploy the delete-account Edge Function. Nothing has been confirmed deleted.';
    if (error.context instanceof Response) {
      try { const body = await error.context.json(); if (typeof body.error === 'string') message = body.error; } catch { /* Keep useful setup message. */ }
    }
    throw new Error(message);
  }
  if (data?.deleted !== true) throw new Error('The server did not confirm account deletion. Please retry.');
}
