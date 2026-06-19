---
name: TrustFlow Healthcare
colors:
  surface: '#f9f9ff'
  surface-dim: '#d5dae7'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e9eefc'
  surface-container-high: '#e4e8f6'
  surface-container-highest: '#dee2f0'
  on-surface: '#171c25'
  on-surface-variant: '#424751'
  inverse-surface: '#2b303b'
  inverse-on-surface: '#ecf0fe'
  outline: '#737782'
  outline-variant: '#c3c6d2'
  surface-tint: '#2d5ea5'
  primary: '#002d60'
  on-primary: '#ffffff'
  primary-container: '#004389'
  on-primary-container: '#87b2ff'
  inverse-primary: '#aac7ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#9af2c5'
  on-secondary-container: '#0c714d'
  tertiary: '#4f2100'
  on-tertiary: '#ffffff'
  tertiary-container: '#723200'
  on-tertiary-container: '#f89c63'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#06468c'
  secondary-fixed: '#9df4c8'
  secondary-fixed-dim: '#81d8ad'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68c'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#753402'
  background: '#f9f9ff'
  on-background: '#171c25'
  surface-variant: '#dee2f0'
  whatsapp-green: '#25d366'
  mint-bg: '#d1fae5'
  soft-bg-gradient-start: '#f9f9ff'
  soft-bg-gradient-end: '#f1f3fc'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
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
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-sm-mobile:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 16px
  margin-mobile: 20px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 40px
  touch-target-min: 48px
---

## Brand & Style

TrustFlow is a high-fidelity design system tailored for secure, healthcare-adjacent user journeys. The brand personality is **reliable, clinical yet warm, and technologically advanced**. It leverages a **Corporate Modern** aesthetic with subtle **Soft-Gradient** influences to reduce user anxiety during sensitive flows like identity verification.

The visual style is characterized by:
- **Clarity and Precision**: Sharp typography and generous whitespace to ensure critical information is easily digestible.
- **Security Signalling**: Use of soft mint greens and deep blues to evoke feelings of safety and institutional trust.
- **Micro-interactions**: Subtle animations (like the pulse effect) to guide user focus without causing distraction.

## Colors

The palette is rooted in a deep "Fidelity Blue" (#004389) that serves as the primary anchor for actions and branding.

- **Primary**: Used for high-emphasis actions and core branding. 
- **Secondary**: A clinical forest green reserved for success states, security indicators, and verified badges.
- **Surface**: The system uses a multi-layered surface approach. A background gradient (`soft-bg-gradient`) provides a sophisticated backdrop for the "Lowest" surface containers (pure white) which house the main interaction cards.
- **Feedback**: A high-contrast "Error Red" is used sparingly for fraud alerts and critical warnings to ensure they break through the calm blue/green environment.

## Typography

The system utilizes **Inter** exclusively to maintain a utilitarian and professional feel. 

- **Headlines**: Use heavy weights (600-700) and negative letter spacing at larger sizes to create a modern, compact "tight" look.
- **Mono-spaces**: While not in the global tokens, specific data entry points (like phone numbers) should use semi-bold weights to improve character recognition.
- **Hierarchy**: Information density is managed by transitioning from `body-md` for secondary instructions to `label-lg` for interactive text and buttons.

## Layout & Spacing

TrustFlow employs a **contextual layout model** with a strong vertical rhythm. 

- **The Stack**: Content is organized in vertical clusters (Stacks). Small stacks (12px) group related text and labels. Medium stacks (24px) separate distinct functional blocks like the OTP input and the timer.
- **Safe Margins**: Mobile layouts require a minimum 20px horizontal margin.
- **Centering**: Transactional screens (Verification, Login) should use centered alignments for primary content to focus the user's eye on the input task.
- **Top Bar**: A fixed 64px (h-16) header provides consistent navigation context without encroaching on the content area.

## Elevation & Depth

Hierarchy is established through a combination of **Ambient Shadows** and **Tonal Layers**.

- **Level 0 (Background)**: Uses a soft linear gradient to create a sense of infinite depth.
- **Level 1 (Cards)**: High-elevation surfaces (shadow-xl) with large corner radii appear to "float" above the background. This is the primary interaction layer.
- **Level 2 (Active States)**: Interactive elements like active OTP boxes use a high-contrast 2px border rather than shadow to indicate focus, ensuring clarity during high-intensity tasks.
- **Sub-surfaces**: Information boxes (Security Footer) use a semi-transparent backdrop blur (`glassmorphism`) to feel integrated into the background while remaining distinct.

## Shapes

The shape language is highly approachable, utilizing **exaggerated corner radii** for primary containers and **pill-shapes** for action elements.

- **Main Containers**: Use a 32px radius to create a soft, friendly "encapsulated" feel.
- **Inputs & Smaller Cards**: Use a 12px (xl) radius.
- **Buttons**: All primary and secondary buttons must be fully rounded (pill-shaped) to maximize the "friendly" brand attribute and differentiate them from input fields.

## Components

### Buttons
- **Primary**: Pill-shaped, 56px height (h-14), using `primary` background and `on-primary` text. Always includes a relevant icon for accessibility.
- **Ghost/Text**: Used for secondary actions (e.g., "Resend"). Uses `primary` text with no background, appearing as `label-lg`.

### Input Fields (OTP)
- **Grid Layout**: 6-digit grid with 8px gaps.
- **Active State**: 2px border in `primary-container` with a blinking cursor animation.
- **Filled State**: Light grey background (`surface-container-low`) with `outline-variant` border to distinguish from active/empty states.

### Cards
- **Transaction Card**: Large 32px rounded container, white background, with heavy shadow.
- **Security Footer**: Semi-transparent (white/60) with a `backdrop-blur` and a thin `outline-variant` border.

### Status Indicators
- **Pulse Icon**: Icons representing the delivery method (e.g., WhatsApp) should be encased in a 56px circular container with a soft-tinted pulse animation to indicate "active processing."