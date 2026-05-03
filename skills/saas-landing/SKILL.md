---
name: saas-landing
description: |
  Single-page SaaS landing with hero, features, social proof, pricing, and CTA.
triggers:
  - "saas landing"
  - "saas"
  - "marketing page"
  - "product landing"
  - "startup landing"
df:
  mode: prototype
  platform: desktop
  scenario: marketing
  preview:
    type: html
    entry: index.html
  design_system:
    requires: true
---

# SaaS Landing Skill

## Sections (in order)
1. **Hero** — logo, headline, subhead, primary + secondary CTA.
2. **Features** — 3–6 tiles (icon, title, 1–2 sentences).
3. **Social proof** — logos/testimonials (skip if user says none).
4. **Pricing** — 2–3 tiers (skip if not requested).
5. **Footer CTA** — accent band, one button.
6. **Footer** — links + copyright.

## Rules
- All colors from DESIGN.md tokens.
- Accent: once in hero, once in footer CTA, links.
- `data-df-id` on every editable element.
- Responsive at 1440w/768w/375w.

## Output
Single `index.html`. No separate CSS/JS files.
