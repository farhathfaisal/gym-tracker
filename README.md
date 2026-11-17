# Gym

A mobile-first workout log for Farhath. It replaces the Notion table: each gym day is a short list of exercises with a weight, a sets × reps value, and a done tick. Repeat a past day, train, tick things off.

The app is an installable PWA. Add it to the iPhone Home Screen and it opens full screen, like a native app.

## Stack

- Next.js (App Router) and TypeScript
- Supabase Auth (email OTP, magic link as fallback) and Postgres
- Existing tables: `gym_days`, `gym_entries`, `gym_exercises`
- Framer Motion for sheets, checks, and reordering

Edits apply on screen immediately and are queued in `localStorage`. They retry until Supabase accepts them, including after the gym wifi drops.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The first sign-in emails a 6-digit code to `itsamefarhath@gmail.com`. The UI will not send a code to any other address.

To click through the interface without a code, add this to `.env.local` and restart:

```bash
NEXT_PUBLIC_USE_MOCK=true
```

Any 6-digit code then signs in against sample sessions. Do not set this on Vercel.

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Publishable client key. RLS rejects every other email. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | Alias for the same key, if you prefer that name. |
| `NEXT_PUBLIC_USE_MOCK` | no | `true` uses sample data and skips email. |

The key in `.env.example` is a public client key. It is safe to ship in the browser. The service role key is not used and must not be added.

These `NEXT_PUBLIC_` values are baked in at build time. If you change them in Vercel, redeploy.

## Deploy on Vercel

1. Import this GitHub repository. Framework preset: Next.js. No extra build settings.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Do not set `NEXT_PUBLIC_USE_MOCK`.
4. Deploy, then copy the production URL (for example `https://gym-tracker.vercel.app`).

## Supabase Auth settings

In the Supabase dashboard for project `nwjotwbzinmjevxvyzva`:

1. **Authentication → URL configuration**
   - Site URL: `https://YOUR-VERCEL-DOMAIN`
   - Redirect URLs:
     - `https://YOUR-VERCEL-DOMAIN/auth/confirm`
     - `http://localhost:3000/auth/confirm`
2. **Authentication → Emails → Magic Link template**

   The template must include `{{ .Token }}` or Supabase sends only a link. Use both the code and a link that does not depend on the browser that requested it:

   ```html
   <h2>Your Gym code</h2>
   <p>Enter this code in the Gym app:</p>
   <p style="font-size:28px; letter-spacing:4px;">{{ .Token }}</p>
   <p>
     Or
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
       open this link in Safari
     </a>.
   </p>
   ```

   The Home Screen app cannot receive that link. Type the code into the app. The link is the fallback when you are already in Safari.

3. Email sign-in stays enabled. There is no password.
4. The first successful code creates the account (none exists yet). After that, you can turn off “Allow new users to sign up” under Authentication → Sign In / Providers → Email. Existing sign-in keeps working.
5. Sessions last until you sign out. Leave time-boxed sessions and the inactivity timeout unset if you do not want to type a code at the gym.

Row Level Security already allows every operation only when the JWT email is `itsamefarhath@gmail.com`.

## Add to the iPhone Home Screen

1. Open the Vercel URL in Safari (not inside another app).
2. Tap Share, then **Add to Home Screen**. The name is Gym and the icon is the barbell.
3. Open Gym from the Home Screen. It runs full screen, under the status bar.
4. Tap **Send code**, then type the 6 digits from the email into the app.

After that, the session stays on the phone. Open the app and the log is there, including edits that were still waiting to sync.

## How a session works

- Home lists days, newest first, with a count such as 4/6. Today is the large card when that date exists in Australia/Melbourne.
- **Repeat** copies that day’s exercises, weights, sets × reps, and order onto today, clears every tick, and opens the new day.
- Tick a row, change the weight with the keypad or ±2.5 kg, and set sets × reps from the usual values or a custom one.
- Drag the grip to reorder. Swipe a row left to delete it.
- **Add exercise** searches existing names or creates one.
- The line under the sets × reps is the previous weight for that exercise.
- Tap the exercise name for a simple weight chart.
- **Edit** changes the date and focus, or deletes a day you repeated by mistake.

## Schema

No database changes. The app uses the tables and policies already in place.
