---
name: dashboard
description: |
  Admin / analytics dashboard. Fixed sidebar, top bar, KPI cards, inline SVG charts.
triggers:
  - "dashboard"
  - "admin panel"
  - "analytics"
  - "control panel"
df:
  mode: prototype
  platform: desktop
  scenario: operations
  preview:
    type: html
    entry: index.html
  design_system:
    requires: true
---

# Dashboard Skill

## Layout
- **Left sidebar** (220–260px): brand, 6–8 nav links, active uses accent.
- **Top bar**: title left, search + avatar right.
- **Main**:
  - Row 1: 3–4 KPI cards (label + big number + delta).
  - Row 2: primary inline SVG chart (line/bar/area).
  - Row 3: secondary chart or recent-events table.

## Rules
- Inline SVG charts only — no JS libraries.
- Every color from DESIGN.md.
- Accent ≤2× (sidebar active + one highlight).
- Sidebar + top bar sticky; main scrolls independently.
- `data-df-id` on each region.
