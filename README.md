# LifeFlow

Dark Expo / React Native app with Dashboard, Tasks, Habits and Settings. Email/password authentication and account-owned data use Supabase. Existing local tasks/habits can be explicitly imported without removing the originals.

Follow [Supabase setup and full test instructions](docs/SUPABASE_SETUP.md) before starting. The SQL migration is in `supabase/migrations/202609300001_lifeflow.sql`; public configuration is documented in `.env.example`.

```bash
npm ci
# Copy .env.example to .env and fill in your project URL/publishable key.
npx expo start --clear
```

On Windows PowerShell use `npm.cmd` and `npx.cmd`. Press `w` for web, or open a client/development build compatible with Expo SDK 57 on mobile.

```bash
npm test
npx expo lint
npx tsc --noEmit
npx expo export --platform web
```

Start Expo once to regenerate typed routes before typechecking after route changes. Do not clear existing app storage before importing old data.

## Onboarding and profile settings

See [onboarding setup and testing](docs/ONBOARDING_SETUP.md). Apply migration `202609300002_profiles_onboarding.sql` after the original database migration before running the updated app. Account deletion additionally requires deploying the included server-side Edge Function.
