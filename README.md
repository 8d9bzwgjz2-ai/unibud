# UNIBUD

A connected digital world for students, young people, creators and communities —
Square, Connect, Bud, Riff, Studies, Studio, Flow, Board, SouLync, Wayward and the
Quarter in one phone-first app.

This repository is the integrated UNIBUD app: a TanStack Start (React 19 + Vite)
front end with its own Better Auth accounts and a Postgres database. Behaviour
comes from the platform overviews and the integration note in
`docs/unibud-integration.md`; destinations that are not really connected say so
rather than inventing people, posts, orders or payments.

## Run

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Open <http://localhost:3000>.

- `web` — Vite dev server (`npm run dev`) on `0.0.0.0:8080` → host port 3000.
  Source is bind-mounted, so edits hot-reload.
- `db` — Postgres 16. `npm run db:migrate` applies `migrations/*.sql` before the
  dev server starts.

## Accounts

UNIBUD sign-in is email and password only. There is no guest entry and no social
sign-in. Create an account at `/join`: a six-digit code verifies it, then profile
setup finishes before Home. With no mail provider configured the code is shown on
the device instead of being emailed.

## Stack

- `src/` — routes (`src/routes`), components, and server functions.
- `migrations/` — schema source of truth, applied by `scripts/migrate.mjs`.
- `src/lib/auth/` — pre-wired Better Auth (email/password enabled in
  `email-password.ts`).
- `scripts/` — dev env wrapper, migrator, preview/browser smoke helpers.

Setup details and sharp edges are in `AGENTS.md`.
