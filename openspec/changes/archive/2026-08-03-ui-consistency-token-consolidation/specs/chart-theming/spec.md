# Chart Theming — Specification

## Purpose

Make Chart.js instances on the dashboard reactive to dark mode by reading colors from computed CSS custom properties instead of hardcoded hex values, and re-initializing charts when the `.dark` class toggles.

## Requirements

### TC-4: Chart.js Dark Mode Reactivity

The chart initialization in `src/routes/+page.svelte` (`initChart()`) MUST read color values from `getComputedStyle(document.documentElement)` instead of hardcoded hex strings:

| Current hardcoded | Replacement |
|-------------------|-------------|
| `borderColor: '#10b981'` (emerald) | `getComputedStyle(docEl).getPropertyValue('--chart-line-1').trim()` |
| `backgroundColor: 'rgba(16, 185, 129, 0.1)'` | computed var with `alpha-multiplier` pattern or CSS `color-mix()` |
| `borderColor: '#3b82f6'` (blue) | `getComputedStyle(docEl).getPropertyValue('--chart-line-2').trim()` |
| `backgroundColor: 'rgba(59, 130, 246, 0.1)'` | computed var with alpha |
| Tooltip `backgroundColor: '#1f2937'` | `getComputedStyle(docEl).getPropertyValue('--chart-tooltip-bg').trim()` |
| X/Y ticks `color: '#9ca3af'` | `getComputedStyle(docEl).getPropertyValue('--chart-grid-color').trim()` |
| Y grid `color: '#f3f4f6'` | `getComputedStyle(docEl).getPropertyValue('--chart-grid-line').trim()` |

New CSS variables MUST be defined in `layout.css` under `:root` and `.dark`:

```
:root {
  --chart-line-1: #10b981;
  --chart-line-2: #3b82f6;
  --chart-tooltip-bg: #1f2937;
  --chart-grid-color: #9ca3af;
  --chart-grid-line: #f3f4f6;
}
.dark {
  --chart-line-1: #34d399;
  --chart-line-2: #60a5fa;
  --chart-tooltip-bg: #1a1a2e;
  --chart-grid-color: #666;
  --chart-grid-line: #333;
}
```

The `$effect` in `+page.svelte` that calls `initChart()` MUST depend on a reactive source that changes when dark mode toggles. The system MAY use a `MutationObserver` on `<html>` watching for `.dark` class changes, or a reactive Svelte store (`$page.data.darkMode` or a `$state` flag). On class change, the chart MUST be destroyed and re-initialized.

#### Scenario: Chart renders with correct colors in light mode

- GIVEN a user views the dashboard in light mode
- WHEN the chart renders
- THEN the line colors MUST match `--chart-line-1` and `--chart-line-2` from the `:root` block
- AND the tooltip background MUST match `--chart-tooltip-bg`

#### Scenario: Chart updates when dark mode toggles

- GIVEN a user toggles dark mode while the chart is visible
- WHEN the `.dark` class is added to `<html>`
- THEN the chart MUST be destroyed and re-initialized within 150ms
- AND the new colors MUST match the `.dark` variant of `--chart-line-1`, `--chart-line-2`, etc.

#### Scenario: Chart is not destroyed unnecessarily

- GIVEN a `MutationObserver` watches for `.dark` changes
- WHEN any attribute OTHER than `class` changes on `<html>`
- THEN the chart MUST NOT be re-initialized
- AND the chart reference MUST remain valid