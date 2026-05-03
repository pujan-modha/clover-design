---
name: saas-landing
description: |
  Hero / features / pricing / CTA marketing layout. High-conversion
  landing page structure with social proof and clear value prop.triggers:
  - "saas landing"
  - "landing page"
  - "marketing site"
  - "product page"
  - "pricing page"
---

# SaaS Landing Skill

Produce a high-conversion SaaS landing page.

## Section Rhythm

1. **Hero** — value prop + primary CTA + social proof
2. **Logos** — "Trusted by" row (6–8 grayscale logos)
3. **Features** — 3–6 feature cards with icons
4. **How it works** — 3-step numbered process
5. **Social proof** — quote + avatar + metrics
6. **Pricing** — 3 tiers, middle one highlighted
7. **FAQ** — accordion, 4–6 questions
8. **Final CTA** — same as hero, urgency hook
9. **Footer** — links + newsletter

## Tweaks

```html
<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroStyle": "gradient",
  "ctaColor": "#c96442",
  "showPricing": true,
  "showLogos": true,
  "testimonialCount": 1
}/*EDITMODE-END*/;
</script>
```

## Hard rules

- **One H1** — hero headline only
- **CTA above fold** — primary button visible without scroll
- **Social proof within 2 screens** — build trust fast
- **Pricing has monthly toggle** — even if only annual shown
- **Footer has email capture** — secondary conversion path
