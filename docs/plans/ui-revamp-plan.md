# UI Revamp Plan: Modern Fintech Aesthetic

## 1. Vision & Visual Identity
The goal is to transform "WealthFolio" from its current earthy "Flexoki" theme to a **Modern Fintech** aesthetic. This design language emphasizes trust, precision, speed, and a premium user experience commonly found in top-tier financial tools (e.g., Linear, Mercury, Robinhood).

### Core Design Pillars
*   **Premium & Clean**: High contrast, crisp lines, and refined whitespace.
*   **Depth & Glass**: Subtle localized glassmorphism (frosted glass) used for depth hierarchy, not overwhelming the content.
*   **Vibrant Data**: Data is the star. Charts and numbers use distinct, vibrant colors against deep/neutral backgrounds.
*   **Motion**: Smooth, subtle micro-interactions that make the app feel "alive" and responsive.

## 2. Design System Specifications

### Typography
*   **Primary (UI)**: **Inter** (Google Font). The gold standard for modern UI. Clean, legible, and neutral.
*   **Secondary (Data)**: **JetBrains Mono** or **IBM Plex Mono**. Used strictly for financial data (prices, percentages, balances) to align visually.
*   **Hierarchy**:
    *   Headings: Bold, tights tracking (letter-spacing: -0.02em).
    *   Body: Regular, normal tracking.
    *   Captions/Labels: Medium/Semi-bold, slightly wide tracking for uppercase.

### Color Palette

#### Dark Mode (The "Deep Space" Theme)
*   **Background**: Deep Slate / Navy (`#020617` or `#0B0E14`). cooler and richer than standard gray.
*   **Surface/Cards**: Slightly lighter navy with subtle borders (`#111827` + Border `#1E293B`).
*   **Text**: White (`#F8FAFC`) for primary, Blue-Gray (`#94A3B8`) for secondary.

#### Light Mode (The "Clean Sheet" Theme)
*   **Background**: Crisp White (`#FFFFFF`) or faintly cool gray (`#F8FAFC`).
*   **Surface/Cards**: White with soft drop shadows and faint gray borders.
*   **Text**: Deep Slate (`#0F172A`) for primary, Slate (`#64748B`) for secondary.

#### Accents (Functional Colors)
*   **Primary**: **Vibrant Indigo** (`#6366F1`) or **Electric Blue** (`#3B82F6`).
*   **Success (Up)**: **Emerald** (`#10B981`) - distinct from text, glowing in dark mode.
*   **Danger (Down)**: **Rose** (`#F43F5E`) - purely for negative trends/errors.
*   **Warning**: **Amber** (`#F59E0B`).

### UI Elements
*   **Cards**:
    *   **Dark**: Dark background, thin 1px border (color-mix transparent), subtle inner glow.
    *   **Light**: White background, very soft diffuse shadow (`shadow-sm` or `shadow-md`), minimal border.
*   **Buttons**:
    *   **Primary**: Solid accent color, slight gradient (top-to-bottom), shadow.
    *   **Secondary**: Transparent/Outlined with hover background.
*   **Inputs**:
    *   Pill-shaped or slightly rounded rect (`rounded-md` -> `rounded-lg`).
    *   Focus states: Distinct ring with accent color opacity.

## 3. Implementation Roadmap

### Phase 1: Foundation (The Styling Engine)
1.  **Dependencies**: Install `@fontsource/inter` (and `@fontsource/jetbrains-mono` if replacing IBM Plex).
2.  **Tailwind Configuration**:
    *   Update `tailwind.config.js` to define the new color tokens (mapped to CSS variables).
    *   Update Font Family definitions.
3.  **Variable Overhaul** (`src/styles.css`):
    *   Replace `Flexoki` HSL values with the new "Modern Fintech" HSL values.
    *   Redefine `--radius` (likely increasing to `0.5rem` or `0.75rem`).
    *   Update `shadcn` semantic mappings (`--background`, `--foreground`, etc.) to point to new palette.

### Phase 2: Core Components & Layout
1.  **Sidebar**:
    *   Update background to match the new deep theme (or semi-transparent glass).
    *   Update active state indicators (glow vs solid block).
2.  **Dashboard Layout**:
    *   Adjust spacing (`gap-4` -> `gap-6`) for a more airy feel.
    *   Update "Widget" containers to use new Card styles.

### Phase 3: Data Visualization
1.  **Charts**: Update Recharts/Chart.js palettes to use the new vibrant colors (`--chart-1` to `--chart-5`).
2.  **Tables**: Design a cleaner table row style (hover effects, crisp borders, monospaced numbers).

### Phase 4: Polish & Motion
1.  **Micro-interactions**: Add `active:scale-95` to buttons.
2.  **Page Transitions**: Ensure smooth fade-in for route changes.
3.  **Glass Effects**: refine `.liquid-glass` for the new dark mode.

## 4. Technical Considerations
*   **CSS Variables**: We will continue using CSS variables for theming to allow instant switching and potential "User Customization" later.
*   **Tailwind v4**: Leverage the new `@theme` block in CSS for cleaner definitions.
*   **Accessibility**: Ensure contrast ratios (especially text on colored backgrounds) meet WCAG AA standards.
