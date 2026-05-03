export interface TokenSchemaEntry {
  kind: "color" | "number" | "boolean" | "enum" | "text";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
  placeholder?: string;
}

export interface TweakSchema {
  [key: string]: TokenSchemaEntry;
}

export interface EditmodeBlock {
  tokens: Record<string, unknown>;
  endIndex: number;
}

const EDITMODE_RE = /const\s+TWEAK_DEFAULTS\s*=\s*\/\*EDITMODE-BEGIN\*\/\s*([\s\S]*?)\s*\/\*EDITMODE-END\*\//;
const SCHEMA_RE = /const\s+TWEAK_SCHEMA\s*=\s*\/\*EDITMODE-BEGIN\*\/\s*([\s\S]*?)\s*\/\*EDITMODE-END\*\//;

export function parseEditmodeBlock(html: string): EditmodeBlock | null {
  const m = EDITMODE_RE.exec(html);
  if (!m) return null;
  try {
    const tokens = JSON.parse(m[1]);
    return { tokens, endIndex: m.index + m[0].length };
  } catch {
    return null;
  }
}

export function parseTweakSchema(html: string): TweakSchema | null {
  const m = SCHEMA_RE.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export function replaceEditmodeBlock(html: string, tokens: Record<string, unknown>): string {
  const m = EDITMODE_RE.exec(html);
  if (!m) return html;
  const prefix = html.slice(0, m.index);
  const suffix = html.slice(m.index + m[0].length);
  const newBlock = `const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/${JSON.stringify(tokens, null, 2)}/*EDITMODE-END*/`;
  return prefix + newBlock + suffix;
}

export function extractTweaksFromHTML(html: string): {
  tokens: Record<string, unknown>;
  schema: TweakSchema | null;
} | null {
  const block = parseEditmodeBlock(html);
  if (!block) return null;
  const schema = parseTweakSchema(html);
  return { tokens: block.tokens, schema };
}

export function isColorString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^(#([0-9a-f]{3}|[0-9a-f]{6})|(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([^)]*\)|color\([^)]*\)|[a-z]+)$/i.test(value.trim());
}

export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}
