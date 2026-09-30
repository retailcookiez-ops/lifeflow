# LifeFlow: Supabase setup and testing

The app now requires an account. Supabase is the source of truth for tasks, habits and daily completions. The original local records are retained for explicit import. No demo records are created or marked complete.

## 1. Get the updated code

Changes are on `feat/persistent-tasks` (PR #1), not `main`. In your LifeFlow project folder, run these commands individually. Keep your existing local data and do not run `reset-project`, clear browser storage or uninstall the app before importing.

```powershell
git fetch origin
git switch feat/persistent-tasks
git pull --ff-only origin feat/persistent-tasks
npm.cmd ci
```

If Git reports local edits or a conflict, preserve those edits before switching. On macOS/Linux use `npm` and `npx` in place of `npm.cmd` and `npx.cmd`.

## 2. Create/configure your Supabase project

1. Create a project in [Supabase](https://supabase.com/dashboard). Keep the database password private; LifeFlow does not use it.
2. Open SQL Editor, paste **all** of `supabase/migrations/202609300001_lifeflow.sql`, and run it once. It creates the four requested tables, policies, constraints, signup profile trigger and import function, plus an import receipt table. Alternatively, a linked Supabase CLI project can apply the migration with `supabase db push`.
3. In Authentication → Providers, enable email/password. Keep email confirmation enabled for normal use. Set the minimum password length to at least 8.
4. In Authentication → URL Configuration, set Site URL to your web app URL, for development normally `http://localhost:8081/welcome` (use the port Expo prints). Allow your development/production welcome URLs in Redirect URLs. On mobile, confirmation can open this web URL; confirm there, then return to the app and log in. LifeFlow does not consume confirmation tokens automatically.
5. For testing with Supabase's built-in email sender, use an address allowed by the project's current email restrictions. Configure a custom SMTP provider before testing with general users. If signup reports an email delivery/rate-limit error, fix email settings rather than RLS. Production confirmation links require a reachable web URL, not a desktop-only localhost URL.
6. In Project Settings → API / API Keys, copy your project URL and **publishable** key beginning `sb_publishable_`. Do not copy a secret/service-role key. This app deliberately accepts the publishable format only.

The migration creates profiles automatically on signup and backfills existing accounts. It stores the optional display name and a validated timezone. There is no profile editing screen yet.

## 3. Environment variables

Copy the example:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_ACTUAL_KEY
```

`.env` is ignored by Git; `.env.example` is committed. These values are public client configuration and included in the Expo bundle. Never put a service-role key, `sb_secret_` key or database password in any `EXPO_PUBLIC_` variable. Set the same variables in your build/deployment environment. Restart Expo after changes:

```powershell
npx.cmd expo start --clear
```

Press `w` for web. For a physical phone, use an Expo client/development build compatible with this project's **SDK 57**; do not upgrade the project merely to match an older Expo Go app. The existing AsyncStorage native dependency was already part of LifeFlow; the new Supabase and URL-polyfill dependencies need no additional native module. Phone and computer must be able to reach your Supabase URL. For LAN Expo testing use the same network.

A missing/invalid configuration produces a setup message on Welcome instead of a crash. Missing SQL tables produce a helpful database setup error.

## 4. Routes and authentication

| URL | Screen | Access |
| --- | --- | --- |
| `/welcome` | Welcome / Continue to Dashboard | Everyone |
| `/signup` | Email/password signup | Signed out |
| `/login` | Email/password login | Signed out |
| `/` | Dashboard | Signed in |
| `/tasks` | Full task manager | Signed in |
| `/habits` | Full habit manager/history | Signed in |
| `/settings` | Account, sync, local import, logout | Signed in |

Expo Router `Stack.Protected` guards the `(app)` and `(auth)` groups. Welcome is a public root route, with Continue to Dashboard when already signed in. Settings also links to Welcome. While the persisted session is checked, a dark loading screen is shown. Sign in switches to Dashboard; logout removes the private routes from navigation history and clears this device's session. Logging out does not log other devices out. AsyncStorage persists the auth session. User-scoped providers unmount on logout/account change, discarding private in-memory data.

Desktop retains the sidebar and mobile/narrow web retains bottom tabs. Route group names do not change the URLs above. Signed-out direct requests to private routes are redirected to Welcome; after login the default destination is Dashboard. A saved login opens Dashboard, while `/welcome` remains available without logging out.

For a deployed web export, publish the entire `dist` directory including the HTML for each route and configure your host to serve route HTML for extensionless URLs. Do not publish only `index.html`. Authentication route guards run in the client; RLS is the actual data security boundary. Static HTML contains no user's task/habit data.

## 5. Cloud behavior and migration

- Services in `src/services/cloud-data.ts` separate queries from UI. Cloud hooks share one account-scoped provider across screens.
- All queries include the account ID; RLS independently enforces it at the database.
- Writes are server-confirmed. The screen updates after a successful save and reload. Failed writes show an error, retain drafts and do not invent a successful completion/deletion. Click Retry / Sync now, then retry the intended edit if it was not saved.
- Other devices refresh every 30 seconds, on app resume, or through Settings → Sync now. This is polling, not Supabase Realtime. Two simultaneous edits to the same item use last-write-wins. Refresh failures leave the last loaded cloud data visible with an error.
- Internet is required. There is no offline write queue. Legacy local hooks are kept for compatibility/tests but are not connected to signed-in screens.
- Tasks retain calendar-date due dates. The database `due_at` holds noon UTC for that date; the UI preserves its `YYYY-MM-DD` value without timezone shifting. `status` maps to the existing completion UI; triggers maintain completion/updated timestamps.
- Habits retain weekday schedules, original creation date, schedule change history and daily completion dates. `schedule_days` uses Sunday=0 through Saturday=6. `created_on` and `schedule_history` are additional columns needed to preserve the app's existing history semantics.
- Habit totals count **only today's scheduled habits**. Nothing completes automatically. Consistency remains completed scheduled days / scheduled days in the last 7 calendar days, including today, excluding dates before creation and rest days. Unchecked today counts incomplete; historical schedules remain effective for earlier days.
- Daily habit dates use the device's local calendar date, matching the existing app. Use the same timezone across devices to see matching daily totals. The profile timezone is stored for future account calendar settings; it does not override the existing device calendar.

### Import old local data safely

1. On the **same browser origin/device** that holds your old data, sign into the account that should own it.
2. Open Settings → Import existing local data. Review the task/habit counts.
3. Click Review import, verify the destination email, then Confirm import into this account.
4. The database imports tasks, schedules and daily completions together. Any validation/write error rolls back the entire import. Original `lifeflow.tasks.v1` and `lifeflow.habits.v1` keys are never changed or removed.
5. Retry after an interrupted response if necessary. Stable local IDs and `local_import_records` receipts prevent duplicate imports, overwriting cloud edits or resurrecting deleted imported items. Success reports newly added items; a retry reports zero.
6. Open Tasks/Habits to check the results, then sign into another device to verify the cloud copy. A new device/browser may correctly show zero local items; old local storage does not travel with your Git checkout.

Never silently import shared-device data into another account. Import receipts are scoped per account; deliberately importing into a different account is a separate explicit action. Local completion dates are preserved. The old task format had no completion timestamp, so imported completed tasks use the import time for `completed_at`. Local IDs become import source IDs while cloud rows receive UUIDs. Invalid local data is left untouched and blocks import; recover a backup rather than clearing it.

## 6. RLS security

RLS is enabled on `profiles`, `tasks`, `habits`, `habit_completions`, and the extra `local_import_records` table. Each has SELECT/INSERT/UPDATE/DELETE policies restricted to `authenticated`:

- Profiles compare `auth.uid()` to `id`; other tables compare it to `user_id`.
- INSERT checks the proposed owner. UPDATE checks both the existing and proposed owner, preventing account reassignment. SELECT/DELETE only expose the caller's rows.
- Anonymous clients have no table privileges or access to the import RPC.
- Completions have a composite foreign key `(habit_id, user_id)` to `(id, user_id)` on habits. Knowing another user's habit UUID cannot attach your own completion to it. `(habit_id, completed_on)` is unique.
- Import runs as `SECURITY INVOKER`: the caller's JWT, grants and RLS apply. Caller identity is read from `auth.uid()`, never accepted from the uploaded payload.
- Only the signup profile trigger uses `SECURITY DEFINER`, with an empty search path and revoked direct execution. It only creates a profile for the newly inserted auth user.

Do not turn off RLS or put elevated keys into the app. Supabase SQL Editor normally runs with elevated privileges, so seeing every row there is expected; it does not simulate a signed-in client.

## 7. Test every feature

Use two real email addresses/accounts (A and B) and two devices or separate browsers. Start with no accidental import into B.

1. **Welcome/protected routes:** with no session, visit `/`, `/tasks`, `/habits` and `/settings` directly. Expect Welcome and no private data. Open `/signup` and `/login`. Confirm dark styling. Resize web above/below 900px and check sidebar/bottom navigation after login.
2. **Signup validation:** try a malformed email, empty password, password shorter than 8 and mismatched confirmation. Expect specific errors without signup. Create A with a valid email, 8+ character password and optional name. Expect confirmation instructions; confirm the email, return to Login, and sign in. Check `profiles` has A's UUID/name/timezone.
3. **Login errors:** log out; try a wrong password and an unconfirmed email. Expect helpful errors. Log in correctly; expect Dashboard, not a blank screen. New accounts start empty.
4. **Persistent session/routes:** refresh `/tasks`, `/habits` and `/settings` while signed in. Close/reopen the app. Expect a session loading state followed by the protected screen, without requiring login again. Visit `/login` when signed in; expect the app. Open `/welcome` while signed in and use Continue to Dashboard; the two progress cards, upcoming tasks and today's habits must remain visible, including their loading/empty states. Test direct routes on your deployed web host as well.
5. **Tasks:** add one undated medium task, one high-priority task due today and one low-priority task due tomorrow. Try a blank title and impossible date (e.g. `2026-02-30`); they must not save. Check Today/Upcoming/All filters, due-date/priority sorting, rename/edit priority/date, clear date, complete, Completed filter, and undo completion. Check Dashboard task percentage changes. Click Delete then Cancel: task remains. Confirm Delete: task disappears. Refresh/reopen and verify the surviving edits. Inspect your `tasks` rows for UUID owner/status/timestamps.
6. **Habits:** add one habit including today's weekday and one excluding it. Expect scheduled/rest-day labels and Dashboard denominator of 1. Check/uncheck the scheduled habit; percentage changes 0→100→0. The rest-day check-in must be disabled. Edit its name and weekdays, including removal/addition of today; totals update and prior history stays intact. Empty names/zero weekdays cannot save. Check This week/Previous week/Next week limits and consistency text. Cancel deletion retains the habit; confirming deletes it and its completion rows. Refresh/reopen to verify remaining habits/history.
7. **Cross-device sync:** log A into another device/browser. Create/edit/complete/delete a task on device 1; on device 2 click Settings → Sync now or wait up to 30 seconds. Repeat for habit edits/check-in/undo/deletion. Check Dashboard and weekly grid agree. Use matching device timezones. After both devices finish writes, refresh both to verify the final saved values.
8. **Account isolation/logout:** create B in another browser and log in. Expect none of A's tasks/habits/history. Add B's own data. Log out from Settings; browser Back and private direct routes must not show B's data. Log A back in and verify only A's data. Logging A out on one device should leave A signed in on the other device.
9. **Import:** on the old device with local data, confirm counts/account email before import. Cancel: no cloud rows added. Confirm: tasks, schedules and dated history appear; local keys remain unchanged. Repeat import: zero new rows. Edit/delete an imported cloud item, repeat import: edits/deletions stay. Check the imported data on the second device.
10. **Failures:** disable the network, attempt a task/habit save or delete and wait for the request error. Expect visible error, retained draft/delete confirmation and no false successful state. Re-enable network, click Retry / Sync now and retry the action. Offline writes are not queued. If an import fails, reconnect and retry: no duplicates and originals retained.
11. **RLS:** run the automated PostgreSQL tests below. To additionally verify your hosted project, use signed-in client sessions A/B and the public key: attempts to select/update/delete A's UUIDs under B should return no rows; inserting a row with A's `user_id` under B or changing B's owner to A must fail. Attempt a completion with B's owner and A's habit UUID: the foreign key must reject it. Never use service-role credentials for these checks.

## 8. Automated checks

```powershell
npm.cmd test
npx.cmd expo lint
npx.cmd tsc --noEmit
npx.cmd expo export --platform web
npx.cmd expo export --platform ios
npx.cmd expo export --platform android
```

Expo regenerates typed routes when you start the dev server; do that before typecheck after route changes. The cloud tests execute the SQL migration in embedded PostgreSQL (PGlite), simulating authenticated/anonymous roles and JWT IDs. They cover user isolation, ownership reassignment, cross-user completion references, CRUD, uniqueness, import retries/deletions/rollback and profile creation. Hook tests cover failed saves, double taps, late requests and account unmount; auth/import tests cover input validation and preservation of local keys. Existing task/habit/calendar/dashboard tests remain.

These checks do not replace the live email/signup/mobile/cross-device checks above. You must create/configure your Supabase project and enter your own public configuration to run those.
