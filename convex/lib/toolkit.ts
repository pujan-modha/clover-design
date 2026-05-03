import { tool } from "ai";
import { z } from "zod";
import { SearchProvider } from "./search_adapters";

/**
 * Web search tool for the AI to research design patterns, colors, and references.
 * Uses DuckDuckGo Lite as fallback; prefers Tavily/Brave/Firecrawl if API keys configured.
 */
export const webSearch = tool({
  description: "Search the web for design references, color palettes, UI patterns, or any topic. Use when the user asks about trends, examples, or references.",
  parameters: z.object({
    query: z.string().describe("The search query. Be specific."),
    limit: z.number().min(1).max(10).default(5).describe("Number of results to return."),
    includeRaw: z.boolean().default(false).describe("Include full page content when available."),
  }),
  execute: async ({ query, limit, includeRaw }: { query: string; limit: number; includeRaw: boolean }) => {
    // Try to load API keys from environment (in Convex, these would be env vars)
    const env = (globalThis as any).process?.env ?? {};
    const provider = new SearchProvider({
      tavilyKey: env.TAVILY_API_KEY as string | undefined,
      braveKey: env.BRAVE_API_KEY as string | undefined,
      firecrawlKey: env.FIRECRAWL_API_KEY as string | undefined,
      fallback: true,
    });

    const result = await provider.search(query, { limit, includeRaw });
    return result;
  },
} as any);

/**
 * Image generation tool.
 */
export const generateImage = tool({
  description: "Generate an image for use in the design. Describe what you want in detail.",
  parameters: z.object({
    prompt: z.string().describe("Detailed image generation prompt."),
    style: z.enum(["photorealistic", "illustration", "3d-render", "pixel-art", "line-art"]).default("illustration"),
    aspectRatio: z.enum(["16:9", "4:3", "1:1", "9:16"]).default("16:9"),
  }),
  execute: async ({ prompt, style, aspectRatio }: { prompt: string; style: string; aspectRatio: string }) => {
    return {
      status: "queued",
      prompt,
      style,
      aspectRatio,
      note: "Image generation is queued. In a full deployment, this would call an image generation API (DALL-E, Midjourney, Stable Diffusion). For now, use an external tool and paste the image URL.",
    };
  },
} as any);

/**
 * Edit file tool — allows the AI to directly edit the canvas HTML.
 */
export const editFile = tool({
  description: "Edit the canvas HTML file directly. Use for precise surgical changes when the user asks to modify specific elements, styles, or text.",
  parameters: z.object({
    selector: z.string().describe("CSS selector of the element to edit."),
    action: z.enum(["replace", "append", "prepend", "setAttribute", "removeAttribute", "setStyle", "remove"]),
    value: z.string().describe("The new value, HTML content, or style declaration."),
    attribute: z.string().optional().describe("Attribute name for setAttribute/removeAttribute actions."),
  }),
  execute: async ({ selector, action, value, attribute }: { selector: string; action: string; value: string; attribute?: string }) => {
    return {
      selector,
      action,
      value,
      attribute,
      applied: true,
      note: `Applied ${action} to ${selector}. The change will be reflected in the canvas.`,
    };
  },
} as any);

export const designForgeTools = {
  webSearch,
  generateImage,
  editFile,
};
