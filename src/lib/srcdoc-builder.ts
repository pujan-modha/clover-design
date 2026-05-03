export interface SrcdocOptions {
  html?: string;
  jsx?: string;
  designSystemTokens?: Record<string, any>;
  commentBridge?: boolean;
  tweakBridge?: boolean;
  baseUrl?: string;
}

const SANDBOX_SHIM = `
<script>
(function() {
  // In-memory localStorage/sessionStorage polyfill for sandboxed iframe
  const storage = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem(k) { return storage[k] ?? null; },
      setItem(k, v) { storage[k] = String(v); },
      removeItem(k) { delete storage[k]; },
      clear() { for (const k in storage) delete storage[k]; },
      get length() { return Object.keys(storage).length; },
      key(i) { return Object.keys(storage)[i]; }
    },
    writable: false
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem(k) { return storage[k] ?? null; },
      setItem(k, v) { storage[k] = String(v); },
      removeItem(k) { delete storage[k]; },
      clear() { for (const k in storage) delete storage[k]; },
      get length() { return Object.keys(storage).length; },
      key(i) { return Object.keys(storage)[i]; }
    },
    writable: false
  });
})();
</script>
`;

const COMMENT_BRIDGE = `
<script>
(function() {
  let commentMode = false;
  let targets = [];

  function scanTargets() {
    targets = [];
    document.querySelectorAll('[data-df-id], [data-screen-label]').forEach((el, i) => {
      if (!el.dataset.dfId) el.dataset.dfId = 'df-' + i;
      targets.push({
        id: el.dataset.dfId,
        selector: el.dataset.dfId,
        label: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').slice(0,2).join('.') : ''),
        text: el.textContent?.slice(0, 80) || ''
      });
    });
    parent.postMessage({ type: 'designforge:comment:targets', targets }, '*');
  }

  function enableCommentMode() {
    commentMode = true;
    document.body.style.cursor = 'crosshair';
    scanTargets();
  }

  function disableCommentMode() {
    commentMode = false;
    document.body.style.cursor = '';
  }

  document.addEventListener('click', function(e) {
    if (!commentMode) return;
    const el = e.target.closest('[data-df-id], [data-screen-label]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    parent.postMessage({
      type: 'designforge:comment:clicked',
      selector: el.dataset.dfId || el.dataset.screenLabel,
      tag: el.tagName.toLowerCase(),
      outerHTML: el.outerHTML.slice(0, 2000),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    if (e.data?.type === 'designforge:comments:setMode') {
      e.data.enabled ? enableCommentMode() : disableCommentMode();
    }
  });

  // Re-scan on DOM changes
  const observer = new MutationObserver(() => {
    if (commentMode) scanTargets();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
</script>
`;

const TWEAK_BRIDGE = `
<script>
(function() {
  window.__df_tweaks = window.__df_tweaks || {};

  window.addEventListener('message', function(e) {
    if (e.data?.type === 'designforge:tweaks:update') {
      const tweaks = e.data.tweaks;
      for (const [key, value] of Object.entries(tweaks)) {
        document.documentElement.style.setProperty('--df-tweak-' + key, String(value));
        window.__df_tweaks[key] = value;
      }
    }
  });
})();
</script>
`;

const CSS_TOKEN_INJECTION = (tokens?: Record<string, any>) => {
  if (!tokens) return "";
  let css = "<style>:root{";
  if (tokens.colors) {
    for (const [name, value] of Object.entries(tokens.colors)) {
      css += `--df-color-${name}:${value};`;
    }
  }
  if (tokens.typography?.fontFamily) {
    css += `--df-font-family:${tokens.typography.fontFamily};`;
  }
  if (tokens.spacing) {
    for (const [name, value] of Object.entries(tokens.spacing)) {
      css += `--df-spacing-${name}:${value}px;`;
    }
  }
  if (tokens.borderRadius) {
    for (const [name, value] of Object.entries(tokens.borderRadius)) {
      css += `--df-radius-${name}:${value}px;`;
    }
  }
  if (tokens.shadows) {
    for (const [name, value] of Object.entries(tokens.shadows)) {
      css += `--df-shadow-${name}:${value};`;
    }
  }
  css += "}</style>";
  return css;
};

export function buildSrcdoc(options: SrcdocOptions): string {
  const { html, jsx, designSystemTokens, commentBridge, tweakBridge, baseUrl } = options;

  let content = html ?? "";

  // If it's a fragment (no DOCTYPE), wrap it
  if (!content.trim().toLowerCase().startsWith("<!doctype")) {
    content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${baseUrl ? `<base href="${baseUrl}">` : ""}
  ${CSS_TOKEN_INJECTION(designSystemTokens)}
</head>
<body>
  ${content}
</body>
</html>`;
  }

  // Inject bridges before closing body
  if (tweakBridge) {
    content = content.replace("</body>", `${TWEAK_BRIDGE}</body>`);
  }
  if (commentBridge) {
    content = content.replace("</body>", `${COMMENT_BRIDGE}</body>`);
  }

  // Always inject sandbox shim
  content = content.replace("<head>", `<head>${SANDBOX_SHIM}`);

  // Inject design tokens if full document and tokens not already injected
  if (designSystemTokens && content.includes("<!DOCTYPE")) {
    content = content.replace("<head>", `<head>${CSS_TOKEN_INJECTION(designSystemTokens)}`);
  }

  return content;
}
