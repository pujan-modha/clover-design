import type { ElementData, ElementSelector } from "./types";

/** Payload for messages sent from the host to the iframe canvas. */
export interface HostMessage {
  source: "designforge-host";
  type: string;
  data?: Record<string, unknown>;
}

/** Payload for messages sent from the iframe canvas back to the host. */
export interface CanvasMessage {
  source: "designforge-canvas";
  type: string;
  data?: Record<string, unknown>;
}

/**
 * Post a message to the iframe's content window.
 *
 * @param iframe - The target iframe element (may be null).
 * @param type - Message type discriminator (e.g. "ENABLE", "UPDATE_STYLE").
 * @param data - Optional payload object.
 */
export function postToCanvas(
  iframe: HTMLIFrameElement | null,
  type: string,
  data?: Record<string, unknown>
): void {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    { source: "designforge-host", type, data },
    "*"
  );
}

/**
 * Injected script that runs inside every preview iframe.
 *
 * Provides three subsystems:
 * 1. **Element selection** — crosshair cursor, hover overlay, click-to-select,
 *    computed-style extraction, and bidirectional messaging with the host.
 * 2. **Tweaks** — listens for `designforge:tweaks:update` postMessages and
 *    applies CSS custom properties in real time. Persists to localStorage.
 * 3. **Comments** — separate cursor mode that posts element metadata back to
 *    the host on click, plus a 500 ms polling loop for live rect tracking so
 *    pins stay glued to their elements across scroll / resize.
 */
