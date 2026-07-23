---
name: Cosmic Intellectual Horizon
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c5c6ce'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8f9098'
  outline-variant: '#44474d'
  surface-tint: '#b7c7eb'
  primary: '#b7c7eb'
  on-primary: '#21304d'
  primary-container: '#0d1e3a'
  on-primary-container: '#7786a8'
  inverse-primary: '#4f5e7e'
  secondary: '#ffb68f'
  on-secondary: '#542100'
  secondary-container: '#994200'
  on-secondary-container: '#ffc9ae'
  tertiary: '#faba74'
  on-tertiary: '#492900'
  tertiary-container: '#301900'
  on-tertiary-container: '#b27b3c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#b7c7eb'
  on-primary-fixed: '#0a1b37'
  on-primary-fixed-variant: '#374765'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb68f'
  on-secondary-fixed: '#331100'
  on-secondary-fixed-variant: '#773200'
  tertiary-fixed: '#ffdcbc'
  tertiary-fixed-dim: '#faba74'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#683d00'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system for this academy bridges the gap between scientific wonder and academic rigor. The visual direction is **Futuristic & Professional**, utilizing a dark-mode first approach that evokes the vastness of the cosmos while maintaining the structured feel of a high-end educational institution. 

The brand personality is "The Modern Explorer": intellectual, courageous, and visionary. It aims to inspire awe in students (Gen Z/Alpha) through cinematic visuals while providing parents with a sense of security and institutional excellence. The aesthetic avoids "cartoonish" space tropes, favoring high-fidelity textures—specifically the Pillars of Creation imagery—and precise, geometric layouts.

## Colors
The palette is rooted in the deep spectrum of a nebula. 
- **Deep Space Navy (#0D1E3A)**: Acts as the primary surface color, providing a stable, high-contrast base for all content.
- **Warm Amber (#CE6A2C)**: Used for primary calls to action and navigational highlights, echoing the heat of forming stars.
- **Starfield Highlights (#FFBE78)**: A softer glow used for subtle accents, hover states, and data visualizations.
- **Neutral White**: Pure white is reserved for high-legibility body text and critical UI labels to ensure WCAG compliance against the dark background.

Subtle "starfield" textures (fine-grain noise and 1px points) should be applied to the primary background layer at 15% opacity to add depth without distracting from the content.

## Typography
The typography system uses a tri-font strategy to balance the futuristic theme with technical clarity.
- **Space Grotesk (Headlines)**: A geometric sans-serif that captures the "Orbitron" spirit while maintaining better legibility for Turkish characters (ç, ğ, ı, ö, ş, ü).
- **Manrope (Body)**: A clean, modern sans-serif optimized for long-form reading on screens. Its open counters ensure readability for both children and adults.
- **JetBrains Mono (Labels/Technical)**: A monospaced font used for "data" points, course codes, and small metadata to reinforce the scientific, "high-tech" nature of the academy.

All fonts must support the Latin-5 (Turkish) character set.

## Layout & Spacing
The layout follows a **Fluid Grid** model based on an 8px base unit. 
- **Desktop**: A 12-column grid with 24px gutters. Content is centered within a 1280px max-width container.
- **Tablet**: An 8-column grid with 20px gutters.
- **Mobile**: A 4-column grid with 16px margins.

Spacing should be generous to allow the background textures to "breathe," creating a sense of vast space. Use larger vertical padding (80px+) between major sections to emphasize a premium, editorial feel.

## Elevation & Depth
Hierarchy is established through **Glassmorphism** and **Tonal Layers** rather than heavy shadows.
- **Surface Level**: The "Deep Space Navy" background.
- **Container Level**: Semi-transparent overlays (Navy at 60% opacity) with a `20px` backdrop blur. This creates a "cockpit" or "HUD" effect.
- **Interactive Level**: Elements use a subtle inner-glow (1px stroke) in White or Amber at 10% opacity to simulate light catching the edge of a glass panel.
- **Shadows**: When used, shadows are "Ambient Glows"—low-opacity, wide-spread blurs using the `Secondary Warm Amber` color to suggest light emission from nearby "stars."

## Shapes
The shape language is **Rounded**, utilizing a 0.5rem (8px) base radius. This softens the "futuristic" aesthetic to make it feel approachable for families while avoiding the overly "bubbly" look of a primary school. Larger containers like cards should use `rounded-xl` (24px) to create a modern, friendly framing for complex information.

## Components
- **Buttons**: Primary buttons are solid `Warm Amber` with white text. Secondary buttons are "Ghost" style with a 1px white border and backdrop blur.
- **Input Fields**: Dark backgrounds (`#081426`) with a 1px border that glows Amber on focus. Labels use `JetBrains Mono` for a technical feel.
- **Cards**: Use the Glassmorphism style (blurred background). Header sections of cards can feature a cropped segment of the "Pillars of Creation" texture.
- **Chips/Badges**: Small, pill-shaped elements using `JetBrains Mono` text. Use these for difficulty levels or subject tags (e.g., "ASTROFİZİK").
- **Progress Bars**: Represented as "Energy Bars," using a gradient from `Warm Amber` to `Highlight Orange`, appearing to "glow" within their containers.
- **Iconography**: Thin-line (1.5pt) icons with geometric terminals. Icons can occasionally have a small "outer glow" effect in the highlight color.