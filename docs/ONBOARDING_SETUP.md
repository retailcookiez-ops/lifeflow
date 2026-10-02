# Onboarding, profile and settings

## Update and database setup

Stop Expo with Ctrl+C. In PowerShell:

```powershell
cd C:\Users\Nicol\lifeflow
git switch feat/persistent-tasks
git pull --ff-only origin feat/persistent-tasks
```

If Git reports local changes, preserve them before resolving the conflict. The old untracked `src/app/index.tsx` must stay outside `src/app` (its backup can remain in `backup/`). The dashboard route is `src/app/(app)/index.tsx`.

In your Supabase project's SQL Editor:

1. If the original database was never set up, run **all** of `supabase/migrations/202609300001_lifeflow.sql` first. Do not rerun it if already applied.
2. Run **all** of `supabase/migrations/202609300002_profiles_onboarding.sql` once. This adds preferences to the existing profiles table; it does not replace tables or delete tasks/habits.

To open the new SQL locally:

```powershell
notepad .\supabase\migrations\202609300002_profiles_onboarding.sql
```

Copy all the file text into a new Supabase SQL Editor query and Run. If it reports an error, stop and copy the error; do not drop existing tables or disable RLS. A `column already exists` error can mean the migration was already applied.

No new client environment variables or dependencies are required. Keep your existing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

```powershell
npx.cmd expo start --clear
```

Press `w` for web. Use a development build/client compatible with SDK 57 for mobile.

## Stored profile fields and routing

`profiles` now includes `goals text[]`, `modules text[]`, nullable `wake_time` and `sleep_time`, `week_start` (0 Sunday or 1 Monday), nullable `onboarding_completed_at`, and `updated_at`. The existing name/timezone fields remain. Database constraints validate choices, and a trigger validates PostgreSQL timezone names and maintains `updated_at`. Existing owner-only RLS policies cover all profile columns.

Existing profile rows are marked complete when migration 002 runs, preserving returning users' route and working dashboard. **Create a new account after the migration** to test onboarding. New signup rows default to `onboarding_completed_at = NULL`.

After email confirmation and manual login, an incomplete profile must pass through `/onboarding` before protected app routes. Finish and Skip both save a completion timestamp in Supabase. Skip uses saved defaults, discarding an unfinished draft. Completing or skipping is server-confirmed; failed requests keep the user on setup. Partially filled steps are in memory, so refreshing an unfinished flow restarts it. Returning users restore the saved profile and retain direct routes.

Profile loading has a visible state. Missing database columns show the exact migration filename with Retry and Log out instead of silently treating the user as new. No local profile fallback bypasses the gate. Background refresh runs every 30 seconds/on resume; unsaved Settings drafts are preserved, and Discard edits reloads the latest saved values.

Goals are preferences only. Only Tasks and Habits are offered as modules. Module selection hides their dashboard summaries but never removes navigation, records, or completion history. Name personalizes the dashboard greeting. Wake/sleep times are preferences, not reminders. The saved timezone does **not** redate existing data or override the device's local-day behavior. Week start changes the habit grid boundaries, not its rolling seven-day consistency calculation.

## Secure account deletion deployment

The Settings confirmation asks for the current password and the exact text `DELETE`. Nothing is deleted just by opening it or canceling. The app calls the `delete-account` Supabase Edge Function, never a client-side admin API.

Deploy the included function to your project (requires the Supabase CLI login/project access):

```powershell
npx.cmd supabase login
npx.cmd supabase functions deploy delete-account --project-ref mjrcfcutaiukndujonbg
```

Run this from the LifeFlow repository root so `supabase/config.toml` is used. The handler explicitly verifies the bearer token using Supabase Auth, then verifies the password against the authenticated user's email. It derives the deletion target from the verified user, never from request-body IDs. Platform `verify_jwt` is false for signing-key compatibility; **authentication is enforced inside the function**, not skipped.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only built-in Edge Function environment values. Never copy the service-role key into Expo or an `EXPO_PUBLIC_` variable. The temporary password-verification client is per request and does not persist tokens. Passwords and tokens are not logged.

If the function is not deployed or fails, the app reports that deletion was not confirmed and retains the account. Successful server-side deletion removes the auth user and cascades through existing foreign keys to its cloud data; the app signs out. Older AsyncStorage backups are intentionally retained. This implementation covers the current email/password accounts, with no Supabase Storage objects or MFA. Reassess deletion if those features are introduced. If Auth CAPTCHA/rate limiting blocks server-side password verification, deletion fails safely; check the Auth response/settings rather than bypassing verification.

## Test checklist

Use disposable accounts for deletion testing.

1. **New user:** apply both migrations, create a new account, confirm email, return and log in. Expect step 1, not Dashboard. Attempt `/tasks` directly: setup still appears. Enter a display name/goals, Continue, set wake/sleep and timezone, Continue, choose modules, Finish. Expect a personalized dashboard. Confirm values and a completion timestamp in your own `profiles` row.
2. **Validation and failures:** try `25:00` and `Not/AZone`; Continue/Save should show an error. Blank name, times, goals and modules are allowed. Disconnect before Finish/Save; after the request fails, expect an error and retained draft, no success message. Reconnect and retry. No tasks or habits should be created or completed automatically.
3. **Skip:** use another new account. Skip on any step. Expect the default Tasks/Habits dashboard. Refresh, log out and log back in: no onboarding. Settings can still edit every preference.
4. **Returning user:** use an account present before migration 002, or one that completed setup. Open `/tasks`, `/habits`, `/settings` directly and refresh. Expect that screen with existing data, no onboarding. While logged out, protected routes require login.
5. **Edit profile:** Settings → change name, goals, timezone, wake/sleep, Sunday/Monday, and modules → Save profile. Expect a success message; Dashboard greeting/modules update. Refresh Settings and confirm persisted values. Change fields without saving → Discard edits restores saved values. Log in on another device, use Sync now, then reopen Settings to see saved preferences.
6. **Modules:** hide Tasks summary and save. Dashboard hides its progress/upcoming list; Tasks remains accessible with existing records. Hide both: a clean dashboard message links to Settings. Restore both. No data is deleted.
7. **Week start:** create a habit if needed, open Habits → weekly history. Toggle Monday/Sunday in Settings and save. Verify the grid starts on the selected day and previous weeks still work. Check-ins and rolling consistency remain unchanged.
8. **Appearance/privacy/logout:** Dark is active, Light is explicitly unavailable. Read the privacy/data explanation and verify account email. Log out and ensure private routes are inaccessible. Existing local import and cloud Sync now remain available.
9. **Deletion:** use a disposable account with test tasks/habits. Open Delete account, then Cancel: records remain. Blank password/wrong confirmation must disable submission. Wrong password must fail. After the function is deployed, enter the correct password and DELETE. Confirm return to Welcome and that this account's cloud rows/auth record are gone; a separate account remains intact. Do not test with an account you want to keep.

## Verification

`npm test`, `npx expo lint`, `npx tsc --noEmit`, `npx expo export --platform all`, and `npx --yes deno check supabase/functions/delete-account/index.ts` cover app types, server types, real embedded PostgreSQL migrations/RLS, account deletion authorization and calendar behavior.

`scripts/check-web.cjs` exercises exported web at desktop and phone sizes with a test-only mocked Supabase backend. It covers returning/new/skipped onboarding, validation, failed saves, profile persistence, module visibility, protected routes, setup-error recovery, deletion cancellation and existing navigation/session behavior. It does not send real emails or delete real accounts. Hosted Supabase signup, cross-device saves, native-device interaction and deployed account deletion still need the manual checks above.
