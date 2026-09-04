# Deony — Complete Product Vision (v4)

Deony is an AWS-hosted web app that acts as a personal archive of everything a user has experienced.

It is not primarily a movie tracker, book tracker, or game tracker. The central concept is the experience: a user finds something they consumed, records when they experienced it, gives it a rating, writes their thoughts, and keeps it as part of their personal history.

## Categories

Every user starts with four built-in categories:

- Movies
- TV Shows
- Video Games
- Books

Users can also create unlimited custom categories for anything else they want to track, such as:

- Anime
- Manga
- Podcasts
- Albums
- Comics
- Articles
- Courses
- Plays
- YouTube content
- Any other type of consumable media

Categories are primarily organizational. All categories share the same core experience-tracking system.

Each category has a `media_type` used to route it to the correct external provider: `movie` / `tv` / `game` / `book` / `anime` / `music` / `podcast` / **`manual`**. `manual` is an explicit enum value, not a null — a category with no provider attached says so directly rather than relying on the absence of a value to carry meaning, which keeps "no provider configured" distinguishable from "not yet set" in code and in the database.

`media_type` is set once at category creation and is **immutable** afterward. Changing it later would leave existing Experiences under that category ambiguous about which provider was actually used to source them historically, so a category that needs a different provider is recreated rather than edited in place.

Category `name` is free text; a `normalized_name` (lowercased, trimmed) is stored alongside it for per-user duplicate detection, so a user can't end up with both "Anime" and "anime" as separate categories by accident.

Categories are **soft-deleted** (`deleted_at`, nullable) rather than hard-deleted. Existing Experiences keep their `category_id` and continue to display normally; a deleted category simply stops appearing as an option when logging new experiences.

The four built-in categories are `is_builtin = true` and cannot be deleted (soft or otherwise). *(Renamed from `is_system` — "builtin" says what these categories actually are; "system" reads as though they're internal/non-user-facing, which they aren't.)*

## Media

For supported categories, users can search external media databases/APIs and select an existing media item.

**Media has two distinct ownership modes:**

**1. Provider-sourced media (global, shared).** Identified by `(source, external_id)`. If user A adds "The Batman" from a provider and user B adds it later, user B resolves to the *same* Media row. `Media.user_id` is `null` for these rows.

**2. Manual media (user-scoped, never global).** No `source`/`external_id`, so nothing distinguishes two different users' "Indie Game X." `Media.user_id` is set to the creator, and manual rows are never matched against or shared with other users.

### How global uniqueness is actually enforced

A GSI in DynamoDB **does not enforce uniqueness** — it's an index, not a constraint, and two items can share the same GSI key. An earlier version of this design leaned on a "sparse GSI" to prevent duplicate provider-sourced rows; that claim was wrong, since a query-then-write pattern against a GSI is a check-then-act race: two users resolving the same new title in the same moment could both query, both find nothing, and both write, producing two rows for one title.

The actual mechanism: **provider identity is the Media table's primary key**, not a surrogate UUID.

- Provider-sourced rows: `id = PROVIDER#{source}#{external_id}`
- Manual rows: `id = MANUAL#{user_id}#{uuid}`

`resolve(source, external_id)` becomes a conditional `PutItem` with `ConditionExpression: attribute_not_exists(id)`. If the item already exists, the condition fails and the operation falls back to a plain `GetItem` on that same deterministic key. This is atomic at the DynamoDB partition-key level — real uniqueness enforced by the base table itself, not implied by an index. No separate lookup GSI is needed at all, since the key *is* the lookup.

Manual entries bypass this path entirely and go straight to their own `MANUAL#{user_id}#{uuid}` key, which can never collide with a provider-sourced key or with another user's manual key.

### Cover images

