---
name: Vanguard Vet
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#404944'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#707974'
  outline-variant: '#bfc9c3'
  surface-tint: '#2b6954'
  primary: '#003527'
  on-primary: '#ffffff'
  primary-container: '#064e3b'
  on-primary-container: '#80bea6'
  inverse-primary: '#95d3ba'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#4f1f19'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b342d'
  on-tertiary-container: '#ea9e93'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f0d6'
  primary-fixed-dim: '#95d3ba'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#0b513d'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4a9'
  on-tertiary-fixed: '#380d08'
  on-tertiary-fixed-variant: '#6e372f'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  mono-data:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  sidebar-width: 260px
  sidebar-collapsed: 72px
  container-gap: 24px
  grid-gutter: 16px
  pos-panel-padding: 20px
---

## Brand & Style

This design system is engineered for the high-stakes environment of veterinary pharmaceutical and clinical management. It adopts a **Modern Corporate** aesthetic with a heavy emphasis on **Minimalism** to facilitate rapid data entry and reduce cognitive load during POS transactions. 

The interface prioritizes professional reliability through a structured, clean layout that mimics the precision of medical records. It balances the warmth of veterinary care with the rigorous technical requirements of batch and expiry management. The overall emotional response should be one of competence, efficiency, and clinical clarity.

## Colors

The palette uses a sophisticated **Deep Emerald Green** as the primary brand anchor, signaling health and growth. The **Dark Navy** secondary color provides grounding for navigation and structural elements, while the **Off-White** background ensures that pure white cards pop with clear separation.

- **Primary (#064E3B):** Used for primary actions, active states, and brand highlights.
- **Secondary (#1E293B):** Reserved for sidebar backgrounds and secondary text.
- **Surface (#FFFFFF):** All data containers and POS panels must use a pure white background for maximum contrast.
- **Semantic Palette:** High-saturation status colors are used specifically for critical indicators like "Expired Batch" (Danger) or "Low Stock" (Warning).

## Typography

The design system utilizes **Geist** for its technical precision and exceptional legibility in data-dense environments. A secondary monospace variant is introduced specifically for SKU numbers, batch codes, and currency values in the POS terminal.

- **Headlines:** Use a tighter letter spacing to maintain a modern, "SaaS-native" look.
- **Body Text:** Standardized at 14px for general application use to maximize the amount of information visible on screen without sacrificing readability.
- **Labels:** Use medium weight for form labels and table headers to provide clear visual distinction from the data itself.

## Layout & Spacing

This design system uses a **Fixed-Fluid Hybrid** layout. A fixed, collapsible sidebar handles primary navigation, while the main content area utilizes a fluid 12-column grid.

- **Sidebar:** Collapses to an icon-only view to maximize workspace for large tables.
- **POS Layout:** A two-pane split. The left pane (65% width) handles product search and selection, while the right pane (35% width) acts as the persistent "Checkout/Cart" area.
- **Spacing Rhythm:** Based on a 4px baseline. Use 16px (4 units) for standard padding and 24px (6 units) for section margins.
- **Data Density:** In the inventory and batch management screens, vertical padding in table cells is reduced to 8px to allow more rows to be visible "above the fold."

## Elevation & Depth

To maintain a professional, flat aesthetic, the design system utilizes **Tonal Layers** supplemented by very subtle, large-radius shadows. 

- **Level 0 (Background):** Off-white (#F8FAFC).
- **Level 1 (Cards/Panels):** Pure white with a 1px border (#E2E8F0) and a soft "Ambient Shadow" (0px 4px 12px rgba(0,0,0,0.03)).
- **Level 2 (Modals/Overlays):** Elevated with a more pronounced shadow (0px 12px 24px rgba(0,0,0,0.08)) to focus attention on critical entry tasks like "New Batch Entry."
- **Interactive States:** Buttons do not use shadows; instead, they shift in color value (darken) or use a 2px offset ring on focus.

## Shapes

The shape language is **Soft**. This avoids the "playfulness" of high-radius corners while softening the "harshness" of clinical software.

- **Inputs & Small Buttons:** 0.25rem (4px) corner radius.
- **Cards & POS Panels:** 0.5rem (8px) corner radius.
- **Status Badges (Chips):** Fully rounded (Pill) to differentiate them from interactive buttons.
- **Icons:** Use "Outline" style with a 1.5px or 2px stroke weight to match the Geist typography's line thickness.

## Components

### POS Terminal & Tables
- **Search Bar:** Large, persistent top-mounted bar with an integrated barcode scanner icon.
- **Data Tables:** Zebra-striping is discouraged. Use thin 1px horizontal dividers only. Batch expiry dates should be highlighted with semantic colored dots (Green = Fresh, Amber = Near Expiry, Red = Expired).
- **Batch Selection:** A specialized dropdown or modal that displays "Expiry Date" and "Stock Level" as sub-text for each selectable batch.

### Buttons & Inputs
- **Primary Button:** Deep Emerald Green with white text. High contrast for "Complete Sale."
- **Ghost Buttons:** Used for secondary actions like "Add Discount" or "Print Receipt."
- **Inputs:** Use a 1px border (#CBD5E1) that thickens and changes to Primary Green on focus. Labels must be persistent (not floating) to ensure clarity during fast entry.

### Notifications & Feedback
- **Toast Messages:** Used for "Transaction Successful" or "Inventory Updated." Positioned at the top-right.
- **Alerts:** Inline alerts for "Stock Out" warnings within the POS cart.

### Dashboard Cards
- **Stat Cards:** Clean white surfaces with high-contrast numerical values (Geist Mono) and a small sparkline trend indicator in the corner.