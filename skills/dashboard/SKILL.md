---
name: dashboard
description: |
  Admin / analytics dashboard with sidebar + dense data layout.
  Tables, charts, KPI cards, filters, pagination.triggers:
  - "dashboard"
  - "admin panel"
  - "analytics"
  - "data table"
  - "back office"
---

# Dashboard Skill

Produce a dense, functional admin dashboard. Sidebar navigation + main content area with data tables, KPI cards, and chart placeholders.

## Structure

```
dashboard/
├── sidebar (200px fixed, collapsible on mobile)
│   ├── Logo / brand
│   ├── Nav sections (Dashboard, Users, Orders, Analytics, Settings)
│   └── User profile at bottom
└── main
    ├── Header (breadcrumb + search + notifications + profile)
    ├── KPI row (4 cards: revenue, users, conversion, churn)
    ├── Chart area (placeholder for chart library)
    ├── Data table (sortable headers, pagination, row actions)
    └── Footer
```

## Tweaks (add to every dashboard)

```html
<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "sidebarWidth": 200,
  "dataDensity": "comfortable",
  "chartType": "line",
  "accentColor": "#3b82f6",
  "showKPIs": true
}/*EDITMODE-END*/;
</script>
```

## Hard rules

- **Dense by default** — whitespace is expensive in dashboards
- **Tabular numbers** — `font-variant-numeric: tabular-nums` on all figures
- **Sortable headers** — visual affordance on table headers
- **Row hover states** — every row must highlight on hover
- **Action menus** — ellipsis dropdown on each row
- **Empty states** — designed, not just "no data"
