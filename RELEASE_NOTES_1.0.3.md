# Release Notes - v1.0.3

## 🚀 Enhancements & UI Improvements

### 🌍 Internationalization (i18n)
- **Full Vietnamese Support**: Extensive updates to Internationalize all Goal-related pages and components.
- **Goals Page**: All hardcoded text strings in Goal Overview, Details, and Allocation views have been moved to translation files.

### 🎯 Goal Management
- **Goal Details Page**:
  - **Projected Values**: Fixed alignment between the "Projected Future Value" card and the chart data.
  - **Visualization**: Updated chart usage to correctly display "Start" and "End" dates on the X-axis.
  - **Monthly Investment**: Replaced static values with dynamic calculation for "Monthly/Daily Investment" required calculations.
  - **Allocations**:
    - **Edit Modal**: Refactored the "Edit Allocation" experience, including prefilling existing values and separating "Amount" vs "Percentage" inputs.
    - **Table Improvements**: Fixed `NaN` display issues and ensured User's preferred currency symbol is used throughout.
    - **Navigation**: Moved "Settings" button to the table header for better accessibility.

### 📊 Dashboard & Tracking
- **Goal Progress**: Improved logic for "Ongoing", "Not Started", and "Overdue" statuses based on strict date comparisons.
- **Trading & Income**:
  - **Dividends**: "Include dividends in performance" is now enabled by default.
  - **Layout**: Relocated time selectors and activity buttons for better UX flow.
  - **Visuals**: Enhanced color schemes for Income charts in light mode.

## 🐛 Bug Fixes
- **Calculations**: Fixed logic for "Available Balance" incorrectly showing as 0 in allocation modals.
- **Sorting**: Set default sort order for "Days Held" to ascending in Asset Lots view.
- **UI Interaction**: Replaced native browser `confirm()` dialogs with custom UI components for deleting allocations.
