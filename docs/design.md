---
name: Quiet Reflection
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece8'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#eae1dc'
  on-surface: '#1f1b18'
  on-surface-variant: '#404849'
  inverse-surface: '#34302d'
  inverse-on-surface: '#f8efea'
  outline: '#71787a'
  outline-variant: '#c0c8c9'
  surface-tint: '#39656c'
  primary: '#114349'
  on-primary: '#ffffff'
  primary-container: '#2d5a61'
  on-primary-container: '#a2d0d8'
  inverse-primary: '#a1ced6'
  secondary: '#5e5e5d'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfde'
  on-secondary-container: '#626361'
  tertiary: '#3d3c39'
  on-tertiary: '#ffffff'
  tertiary-container: '#54534f'
  on-tertiary-container: '#c9c7c2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bcebf3'
  primary-fixed-dim: '#a1ced6'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#1f4d54'
  secondary-fixed: '#e3e2e0'
  secondary-fixed-dim: '#c7c6c5'
  on-secondary-fixed: '#1a1c1b'
  on-secondary-fixed-variant: '#464746'
  tertiary-fixed: '#e5e2dd'
  tertiary-fixed-dim: '#c9c6c1'
  on-tertiary-fixed: '#1c1c19'
  on-tertiary-fixed-variant: '#474743'
  background: '#fff8f5'
  on-background: '#1f1b18'
  surface-variant: '#eae1dc'
typography:
  display:
    fontFamily: EB Garamond
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-md:
    fontFamily: EB Garamond
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  caption:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 120px
---

## Brand & Style

This design system centers on the concept of a digital sanctuary. It adopts a **Minimalist** aesthetic with **Tactile** undercurrents, drawing inspiration from high-end editorial design and artisanal stationery. The UI is designed to be "invisible," prioritizing the user's content and introspective thoughts over interface ornamentation.

The emotional response should be one of calm, focus, and permanence. By utilizing generous whitespace and a restricted palette, the system avoids the "noise" of traditional social media or data-heavy archives. It feels like a high-quality paper journal: structured but breathable, intentional, and timeless.

## Colors

The palette is rooted in soft neutrals to mimic physical media. 
- **Primary (Deep Teal):** Used sparingly for intentional actions, focus states, and primary navigation cues. It represents "the ink" of the user's thoughts.
- **Secondary (Off-White):** The "Paper" surface. It is the primary background color, providing a warm, non-glare canvas.
- **Tertiary (Warm Gray):** Used for subtle borders and secondary surfaces, creating soft contrast without harsh lines.
- **Neutral (Charcoal):** Reserved for high-legibility text and iconography, ensuring a comfortable reading experience.

