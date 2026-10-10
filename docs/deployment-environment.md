# UNIBUD deployment environment

UNIBUD is a TanStack Start + Nitro application. The repository keeps secrets out of source control.

Production requires:
- Node.js 22.
- A PostgreSQL connection through `DATABASE_URL` or Netlify Database's `NETLIFY_DB_URL`.
- `VITE_AUTH_ENABLED=true` when production sign-in is provisioned.
- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID`, and `GROK_AUTH_CLIENT_SECRET` for federated authentication.

The application database contract is PostgreSQL. Application code must use the repository database abstraction rather than provider-specific database clients. No external database SDK is required.

For local development, `VITE_AUTH_ENABLED=false` is the safe default. Do not commit real credentials.

Netlify builds with `npm run build` and publishes `dist`; Nitro supplies the SSR server function.

The database migration runs as part of the build and accepts `DATABASE_URL`, `NETLIFY_DB_URL`, `NETLIFY_DATABASE_URL`, or `NETLIFY_DATABASE_URL_UNPOOLED`.
