export interface TweakValue {
  type: "color" | "number" | "enum" | "boolean" | "string";
  value: any;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
  label?: string;
}

export interface TweakSchema {
  [key: string]: TweakValue;
}

const EDITMODE_REGEX = /const\s+TWEAK_DEFAULTS\s*=\s*\/\*EDITMODE-BEGIN\*\/([\s\S]*?)\/\*EDITMODE-END\*\//;
const SCHEMA_REGEX = /\/\*TWEAK-SCHEMA-BEGIN\*\/([\s\S]*?)\/\*TWEAK-SCHEMA-END\*\//;

export function parseEditmodeBlock(html: string): Record<string, any> | null {
  const match = html.match(EDITMODE_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function replaceEditmodeBlock(html: string, values: Record<string, any>): string {
  return html.replace(EDITMODE_REGEX, (match, inner) => {
    return match.replace(inner, JSON.stringify(values, null, 2));
  });
}

export function parseTweakSchema(html: string): TweakSchema | null {
  const match = html.match(SCHEMA_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function ensureEditmodeMarkers(html: string): string {
  if (html.includes("EDITMODE-BEGIN")) return html;
  return html.replace(
    "</body>",
    `<script>const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{}/*EDITMODE-END*/;</script></body>`
  );
}

/** Apply tweak values to an HTML string by replacing CSS custom properties. */
export function applyTweaksToHtml(html: string, tweaks: Record<string, any>): string {
  let result = html;
  for (const [key, value] of Object.entries(tweaks)) {
    // Replace CSS custom properties
    const regex = new RegExp(`var\\(\\s*--df-tweak-${key}\\s*[^)]*\\)`, "g");
    result = result.replace(regex, String(value));
    // Also replace inline style declarations
    const styleRegex = new RegExp(`--df-tweak-${key}\\s*:\\s*[^;]+`, "g");
    result = result.replace(styleRegex, `--df-tweak-${key}: ${value}`);
  }
  return result;
}

// Legacy compatibility exports for TweakPanel

export interface TokenSchemaEntry {
  kind: "color" | "number" | "enum" | "boolean" | "string";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
}

export function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

const COLOR_REGEX = /^#([0-9a-fA-F]{3,8})|^(rgb|rgba|hsl|hsla)\(/;

export function isColorString(value: unknown): boolean {
  return typeof value === "string" && COLOR_REGEX.test(value);
}

export interface ExtractTweaksResult {
  tokens: Record<string, any>;
  schema: Record<string, TokenSchemaEntry> | null;
}

export function extractTweaksFromHTML(html: string): ExtractTweaksResult | null {
  const block = parseEditmodeBlock(html);
  const schema = parseTweakSchema(html);

  if (!block) return null;

  const schemaMap: Record<string, TokenSchemaEntry> | null = schema
    ? Object.fromEntries(
        Object.entries(schema).map(([key, entry]) => [
          key,
          {
            kind: entry.type,
            min: entry.min,
            max: entry.max,
            step: entry.step,
            unit: entry.unit,
            options: entry.options,
          } as TokenSchemaEntry,
        ])
      )
    : null;

  return { tokens: block, schema: schemaMap };
}
