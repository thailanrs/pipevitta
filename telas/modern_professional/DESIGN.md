---
name: Modern Professional
colors:
  surface: '#f9f9ff'
  surface-dim: '#d7dae3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fc'
  surface-container: '#ebedf7'
  surface-container-high: '#e6e8f1'
  surface-container-highest: '#e0e2eb'
  on-surface: '#181c22'
  on-surface-variant: '#414753'
  inverse-surface: '#2d3037'
  inverse-on-surface: '#eef0fa'
  outline: '#717785'
  outline-variant: '#c1c6d5'
  surface-tint: '#005db8'
  primary: '#005ab4'
  on-primary: '#ffffff'
  primary-container: '#0a73e0'
  on-primary-container: '#fefcff'
  inverse-primary: '#aac7ff'
  secondary: '#465f88'
  on-secondary: '#ffffff'
  secondary-container: '#b6d0ff'
  on-secondary-container: '#3f5881'
  tertiary: '#964400'
  on-tertiary: '#ffffff'
  tertiary-container: '#bd5700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458d'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#aec7f7'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#2d476f'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68c'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#763400'
  background: '#f9f9ff'
  on-background: '#181c22'
  surface-variant: '#e0e2eb'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

# Design System: Modern Professional

## Brand & Style
This design system embodies a **Corporate / Modern** aesthetic, focusing on reliability, clarity, and professional balance. It is designed for high-trust environments where information density and clarity are paramount. The style is influenced by Material Design and HIG principles, utilizing a clean, structured approach with subtle depth and a refined color palette to evoke a sense of stability and institutional competence.

## Colors
The color palette provides a professional and trustworthy environment through a blue-centric scheme:

- **Primary (#1275e2):** A confident blue used for key actions and brand identity.
- **Secondary (#5f78a3):** A muted blue-grey for secondary UI elements.
- **Tertiary (#c55b00):** A warm ochre accent for highlights.
- **Neutral (#74777f):** A balanced grey for surfaces and text.

The system defaults to a **light** color mode, ensuring high legibility and a clean workspace.

## Typography
The system uses **Inter** for all typographic roles. Inter is optimized for UI, providing excellent legibility and a modern, neutral tone.

- **Headlines:** Set in Inter with semi-bold to bold weights for clear hierarchy.
- **Body:** Inter regular, optimized with a 1.5x line height for comfortable reading.
- **Labels:** Inter medium with slightly increased letter spacing for functional clarity at small sizes.

## Layout & Spacing
We employ a fluid grid system based on an 8px scale.
- **Gutter:** 16px
- **Margin:** 24px
- **Multiplier:** 2

The layout adapts from a 12-column desktop view to a 4-column mobile view, maintaining consistent spatial rhythm through the application of the base spacing units.

## Elevation & Depth
Visual hierarchy is conveyed through **Tonal Layers** and **Ambient Shadows**. By using slightly different surface colors for containers and soft, diffused shadows for floating elements (like modals or dropdowns), we create a clear sense of stack order without cluttering the interface with heavy borders.

## Shapes
The interface uses a **Rounded** shape language (`roundedness: 2`).
- **Standard elements:** 0.5rem (8px) corner radius.
- **Large elements (Cards):** 1rem (16px) corner radius.
- **Extra large elements:** 1.5rem (24px) corner radius.

This softening of corners provides a modern, approachable feel while maintaining a professional structure.

## Components
### Buttons
Buttons are the primary interaction point. They feature 8px rounded corners. Primary buttons use the #1275e2 blue, while secondary buttons use the #5f78a3 grey or a low-contrast outline.

### Cards
Cards are used to group related information. They feature a 16px corner radius and a very subtle ambient shadow to lift them from the background surface.

### Input Fields
Inputs use a 1px neutral border with an 8px radius. On focus, the border transitions to the primary blue color with a subtle outer glow.

### Chips & Tags
Chips are used for filtering and metadata. They have a high degree of roundedness (pill-shaped) to distinguish them from actionable buttons.