export const CANVAS_INJECTOR_SCRIPT = `
(function() {
  'use strict';
  if (window.__dfInjectorLoaded) return;
  window.__dfInjectorLoaded = true;

  let selectionEnabled = false;
  let selectedEl = null;
  let hoverEl = null;
  let highlightBox = null;
  let hoverBox = null;

  function createBox(color) {
    const div = document.createElement('div');
    div.style.cssText =
      'position:absolute;pointer-events:none;z-index:9999;'
      + 'border:2px solid ' + color + ';'
      + 'background:' + color + '08;'
      + 'transition:all 0.08s ease;';
    return div;
  }

  function updateBox(box, el) {
    if (!el || !el.getBoundingClientRect) { box.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    box.style.display = 'block';
    box.style.top = (r.top + window.scrollY) + 'px';
    box.style.left = (r.left + window.scrollX) + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';
  }

  function getSelector(el) {
    const parts = [];
    let current = el;
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      if (current.id) { part += '#' + current.id; parts.unshift(part); break; }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(/\\s+/).filter(Boolean);
        if (classes.length) part += '.' + classes.join('.');
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          part += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function getComputedStyles(el) {
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textAlign: cs.textAlign,
      padding: cs.padding,
      margin: cs.margin,
      borderRadius: cs.borderRadius,
      border: cs.border,
      display: cs.display,
      flexDirection: cs.flexDirection,
      alignItems: cs.alignItems,
      justifyContent: cs.justifyContent,
      gap: cs.gap,
      width: cs.width,
      height: cs.height,
      position: cs.position,
      top: cs.top,
      left: cs.left,
    };
  }

  function send(type, data) {
    window.parent.postMessage({ source: 'designforge-canvas', type, data }, '*');
  }

  function selectElement(el) {
    selectedEl = el;
    if (!highlightBox) highlightBox = createBox('#c96442');
    document.body.appendChild(highlightBox);
    updateBox(highlightBox, el);
    send('ELEMENT_SELECTED', {
      selector: getSelector(el),
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.slice(0, 200) || '',
      html: el.outerHTML.slice(0, 1000),
      styles: getComputedStyles(el),
      rect: el.getBoundingClientRect(),
    });
  }

  function deselect() {
    selectedEl = null;
    if (highlightBox) highlightBox.remove();
    highlightBox = null;
    send('ELEMENT_DESELECTED');
  }

  document.addEventListener('click', function(e) {
    if (!selectionEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) { deselect(); return; }
    if (el === selectedEl) { deselect(); return; }
    selectElement(el);
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!selectionEnabled) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) {
      if (hoverBox) hoverBox.style.display = 'none';
      return;
    }
    if (el === hoverEl) { updateBox(hoverBox, el); return; }
    hoverEl = el;
    if (!hoverBox) hoverBox = createBox('#3b82f6');
    document.body.appendChild(hoverBox);
    updateBox(hoverBox, el);
    send('ELEMENT_HOVERED', { tag: el.tagName.toLowerCase(), selector: getSelector(el) });
  }, { passive: true });

  window.addEventListener('message', function(e) {
    const msg = e.data;
    if (!msg || msg.source !== 'designforge-host') return;

    switch (msg.type) {
      case 'ENABLE':
        selectionEnabled = true;
        document.body.style.cursor = 'crosshair';
        break;
      case 'DISABLE':
        selectionEnabled = false;
        document.body.style.cursor = '';
        deselect();
        if (hoverBox) hoverBox.remove();
        hoverBox = null;
        break;
      case 'UPDATE_STYLE':
        if (selectedEl && msg.data && msg.data.styles) {
          Object.assign(selectedEl.style, msg.data.styles);
          updateBox(highlightBox, selectedEl);
        }
        break;
      case 'UPDATE_TEXT':
        if (selectedEl && msg.data && msg.data.text !== undefined) {
          selectedEl.textContent = msg.data.text;
          send('ELEMENT_TEXT_EDITED', { selector: getSelector(selectedEl), text: msg.data.text });
        }
        break;
      case 'DELETE_ELEMENT':
        if (selectedEl) { selectedEl.remove(); deselect(); }
        break;
      case 'SELECT_BY_SELECTOR':
        if (msg.data && msg.data.selector) {
          try {
            const el = document.querySelector(msg.data.selector);
            if (el) selectElement(el);
          } catch(e) {}
        }
        break;
      case 'GET_HTML':
        send('HTML_CONTENT', { html: document.documentElement.outerHTML });
        break;
      case 'designforge:comments:setMode':
        // Handled by comments subsystem below
        break;
    }
  });

  // === TWEAKS SYSTEM ===
  const TWEAK_DEFAULTS = window.__TWEAK_DEFAULTS__ || {};
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
    window.dispatchEvent(new CustomEvent('designforge:tweaks:update', {
      detail: tweakState
    }));
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'designforge:tweaks:update') {
      tweakState = { ...tweakState, ...e.data.tokens };
      try { localStorage.setItem('designforge-tweaks', JSON.stringify(tweakState)); } catch(e) {}
      applyTweaks();
    }
  });

  applyTweaks();

  // === COMMENTS SYSTEM ===
  let commentMode = false;
  let commentHoverOverlay = null;

  function createCommentHoverOverlay(rect) {
    if (commentHoverOverlay) commentHoverOverlay.remove();
    commentHoverOverlay = document.createElement('div');
    commentHoverOverlay.style.cssText =
      'position:absolute;pointer-events:none;z-index:9998;'
      + 'border:2px solid #3B82F6;'
      + 'background:rgba(59,130,246,0.08);'
      + 'top:' + (rect.top + window.scrollY) + 'px;'
      + 'left:' + (rect.left + window.scrollX) + 'px;'
      + 'width:' + rect.width + 'px;'
      + 'height:' + rect.height + 'px;'
      + 'transition:all 0.1s ease;';
    document.body.appendChild(commentHoverOverlay);
  }

  function removeCommentHoverOverlay() {
    if (commentHoverOverlay) { commentHoverOverlay.remove(); commentHoverOverlay = null; }
  }

  function getCommentElementInfo(el) {
    const rect = el.getBoundingClientRect();
    const parts = [];
    let current = el;
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      if (current.id) { part += '#' + current.id; parts.unshift(part); break; }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(/\\s+/).filter(Boolean);
        if (classes.length) part += '.' + classes.join('.');
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          part += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(part);
      current = current.parentElement;
    }
    return {
      selector: parts.join(' > '),
      tag: el.tagName.toLowerCase(),
      outerHTML: el.outerHTML.slice(0, 800),
      rect: { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height }
    };
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'designforge:comments:setMode') {
      commentMode = e.data.enabled;
      document.body.style.cursor = commentMode ? 'crosshair' : (selectionEnabled ? 'crosshair' : '');
      if (!commentMode) removeCommentHoverOverlay();
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (!commentMode) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) {
      removeCommentHoverOverlay();
      return;
    }
    const rect = el.getBoundingClientRect();
    createCommentHoverOverlay(rect);
  }, { passive: true });

  document.addEventListener('mouseout', function(e) {
    if (!commentMode) return;
    removeCommentHoverOverlay();
  }, { passive: true });

  document.addEventListener('click', function(e) {
    if (!commentMode) return;
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) return;
    const info = getCommentElementInfo(el);
    window.parent.postMessage({ type: 'designforge:comment:clicked', ...info }, '*');
    removeCommentHoverOverlay();
  }, true);

  // === LIVE RECT TRACKING ===
  setInterval(function() {
    if (!window.__LIVE_COMMENT_SELECTORS__) return;
    const rects = {};
    window.__LIVE_COMMENT_SELECTORS__.forEach(function(sel) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          rects[sel] = { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
        }
      } catch(e) {}
    });
    if (Object.keys(rects).length > 0) {
      window.parent.postMessage({ type: 'designforge:comment:liveRects', rects }, '*');
    }
  }, 500);

  window.__designforgeReady = true;
})();
`;

/**
 * Build a CSS selector for an element by walking up the DOM tree.
 *
 * Uses IDs when available, falls back to class + nth-of-type for disambiguation.
 */
export function getElementSelector(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${current.id}`;
      parts.unshift(part);
      break;
    }
    if (current.className && typeof current.className === "string") {
      const classes = current.className.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        part += "." + classes.join(".");
      }
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(" > ");
}

/** Inject the canvas manipulation script into a Document. */
export function injectCanvasScripts(doc: Document): void {
  const script = doc.createElement("script");
  script.textContent = CANVAS_INJECTOR_SCRIPT;
  doc.head.appendChild(script);
}
