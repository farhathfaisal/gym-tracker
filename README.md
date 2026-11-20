# Gym

A mobile-first workout log for Farhath. It replaces the Notion table: each gym day is a short list of exercises with a weight, a sets × reps value, and a done tick. Repeat a past day, train, tick things off.

The app is an installable PWA. Add it to the iPhone Home Screen and it opens full screen, like a native app.

## Stack

- Next.js (App Router) and TypeScript
- A four-digit passcode checked on the server. There is no email code and no Supabase Auth login.
- Postgres via the Supabase service role, only from server routes. Row Level Security stays on, so the anon key cannot read the gym tables.
- Framer Motion for sheets, checks, and reordering

Edits apply on screen immediately and are queued on the phone. They retry until the server accepts them, including after the gym wifi drops. The last loaded workout opens from that cache with no network round trip.

## Passcode

The keypad is shown the first time you open the app in the browser or from the Home Screen. After the right code, the browser keeps you signed in for ten years. Each visit renews that. Clearing Safari website data is what shows the keypad again.

Set `APP_PIN` in Vercel. It must be exactly four digits. Do not put it in the repo.

`SESSION_SECRET` signs that cookie. It is a long random string, also server-only.

`SUPABASE_SERVICE_ROLE_KEY` is the secret key from Supabase → Project Settings → API keys. The server uses it for every read and write. It must never be a `NEXT_PUBLIC_` variable.

## Local development

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with a four-digit `APP_PIN`, a long `SESSION_SECRET`, and the service role key. Then:

```bash
npm run dev
```

Open http://localhost:3000 and enter the passcode.

To click through sample workouts without Supabase, set `GYM_DATA=mock` plus your own `APP_PIN` and `SESSION_SECRET` in `.env.local`.

Do not set `GYM_DATA` on Vercel.

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Server | Project URL. `NEXT_PUBLIC_SUPABASE_URL` is accepted as a fallback. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Secret key. Bypasses RLS only on the server. |
| `APP_PIN` | Server | Six-digit passcode. Farhath sets this in Vercel. |
| `SESSION_SECRET` | Server | HMAC secret for the session cookie. At least 32 characters. |
| `GYM_DATA` | Server, local only | `mock` uses sample data. |

## Deploy on Vercel

The project is already connected: [gym-tracker](https://vercel.com/farhath-faisals-projects/gym-tracker). Production is https://gym-tracker-gray-three.vercel.app.

In that project’s Settings → Environment Variables, for Production:

1. `APP_PIN` — four digits.
2. `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API keys → secret key (`sb_secret_...` or the legacy `service_role` key).
3. `SESSION_SECRET` — any long random string.
4. `SUPABASE_URL` — `https://nwjotwbzinmjevxvyzva.supabase.co` if it is not already set.

Redeploy after saving them. Do not set `GYM_DATA`.

## Add to the iPhone Home Screen

1. Open https://gym-tracker-gray-three.vercel.app in Safari.
2. Tap Share, then **Add to Home Screen**.
3. Open the Gym icon and enter the passcode once.

After that, the icon opens straight into the log, including when the gym wifi is down.

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

No database changes. Row Level Security stays enabled on `gym_days`, `gym_entries`, and `gym_exercises`.
