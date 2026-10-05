# UNIBUD Base44: Start Here

This folder is the complete UNIBUD project source prepared for use as the starting codebase of a new repository/project.

## Important

Do NOT rebuild UNIBUD from scratch.
Do NOT replace this project with a simplified demo.
Do NOT create a second competing Spark, Bud, agent, database, auth system, or navigation architecture.

Preserve the existing source tree, routes, database migrations, authentication, PostgreSQL architecture, RLS/security rules, and working functionality.

## Architecture target

UNIBUD is the student-life environment.

Bud is the visible intelligent environment inside UNIBUD.
Spark is the internal coordination/intelligence layer behind Bud and other real product capabilities.
Specialist intelligence is available underneath Spark only when actually required and actually implemented.
Fixer remains a distinct user-facing experience, but Spark may reach its real capabilities when relevant.

The intended flow is:

UNIBUD → Bud → Spark → required real capability → real execution/state → Bud/user

## Reality rule

Never simulate a human supporter, AI activity, notification, booking, purchase, reminder, message, memory, progress update, completed action, or external result.

If the system cannot actually perform an action or retrieve real state, say so clearly. Do not create a fake response that makes the action appear completed.

## Spark / specialist rule

Spark may coordinate only capabilities that are actually available. It may conceptually reach Oracle, Scholar, Orbit, Coach, Community, Vision, Creator, Atlas, Pulse, Guardian, Voice, Navigator, Browser, and Fixer where the underlying capability exists.

Do not expose internal routing, agent names, provider details, or orchestration notes to ordinary users unless the product explicitly requires it.

## Fixer rule

Fixer must never fabricate an anonymous student, peer, therapist, volunteer, or human conversation. Human connection must use a real matching/connection state and real backend/provider execution. If no real connection is available, show an honest unavailable/pending state.

## New repository setup

Treat this entire folder as the source of truth for the new repository. Import the complete project first. Then apply any remaining changes as modifications to this codebase.

Do not delete working migrations or replace the PostgreSQL/auth architecture with local/demo storage.

## Secrets

Never commit API keys, passwords, tokens, private credentials, or other secrets. Use environment variables and the existing `.env.example` conventions.

## Verification

After integration, run the project's existing checks where the environment supports them:

- npm run typecheck
- npm run test
- npm run lint
- npm run build

Fix genuine integration/type/build errors. Do not hide errors by disabling checks or weakening types.
