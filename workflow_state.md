# Workflow State — Deony

## Current Phase
Build Complete. E2E Testing / Polish / UI & Rating Normalization Complete.

## Current Task
- TICK-004: AWS Infrastructure as Code (IaC) Deployment Baseline (deferred for dedicated focus session per user directive).

## Decisions Made
- Local dev: DynamoDB Local (Java JAR) + s3rver (npm) + cognito-local (npm) + Express adapter
- Providers: TMDB (movies+TV), Open Library (books), RAWG (games)
- Editor: Tiptap + tiptap-markdown (WYSIWYG hybrid with source toggle)
- Testing: Vitest + Playwright
- Rating scale: Internal storage 0-10 or 0-5 is normalized everywhere to a clean 5-star scale in UI (`normalizeRatingTo5`, `formatRating5`).
- Git repository initialized on `main` with baseline release tag `local-1.0` (`v1.0.0-local`).
- No Docker, no AWS account for dev/test

## Stack
React + TypeScript + Vite · DynamoDB Local · s3rver · cognito-local · Express dev server
TMDB · Open Library · RAWG · Tiptap · Vitest · Playwright

## What Exists
- Phase 0 Foundation is complete.
- Phase 1 Data Layer is complete.
- Phase 2 Authentication is complete.
- Phase 3 Core UI Shells is complete.
- Phase 4 Core Features is complete.
- Phase 5 Organization is complete.
- Phase 6 Insights & Public Face is complete.
- Phase 7 Polish & Deploy is complete.
- **Frontend Design Overhaul complete**: 9 pages rewritten to Tailwind CSS matching design system.
- **TICK-001 Complete: Backend Invariant & DynamoDB Unit Test Suite**:
  - `server/handlers/__tests__/experience.test.ts`, `category.test.ts`, `media.test.ts`.
  - 24/24 unit tests passing cleanly (`npx vitest run`).
- **TICK-003 Complete: UI Skeletons, Empty States & Provider Error Resilience**:
  - `src/components/ui/Skeleton.tsx`, `src/components/ui/EmptyState.tsx`.
  - Added skeleton loaders and error resilience.
- **TICK-002 Complete: Public Profile Sharing Flow & Unauthenticated Read Access**:
  - Mounted `/profile/:username` and `/u/:username` with privacy enforcement.
  - Public profile poster cards and guest navigation modal.
