---
name: web-prototype
description: |
  General-purpose desktop web prototype. Single self-contained HTML file.
  Default for any landing / marketing / docs / SaaS page.
triggers:
  - "prototype"
  - "mockup"
  - "landing"
  - "homepage"
  - "marketing page"
---

# Web Prototype Skill

Produce a single, self-contained HTML prototype with good defaults (typography, spacing, accent budget).

## Workflow

### Step 0 — Pre-flight
1. Read the active DESIGN.md if one exists. Map its colors to CSS `:root` variables.
2. Plan the section list before writing.

### Step 1 — Build structure
Create a single HTML file with:
- `<!doctype html>` and responsive meta tags
- CSS in `<style>` using CSS custom properties for tokens
- Semantic HTML structure

### Step 2 — Add Tweaks (MANDATORY)
After the design is complete, add tweak controls so the user can adjust parameters:

```html
<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primaryColor": "#c96442",
  "fontSize": 16,
  "density": "comfortable",
  "dark": false
}/*EDITMODE-END*/;

const TWEAK_SCHEMA = /*EDITMODE-BEGIN*/{
  "primaryColor": { "kind": "color" },
  "fontSize": { "kind": "number", "min": 12, "max": 24, "step": 1, "unit": "px" },
  "density": { "kind": "enum", "options": ["compact", "comfortable", "spacious"] },
  "dark": { "kind": "boolean" }
}/*EDITMODE-END*/;
</script>
```

Use CSS variables in your design: `background: var(--tweak-primaryColor, #c96442);`

### Step 3 — Self-check
- Single accent, used at most twice per screen
- Mobile reflow works at 768px
- No external CDN dependencies (fonts OK from Google Fonts)
- All images are data URIs or inline SVG placeholders

### Step 4 — Emit
Wrap in `<artifact>` tags. One sentence before describing what's there.

## Hard rules

- **Single accent budget** — eyebrow + primary CTA only
- **Display font is serif** (Georgia / Iowan / Charter). Sans for body. Mono for captions.
- **Image placeholders, not external URLs**
- **Mobile reflow already works** via media query at 768px
- **Every section has `data-df-id`** so comment mode can target it
