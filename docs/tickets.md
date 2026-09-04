# Engineering Tickets Roadmap — Deony

This document defines self-contained, sequentially actionable engineering tickets for the Deony codebase. Any engineer picking up a ticket has full context, requirements, target files, and acceptance criteria without needing prior session memory.

---

## Ticket Overview & Recommended Execution Order

| Ticket ID | Title | Priority | Est. Complexity | Dependencies |
|---|---|---|---|---|
| **TICK-001** | Backend Invariant & DynamoDB Unit Test Suite | P0 | Medium | None |
| **TICK-002** | Public Profile Sharing Flow & Unauthenticated Access | P1 | Medium | TICK-001 |
| **TICK-003** | UI Skeletons, Empty States & Provider Error Resilience | P1 | Medium | None |
| **TICK-004** | AWS Infrastructure as Code (IaC) Deployment Baseline | P2 | High | TICK-001, TICK-002 |

---

## TICK-001: Backend Invariant & DynamoDB Unit Test Suite

### Status
- **Priority**: P0 (Foundational Quality)
- **Assigned To**: Open
- **Dependencies**: None

### Context & Motivation
`docs/deony-product-vision.md` defines strict, non-negotiable architectural invariants (e.g. `sort_date` absence on wishlist items, `rating: null` distinct from `0`, optimistic concurrency control). While E2E Playwright tests cover user-facing journeys, isolated unit/integration tests with Vitest are required to prevent regressions in backend handlers and DynamoDB expression construction.

### Requirements & Scope
1. **`sort_date` Rules**:
   - Creating/updating an experience with status `"Want to Experience"` MUST omit `sort_date` (attribute must not exist in DynamoDB Item).
   - Moving from `"Completed"` to `"Want to Experience"` must issue a `REMOVE sort_date` clause without colliding with `SET` clauses.
   - Status `"In Progress"` and `"Completed"` must compute and persist `sort_date` (never user-edited).
2. **Rating Invariant**:
   - Ensure `rating: null` is never stored or coerced to `0`. Unrated items must retain `rating: null`.
3. **Concurrency & Idempotency**:
   - Experience updates must increment and enforce `version` check (`attribute_exists(id) AND version = :expected_version`), returning `409 Conflict` on mismatch.
   - Creation must honor `idempotency_key`. Duplicate requests with identical keys must return the original item without creating a duplicate.
4. **Media Uniqueness**:
   - Media creation must use conditional `PutItem` (`attribute_not_exists(id)`). Provider-sourced media (`PROVIDER#{source}#{external_id}`) must never duplicate.
5. **Category Rules**:
   - Deleting a category with `is_builtin: true` must return `400 Bad Request`.
   - Custom category deletion must perform soft deletion (`is_deleted: true`).
   - Category `media_type` must be immutable on update.

### Target Files
- `server/handlers/__tests__/experience.test.ts` (NEW)
- `server/handlers/__tests__/category.test.ts` (NEW)
- `server/handlers/__tests__/media.test.ts` (NEW)
- `vitest.config.ts` (Inspect/update configuration if needed)

### Acceptance Criteria
- [ ] Vitest suite runs locally with `npm run test` or `npx vitest run`.
- [ ] 100% of invariant assertions pass against DynamoDB Local / mocked document client.
- [ ] No race condition in optimistic update version checks.

---

## TICK-002: Public Profile Sharing Flow & Unauthenticated Read Access

### Status
- **Priority**: P1 (Core Product Feature)
- **Assigned To**: Open
- **Dependencies**: TICK-001

### Context & Motivation
Per the product vision, users can share their curated personal library publicly via `/profile/:username` or `/u/:username`. Public views must be accessible without logging in, resolve user details through `UsernameIndex`, respect `profile_visibility`, and provide clean social previews (OpenGraph).

### Requirements & Scope
1. **Unauthenticated Access**:
   - Route `/profile/:username` must allow public read-only access (bypass `authMiddleware`).
   - Navigation bar must adapt: hide private actions (Log Experience, Settings, Account Delete) and show "Sign In / Join Deony" CTA when unauthenticated.
2. **Profile Visibility Enforcement**:
   - If `profile_visibility === 'private'` and request is unauthenticated or from a different user, return `403 Forbidden` / private profile placeholder.
   - If `profile_visibility === 'public'`, serve public profile details, public categories, and public completed/in-progress experiences.
3. **Cache Invariant & Internal Resolution**:
   - Server-side resolution resolves username via `UsernameIndex` and retrieves `profile_version`.
   - Public URLs must NEVER expose version tokens in the pathname.
4. **Social Sharing & Meta**:
   - Support OpenGraph tags (`og:title`, `og:description`, `og:image`) populated with display name, bio, and archive count for link sharing on Discord/Twitter/iMessage.

### Target Files
- `server/routes.ts` (Ensure public profile endpoints permit unauthenticated GET)
- `server/handlers/user.ts` (Optimize `getUserByUsername` public projection)
- `src/pages/PublicProfilePage.tsx` or `src/pages/ProfilePage.tsx`
- `tests/public-profile.spec.ts` (NEW Playwright test)

