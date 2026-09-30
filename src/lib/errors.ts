export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Something went wrong.';
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email using the link in your inbox, then log in.';
  if (/fetch|network|connection/i.test(message)) return 'Could not connect. Check your internet connection and try again.';
  if (/row.level|permission denied/i.test(message)) return 'This account cannot access that data. Check your session and database setup.';
  if (/relation .* does not exist|schema cache/i.test(message)) return 'The database is not ready. Run the LifeFlow SQL migration in Supabase.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a moment, then try again.';
  return message;
}
