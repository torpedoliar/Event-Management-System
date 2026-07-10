---
name: Event Management System
description: Premium event experiences with heritage gold accents on a deep charcoal foundation
colors:
  primary: "#D4A853"
  primary-hover: "#C49A4A"
  primary-soft: "#F5ECD7"
  primary-muted: "#B8934A"
  primary-glow: "rgba(212,168,83,0.20)"
  bg: "#09090B"
  bg-elevated: "#12121A"
  bg-subtle: "#1A1A24"
  surface: "#151520"
  surface-muted: "#1E1E2A"
  surface-bright: "#272735"
  text: "#FAFAF9"
  text-muted: "#A1A1AA"
  text-dim: "#71717A"
  success: "#4ADE80"
  warning: "#FBBF24"
  danger: "#F87171"
  info: "#60A5FA"
  border: "rgba(255,255,255,0.06)"
  border-hover: "rgba(255,255,255,0.12)"
  border-active: "rgba(212,168,83,0.40)"
typography:
  display:
    fontFamily: "Cinzel, serif"
    fontSize: "clamp(3rem, 8vw, 7rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Cinzel, serif"
    fontSize: "clamp(2.25rem, 5vw, 4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Cinzel, serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.04em"
rounded:
  default: "0.75rem"
  xl: "1rem"
  "2xl": "1.25rem"
  "3xl": "1.5rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  "2xl": "3rem"
components:
  button-primary:
    backgroundColor: "#D4A853"
    textColor: "#09090B"
    rounded: "0.75rem"
    padding: "0.625rem 1.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#D4A853"
    borderColor: "rgba(212,168,83,0.40)"
    rounded: "0.75rem"
    padding: "0.625rem 1.5rem"
  input:
    backgroundColor: "rgba(26,26,36,0.60)"
    textColor: "#FAFAF9"
    borderColor: "rgba(255,255,255,0.06)"
    rounded: "0.75rem"
    padding: "0.625rem 1rem"
  card:
    backgroundColor: "#151520"
    borderColor: "rgba(255,255,255,0.06)"
    rounded: "0.75rem"
---

# Design System: Event Management System

## 1. Overview

**Creative North Star: "The Golden Vault"**

Heritage elegance meets modern restraint. Like stepping into a private members club's digital presence — warm gold light against deep charcoal walls, every surface intentional, every interaction confident. The system communicates that *this event took care of every detail* without shouting it.