### Acceptance Criteria
- [ ] Unauthenticated visitor can open `http://localhost:5173/profile/testuser` in an incognito window and view shelves.
- [ ] Private profiles show "This archive is private" without leaking media counts.
- [ ] Logged-out user has no access to edit/delete buttons on another user's profile.
- [ ] Playwright E2E test passes verifying logged-out viewing.

---

## TICK-003: UI Skeletons, Empty States & Provider Error Resilience

### Status
- **Priority**: P1 (User Experience & Reliability)
- **Assigned To**: Open
- **Dependencies**: None

### Context & Motivation
Currently, initial data fetching displays blank screens or basic text spinners before content loads. Additionally, third-party media APIs (TMDB, RAWG, Open Library) can fail due to rate limits or network issues. The system must degrade gracefully to manual entry without blocking the user.

### Requirements & Scope
1. **Loading Skeletons**:
   - Create reusable `<SkeletonCard />` and `<SkeletonRow />` matching Tailwind surface colors.
   - Implement animated pulse loading states for:
     - `LibraryPage`: Grid cards skeleton.
     - `HomeDashboardPage`: Recent activity cards + stats skeleton.
     - `ManageCategoriesPage`: Category row skeletons.
2. **Comprehensive Empty States**:
   - Empty Library: Contextual graphic/icon, warm title ("Your shelves are waiting"), and a direct "Log your first experience" primary button.
   - Empty Category / Filter: "No items found in this category" with a button to clear filter or log a new item under this category.
   - Empty Timeline: "No completed experiences yet" with encouragement to finish in-progress items.
3. **Provider Fallback & Resilience**:
   - If provider search times out or errors (HTTP 429/500/network error), render a subtle non-blocking banner: *"Search is currently unavailable. Add your media manually."*
   - Provide an instant button transitioning to `<ManualMediaForm />` with pre-filled title from the search bar.

### Target Files
- `src/components/ui/Skeleton.tsx` (NEW)
- `src/components/ui/EmptyState.tsx` (NEW)
- `src/pages/LibraryPage.tsx`
- `src/pages/HomeDashboardPage.tsx`
- `src/pages/LogExperiencePage.tsx`

### Acceptance Criteria
- [ ] Loading states show smooth layout skeletons without layout shift (CLS < 0.1).
- [ ] Simulating network failure on TMDB displays graceful manual fallback banner.
- [ ] Empty states across all 4 main views provide actionable paths to log items.

---

## TICK-004: AWS Infrastructure as Code (IaC) Deployment Baseline

### Status
- **Priority**: P2 (Production Cloud Readiness)
- **Assigned To**: Open
- **Dependencies**: TICK-001, TICK-002

### Context & Motivation
Local development relies on DynamoDB Local, Cognito Local, and s3rver. To deploy to real AWS environments (staging/production), all resources must be declared as version-controlled Infrastructure as Code (AWS CDK with TypeScript or Terraform).

### Requirements & Scope
1. **DynamoDB Single/Multi-Table Schema**:
   - Define tables with Billing Mode `PAY_PER_REQUEST` (On-Demand):
     - `User`: PK `id` (String), GSI `UsernameIndex` (PK `username`).
     - `Category`: PK `id` (String), GSI `UserCategoriesIndex` (PK `user_id`, SK `sort_order`).
     - `Media`: PK `id` (String).
     - `Experience`: PK `USER#{user_id}`, SK `EXP#{id}`:
       - `GSI1 CategoryStatusIndex`: PK `PK`, SK `category_id#status#sort_date`
       - `GSI2 TimelineIndex`: PK `PK`, SK `sort_date` (Sparse — wishlist excluded)
       - `GSI3 AlphaIndex`: PK `PK`, SK `media_title`
       - `GSI4 RecentlyAddedIndex`: PK `PK`, SK `created_at`
2. **Cognito User Pool**:
   - Standard User Pool with Email Alias sign-in.
   - App Client configured without client secret for SPA consumption.
   - Token validity configurations (Access token: 1 hour, Refresh token: 30 days).
3. **Storage & CDN**:
   - S3 Bucket for user media assets with Origin Access Control (OAC).
   - CloudFront distribution serving static Vite web app from S3 + reverse proxying `/api/*` to API Gateway.
4. **Compute & Secrets**:
   - API Gateway HTTP API integrated with Lambda (running Node.js 20+ runtime).
   - AWS Systems Manager Parameter Store parameters for `TMDB_API_KEY` and `RAWG_API_KEY`.

### Target Files
- `infra/` (NEW directory)
- `infra/cdk.json` or `infra/main.tf`
- `infra/lib/database-stack.ts`
- `infra/lib/auth-stack.ts`
- `infra/lib/api-stack.ts`
- `infra/lib/frontend-stack.ts`
- `docs/deployment-guide.md` (NEW)

### Acceptance Criteria
- [ ] IaC synthesis completes without errors (`npx cdk synth` or `terraform validate`).
- [ ] Resource definitions match non-negotiable invariants (exact index names, sparse indexes, partition key schemas).
- [ ] Clear step-by-step deployment guide for staging and production environments.