Avoid pure black (#000) or pure white (#FFF) to maintain the soft, organic feel of the archive.

## Typography

The typography pairing creates a dialogue between tradition and modernity.
- **Headlines:** Use the elegant serif for all entry titles and section headers. It should feel literary and personal.
- **Body:** Use the clean sans-serif for descriptions, notes, and metadata. The high x-height ensures legibility during long-form reading.
- **Labels:** Set in uppercase with slight letter spacing to differentiate functional UI elements from the narrative content.
- **Line Height:** Generous leading (1.6x for body) is essential to preserve the "breathable" quality of the layout.

## Layout & Spacing

This design system utilizes a **Fixed Grid** on desktop to contain content within a comfortable reading measure, transitioning to a **Fluid Grid** on mobile devices.

- **Desktop:** 12-column grid with a maximum content width of 1100px to prevent lines of text from becoming too wide.
- **Margins:** Intentional "waste" of space is encouraged. Large outer margins (xxl) help the user focus on the central archive.
- **Rhythm:** Use increments of 8px for vertical rhythm. Related elements should use 'md' (16px) spacing, while distinct sections should use 'xl' (48px) to provide clear visual breaks without the need for horizontal rules.

## Elevation & Depth

To maintain a flat, paper-like feel, this design system eschews heavy drop shadows in favor of **Low-Contrast Outlines** and **Tonal Layers**.

- **Surfaces:** Depth is communicated by shifting background colors. The base page is `secondary_color`, while floating cards or modals use a pure white with a 1px border of `tertiary_color`.
- **Interaction:** Hover states should be indicated by a subtle shift in background color (e.g., from off-white to a very pale tint of the primary color) rather than a shadow "lift."
- **Focus:** When an element is active or focused, use a subtle 1px solid stroke of the `primary_color`.

## Shapes

The shape language is "Soft-Organic." 
- **Standard UI (Buttons, Inputs):** 0.5rem (8px) provides a friendly but disciplined appearance.
- **Media Cards:** Use `rounded-lg` (16px) to soften photos and video thumbnails, making them feel like physical snapshots.
- **Iconography:** Use a light stroke weight (1.5px to 2px) with rounded caps and joins to match the typography's softness.

## Components

- **Cards:** Use a minimal card style. No shadows; instead, use a 1px `tertiary_color` border. Ensure generous internal padding (min 24px) to avoid a cramped feel.
- **Buttons:** 
  - *Primary:* Solid `primary_color` with white text. Rounded 8px.
  - *Secondary:* Ghost style with 1px `tertiary_color` border and `neutral_color` text.
- **Input Fields:** Bottom-border only (like a lined notebook) or very subtle 4-sided borders. No heavy fills.
- **Chips/Tags:** Used for categorization. Small, uppercase sans-serif text on a light gray background with full pill-rounding.
- **The "Timeline" Line:** A vertical 1px line in `tertiary_color` used to connect media entries, reinforcing the archival, chronological nature of the product.
- **Lists:** Clean, undivided lists. Use whitespace and bolded `label-md` metadata to separate items rather than harsh horizontal separators.

# Deony Product Specification & Screen Inventory (v1)

## Product Overview
Deony is a personal media-experience archive. Unlike trackers (Letterboxd, Goodreads), Deony focuses on the *experience* itself—the journal entry of a life lived through media.

---

## 1. Marketing & Authentication (The Entryway)

### [M1] Landing Page (`/`)
*   **Purpose:** Answers "What is Deony and why should I use it?"
*   **Layout:** 
    *   Hero: Catchy headline ("Your life, indexed through the art you love"), CTA.
    *   Value Props: 3-column grid (Archive over Track, Personal over Social, Flexible over Rigid).
    *   Visual Teaser: A preview of the Timeline or Library UI.
    *   Footer: Links and copyright.
*   **Actions:** "Start your archive" (Signup), "Log in".
*   **Empty State:** N/A.
*   **Notable States:** N/A.

### [A1] Sign Up / Log In / Recovery (`/auth`)
*   **Purpose:** Answers "How do I enter my private archive?"
*   **Layout:** Centralized card with tabs for Login/Signup. Simple form fields.
*   **Actions:** Submit form, "Forgot password?", "Social login".
*   **Empty State:** N/A.
*   **Notable States:** Validation errors, Cognito loading state.

---

## 2. Onboarding (The Foundation)

### [O1] First-Run Onboarding (`/onboarding`)
*   **Purpose:** Answers "How do I set up my space?"
*   **Layout:** 
    *   Step 1: Set display name & username.
    *   Step 2: Choose default categories (Movies, TV, Books, Games, Albums).
    *   Step 3: Quick "Log your first experience" prompt.
*   **Actions:** Continue, Skip, Toggle categories.
*   **Empty State:** N/A.

---

## 3. The Core App (Authenticated)

### [H1] Home / Dashboard (`/home`)
*   **Purpose:** Answers "What’s the current snapshot of my media life?"
*   **Layout:**
    *   Quick Log Bar: Fast entry point.
    *   "Currently Experiencing": Horizontal scroll of in-progress items.
    *   Recent Highlights: Last 3 logged items with star ratings and short snippets.
    *   Stat Snack: "X items logged this month."
*   **Actions:** "Log something new", "View Library", "See Timeline".
*   **Empty State:** "Your archive is empty. Start by logging your first experience." + CTA.

### [L1] Personal Library (`/library`)
*   **Purpose:** Answers "What have I ever consumed?"
*   **Layout:**
    *   Header: Search bar + Filter chips (Category, Status, Rating).
    *   Body: Responsive grid of media covers/posters.
    *   Sort: Dropdown (Date Logged, Rating, Release Date).
*   **Actions:** Click item (Detail), Change filters, Toggle Grid/List view.
*   **Empty State:** "No items match your filters."

### [E1] Add/Log an Experience (`/log` or Modal)
*   **Purpose:** Answers "How do I record a new memory?"
*   **Layout:**
    *   Step 1: Search provider (TMDB/OpenLibrary/IGDB) or "Add Manually".
    *   Step 2: Experience Form: Rating (Stars), Dates (Started/Finished), Status (Completed/Dropped/etc.), Category, "Personal Thoughts" (Rich text/Markdown).
*   **Actions:** Search, Select candidate, Save Experience, Cancel.
*   **Empty State:** Search results placeholder.
*   **Notable States:** Provider search unavailable (Error toast).

### [D1] Experience Detail/View (`/experience/:id`)
*   **Purpose:** Answers "What did I think about this specific thing?"
*   **Layout:**
    *   Header: Title, Media Cover, User Rating, Dates.
    *   Body: Full "Personal Thoughts" journal entry.
    *   Meta: Category tag, Status.
*   **Actions:** Edit, Delete, Share (if public), Back to Library.
*   **Notable States:** 404 if ID is invalid.

### [D2] Edit Experience (`/experience/:id/edit`)
*   **Purpose:** Answers "How do I update my thoughts?"
*   **Layout:** The Log form pre-populated with existing data.
*   **Actions:** Save Changes, Delete Experience, Discard.

---

## 4. Organization & History

### [C1] Category Management (`/categories`)
*   **Purpose:** Answers "How is my archive structured?"
*   **Layout:** 
    *   List: Draggable rows of categories with counts.
    *   Actions: "Create Custom Category" button.
*   **Actions:** Reorder (Drag/Drop), Edit name/color, Soft-delete.
*   **Empty State:** "No custom categories yet."

### [T1] Timeline (`/timeline`)
*   **Purpose:** Answers "When did I experience these things?"
*   **Layout:** 
    *   Chronological Vertical Line.
    *   Month/Year Headers.
    *   Experience Cards hanging off the line.
*   **Actions:** Filter by Date Range, Jump to Year.
*   **Empty State:** "A quiet time... log an experience to see it here."

---

## 5. Insights & Public Face

### [S1] Statistics & Retrospectives (`/stats`)
*   **Purpose:** Answers "What are my patterns?"
*   **Layout:**
    *   Overview: Big numbers (Total Hours, Items per Category).
    *   Charts: Bar chart (Experiences per Month), Pie chart (Rating Distribution).
    *   "Your Year in Deony" (Conditional): Visual summary card for the current/past year.
*   **Actions:** Toggle All-Time vs Year, Share Summary.

### [P1] Public Profile (`/u/:username`)
*   **Purpose:** Answers "What does [User] recommend?"
*   **Layout:** 
    *   Profile Header: Bio, Total Items, Join Date.
    *   Grid: Curated "Favorites" or "Recent Completes" (Read-only).
*   **Actions:** Follow (if social enabled), View specific items.
*   **Empty State:** "This user's archive is private or empty."

---

## 6. Utilities

### [U1] Account, Category & Profile Settings (`/settings`)
*   **Purpose:** Answers "How do I manage my identity, categories, and privacy?"
*   **Layout:**
    *   Section 1: Profile (Name, Bio, Username).
    *   Section 2: Categories (Full Category Management: create custom categories, assign icons, reorder, delete).
    *   Section 3: Privacy (Archive Visibility: Private/Public, Share Profile).
    *   Section 4: Account (Email, Change Password, Export Data, Delete Account).
*   **Actions:** Save Settings, Create Category, Reorder Categories, Export Data, Logout.

### [X1] Error States (`/404`)
*   **Purpose:** Answers "Where am I?"
*   **Layout:** Large friendly 404 illustration, link back home.
*   **Notable States:** Generic error ("Something went wrong") with retry button.

---

## Total Page Count: 14

## Sitemap
- **Nav (Logged In):** Home, Library (includes Catalog & Statistics/Insights), Timeline, Settings (includes Profile, Categories, Privacy, Account), [New Entry Button].
- **Nav (Logged Out):** Landing, Login/Signup.
- **Deep Links & Compatibility:** `/stats` redirects to `/library?view=stats`, `/categories` redirects to `/settings?tab=categories`.
- **Modals:** Log Experience (often triggered from multiple points), Create Category (within Settings).
- **Sub-pages:** Edit Experience (from Detail).
