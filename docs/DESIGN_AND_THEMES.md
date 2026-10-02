# Responsive design and themes

The dashboard follows the supplied desktop and mobile references: mountain/sunset vector artwork, teal task accents, purple habit accents, a Coach mascot/card, upcoming tasks and today's scheduled habits. Artwork is bundled as local SVG data, so it works offline without adding an image host or native dependency.

Desktop web uses a 230px sidebar from 900px. At 1220px and above, Coach occupies a right column beside the progress/list widgets. Smaller layouts stack the cards. Phone layouts below 700px use circular progress, compact streak/focus cards, a short Coach invitation and full-width task/habit lists above bottom navigation. Native devices retain bottom navigation. Add-task and add-habit links live in their own list widgets and open the existing creation forms.

Choose Light or Dark from the header, desktop sidebar, or Settings → Appearance. The preference is stored in AsyncStorage under `lifeflow:theme` on this device/browser, independently of login. New devices default to dark. It applies to auth/onboarding, dashboard, tasks, habits, Coach, Settings, forms, errors and deletion confirmations. Storage failures show an error while retaining the selected theme for the session. A slow startup read cannot overwrite a more recent selection.

No database migration, new environment variables, or Edge Function redeployment is required for this visual update. Existing auth, Supabase ownership policies and all cloud operations are unchanged.

## Honest summary cards

Best habit streak is the largest current scheduled-completion streak among your existing habits. Days off do not break it. A pending today allows yesterday's streak to remain; a missed earlier scheduled day ends it. Schedule history is respected. This is a habit-specific scheduled-completion streak, not an app-login streak.

Focus time is clearly marked coming soon and displays a dash; no focus tracking exists yet. Paid upgrades and notifications from the reference mockups are not displayed as working features. Coach buttons only open a draft or the Coach screen; they never send an AI request automatically. The dashboard search filters existing task/habit titles, with links to their full screens.

## Test on your PC

```powershell
cd C:\Users\Nicol\lifeflow
git switch feat/persistent-tasks
git pull --ff-only origin feat/persistent-tasks
npm.cmd ci
npx.cmd expo start --clear
```

Preserve any local changes if Git blocks the pull. The Dashboard lives at `src/app/(app)/index.tsx`; do not recreate an additional `src/app/index.tsx` route.

1. Press `w`, log in, and open Dashboard. Try widths 390px, 768px, and 1440px. Check sidebar/bottom navigation, readable cards and no horizontal page overflow.
2. Switch Light/Dark in the header. Visit Tasks, Habits, Coach and Settings in each mode. Inspect input text, selected controls and confirmation/error text.
3. Choose Light, reload a direct route such as `/tasks`, and confirm Light persists. Log out: Welcome and Login should retain that device preference. Choose Dark and repeat.
4. Create, edit, complete/uncomplete and delete a task/habit using existing controls. Check dashboard totals update, and habit totals still include only today's scheduled habits. Refresh to check persistence.
5. Search for a saved task/habit title on Dashboard and follow the result. Clear the search. Try a nonexistent title for the empty state.
6. Check the streak against habit completion history. An empty account has streak 0; future and unscheduled completions must not inflate it. Focus time must display a dash with its coming-soon label.
7. Tap a Coach suggestion. It opens the Coach screen with a draft; no request is sent until Get suggestions is pressed. Existing Coach consent and limits remain active.
8. On a physical phone with a compatible Expo SDK 57 client/development build, check the keyboard, scrolling, bottom safe area, theme switching and task/habit forms.

Automated checks cover the existing cloud/auth/profile behavior, streak calendar logic, both browser palettes, persisted theme preference, protected routes, Coach and responsive navigation. CI exports web, iOS and Android bundles. Physical native interaction still needs device testing.
