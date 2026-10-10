# UNIBUD Implementation Handoff

## Purpose

This file is the continuation checkpoint for UNIBUD implementation work. Any future implementation agent must read this file before changing architecture or UI.

## Source of truth

Repository: `iamtheoracle/unibud-app`
Branch: `main`
Old repository `iamtheoracle/unibud` is reference/archive only and must not be modified.

Verified latest committed main SHA at handoff: `d8412b3dd5e166bd072e65bf974e7b891c04dcda`
Latest committed message: `Extend registry with browser discovery agent`.

Important: a previous implementation-agent transcript reported uncommitted working-tree changes (contextual bottom navigation, removal of the permanent header, Chat Bud presence, etc.). Those changes are NOT present in the verified main branch at this checkpoint. Do not claim they are committed or implemented until they are visible in git.

## Locked product principles

- UNIBUD is an educational world/society, not merely an education app.
- Bud is the only user-facing AI. Bud is a full experience and is contextually available throughout UNIBUD.
- Spark is hidden orchestration. Internal agents cooperate as one unified intelligence.
- Reality first: never fabricate activity, memories, trends, agent actions, provider connections, money, catalogue items, or external results.
- Agents have distinct responsibilities and real system relationships; do not turn them into fake conversational theatre.
- Preserve existing architecture unless a change is explicitly required by the current specification.
- Do not revive obsolete navigation decisions from older design generations.

## Current navigation direction

The current intended navigation model is contextual, not a permanent catalogue.

- Primary access: Square, Connect, Communities, Chat.
- Navigation is normally hidden.
- It appears at the bottom when the user needs it.
- After use/navigation, it collapses/disappears again.
- Do not restore the old permanent top header/primary-nav model.
- Do not make Bud a permanent navigation destination.
- Board remains a distinct academic/Academy environment and is not a permanent primary navigation slot.
- Profile/Me, Settings, Notifications, Search, Market, Bank, Riff, Scene, etc. remain contextual/side-access spaces as defined by the wider product architecture.
- Do not invent a replacement logo treatment. If obsolete persistent branding is removed, keep the UI clean and UNIBUD-native.

## Known implementation status

### Agent/runtime

The committed code already contains:
- agent contracts and registry
- activity logging
- real handler execution with explicit missing-capability errors
- Spark routing
- Bud server/runtime integration
- capability-aware provider boundary
- browsing provider boundary
- Browser agent registration
- world principles/core places

Do not describe the agent system as fully complete. Several handlers/capabilities remain intentionally unavailable until real providers or implementations exist.

### Chat

Committed routes exist:
- `src/routes/_app/messages.tsx`
- `src/routes/_app/messages.$id.tsx`

The generated route tree currently contains `/_app/messages/$id` and attaches it as a child of `/_app/messages`. The direct/room thread component itself is substantial and includes messaging, media sharing, calls, and chat composer behavior.

A previous agent reported an SSR/runtime problem where `/messages/$id` appeared to render the list route instead of the thread. That report came from an uncommitted working tree. The current committed branch has the route definition and generated route-tree entry, but the runtime behavior has NOT been independently verified here. Verify it before changing route architecture.

TanStack Router uses file-based routes under `src/routes`; dynamic child route `src/routes/_app/messages.$id.tsx` is the correct pattern. Do not replace it with Next.js/Remix routing patterns.

## Immediate continuation order

1. Verify the current committed app starts and routes correctly.
2. Verify `/messages/$id` for both direct and room conversations in an actual running environment.
3. If the thread route fails, inspect route generation/HMR/build state before rewriting route architecture. Regenerate the TanStack route tree only through the project's normal generation command.
4. Implement the contextual bottom navigator only after confirming no uncommitted agent work is being lost.
5. Add the small Bud/Fixer contextual presence to Chat without changing Bud's conversational behavior.
6. Run typecheck/lint/build/tests available in the repository. Report exact results; never claim success without running them.
7. Audit major spaces surface-by-surface: Square, Connect, Communities, Chat, Board/Academy, Bud, Camera, Drop, Search, Profile/Me, Market, Bank/financial records, Riff, Scene, Discovery, Notifications, Settings.
8. For each space, classify: confirmed, implemented, partial, placeholder, blocked by real provider/backend, or undecided.
9. Audit agent relationships and handoffs. The target is one unified intelligence made of distinct agents, not isolated agents.
10. Audit reality boundaries: external browsing, media, calls, finance, commerce, notifications, and integrations must return honest unavailable states when disconnected.
11. Audit responsive/mobile behavior and visual consistency against the existing UNIBUD design language.
12. Only call the implementation complete after the above checks pass.

## Handoff discipline

Every implementation agent must leave:
- the exact commit SHA reached
- files changed
- tests/checks actually run and their results
- known failures/blockers
- next unfinished task
- any architectural decision made during that run

Do not use vague status such as "mostly done" or "looks good".

## Important product boundary

The app should feel alive because real systems are working. It must never manufacture activity to make the world feel alive. Personality can make real activity feel familiar; personality cannot substitute for real functionality.

## External verification note

Generic TanStack Router guidance confirms that file-based dynamic routes use `src/routes/.../$id` patterns and that SSR can render route components on the server. Use the repository's actual generated route tree and runtime behavior as the authoritative implementation evidence, not generic examples.
