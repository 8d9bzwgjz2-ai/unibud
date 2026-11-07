# UNIBUD

UNIBUD is a student social + academic platform. Square is the social home. Bud is the visible AI. Board, Studies, Chat, Communities, and Connect sit around that.

This repository is the standalone UNIBUD application (auth, Square, Bud, Studio, Board, Studies). It is not the older Base44 app in `iamtheoracle/unibud`. UNIBUD has its own public product identity; it is not presented as Oracle Arc.

## Stack

- TanStack Start + React
- Better Auth
- Postgres in production; local development uses the repository's local database path
- Zustand campus store

## Run

```bash
npm install
npm run db:migrate
npm run dev
```

Dev server: `http://localhost:8080`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local app |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |
| `npm run build` | Production build + migrate |

## Product notes

- **Bud** is the only visible AI. Spark and specialists stay internal.
- External providers are optional capability boundaries; the core application must not silently depend on them.
- Syllabus belongs to the **course**. Bud uses enrolled courses as context.
- Board is the classroom layer. It is not Bud.
- Music for Drops / Stories / Peek is licensed-catalogue architecture, not user uploads of commercial tracks.
- Image/GIF generation in Bud is wired in-conversation; a generation provider is not connected yet.
