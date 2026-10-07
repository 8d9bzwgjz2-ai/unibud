# UNIBUD Architecture

UNIBUD is a standalone student application. Its public product identity is UNIBUD/Bud and must not be presented as Oracle Arc.

## Runtime coordination

The visible assistant is Bud.

Spark is an internal coordinator. It routes only the specialist capabilities required for a request.

Specialists are registered in `src/lib/agents/registry.ts` and executed through `src/lib/agents/runtime.ts`.

The intended request flow is:

User → Bud → Spark → required specialists → Spark → Bud → User

A specialist without a connected handler is explicitly skipped. The system must never report skipped or failed work as completed.

## Current boundaries

- Browser/discovery is an explicit provider boundary. There is no fake browsing implementation.
- Voice, media generation, and other integrations must remain capability-gated.
- Authentication is isolated behind the app's auth layer.
- Database access is centralized through the database resolver.
- No secrets belong in source control.

## Codespaces

The repository now contains a dedicated `.devcontainer/devcontainer.json` so GitHub Codespaces use Node 22, install the locked dependencies, and forward the UNIBUD development ports.

## External API policy

External APIs must not become silent core dependencies. Any external provider must be explicit, capability-gated, and replaceable. Before production, review every provider boundary and environment variable against the project's approved integration policy.
