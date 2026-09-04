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