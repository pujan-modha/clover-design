import type { ElementData, ElementSelector } from "./types";

export interface HostMessage {
  source: "designforge-host";
  type: string;
  data?: Record<string, unknown>;
}

export interface CanvasMessage {
  source: "designforge-canvas";
  type: string;
  data?: Record<string, unknown>;
}

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
        const classes = current.className.split(/\s+/).filter(Boolean);
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

  /** Extract full computed styles for inspector */
  function getComputedStyles(el) {
    const cs = window.getComputedStyle(el);
    const styles = {};
    const keys = [
      'color','backgroundColor','fontSize','fontFamily','fontWeight','lineHeight',
      'letterSpacing','textAlign','textTransform','padding','margin','borderRadius',
      'border','borderWidth','borderColor','borderStyle','display','flexDirection',
      'alignItems','justifyContent','gap','width','height','minWidth','minHeight',
      'maxWidth','maxHeight','position','top','left','right','bottom',
      'zIndex','opacity','boxShadow','transform','overflow','whiteSpace',
      'cursor','pointerEvents','visibility'
    ];
    for (const key of keys) {
      styles[key] = cs[key];
    }
    return styles;
  }

  /** Build DOM tree snapshot for selected element */
  function getDomTree(el) {
    function nodeInfo(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        return text ? { type: 'text', text: text.slice(0, 60) } : null;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const info = {
        tag: node.tagName.toLowerCase(),
        id: node.id || undefined,
        classes: node.className && typeof node.className === 'string'
          ? node.className.split(/\s+/).filter(Boolean).slice(0, 4)
          : undefined,
        children: [],
        selector: getSelector(node),
      };
      // Limit depth and breadth
      if (node.children.length <= 8) {
        for (const child of node.children) {
          const childInfo = nodeInfo(child);
          if (childInfo) info.children.push(childInfo);
        }
      } else {
        info.children = [{ type: 'text', text: '(' + node.children.length + ' children)' }];
      }
      return info;
    }

    // Return tree from body down to selected element + its children
    const tree = nodeInfo(document.body);
    const selectedTree = nodeInfo(el);
    return { tree, selectedTree };
  }

  function send(type, data) {
    window.parent.postMessage({ source: 'designforge-canvas', type, data }, '*');
  }

  function selectElement(el) {
    selectedEl = el;
    if (!highlightBox) highlightBox = createBox('#c96442');
    document.body.appendChild(highlightBox);
    updateBox(highlightBox, el);

    const tree = getDomTree(el);
    const attributes = [];
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-df-') || attr.name === 'class' || attr.name === 'id' || attr.name === 'style') {
        attributes.push({ name: attr.name, value: attr.value });
      }
    }

    send('ELEMENT_SELECTED', {
      selector: getSelector(el),
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.slice(0, 200) || '',
      html: el.outerHTML.slice(0, 1000),
      styles: getComputedStyles(el),
      rect: el.getBoundingClientRect(),
      attributes: attributes,
      breadcrumb: getBreadcrumb(el),
      domTree: tree.selectedTree,
      parentTree: tree.tree,
    });
  }

  function getBreadcrumb(el) {
    const crumbs = [];
    let current = el;
    while (current && current !== document.body) {
      let name = current.tagName.toLowerCase();
      if (current.id) name += '#' + current.id;
      else if (current.className && typeof current.className === 'string') {
        const firstClass = current.className.split(/\s+/).filter(Boolean)[0];
        if (firstClass) name += '.' + firstClass;
      }
      crumbs.unshift(name);
      current = current.parentElement;
    }
    return crumbs;
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
      if (hoverEl) {
        send('ELEMENT_LEAVE', { selector: getSelector(hoverEl) });
        hoverEl = null;
      }
      return;
    }
    if (el === hoverEl) { updateBox(hoverBox, el); return; }
    if (hoverEl) send('ELEMENT_LEAVE', { selector: getSelector(hoverEl) });
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
          // Re-send updated computed styles
          send('ELEMENT_SELECTED', {
            selector: getSelector(selectedEl),
            tag: selectedEl.tagName.toLowerCase(),
            text: selectedEl.textContent?.slice(0, 200) || '',
            html: selectedEl.outerHTML.slice(0, 1000),
            styles: getComputedStyles(selectedEl),
            rect: selectedEl.getBoundingClientRect(),
            attributes: Array.from(selectedEl.attributes).map(a => ({ name: a.name, value: a.value })),
            breadcrumb: getBreadcrumb(selectedEl),
            domTree: getDomTree(selectedEl).selectedTree,
            parentTree: getDomTree(selectedEl).tree,
          });
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
      case 'SCAN_TARGETS':
        const targets = [];
        document.querySelectorAll('[data-df-id], [data-screen-label]').forEach(function(el) {
          const r = el.getBoundingClientRect();
          targets.push({
            selector: getSelector(el),
            tag: el.tagName.toLowerCase(),
            label: el.dataset.dfId || el.dataset.screenLabel || '',
            text: el.textContent?.slice(0, 60) || '',
            rect: { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height },
            htmlHint: el.outerHTML.slice(0, 180),
          });
        });
        send('SCAN_TARGETS_RESULT', { targets });
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
        const classes = current.className.split(/\s+/).filter(Boolean);
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
  let rafId = null;
  function scheduleRectUpdate() {
    if (rafId) return;
    rafId = requestAnimationFrame(function() {
      rafId = null;
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
    });
  }

  window.addEventListener('scroll', scheduleRectUpdate, { passive: true });
  window.addEventListener('resize', scheduleRectUpdate, { passive: true });

  // Also keep the interval as fallback
  setInterval(scheduleRectUpdate, 500);

  window.__designforgeReady = true;
})();
`;

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

export function injectCanvasScripts(doc: Document): void {
  const script = doc.createElement("script");
  script.textContent = CANVAS_INJECTOR_SCRIPT;
  doc.head.appendChild(script);
}
