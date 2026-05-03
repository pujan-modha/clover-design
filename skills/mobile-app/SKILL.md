---
name: mobile-app
description: |
  iPhone / Android framed app prototype. Pixel-accurate device chrome
  with status bar, home indicator, and safe areas.triggers:
  - "mobile app"
  - "iOS prototype"
  - "Android prototype"
  - "phone screen"
  - "app mockup"
---

# Mobile App Skill

Produce framed mobile app prototypes with pixel-accurate device chrome.

## Device Frame

Use this exact structure for the iPhone frame:

```html
<div class="device-frame" style="width:393px;height:852px;border-radius:55px;border:12px solid #1a1a1a;position:relative;overflow:hidden;background:#fff;">
  <!-- Dynamic Island -->
  <div style="position:absolute;top:11px;left:50%;transform:translateX(-50%);width:126px;height:37px;background:#1a1a1a;border-radius:20px;z-index:10;"></div>
  <!-- Status bar -->
  <div style="position:absolute;top:0;left:0;right:0;height:54px;z-index:5;display:flex;align-items:flex-end;justify-content:space-between;padding:0 30px 8px;font-size:14px;font-weight:600;">
    <span>9:41</span>
    <span>•••</span>
  </div>
  <!-- Screen content -->
  <div class="screen-content" style="height:100%;padding:54px 0 34px;overflow-y:auto;">
    <!-- YOUR CONTENT HERE -->
  </div>
  <!-- Home indicator -->
  <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;background:#1a1a1a;border-radius:3px;"></div>
</div>
```

## Tweaks

```html
<script>
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "device": "iphone",
  "theme": "light",
  "contentDensity": "comfortable",
  "showStatusBar": true
}/*EDITMODE-END*/;
</script>
```

## Hard rules

- **Safe area**: content must not overlap Dynamic Island or Home Indicator
- **Touch targets**: minimum 44×44px per Apple HIG
- **Scroll within screen**: `.screen-content` scrolls, not the page
- **Status bar time**: always 9:41 (Apple keynote tradition)
- **No page scroll**: the device frame itself is fixed on the page
