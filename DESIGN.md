# Design System: Mod Mantenimiento de Equipos
**Skill:** taste-design | **Vibe:** Tool-heavy, dense, sober

---

## Configuration — Dials

| Dial | Value | Description |
|------|-------|-------------|
| **Creativity** | `4` | Functional, predictable, clean — not expressive |
| **Density** | `8` | Data-heavy: tables, lists, metrics, forms |
| **Variance** | `4` | Consistent grids, repeatable patterns, ERP-level predictability |
| **Motion Intent** | `3` | Subtle hover/entrance cues, no cinematics |

---

## 1. Visual Theme & Atmosphere
A tool-heavy, data-dense interface modeled after Vercel/Linear. The atmosphere is professional and functional — every element earns its place through data utility, not decoration. Density is high (Level 8) for operational efficiency. Variance is low (Level 4) for predictability across table-heavy views. Motion is restrained (Level 3) — micro-interactions on hover and staggered entrance reveals, never theatrical. Dark mode is primary. Light mode is a clean alternative, not a second system.

## 2. Color Palette & Roles

### Light Mode
- **Canvas White** (#F8FAFB) — Primary background surface
- **Pure Surface** (#FFFFFF) — Card fill, containers
- **Charcoal Ink** (#18181B) — Primary text (Zinc-950, never pure black)
- **Steel Secondary** (#71717A) — Body text, descriptions, metadata
- **Muted Slate** (#94A3B8) — Tertiary text, timestamps, disabled
- **Whisper Border** (#E2E8F0) — Card borders, structural 1px lines
- **Diffused Shadow** (rgba(0,0,0,0.05)) — Card elevation, wide-spreading

### Dark Mode
- **VaultX Black** (#0B0F19) — Primary background surface
- **Deep Surface** (#151A26) — Card fill, containers
- **Off-White** (#F8FAFC) — Primary text
- **Steel Secondary** (#94A3B8) — Body text, descriptions
- **Muted Slate** (#64748B) — Tertiary text, timestamps
- **Whisper Border** (#1E293B) — Card borders, structural lines
- **Diffused Shadow** (rgba(0,0,0,0.4)) — Card elevation in dark mode

### Accent (Single)
- **Electric Blue** (#4B86E7) — Primary accent for CTAs, active states, focus rings
  - HSL: 217° 76% 60% (desaturated below 80% per taste-design rule)
  - Hover: #3468D9 (HSL 217° 76% 53%)
  - Light tint: #DEEBFB (for focus rings, badges)

### Semantic Status
- **Success** (#22C55E) — Operativo, completado, OK
- **Warning** (#F59E0B) — Pendiente, vencido, atención
- **Danger** (#DC2626) — Crítico, error, destruir
- **Info** (#4B86E7) — Informativo, link, navegación

### Banned Colors
- Purple/Violet neon gradients — the "AI Purple" aesthetic
- Pure Black (#000000) — always Off-Black or Zinc-950
- Oversaturated accents above 80% saturation
- Mixed warm/cool gray systems within one project
- Any color not defined in this palette

## 3. Typography Rules
- **Display:** `Geist` — Track-tight (`-0.025em`), controlled fluid scale, weight-driven hierarchy (600–800). Leading compressed (`1.1`). For headlines and stat values
- **Body:** `Geist` at weight 400 — Relaxed leading (`1.65`), max-width 65ch, Steel Secondary color (#71717A)
- **Mono:** `Geist Mono` — For code blocks, metadata, timestamps, labels. When density exceeds 7, all numbers switch to monospace
- **Scale:** Display at `clamp(2rem, 4vw, 3rem)`. Body at `1rem/1.125rem`. Mono metadata at `0.8125rem`
- **Section Headers (sidebar):** 10px uppercase, tracking-widest, 60% opacity text

### Banned Fonts
- `Inter` — banned everywhere in premium/creative contexts
- `Outfit` — replaced by Geist for this project
- Generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`) — BANNED. Never in dashboards
- Any font not defined in this spec

## 4. Component Stylings

### Buttons
- **Primary:** Electric Blue fill, white text, flat surface
- **Secondary:** Ghost/outline, no fill, subtle border
- **Active:** `-1px translateY` or `scale(0.97)` for tactile push — already implemented
- **Hover:** Subtle background shift, never glow — NO outer glow shadows
- **Disabled:** Muted background, 50% opacity text
- **Icon buttons (ActionIconButton):** Scale on hover, accent color on active

### Cards
- **Radius:** `1rem` (rounded-xl) — generous but not extreme for dense layouts
- **Shadow:** Diffused, tinted to background: `0 4px 24px rgba(0,0,0,0.06)` (light) / `0 4px 24px rgba(0,0,0,0.4)` (dark)
- **Border:** 1px whisper border, semi-transparent
- **Padding:** `1.5rem` internal
- **Hover:** Border-color shift to primary, NO blue glow
- **Stat cards:** 2x2 grid, brand accent line at top (3px), monospace stat values
- **Featured stat:** Primary fill, white text, no border

### Inputs / Forms
- **Label:** Positioned above input, monospace font
- **Helper text:** Optional, below input, muted color
- **Error text:** Below in danger color (#DC2626)
- **Focus ring:** 2px primary color with 2px offset — NO outer glow
- **Error shake:** GSAP-powered horizontal shake for tactile feedback
- **Standard gap:** 0.5rem between label-input-error stack

### Navigation (Sidebar)
- **Structure:** Fixed sidebar, 256px width, dark-themed
- **Logo:** Brand icon + title in white text (never changes with theme)
- **Group headers:** 10px uppercase, tracking-widest, 60% opacity, collapsible
- **Nav items:** 14px, rounded-lg, icon + label, padding 0.5rem 0.75rem
- **Active indicator:** 3px primary-colored bar on left, slides in on active
- **Hover:** Icon scale (1.12) via spring physics, background white/5
- **User info:** Bottom of sidebar, avatar initials + name + role

### Loaders
- **Skeletal shimmer:** Matching exact layout dimensions and rounded corners
- **Shifting light reflection** across placeholder shapes
- **NO circular spinners** — banned by taste-design rule

### Empty States
- **Composed composition:** Icon + guidance text + action button
- **Never "No data found"** — show how to populate data
- **GSAP animation:** Fade-up entrance

### Toast / Notifications
- **Position:** Bottom-right (standard)
- **Style:** Card with icon, message, close button
- **Auto-dismiss:** 4-5 seconds

### Badges / Status
- **Semantic colors:** success/warning/danger/info
- **Small, pill-shaped:** Rounded-full, padding 0.25rem 0.625rem
- **Uppercase text:** 11px, font-semibold

## 5. Hero Section
*Not applicable — this is an ERP system, not a marketing site. Dashboard serves as the first impression.*

## 6. Layout Principles

### Structure
- **Sidebar + Main content** pattern (fixed sidebar, scrollable main)
- **Topbar:** 64px height, page title, dark mode toggle, logout
- **Content area:** `max-width: 1400px`, centered with responsive padding
- **Full-height:** Use `min-h-screen` (Tailwind) — no `h-screen` or `h-[100vh]`

### Dashboard
- **Stat cards:** 2x2 grid (CSS Grid), gap 1rem
- **Quick actions:** 2x2 grid below stats
- **Chart:** Full width, h-56 (224px)
- **Recent activity:** Full width table below chart

### Tables (Equipos, Tickets, Mantenimiento, etc.)
- **Header:** Search input + filter chips
- **Table:** Full width, zebra striping subtle
- **Mobile:** Table converts to stacked cards (table-card-mobile)
- **Pagination:** Page size 10, previous/next buttons
- **Empty state:** Composed guidance when no results

### Forms
- **Single column:** Full width fields, max-width 640px
- **Field stack:** Label → Input → Error (0.5rem gaps)
- **Submit button:** Primary, full width on mobile
- **Cancel button:** Ghost/outline, secondary

### Responsive Rules
- **Mobile-First Collapse (< 768px):** All multi-column layouts collapse to single column
- **No Horizontal Scroll:** Critical failure on mobile
- **Typography Scaling:** Headlines via `clamp()`, body minimum 1rem
- **Touch Targets:** All interactive elements minimum 44px
- **Navigation:** Desktop sidebar → mobile overlay (GSAP slide-in)
- **Cards:** Bento grids revert to stacked single-column on mobile

## 7. Responsive Rules
Every screen must work across all viewports:
- **Mobile-First Collapse (< 768px):** Single column, `width: 100%`, `padding: 1rem`, `gap: 1.5rem`
- **No Horizontal Scroll:** All elements fit within viewport
- **Typography Scaling:** Headlines scale via `clamp()`, body minimum `1rem`
- **Touch Targets:** 44px minimum, generous spacing
- **Navigation:** Desktop sidebar → mobile overlay (GSAP slide-in)
- **Testing Viewports:** 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px (small laptop), 1440px (desktop)

## 8. Motion & Interaction

### Physics Engine
- **Spring-based:** `stiffness: 100, damping: 20` (GSAP `ease-spring`)
- **No linear easing** — premium, weighty feel on all interactive elements
- **Emil's ease-out:** `cubic-bezier(0.23, 1, 0.32, 1)` for UI interactions

### Perpetual Micro-Interactions
- **Nav icons:** Scale 1.12 on hover (spring physics)
- **Buttons:** Scale 0.97 on active (tactile push)
- **Cards:** translateY(-3px) on hover with shadow elevation
- **Stat cards:** translateY(-3px) on hover

### Staggered Orchestration
- **Lists and grids:** Mount with cascaded delays (35ms between items)
- **Sidebar nav:** GSAP stagger on mobile open (35ms delay)
- **Dashboard sections:** Fade-up entrance with stagger

### Layout Transitions
- **Page navigation:** GSAP fade-up on route change
- **Sidebar open/close:** GSAP slide + stagger on mobile

### Hardware Rules
- **Animate ONLY `transform` and `opacity`** — never `top`, `left`, `width`, `height`
- **Grain/noise filters:** Fixed, pointer-events-none pseudo-elements

### Reduced Motion
- **prefers-reduced-motion:** Keep opacity, remove movement
- **No animation on hover transforms**

## 9. Anti-Patterns (Banned)
- No emojis — anywhere in UI, code, or alt text
- No `Inter` font — use `Geist`, `Geist Mono`
- No `Outfit` font — replaced by Geist
- No generic serif fonts — never in dashboards
- No pure black (#000000) — Off-Black or Zinc-950 only
- No neon outer glows or default box-shadow glows
- No blue glow on card hover — border-color shift only
- No oversaturated accent colors above 80%
- No excessive gradient text on large headers
- No custom mouse cursors
- No overlapping elements — clean spatial separation always
- No 3-column equal card layouts — use 2x2 grids or asymmetric
- No centered Hero sections (not applicable for ERP)
- No filler UI text: "No data found" — show guidance instead
- No generic names: use real equipment/ticket terminology
- No fake round numbers: use organic data
- No fabricated data or statistics — use placeholder labels if needed
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No broken image links — use SVG avatars or initials
- No `z-index` spam — use only for Navbar, Modal, Overlay contexts
- No `h-screen` — always `min-h-screen` or `min-h-[100dvh]`
- No circular loading spinners — skeletal shimmer only
- No global `h1/h2/h3` color overrides — use Tailwind utilities instead
- No `text-white` on elements inside themed containers — use semantic colors
