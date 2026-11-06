# UNIBUD integration note

This preview is the integrated UNIBUD application. It is not a second shell beside Bamboo Moon, and it is not a replacement of Arc Project One.

## Sources

| Concern | Source | What landed here |
| --- | --- | --- |
| Application foundation, routes, Bud, Studies, Studio, auth boundary | Arc-compatible TanStack app already in this workspace, plus `iamtheoracle/arc-project-one` branch `feat/unibud-bamboo-shell-2026-10-25` | Kept. Auth stays off. No merge and no deploy. |
| Visual system | `iamtheoracle/bamboo-thunder-brave-moon` (`fix/netlify-auth-no-pglite`) | Paper background, DM Sans and Newsreader, ink and bud accent, wordmark, cards, empty states. |
| Primary navigation position | Bamboo Moon shell as recorded on the Arc bamboo-shell branch (`.ub-tabbar`) | Fixed bottom bar. Icon only. Order is Square, Connect, Quad, Chat. |
| Guild | Arc navigation contract | Separate right-side drawer. Order is The Quarter, Concierge, Board. Opened by the Guild control and a right-edge swipe. Escape, backdrop, focus trap, focus restore. Background is inert while it is open. |
| Secondary menu | Bamboo Moon side menu, with Arc's separation rule | Header menu. Profile, Bud, Riff, Search, Studies, News, Settings, Fixer, Help, Feedback. Chat and Board are not duplicated here. |
| Other repositories | `unibud-app`, `unibud-live`, `arc-project-one-v2` | Inspected. UNIBUD Live stays legacy. Mini-apps that only exist as fixture profiles were not copied in as live data. |

## Oracle Arc and Connect

Bud’s replies go through the Oracle Arc model layer (`src/lib/oracle/arc-llm.ts`). The student still only sees Bud. Connect is the directory, not a feed.

- People come only from `connect_profiles`. A profile stays hidden until that person turns discovery on. Search never returns the viewer, a hidden profile, or someone blocked in either direction. Rank is relevance: exact handle, exact name, then partial and close spelling. Verification does not change rank and is never invented.
- Follow is one-way. If the other person requires approval, the follow stays pending. A mutual connection is a request that only the recipient can accept. The sender can cancel a pending request. Either person can remove an accepted connection. A decline is not announced to the requester.
- Requests, Sent, and Connections read those records. Empty states stay empty. No sample students are seeded.
- Services are the registered UNIBUD surfaces SouLync, Wayward, Flow, and Quad. Their integration status is unavailable, so the screen says Not connected. Approving one returns “This service is not available to connect.” A Connected state is stored only after a real grant with scopes. Revoke lives on the service screen and in Settings.
- Connection requests, accepted connections, follows, and service access changes write to the existing notifications list. The other person is not told who reported them.

## Honest gaps

These destinations keep their screens and say they are not connected. They do not invent people, posts, orders, attendance, or payments.

- Square, Quad, Podcasts, Riff
- The Quarter and the marketplace
- Concierge (a draft is not sent)
- Wallet (no balance, no send, no withdraw, no paid request)
- SouLync, Wayward, Flow, and Quad are listed in Connect and are not available to connect

Direct messages between two real accounts are delivered on a shared thread. Class, group, study, and community rooms, plus posts and news, are created on Board. Search finds those records and usernames. Nothing is listed until a person starts it. Highlights on a profile stay empty until that person creates one.

Fixture catalogues remain in `src/lib/unibud/catalog.ts` for development reference. `getCampusCatalog` filters those ids out and does not seed them for the interface. Connect does not use those fixtures as people.

## Accounts

UNIBUD sign-in is email and password only. There is no guest entry and no social sign-in. A new account stays unverified until a six-digit code is accepted, then profile setup finishes before Home. Password reset links expire and work once. Passwords are stored as hashes. When no mail provider is configured, the code or reset link is shown on the device instead of pretending an email was sent.

- Do not collect SSN, tax, or bank details.
- CI billing on the private repository is an account-owner issue.
- Bamboo Moon stays the design reference. Changes here are not an automatic sync back to that repository.
