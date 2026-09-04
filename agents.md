# agents.md — Deony

Instructions for any AI agent (Claude Code, etc.) working in this repo.

## What this is

Deony is a personal media-experience archive (not a movie/book/game tracker).
Core loop: user logs an **Experience** (status, rating, dates, thoughts) against a
**Media** item, filed under a user-owned **Category**.

Full product spec: [`docs/deony-product-vision.md`](./docs/deony-product-vision.md) — **read it before
touching data models, DynamoDB access patterns, or provider/media logic.** This file is a
quick-reference; the vision doc is the source of truth when they conflict.

Page/screen inventory: [`docs/design.md`](./docs/design.md) — **read it before building, renaming,
removing, or restructuring any page.** It defines the full set of screens (route, purpose, layout,
actions, empty/error states) and the sitemap of how they link together. Don't invent a new page or
change a page's core layout/actions without updating `design.md` in the same change — the doc and
the app should never drift apart. If a task requires a screen not listed there, add it to
`design.md` first (and note the addition in `workflow_state.md`), then build it.

Each page listed in `design.md` has a corresponding folder under
[`docs/screens/`](./docs/screens/), named `{page_name}_deony` in lowercase snake_case (e.g. the
"Personal Library" page → `docs/screens/library_deony/`). Keep this 1:1 mapping: if `design.md`
lists a page, it should be findable under a matching `docs/screens/*_deony` folder, and vice
versa. Shared UI (buttons, cards, nav) does not live here — this directory is only for
per-page design/spec material, not reusable pieces.

## Session workflow

1. On start, read `workflow_state.md`. It's your memory across sessions — don't re-derive
   context that's already logged there.
2. If the task touches data model, access patterns, or provider logic, read
   `docs/deony-product-vision.md` first. If it touches any UI/page work, read `docs/design.md`
   first. Don't rely on memory of these docs from an earlier session — re-check, since either
   may have been updated.
3. Work in small, verifiable steps. Update `workflow_state.md` as you go, not just at the end
   (agents get interrupted; the file should always reflect real state).
4. Before ending a session, leave `workflow_state.md` in a state where a fresh agent with no
   other context could pick up correctly.

## Stack

React + TypeScript + Vite · Cognito · API Gateway · Lambda · DynamoDB · S3 · CloudFront · Parameter Store · CloudWatch.
No EC2/ECS/K8s/RDS unless there's a concrete reason — flag it in `workflow_state.md` before adding.

## Non-negotiable invariants

These are load-bearing design decisions. Do not "simplify" or "fix" them without re-reading the
relevant section of the vision doc — they exist to prevent specific bugs.

- **`Category.media_type` is set once, immutable.** Need a different provider → new category, not an edit.
- **`Media.id` encodes identity** — `PROVIDER#{source}#{external_id}` or `MANUAL#{user_id}#{uuid}`.
  Uniqueness comes from a conditional `PutItem` on this key, **never** from a GSI. Don't add a
  "lookup GSI" for Media — the key already is the lookup.
- **Two Media ownership modes**: provider-sourced (global, `user_id = null`) vs manual
  (user-scoped, never matched/shared across users). Don't merge these paths.
- **`sort_date` is computed, never user-edited**, and is the *only* field chronological views read.
  It's absent (not null, not zero) for `Want to Experience` — that absence is what keeps wishlist
  items off the timeline. Don't backfill a fake `sort_date` for Want-to-Experience.
- **`rating: null` ≠ `rating: 0`.** Null means unrated. Never coalesce one into the other in
  queries, aggregates, or UI.
- **Experience denormalizes `media_title`/`media_type` from Media at write time** (snapshot, not
  live-synced) — but deliberately **not** `cover_image` (fetched via `BatchGetItem` at render time).
  Don't "fix" this by adding live joins or denormalizing cover_image.
- **Public profile URLs never contain a version number.** `profile_version` is resolved
  server-side per request via `UsernameIndex` and used only for an internal cache key. Any write
  that changes public visibility bumps `profile_version` inside the same `TransactWriteItems` as
  the underlying write — never as a separate follow-up call.
- **Experience creation is idempotent** (client-supplied idempotency key). **Experience updates
  use optimistic concurrency** (`version` field, conditional write). Don't drop either.
- Categories and Media are **soft-deleted** where specified; built-in categories can't be deleted
  at all.

## DynamoDB access patterns (don't relitigate)

See vision doc "AWS Architecture" for full key design. Summary of what serves what:

| Need | Index | Note |
|---|---|---|
| Get/edit/delete one experience | Primary (`USER#id` / `EXP#id`) | |
| Filter by category (+status) | `GSI1 CategoryStatusIndex` | category must lead; can't do status-only |
| Timeline / date-range / recently completed | `GSI2 TimelineIndex` | sparse — excludes Want to Experience |
| Alphabetical | `GSI3 AlphaIndex` | |
| Recently added (incl. Want to Experience) | `GSI4 RecentlyAddedIndex` | the only index `created_at` drives |

Rating filter/sort, status-only filtering, and free-text title search are **intentionally
client-side at this stage** — don't add a GSI for these without checking `workflow_state.md` /
raising it, since that's a deliberate scope decision, not a gap.

Every list endpoint paginates via `LastEvaluatedKey` as an opaque cursor. No unbounded reads.

## Providers

`search()` is ephemeral (never persisted, debounced client-side + throttled server-side).
`resolve()` is the only place a Media row gets created, and only fires on user selection.
Search failure → "search unavailable, add manually," never a hard block. Resolve failure → same,
offer manual fallback immediately.