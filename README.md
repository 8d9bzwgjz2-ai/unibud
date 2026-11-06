# UNIBUD

A connected digital world for students, young people, creators and communities. This repository
is the first working slice of that platform: **Chat**, **LYNC** and **one central notification
system**, built on persistent data.

## What works today

**Chat** — direct and group conversations, conversation history, delivery and read states, unread
counts, search and unread filtering. Messages are stored, not simulated.

**LYNC** — the conversation streak. A day counts only when at least two members spoke, so streaks
reward genuine two-way conversation. Levels (Ember → Flame → Beacon → Constellation → Aurora →
Eclipse), best streak, a seven-day activity strip, copyable achievements, milestone notifications
fired exactly once, and a single friendly reminder when a streak goes quiet.

**Notifications** — one inbox for the whole platform. Every notification carries its source
(Chat, LYNC, UNIBUD), a category, and the exact destination to open. Preferences per category stop
alerts being created at all.

Square, Connect, Quad, Wayward, SouLync, Riff, Board, Flow, The Quarter, The Fixer, Concierge,
Pockets and Bud are described in the platform overview and are not part of this slice.

## Stack

- `web/` — React 18, Vite 6, Tailwind, React Router. Newsreader headings, Inter body, paper and
  ink palette with restrained champagne accents.
- `server/` — Node 22, Express, `pg`, cookie sessions (httpOnly, 30 days), bcrypt passwords.
- Postgres 16, schema in `server/migrations`, applied automatically on boot.

## Run locally

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Open <http://localhost:3000>. The API is served through the Vite dev proxy on the same origin, so
the session cookie is first-party.

### Demo members

Seeded on first boot by `server/src/seed.js`:

| Member | Email | Password |
| --- | --- | --- |
| Amara Okoye | `amara@unibud.app` | `unibud` |
| Zara Bello | `zara@unibud.app` | `unibud` |
| Tobi Adeyemi | `tobi@unibud.app` | `unibud` |
| Kwame Mensah | `kwame@unibud.app` | `unibud` |
| Imani Cole | `imani@unibud.app` | `unibud` |

These are review identities, not production accounts.

## Design principles from the spec

- Phone-first; headings in Newsreader, body in Inter.
- Black and white as the main palette, champagne used only for emphasis (streaks, unread marks).
- No unnecessary loading screens; the navigation retracts while reading and returns on scroll up.
- One notification space, always labelled with its source and always opening the exact place the
  event happened.

## Repository notes

The two uploaded archives (`UNIBUD-Base44-Full.zip`, `UNIBUD-Base44-Patch.zip`) are earlier
handoff bundles and are not used by the running app.
