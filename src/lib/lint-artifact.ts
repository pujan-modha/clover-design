export interface LintIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  line?: number;
  suggestion?: string;
}

export interface LintResult {
  issues: LintIssue[];
  score: number; // 0-100
  passed: boolean;
}

// P0: Hard AI-slop tells
const P0_PATTERNS = [
  {
    code: "SLOP-GRADIENT-PURPLE",
    regex: /linear-gradient\s*\([^)]*(?:purple|violet|#8b5cf6|#7c3aed|#a78bfa|#c4b5fd)[^)]*\)/gi,
    message: "Purple/violet gradient detected — a classic AI slop tell.",
    suggestion: "Use brand colors or subtle neutral gradients instead.",
  },
  {
    code: "SLOP-GRADIENT-TRUST",
    regex: /linear-gradient\s*\([^)]*(?:#3b82f6|#06b6d4|blue|cyan|sky)[^)]*(?:#3b82f6|#06b6d4|blue|cyan|sky)[^)]*\)/gi,
    message: "Blue→cyan 'trust' gradient detected.",
    suggestion: "Use a single accent color or a more subtle gradient.",
  },
  {
    code: "SLOP-INDIGO",
    regex: /#6366f1|#4f46e5|#4338ca|#3730a3/gi,
    message: "AI-default indigo (#6366f1) detected.",
    suggestion: "Use a brand-specific accent color instead of the default indigo.",
  },
  {
    code: "SLOP-EMOJI-ICONS",
    regex: /<[^>]*>[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]{1,3}<\/[^>]*>/gu,
    message: "Emoji used as UI icons.",
    suggestion: "Replace with proper SVG icons (Lucide-style).",
  },
  {
    code: "SLOP-CARD-LEFT-BORDER",
    regex: /border-left\s*:\s*\d+px\s+solid/gi,
    message: "Rounded card + left border accent pattern detected.",
    suggestion: "Use a subtler differentiation like background tone or shadow.",
  },
  {
    code: "SLOP-COPY",
    regex: /(?:Elevate|Seamless|Unleash|Next-Gen|Revolutionize|Transform|Empower|Innovative|Cutting-edge|State-of-the-art)[^<]{0,30}/gi,
    message: "AI copywriting clichés detected.",
    suggestion: "Use concrete, specific language instead of generic marketing terms.",
  },
  {
    code: "SLOP-FILLER-TEXT",
    regex: /(?:Scroll to explore|Swipe down|Tap to discover|Learn more|Read more|Click here|Get started|Sign up now)[^<]{0,10}/gi,
    message: "Filler UI text detected.",
    suggestion: "Remove or replace with meaningful calls to action.",
  },
  {
    code: "SLOP-LOREM",
    regex: /lorem ipsum|dolor sit amet|consectetur adipiscing|placeholder text|sample text|dummy text/gi,
    message: "Placeholder / lorem ipsum text detected.",
    suggestion: "Replace with real content or meaningful placeholders.",
  },
  {
    code: "SLOP-METRICS",
    regex: /(?:10\s*x\s*faster|99\.9%\s*uptime|zero[-\s]downtime|24\/7|100%|unlimited|instant|seamless|effortless)[^<]{0,20}/gi,
    message: "Invented/generic metric detected.",
    suggestion: "Use real, verifiable metrics or omit claims entirely.",
  },
  {
    code: "SLOP-SCROLL-INTO-VIEW",
    regex: /scrollIntoView\s*\(/gi,
    message: "scrollIntoView() detected — breaks iframe previews.",
    suggestion: "Remove scrollIntoView calls from generated code.",
  },
  {
    code: "SLOP-PLACEHOLDER-IMAGE",
    regex: /(?:unsplash|placehold\.co|placehold\.it|via\.placeholder|picsum\.photos)/gi,
    message: "External placeholder image CDN detected.",
    suggestion: "Use generated images or inline SVG patterns instead.",
  },
  {
    code: "SLOP-PURPLE-PINK-GRADIENT",
    regex: /linear-gradient\s*\([^)]*(?:purple|violet|#8b5cf6)[^)]*(?:pink|#ec4899|#f472b6)[^)]*\)/gi,
    message: "Purple→pink gradient detected — overused AI pattern.",
    suggestion: "Use a single solid accent or a more original gradient.",
  },
];

// P1: Medium-confidence tells
const P1_PATTERNS = [
  {
    code: "SLOP-ALL-CAPS",
    regex: /[A-Z]{4,}/g,
    message: "ALL-CAPS text without letter-spacing.",
    suggestion: "Add letter-spacing: 0.06em or more to uppercase text.",
    filter: (html: string, match: string) => {
      const context = html.slice(Math.max(0, match.index! - 200), match.index! + match.length + 200);
      return !context.includes("letter-spacing");
    },
  },
  {
    code: "SLOP-INTER",
    regex: /font-family[^;]*Inter/gi,
    message: "Inter font detected — overused AI default.",
    suggestion: "Use Geist, Satoshi, Outfit, or Cabinet Grotesk instead.",
  },
  {
    code: "SLOP-PURE-BLACK",
    regex: /#000000|rgb\(0\s*,\s*0\s*,\s*0\)/gi,
    message: "Pure black (#000000) detected.",
    suggestion: "Use off-black like #1a1a1a or #0f0f0f for better readability.",
  },
  {
    code: "SLOP-3-COLUMN-EQUAL",
    regex: /grid-template-columns\s*:\s*repeat\(3\s*,\s*1fr\)/gi,
    message: "3-column equal card layout detected.",
    suggestion: "Vary column widths or use asymmetric layouts for visual interest.",
  },
  {
    code: "SLOP-SANS-SERIF-DISPLAY",
    regex: /font-family[^;]*(?:Roboto|Arial|system-ui|sans-serif)[^;]*;/gi,
    message: "Generic sans-serif display face on headings.",
    suggestion: "Use a distinctive font for headings (Geist, Satoshi, etc.).",
    filter: (html: string, match: string) => {
      const context = html.slice(Math.max(0, match.index! - 100), match.index! + match.length + 100);
      return /h[1-6]/.test(context);
    },
  },
  {
    code: "SLOP-NEON-SHADOW",
    regex: /box-shadow[^;]*(?:0 0 \d+px|rgba\(\d+,\s*\d+,\s*255|hsla\(\d+,\s*100%,\s*50%)/gi,
    message: "Neon / outer glow shadow detected.",
    suggestion: "Use subtle, diffuse shadows for depth instead of neon glow.",
  },
  {
    code: "SLOP-HEX-OVERUSE",
    regex: /#[0-9a-fA-F]{3,6}/g,
    message: "Too many raw hex colors outside token definitions.",
    suggestion: "Consolidate colors into CSS custom properties in :root.",
    filter: (html: string, _match: string, matches: RegExpMatchArray[]) => {
      const rootSection = html.match(/:root\s*\{[^}]*\}/);
      const rootHexes = rootSection ? rootSection[0].match(/#[0-9a-fA-F]{3,6}/g)?.length ?? 0 : 0;
      const totalHexes = matches.length;
      return totalHexes - rootHexes > 12;
    },
  },
  {
    code: "SLOP-VAR-ACCENT-OVERUSE",
    regex: /var\(\s*--accent\s*\)/g,
    message: "var(--accent) overused — may indicate lazy token application.",
    suggestion: "Use semantic token names (primary, secondary, muted) instead.",
    filter: (_html: string, _match: string, matches: RegExpMatchArray[]) => matches.length > 6,
  },
];

export function lintArtifact(html: string): LintResult {
  const issues: LintIssue[] = [];

  for (const pattern of P0_PATTERNS) {
    const matches = html.match(pattern.regex);
    if (matches) {
      for (const _match of matches) {
        issues.push({
          severity: "error",
          code: pattern.code,
          message: pattern.message,
          suggestion: pattern.suggestion,
        });
      }
    }
  }

  for (const pattern of P1_PATTERNS) {
    const matches = html.match(pattern.regex);
    if (matches) {
      let shouldFlag = true;
      if (pattern.filter) {
        shouldFlag = pattern.filter(html, matches[0], matches);
      }
      if (shouldFlag) {
        for (const _match of matches.slice(0, 3)) { // Limit P1 duplicates
          issues.push({
            severity: "warning",
            code: pattern.code,
            message: pattern.message,
            suggestion: pattern.suggestion,
          });
        }
      }
    }
  }

  // Check for missing data-df-id on sections
  const sections = html.match(/<section[^>]*>/gi) ?? [];
  const sectionsWithIds = html.match(/<section[^>]*data-df-id[^>]*>/gi) ?? [];
  if (sections.length > 0 && sectionsWithIds.length < sections.length / 2) {
    issues.push({
      severity: "info",
      code: "SLOP-MISSING-IDS",
      message: `Many <section> elements lack data-df-id attributes (${sectionsWithIds.length}/${sections.length}).`,
      suggestion: "Add data-df-id to major sections for comment targeting.",
    });
  }

  // Check for missing theme classes on slides (deck mode)
  const slides = html.match(/<section[^>]*class[^>]*>/gi) ?? [];
  const slidesWithTheme = html.match(/<section[^>]*class[^>]*(?:light|dark|hero)[^>]*>/gi) ?? [];
  if (slides.length >= 3 && slidesWithTheme.length < slides.length / 2) {
    issues.push({
      severity: "info",
      code: "SLOP-MISSING-THEME",
      message: `Slides lack theme classes (${slidesWithTheme.length}/${slides.length}).`,
      suggestion: "Add light/dark/hero theme classes to slides for variety.",
    });
  }

  // Check for theme rhythm (3+ same theme in a row)
  const themeMatches = html.match(/class="[^"]*(?:light|dark|hero)[^"]*"/gi) ?? [];
  let streak = 1;
  let maxStreak = 1;
  for (let i = 1; i < themeMatches.length; i++) {
    const prev = themeMatches[i - 1].match(/(light|dark|hero)/)?.[0];
    const curr = themeMatches[i].match(/(light|dark|hero)/)?.[0];
    if (prev && curr && prev === curr) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }
  if (maxStreak >= 4) {
    issues.push({
      severity: "info",
      code: "SLOP-THEME-RHYTHM",
      message: `${maxStreak} consecutive slides with the same theme class.`,
      suggestion: "Alternate themes to create visual rhythm and contrast.",
    });
  }

  const score = Math.max(0, 100
    - issues.filter((i) => i.severity === "error").length * 12
    - issues.filter((i) => i.severity === "warning").length * 4
    - issues.filter((i) => i.severity === "info").length * 1
  );

  return {
    issues,
    score,
    passed: score >= 70,
  };
}

export function formatLintResult(result: LintResult): string {
  if (result.issues.length === 0) {
    return "✅ No AI-slop issues detected. Score: 100/100";
  }

  const lines = [`Lint Score: ${result.score}/100\n`];
  for (const issue of result.issues) {
    const icon = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
    lines.push(`${icon} [${issue.code}] ${issue.message}`);
    if (issue.suggestion) {
      lines.push(`   → ${issue.suggestion}`);
    }
  }
  return lines.join("\n");
}
