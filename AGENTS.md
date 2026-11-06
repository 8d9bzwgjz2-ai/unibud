# UNIBUD — working notes for agents

A phone-first UNIBUD slice: **Chat, LYNC and one notification system**, built from the platform
spec. React + Vite frontend, Express API, Postgres. Nothing here is a mock: messages, streaks and
notifications are all rows in the database.

## Layout

- `web/` — Vite + React app (routes: `/chat`, `/chat/:id`, `/lync`, `/notifications`, `/profile`).
  The Vite dev server proxies `/api` to the API, so the session cookie stays first-party.
- `server/` — Express API on port 3001. `src/services/lync.js` holds the streak rules,
  `src/services/notify.js` is the single notification writer, `src/services/conversations.js`
  builds the conversation list (last message, unread count, member read positions).
- `server/migrations/*.sql` — applied on API boot, tracked in `schema_migrations`.

## Run

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Host port 3000 is the web app; the API is only reachable through the Vite proxy. The API runs
migrations and seeds demo data on first boot.

## Things that are easy to get wrong

- **Seeding only runs on an empty `users` table.** To reseed, drop the `unibud-db` volume — never
  do that on a database you care about.
- **Demo identities** are `amara|zara|tobi|kwame|imani@unibud.app`, password `unibud`, seeded by
  `server/src/seed.js`. They exist for review, not production.
- **LYNC is computed, never stored as a counter.** A UTC day counts only when at least two members
  sent a message that day (so a monologue cannot build a streak). `lync_state` stores the best
  streak, the last celebrated milestone and the last reminder time.
- **Milestones fire once.** `lync_state.celebrated_milestone` guards against re-notifying.
- **Reminders run from an interval inside the API process** (every 60s, max one per conversation
  per 20h). There is no separate worker.
- **Notification preferences are applied at creation time** in `notifyUsers`, so turning a category
  off stops new rows rather than hiding them in the UI.
- Session cookies work over the preview proxy because the app is single-origin (Vite proxies
  `/api`); do not split the API onto its own public port without revisiting cookies and CORS.
- Vite `allowedHosts` is extended from `BASE44_SANDBOX_HOST_DOMAIN` only when
  `BASE44_PREVIEW_MODE === "1"`; unset means default Vite host checking.

## Verify

- `curl -s localhost:3000/api/health` → `{"ok":true}` (through the web proxy).
- Sign in with a demo member, open a conversation, send a message, then check that the other
  member's inbox has one message alert for that thread, its LYNC advanced, and the unread count
  cleared when the thread is opened.