Manual-entry cover images are uploaded via presigned S3 URL to a path scoped to both the user *and* explicitly to manual media: `users/{user_id}/manual-media/{media_id}/cover.jpg`. The `manual-media` segment keeps user-uploaded binaries structurally separate from anything provider-sourced — provider-sourced `cover_image` is always an external URL (the provider's own CDN), never a path under a per-user prefix, so there's no ambiguity if a manual entry is ever deleted and recreated, or if global asset handling changes later; the two kinds of assets were never sharing a naming scheme to begin with.

### Metadata snapshot policy

Provider-sourced titles can change (a provider corrects a typo, a title gets updated) after a user has already logged an experience against that Media row. Deony's policy, stated explicitly rather than left implicit: **denormalized fields on Experience are write-time snapshots.** They are not kept in sync with later corrections to the global Media row. If a user re-opens an old experience, they may see the title as it was at logging time, not the current provider title. Propagating corrections is a deferred feature (a future batch re-hydration job), not a v1 requirement — this is a documented tradeoff, not an oversight.

Media metadata can include:

- Title
- Media type
- Cover image
- Description
- Release/publication date
- External ID *(null for manual entries)*
- External source *(null for manual entries)*
- `is_manual` flag
- `user_id` *(null for provider-sourced/global; set for manual)*

## Experiences

The most important entity in Deony is the user's experience with a media item.

A user can record:

- Status
  - Want to Experience
  - Currently Experiencing
  - Completed
  - Dropped
- Rating from 0–10
- Start date
- End date
- Personal thoughts
- The category they filed it under

"Thoughts" should be treated as a core feature rather than simply an optional review field. Deony is intended to function as a personal journal/archive, not merely a database of ratings.

Categorization lives on the Experience, not on Media. A user may log more than one Experience against the same Media item (e.g. a rewatch or replay).

### Status transitions and date semantics

Three date-related concepts are kept strictly separate, because conflating them is what breaks sorting and timelines later:

- **`created_at`** — a system timestamp, set once when the row is created, never user-edited. Answers "when was this added to Deony," independent of anything about the experience itself.
- **`started_on` / `ended_on`** — user-entered *dates* (not timestamps; exact time of day isn't a meaningful thing to log for "I finished this book"). `ended_on` covers both "the date I completed it" and "the date I stopped partway" — Completed and Dropped are both, semantically, "the date I stopped actively engaging with this," so one field serves both rather than introducing a separate `dropped_at`.
- **`sort_date`** — computed at write time, never directly user-edited, and the *only* field any chronological view reads from:

| Status | `started_on` | `ended_on` | `sort_date` |
|---|---|---|---|
| Want to Experience | not set | not set | **not written (absent)** |
| Currently Experiencing | set (required, backfillable) | not set | `started_on` |
| Completed | optional if unknown | **required** | `ended_on` |
| Dropped | optional | optional ("date dropped") | `ended_on` if set, else `started_on`, else `created_at` |

`sort_date` being **absent** (not zero, not null — genuinely unwritten) for Want to Experience is deliberate: it means Want-to-Experience items are structurally excluded from any sparse index keyed on `sort_date` (see `GSI2` below) without needing a status filter in every timeline query. This directly answers a product question that was previously left implicit: **Want-to-Experience items do not appear on the historical timeline.** The timeline's defining question — "what was I experiencing at this point in my life" — is about things that actually happened; a wishlist item hasn't happened yet. Wants still surface in the library (sorted by "recently added," see `GSI4`), just not on the chronological timeline.

`rating` follows the same not-conflating-absence-with-a-value principle: **`null`/absent explicitly means "not yet rated."** This has to be called out because `0` is a legitimate rating on a 0–10 scale — a null rating and a 0/10 rating are different facts and must never be treated as interchangeable in code or in the UI ("not yet rated" is a distinct display state from "rated 0/10").

### Concurrency and idempotency

- **Experience creation accepts a client-supplied idempotency key.** A flaky mobile connection retrying a "log this experience" request should not create two rows. The write is a conditional check against a short-lived idempotency record; a retried request with the same key returns the original result instead of creating a duplicate.
- **Experience updates carry a `version` integer**, incremented on every successful write. Updates require `ConditionExpression: version = :expectedVersion`; a mismatch (e.g. the same experience edited from two open tabs) returns a conflict rather than silently letting the second write clobber the first.

The same media item can have completely different experiences for different users.

## Personal Library

Each user has a personal library containing their experiences.

The library should support:

- Viewing all experiences
- Searching
- Filtering by category
- Filtering by status
- Filtering by rating
- Sorting by recently added
- Sorting by recently completed
- Sorting by rating
- Sorting alphabetically
- Viewing individual experiences
- Editing experiences
- Deleting experiences

See *AWS Architecture* for exactly which of these are server-side DynamoDB queries versus deliberately client-side filters, and for pagination, which applies to every list endpoint here.

## Timeline

Deony should have a chronological timeline showing what the user experienced over time.

For example:

```
August 30 — The Hobbit — 8/10
August 27 — Elden Ring — 10/10
August 22 — The Batman — 9/10
August 18 — Breaking Bad — 10/10
```

A library answers "what have I experienced?" The timeline answers "what was I experiencing at this point in my life?" — which is why **Want to Experience items are excluded** from it (see *Status transitions and date semantics* above); they haven't happened yet, so they don't belong on a record of what happened.

The timeline reads directly from `GSI2` (`TimelineIndex`, sorted by `sort_date`), so ongoing items anchor at their real start date and completed/dropped items sort by when they actually ended — one consistently-computed field driving every chronological view instead of per-query special-casing.

Users should eventually be able to browse their history by month, year, or custom date range, via a range query on `sort_date`.

## Public Profiles

Users can optionally make their Deony profile public.

Each user has a shareable URL such as `deony.com/u/username`. `User.profile_visibility` controls the default for the whole profile; `Experience.visibility`, when set, overrides that default for a single experience.

### Caching as a privacy boundary

**The version number must never appear in the public-facing, shareable URL.** An earlier design cached `/u/username?v={profile_version}` directly — but a shared or bookmarked link pins whatever version number was current at share time. If the profile's visible content later changes (version increments), that old link still resolves to the *stale, now-outdated* cached version forever, or until incidental TTL eviction — which defeats the entire point of versioning as a correctness mechanism rather than a performance one.

**Fix — the public URL stays version-less; versioning happens server-side, per request:**

- The canonical, shareable URL is always `deony.com/u/{username}` — no version in it, ever.
- On each request, a lightweight lookup (a single `GetItem` against `User`, via a `UsernameIndex` GSI keyed on `username`) resolves the *current* `profile_version` for that user. This lookup is cheap — it is not the expensive part of serving the page.
- That lookup result is used to route to a version-qualified **internal** cache key (e.g. an internal path or cache-key header CloudFront keys on) — this is where the actual profile render (stats, timeline, thoughts) is cached and reused.
- Every request re-resolves the current version first, so a shared link always reflects the *current* visibility state; the expensive aggregation work, not the version check, is what benefits from caching.

**Writes that affect visibility are transactional, not sequential.** Any write that could change what's publicly visible — a `profile_visibility` toggle, an `Experience.visibility` change, or an add/edit/delete on a currently-public profile — increments `User.profile_version` in the **same** `TransactWriteItems` call as the underlying write, not as a follow-up step that could fail or lag independently. This guarantees it's impossible for a visibility-affecting write to commit without the version bump also committing — the two either both happen or neither does.

A short TTL (e.g. 60s) can still sit on top of the versioned cache as a backstop, but correctness no longer depends on it.

## Statistics and Retrospectives

Deony should provide useful statistics about a user's personal media history.

Examples:

- Total experiences
- Experiences by category
- Average rating
- Highest-rated items
- Most active periods
- Experiences completed per month/year
- Category distribution
- Yearly summaries

**Counting rules:**
- Only `Completed` experiences count toward average rating, highest-rated lists, and "completed per month/year" figures. `Want to Experience` is excluded entirely. `Dropped` is excluded from rating aggregates but may contribute to its own separate "dropped" count.
- An experience with `rating = null` is excluded from rating aggregates entirely (it's unrated, not rated zero — see *Status transitions and date semantics*).
- Rewatches/replays each count independently toward totals; a separate "unique titles experienced" stat should also be exposed.

```
Your 2026 in Deony

147 experiences
42 movies
31 books
28 games
23 TV shows
13 anime
Average rating: 8.2
```

## Media Providers

The provider abstraction has two distinct operations that must not be conflated:

**1. Search — ephemeral, never persisted.** `provider.search(query) -> candidate[]` returns normalized candidates for display. Nothing is written to the Media table just because a user viewed results.

**2. Resolve — the only point where a Media row is created or reused.** `provider.resolve(source, external_id) -> Media` runs only when a user selects a candidate. It's the conditional-`PutItem`-on-deterministic-key get-or-create described in *Media* above.

```
Search (ephemeral)   → candidate list, not stored
Resolve (on select)  → Media (global, deduped, get-or-create)
```

**Search is throttled and debounced.** The client debounces keystrokes (e.g. ~300ms) before calling search, and the search endpoint carries its own API Gateway throttle per user — search-as-you-type against a free-tier external API is the single easiest way to blow through a provider's rate limit, so both layers guard against it independently.

**Provider failure is defined, not left implicit:**
- A failed *search* degrades to a visible "search unavailable — add manually" state; it never presents as a hard error blocking the user from logging anything.
- *Resolve* is required synchronously as part of saving a new Experience against a provider candidate (the Experience shouldn't reference a Media row that doesn't yet exist). If resolve fails, the user is offered an immediate fallback to manual entry rather than being blocked with no path forward.

A category's `media_type` determines which provider's `search`/`resolve` pair is invoked. Providers can be added or replaced without changing the rest of the application. Because resolution is deduped globally, a provider is only actually called once per unique title across all users.

## Product Philosophy

**Experience over metadata.** External databases exist to make logging convenient. The user's experience is the important object.

**Personal archive over social network.** Deony should prioritize the user's personal history instead of building a social media feed around it.

**Flexible over restrictive.** Users should be able to track things that don't fit neatly into predefined categories, and should be able to categorize the same title differently than other users do.

**Journal over rating database.** Ratings are useful, but thoughts and personal history are equally important.

**Simple core model.**

```
Media (global, or user-scoped if manual) ← Experience (user + category + rating + thoughts) → User
```

## Differentiation

Deony should not attempt to be a replacement for specialized platforms such as Letterboxd, Goodreads, Backloggd, or Trakt. Those platforms primarily organize around specific media types. Deony organizes around the user's life and experiences.

Its defining question is "what have I experienced, and what did I think about it?" rather than "how do I track movies/books/games?"

## Authentication

Use AWS Cognito for registration, login, logout, password recovery, and account management. The application should not implement its own password/authentication system.

## AWS Architecture

Suggested stack:

- React + TypeScript + Vite
- S3 for frontend hosting, and for manual-entry cover images under `users/{user_id}/manual-media/{media_id}/`
- CloudFront for CDN, HTTPS, and version-keyed caching of public-profile responses (resolved server-side per request — see *Public Profiles*)
- Cognito for authentication
- API Gateway for the API, with per-user throttling on the provider-search endpoint
- Lambda for backend logic
- DynamoDB for application data
- Parameter Store (SecureString) for external provider API credentials
- CloudWatch for logging and monitoring

Avoid introducing EC2, ECS, Kubernetes, RDS, or other infrastructure unless there is a concrete architectural reason.

### DynamoDB key design

**`User` table** — `PK = id`. `UsernameIndex` GSI, `PK = username`, backs login lookups and the per-request `profile_version` check described in *Public Profiles*.

**`Media` table** — `PK = id`, where `id` itself encodes provider identity (`PROVIDER#{source}#{external_id}`) or manual ownership (`MANUAL#{user_id}#{uuid}`). No separate lookup GSI — the key is the lookup, and uniqueness is enforced by a conditional `PutItem` against it (see *Media* above for why a GSI can't do this job).

**`Experience` table** — partitioned by `user_id` so a user's full data set is colocated:

- Primary key: `PK = USER#{user_id}`, `SK = EXP#{experience_id}` — direct get/edit/delete.
- `GSI1` (`CategoryStatusIndex`): `PK = USER#{user_id}`, `SK = {category_id}#{status}#{sort_date}`. `BeginsWith(category_id)` serves the category filter; `BeginsWith(category_id#status)` serves category+status combined. Because `category_id` leads the sort key, this index **cannot** serve a status filter on its own (no category selected) — status-only filtering is done client-side over `GSI2` or `GSI4` results, alongside rating (below), as a deliberate, explicitly-scoped simplification rather than an accidental gap.
- `GSI2` (`TimelineIndex`): `PK = USER#{user_id}`, `SK = {sort_date}#{experience_id}`. Serves the timeline (including date-range `Between` queries) and "recently completed" sort, since `sort_date = ended_on` for `Completed` items. **This index does not serve "recently added"** — `sort_date` reflects when the *experience* happened, not when the row was created, and for most statuses those are different dates. It is sparse with respect to `Want to Experience` rows, since those never get a `sort_date` written at all — which is exactly the mechanism that keeps Wants off the timeline (see *Status transitions and date semantics*).
- `GSI3` (`AlphaIndex`): `PK = USER#{user_id}`, `SK = {media_title_lowercase}#{experience_id}`. `Experience` denormalizes `media_title` and `media_type` from `Media` at write time (see *Metadata snapshot policy* for why these are snapshots, not live-synced) so alphabetical sort and basic library display don't require a join back to `Media` on every read. `cover_image` is **not** denormalized — it's purely a display concern, not something any sort key or filter needs, and it's fetched via a single `BatchGetItem` against `Media` for the current page of results at render time. Given pagination already bounds page size, that batch fetch is cheap; denormalizing it preemptively would just be one more field to go stale for no query-time benefit.
- `GSI4` (`RecentlyAddedIndex`): `PK = USER#{user_id}`, `SK = {created_at}#{experience_id}`. Exists specifically because `GSI2` cannot correctly serve "recently added" — this is the actual index for that sort, and it's also where `Want to Experience` items are browsable chronologically by when they were added, since they're absent from `GSI2`.
- **Explicitly client-side, at MVP scale:** rating filter/sort (usually a secondary filter layered on top of category/status/date, not a primary access pattern), status-only filtering with no category selected, and free-text title search (a dedicated search index is a deliberate later addition, not a v1 requirement).

**Pagination applies to every list-returning endpoint** — library, timeline, category list, search results — via DynamoDB's `LastEvaluatedKey` exposed as an opaque cursor at the API layer. No endpoint returns an unbounded result set.

## Core Data Model

**User**
- id *(PK)*
- username
- display_name
- profile_visibility
- profile_version *(int, default 0; incremented only via `TransactWriteItems` alongside any visibility-affecting write)*
- created_at
- updated_at
- GSI: `UsernameIndex` (`PK = username`)

**Category**
- id *(PK)*
- user_id
- name
- normalized_name
- media_type *(enum: movie / tv / game / book / anime / music / podcast / manual — never null; immutable after creation)*
- icon
- color
- sort_order
- is_builtin
- deleted_at *(nullable — soft delete)*
- created_at
- updated_at

**Media**
- id *(PK — `PROVIDER#{source}#{external_id}` for provider-sourced, `MANUAL#{user_id}#{uuid}` for manual; uniqueness enforced by conditional write on this key, not by any index)*
- media_type
- external_id *(nullable)*
- source *(nullable)*
- is_manual
- user_id *(nullable; set for manual only)*
- title
- description
- cover_image
- release_date
- created_at
- updated_at

**Experience**
- id
- user_id *(`PK = USER#{user_id}`)*
- media_id
- category_id
- status
- rating *(nullable = unrated; `0` is a distinct, valid rated value)*
- started_on *(date)*
- ended_on *(date; covers both Completed-finish and Dropped-stop)*
- sort_date *(computed; absent for Want to Experience — see semantics table above)*
- thoughts
- visibility *(nullable; overrides `User.profile_visibility` for this one experience)*
- media_title, media_type *(denormalized snapshot from `Media` at write time — `cover_image` deliberately excluded, see `GSI3` above)*
- version *(int, optimistic concurrency)*
- created_at *(system timestamp, immutable)*
- updated_at
- GSIs: `GSI1 CategoryStatusIndex`, `GSI2 TimelineIndex`, `GSI3 AlphaIndex`, `GSI4 RecentlyAddedIndex`

The primary relationship is:

```
User → Experience → Media (global if provider-sourced, user-scoped if manual)
                  ↘ Category (user-owned)
```

## Social Features

Deony may eventually have social functionality — following, discovering public profiles, sharing individual experiences, likes/reactions, comments, activity feeds, public recommendations — but these should remain secondary to the personal archive and should not alter the fundamental architecture.

## Import and Export

The complete product should eventually support importing/exporting personal data (Letterboxd, Goodreads, Backloggd, Trakt, CSV, and other compatible services), prioritizing user ownership of their data.

## Future Intelligence

AI can eventually enhance Deony — personal retrospectives, pattern-finding, natural-language search over the archive, personalized recommendations — but it should be built around the user's existing archive rather than replacing it.

## Complete Product Experience

```
Sign up
↓
Create personal archive
↓
Search or manually add something
↓
Choose category
↓
Record experience
↓
Rating + dates + thoughts + status
↓
Browse personal library
↓
Browse chronological timeline
↓
View statistics and retrospectives
↓
Create custom categories
↓
Share public profile
↓
Discover other public archives
↓
Import/export data
↓
Use the archive as a long-term record of personal media history
```

## Product Goal

The ultimate goal of Deony is to create a personal, chronological, searchable archive of the things that a person has experienced and what they thought about them.

It should feel less like maintaining a database and more like keeping a diary of your relationship with media.

The technical implementation should be planned around this complete product vision, while development can be broken into practical phases.