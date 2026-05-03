---
name: tweaks
description: |
  AI-emitted tweak controls panel. The model surfaces parameters worth
  nudging — color, spacing, typography, density — so the user can
  refine without another full prompt. Pure frontend + localStorage.triggers:
  - "tweak"
  - "adjust"
  - "variant"
  - "parameter"
  - "tweak panel"
---

# Tweaks Skill · 设计变体实时调参

Add tweak controls to any design so users can adjust parameters without editing code.

## When to add Tweaks

- User asks for "adjustable parameters" or "multiple versions"
- Design has clear variations worth exploring
- Even if not asked, add 2–3 tweaks to every design — it shows possibility space

## Implementation

Add this block to your HTML's `<script>`:

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

let tweakState = { ...TWEAK_DEFAULTS };
try {
  const stored = localStorage.getItem('designforge-tweaks');
  if (stored) tweakState = { ...tweakState, ...JSON.parse(stored) };
} catch(e) {}

function applyTweaks() {
  const root = document.documentElement;
  Object.entries(tweakState).forEach(([key, val]) => {
    root.style.setProperty('--tweak-' + key, String(val));
  });
}

window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'designforge:tweaks:update') {
    tweakState = { ...tweakState, ...e.data.tokens };
    try { localStorage.setItem('designforge-tweaks', JSON.stringify(tweakState)); } catch(e) {}
    applyTweaks();
  }
});

applyTweaks();
</script>
```

Use variables in CSS:
```css
.cta-button {
  background: var(--tweak-primaryColor, #c96442);
  font-size: var(--tweak-fontSize, 16px);
}
body {
  padding: var(--tweak-density, comfortable) === 'compact' ? '8px' : '24px';
}
```

## Typical Tweak Options

### Universal
- Primary color (color picker)
- Font size (slider 12–24px)
- Dark mode (toggle)

### Landing page
- Hero style (image / gradient / pattern / solid)
- CTA variant
- Layout (single / two column / sidebar)

### Product prototype
- Layout variant (A / B / C)
- Animation speed (0.5x–2x)
- Data density (5 / 20 / 100 mock items)
- State (empty / loading / success / error)

## Design principles

1. **Meaningful options** — discrete variations, not continuous sliders for things that look bad at intermediate values
2. **Max 5–6 options** — more becomes a config page
3. **Defaults are shippable** — tweaks are exploration, not required fixes
4. **Group by category** — Visual / Layout / Content