- **Library UI & 5-Star Rating Normalization Complete**:
  - `src/utils/rating.ts`: Built `normalizeRatingTo5` and `formatRating5`.
  - `src/pages/LibraryPage.tsx`:
    - Fixed 2-column header layout and prevented flex width collapse on search bar.
    - Added tokenized multi-field search across titles, categories, statuses, thoughts, and descriptions.
    - Added status chips directly onto poster cards (`Completed`, `In Progress`, `Wishlist`, `Dropped`) with distinct color themes and backdrop blur.
    - Added Grid / List view mode switcher with rich archival row presentation in List view.
    - Added `/` keyboard shortcut to immediately focus search.
    - Added active search and filter chips with single-click dismissal.
  - `src/pages/ExperienceDetailPage.tsx` & `src/pages/EditExperiencePage.tsx`:
    - Distinct filled (`text-primary`, `'FILL' 1`) vs unfilled (`text-outline-variant/35`, `'FILL' 0`) stars.
    - Clean numeric score indicators (`4 / 5`, `5 / 5`).
  - `src/pages/SettingsPage.tsx`:
    - Removed redundant Log Out button from the bottom of the Settings page.
    - Added "Public Profile Active" card under Privacy with canonical link preview, instant auto-save toggle, "Share Profile" button (copies link & triggers native share), and "View" button.
  - `src/pages/PublicProfilePage.tsx`:
    - Added "Share Profile" button in the public profile header with instant link copy and toast confirmation.
  - `src/pages/ExperienceDetailPage.tsx`:
    - Added "Share" button in action bar beside Edit and Delete to share or copy the experience link.
  - `src/pages/StatisticsPage.tsx` & `src/utils/pdfExport.ts`:
    - Connected "Download PDF" using `jsPDF` to generate a beautiful, formatted `deony-archive-summary-2026.pdf` document with brand colors, KPI cards, category breakdown, and recent experiences.
    - Connected "Share Summary" to format archive metrics into clipboard/share text.
  - `src/pages/OnboardingPage.tsx`:
    - Tightened entire layout by fixing Tailwind `spacing` collision with `maxWidth`, removing oversized margins/paddings.
    - Mounted as a standalone linear/transactional flow without sidebar collision.
    - Added responsive category cards with checkmark indicators and compact spacing.
  - `src/pages/LandingPage.tsx`:
    - Tightened vertical spacing across the entire page (eliminated 120px/80px gaps, compact hero block).
    - Added smooth anchor scrolling (`scroll-behavior: smooth`).
    - Added silky hover micro-interactions (button hover lift, subtle shadow, active scale compression, card hover elevation, image zoom, bento border illumination).
  - `src/pages/HomeDashboardPage.tsx`:
    - Updated `renderStars` to include explicit unfilled star styles.
    - Added first-time user Welcome Banner when archive is empty, prompting users to configure initial categories via `/onboarding`.
    - Wired Quick Log bar so typed query seamlessly pre-fills `/log` search input.
  - **First-Time User Comprehensive Audit & Polish Complete**:
    - `src/pages/LogExperiencePage.tsx`: Pre-populates `searchQuery` from `location.state.initialQuery`.
    - `src/pages/TimelinePage.tsx`: Normalized star ratings to 5-star scale using `normalizeRatingTo5`; styled filled vs unfilled stars; eliminated 5-star glitch on 8/10 items; hid misleading stars for unrated entries.
    - `src/components/layout/AppLayout.tsx`:
      - Added "Categories" to navigation menu (desktop sidebar & mobile menu).
      - Fixed unauthenticated guest view on 404 / public routes by hiding private user shell when `!user`.
    - `src/pages/SettingsPage.tsx`: Added "Organization" card directly linking to Category Management (`/categories`).
    - `src/pages/OnboardingPage.tsx`: Aligned category template IDs to canonical `media_type` enums (`movie` and `tv`).
    - `src/services/auth.ts`: Gracefully suppressed unsupported `GlobalSignOut` warning in local dev.
    - `src/pages/LandingPage.tsx`: Replaced dead footer `#` links with real anchors (`#features`, `#philosophy`, `/auth`) and dynamic current year copyright.
    - `src/pages/LogExperiencePage.tsx`: Mapped provider search fields (`source`, `external_id`, `release_date`) properly into `/media/resolve`, strictly honoring the `PROVIDER#{source}#{external_id}` deduplication invariant instead of creating random UUIDs.
    - `src/components/editor/JournalViewer.tsx` & `src/pages/ExperienceDetailPage.tsx`: Created read-only Tiptap Markdown viewer so archival thoughts render rich typography (headings, lists, quotes, emphasis) instead of raw markdown text.
    - `src/pages/AuthPage.tsx` & `src/styles/index.css`:
      - Eliminated ugly browser focus rectangle outlines on click across all inputs, tab buttons, submit buttons, and social login buttons using `:focus:not(:focus-visible)` and Tailwind `outline-none focus:outline-none focus-visible:*`.
      - Added interactive password visibility toggle with Material Symbols eye icons (`visibility` / `visibility_off`) on both Log In and Sign Up forms.
  - **Consolidation & Visual Tightening (User Request Implemented)**:
    - **Categories within Settings**: Consolidated category taxonomy management directly into `src/pages/SettingsPage.tsx` under a dedicated Category Management section featuring modal creation, drag-and-drop reordering, item counts, and category deletion. `ManageCategoriesPage.tsx` cleanly delegates to `<SettingsPage initialTab="categories" />` for backward route compatibility.
    - **Statistics within Library**: Consolidated retrospective insights and analytics directly into `src/pages/LibraryPage.tsx` with an integrated view switcher (`Catalog` vs `Insights & Statistics`). Includes 4 KPI cards (Total Entries, Words Written, Media Curated, Streak), monthly distribution chart, Top Categories percentage bars, "Your Year in Deony" banner, Share Summary, and Download PDF (`jsPDF`). `StatisticsPage.tsx` cleanly delegates to `<LibraryPage initialView="stats" />`.
    - **Spacing Tightening & Visibility Enhancement**:
      - Eliminated oversized 120px desktop side margins and 80px vertical dead spaces across `HomeDashboardPage` and `LibraryPage`, replacing with responsive `px-gutter md:px-8 lg:px-12`.
      - Balanced font sizes and badge hierarchy: upgraded tiny `text-[10px]` status badges to readable `text-xs font-medium` chips with backdrop blur, and aligned header scales across screens.
      - Supported tokenized search matching on both internal status enums and user-facing status chip labels (`In Progress`, `Completed`, etc.).
  - **Sidebar Cleanup & Editor Polish (User Request Implemented)**:
    - **Sidebar Streamlined**: Removed Categories item from desktop sidebar and mobile navigation drawer in `AppLayout.tsx` since Category Management is directly inside Settings.
    - **Log Experience Editor Sizing**: Reduced `JournalEditor` min-height from `min-h-[300px]` to compact `min-h-[130px]` with `max-h-[220px]` scroll container in `LogExperiencePage.tsx`, removing redundant outer border wrapper and preventing modal box clipping.
    - **Toolbar Mark Retention Fix**: Added `onMouseDown={(e) => e.preventDefault()}` on all `JournalEditor` toolbar buttons to prevent contenteditable blur and ProseMirror `storedMarks` clearance. Clicking Bold now immediately highlights the active button and formats typing into `strong` text from the very first stroke. Added `onTransaction` listener for instant visual reactivity.
  - **Cover Picture Addition & Visual Audit Polish (User Request Implemented)**:
    - **Cover Picture Upload & URL Support**:
      - `server/handlers/media.ts` & `server/routes.ts`: Added `updateMedia` handler (`PATCH /media/:id` & `PUT /media/:id`) and updated `createManualMedia` to persist `cover_image`. Handled URI component decoding for composite partition keys (`MANUAL#user#id` and `PROVIDER#source#id`).
      - `LogExperiencePage.tsx`: Added "Upload Photo" (local file input with FileReader/S3 fallback) and "URL" buttons directly under the media preview in Step 2. Users can now easily upload a photo or paste an image URL for manual entries or any media.
      - `EditExperiencePage.tsx`: Added cover thumbnail preview and "Upload Photo" / "URL" controls to allow updating or removing cover pictures directly when editing experiences.
    - **Editor Spacing & Non-Clipping Modal**:
      - Installed `@tiptap/extension-placeholder` and added responsive placeholder styling in `JournalEditor.tsx`.
      - Reduced form gaps (`gap-md`, `pb-2`) and right-sized editor to `min-h-[110px] max-h-[170px]` with ample bottom breathing room, eliminating modal footer clipping.
    - **Design System Consistency & Top Line Alignment**:
      - Aligned section header dividers across `SettingsPage.tsx`, `LibraryPage.tsx`, `LogExperiencePage.tsx`, `EditExperiencePage.tsx`, and `ExperienceDetailPage.tsx` to uniform `border-b border-tertiary/25 pb-xs mb-md` with `font-headline-md text-headline-md text-primary`.
      - Standardized card borders and dividers to subtle `border-tertiary/25`.
      - Fixed oversized desktop padding in `EditExperiencePage.tsx` and `ExperienceDetailPage.tsx`, standardizing to `max-w-[860px] mx-auto px-gutter md:px-8`.
  - **Inline Error Placement, Outline Removal & Sidebar Streamlining (User Request Implemented)**:
    - **Inline Specific Cover Errors**:
      - Replaced all left-side and toast banners for cover image errors in `LogExperiencePage.tsx` and `EditExperiencePage.tsx` with dedicated inline alerts rendered directly at the cover controls container beneath the URL and upload buttons.
      - Added specific, descriptive error feedback for URL validation, file sizes, and server error messages.
      - Built `src/utils/imageCompressor.ts` using HTML5 Canvas to client-compress uploaded pictures to ~150KB, ensuring uploads never fail payload limits.
      - Increased Express payload limit in `server/dev-server.ts` to `50mb` and configured both S3 buckets (`deony-assets`, `deony-media-assets`).
    - **Search Input Outline Removal**:
      - Completely removed focus/active outlines on `LogExperiencePage.tsx` search and category select with `outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0`.
      - Updated `src/styles/index.css` with global overrides ensuring `input, select, textarea, button` never render browser focus rectangle boxes.
    - **Sidebar Streamlining & Landing Navigation**:
      - Removed "Journal" from desktop sidebar and mobile navigation drawer in `AppLayout.tsx`.
      - Sidebar now contains strictly: **Library**, **Timeline**, **Settings**, **Sign Out**, with `+ New Entry` pinned at the bottom left.
      - Redirected auth and onboarding destinations to `/library`, making the Library the primary landing page.
      - Configured `/home` route to redirect to `/library`.
    - **Automated & Visual Verification**:
      - Created `tests/new-user-experience-audit.spec.ts` testing the exact new-user flow: signup -> library landing -> sidebar check -> + New Entry -> search without outline -> cover error inline -> image update -> experience edit -> library catalog.
      - Captured visual screenshots in `screenshots-new-user-audit/` and verified with `view_file`.
      - TypeScript (`tsc --noEmit`): Clean, 0 errors.
      - Unit Tests (`npm test`): 24/24 tests passed across 3 test suites.
      - Playwright End-to-End Tests (`npx playwright test`): 15/15 test suites passed cleanly with 0 page errors and 0 console errors.

## Current Task
- **TICK-004**: AWS Infrastructure as Code (IaC) Deployment Baseline
  - Status: READY FOR DEDICATED FOCUS SESSION (as directed by user)
  - Detailed architecture, CDK constructs, and runbooks planned in `implementation_plan.md`.

## What's Next
- Execute TICK-004 (AWS CDK IaC deployment baseline) in a dedicated focus session when requested.

## Blockers
None. Ready for TICK-004 when user signals to proceed.