The foundation is near-black charcoal (#09090B), a deliberate choice for event venues where ambient lighting is low. Gold accents (#D4A853) are rare and purposeful — their scarcity is the point. The interface should feel like a well-designed luxury product: nothing wasted, nothing missing.

**Key Characteristics:**
- Dark canvas with warm gold illumination on key interactions
- Serif display type (Cinzel) for headings conveys heritage and authority
- Sans-serif body type (Inter) provides crisp readability
- Rounded surfaces with subtle depth via shadows, not glass effects
- Motion is responsive and confident, never bouncy or playful

**Explicitly Rejected (from PRODUCT.md):**
- Generic SaaS aesthetics with blue/purple gradients
- Budget event software with clip art or dated patterns
- Over-designed interfaces that sacrifice clarity
- AI-generated patterns: gradient text, numbered section scaffolding, universal eyebrow kickers

## 2. Colors

The palette is restrained and theatrical — deep charcoal recedes so gold moments feel like spotlights in a dark room.

### Primary
- **Heritage Gold** (#D4A853): The signature accent. Used sparingly on primary CTAs, active states, focus rings, and ceremonial moments (winner displays, prize announcements). Hover state: #C49A4A.
- **Soft Gold** (#F5ECD7): High-contrast text on dark backgrounds, selected states, badges. Not for large areas.
- **Muted Gold** (#B8934A): Subtle hover states, secondary accents. The quiet cousin of the primary.
- **Gold Glow** (rgba(212,168,83,0.20)): Ambient glow effects behind primary elements — hover states, spotlight moments.

### Semantic
- **Success** (#4ADE80): Check-in confirmations, completed states, attendance confirmed.
- **Warning** (#FBBF24): Pending states, attention needed, confirmation dialogs.
- **Danger** (#F87171): Errors, deletions, capacity warnings.
- **Info** (#60A5FA): Neutral information, tooltips, secondary status.

### Neutral
- **Void** (#09090B): Primary background. Near-black with subtle warmth from proximity to gold.
- **Elevated** (#12121A): Card backgrounds, elevated surfaces, modal backdrops.
- **Subtle** (#1A1A24): Input backgrounds, nested containers.
- **Surface** (#151520): Default card background, interactive surfaces at rest.
- **Surface Muted** (#1E1E2A): Hover state backgrounds, secondary surfaces.
- **Surface Bright** (#272735): Active state backgrounds, high-contrast containers.
- **Text** (#FAFAF9): Primary text on dark backgrounds. High contrast.
- **Text Muted** (#A1A1AA): Secondary text, descriptions, labels. Still legible at ≥4.5:1.
- **Text Dim** (#71717A): Tertiary text, placeholders, disabled states.
- **Border** (rgba(255,255,255,0.06)): Subtle dividers, card edges.
- **Border Hover** (rgba(255,255,255,0.12)): Hover state borders.
- **Border Active** (rgba(212,168,83,0.40)): Focus and active state borders.

**The Rarity Rule.** Primary gold appears on ≤10% of any given screen. Its scarcity is the message.

## 3. Typography

**Display Font:** Cinzel (serif fallback) — Used for h1-h3, section headings, hero text, ceremonial displays (winner names, prize announcements).

**Body Font:** Inter (system-ui fallback) — Used for body text, UI labels, form fields, navigation, all functional text.

**Mono Font:** JetBrains Mono (monospace fallback) — Used for code snippets, technical displays, QR data, timestamps.

**Character:** The serif/sans pairing is authoritative yet approachable. Cinzel brings heritage weight to headings; Inter keeps functional text crisp and readable. The contrast between display and body fonts reinforces the "premium without pretension" personality.

### Hierarchy
- **Display** (600, clamp(3rem, 8vw, 7rem), 0.95 line-height, -0.04em tracking): Hero headlines, event names, winner displays. Use sparingly.
- **Headline** (600, clamp(2.25rem, 5vw, 4rem), 1 line-height, -0.03em tracking): Page titles, section headers.
- **Title** (600, clamp(1.75rem, 3vw, 2.5rem), 1.1 line-height, -0.02em tracking): Card titles, subsection headings.
- **Body** (400, 1rem, 1.65 line-height): Paragraph text, descriptions. Max 65-75ch for readability.
- **Label** (500, 0.75rem, 1.25 line-height, 0.04em tracking): UI labels, badges, metadata. Uppercase for category labels only.

**Named Rules:**
- **The Balance Rule.** Use `text-wrap: balance` on h1-h3 for even line lengths in headings.
- **The Pretty Rule.** Use `text-wrap: pretty` on long prose paragraphs to reduce orphans.

## 4. Elevation

The system uses **layered shadows** to convey depth. Event venues are dark environments; subtle depth cues help users parse the interface hierarchy without relying on color.

### Shadow Vocabulary
- **Soft** (`0 4px 20px rgba(0,0,0,0.28)`): Default card elevation. Surfaces at rest.
- **Panel** (`0 24px 60px rgba(0,0,0,0.40)`): Elevated panels, modals, slide-out drawers.
- **Gold** (`0 0 40px rgba(212,168,83,0.12)`): Gold-accented elements, prize cards, winner highlights.
- **Gold Small** (`0 0 20px rgba(212,168,83,0.10)`): Subtle gold glow on interactive elements.
- **Inner Glow** (`inset 0 1px 0 0 rgba(255,255,255,0.06)`): Top-edge highlight on cards, subtle "lit from above" effect.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus).

## 5. Components

### Buttons
- **Shape:** Rounded corners (0.75rem / 12px radius)
- **Primary:** Gold background (#D4A853), dark text (#09090B), soft shadow. Hover: darker gold (#C49A4A) with slight lift (translateY(-2px)). Active: pressed effect (translateY(0)).
- **Ghost:** Transparent background, gold border (#D4A853 at 40% opacity), gold text. Hover: border brightens to 60%, background gains subtle gold tint.
- **Focus:** 2px gold ring with 50% opacity, offset by 0.
- **Disabled:** Reduced opacity (50%), no hover effects.

### Cards / Surfaces
- **Corner Style:** Rounded (0.75rem default; 1rem for larger cards, 1.25rem for panels)
- **Background:** Surface (#151520) at rest, Surface Muted (#1E1E2A) on hover
- **Shadow Strategy:** Soft shadow at rest, Panel shadow when elevated
- **Border:** Subtle white at 6% opacity; brightens to 12% on hover
- **Internal Padding:** 1rem (sm), 1.5rem (md), 2rem (lg) — varies by card size
- **Interactive Cards:** Subtle lift (-translateY(2px)) + enhanced shadow + gold border glow on hover

### Inputs / Fields
- **Style:** Transparent-to-subtle background (rgba(26,26,36,0.60)), subtle border (rgba(255,255,255,0.06))
- **Text:** Primary text color (#FAFAFA9)
- **Placeholder:** Dim text (#71717A)
- **Radius:** 0.75rem matching buttons
- **Focus:** Border shifts to gold at 40% opacity, 2px gold ring with 40% opacity
- **Error:** Border shifts to danger red (#F87171), red ring, error message below

### Navigation
- **Style:** Horizontal on desktop, slide-out drawer on mobile
- **Background:** Transparent with blur (backdrop-blur-xl) on glass surfaces
- **Active State:** Gold text (#D4A853), subtle gold underline or background tint
- **Hover:** Text brightens, subtle background appears

### Badges / Status Indicators
- **Style:** Pill-shaped (rounded-full), small padding (0.625rem 0.75rem)
- **Background:** Color at 10-20% opacity
- **Text:** Matching semantic color
- **Border:** Subtle matching border at low opacity

### Form Controls
- **Style:** Full-width inputs with 1rem padding
- **Border:** Subtle white at 6% opacity
- **Background:** Semi-transparent dark
- **Focus:** Gold ring and border shift
- **Transition:** 150ms for fast, smooth response

## 6. Do's and Don'ts

### Do:
- **Do** use heritage gold sparingly — the accent's power comes from restraint
- **Do** use Cinzel for headings and ceremonial moments; Inter for functional text
- **Do** use shadows for depth — a lit-from-above effect feels premium
- **Do** verify contrast ratios: body text ≥4.5:1, large text ≥3:1
- **Do** include reduced motion support — guests with vestibular disorders need full access
- **Do** use icons as visual anchors alongside text labels — never color as the only signal

### Don't:
- **Don't** use gradient text — decorative, never meaningful; use solid colors with weight/size for emphasis
- **Don't** add glassmorphism as decoration — blur and glass are rare and purposeful, not default
- **Don't** scaffold with numbered sequences (01, 02, 03) — numbers belong in actual sequences, not decorative headers
- **Don't** add eyebrow kickers above every section — one named kicker as a brand system is voice; universal eyebrows are AI grammar
- **Don't** use side-stripe borders (border-left > 1px as accent) — use full borders, background tints, or leading icons
- **Don't** create identical card grids — vary sizing and emphasis based on content importance
- **Don't** overflow text containers — test headings at every breakpoint; reduce clamp max or rewrite copy if overflow occurs
- **Don't** pair similar fonts (two geometric sans-serifs) — the contrast between Cinzel (serif) and Inter (sans) is intentional
