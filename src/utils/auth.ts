export function validateAuth(email: string, password: string, signup: boolean): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (signup && password.length < 8) return 'Use a password with at least 8 characters.';
  if (password.length > 128) return 'Use a password with at most 128 characters.';
  return null;
}
