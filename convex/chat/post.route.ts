import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { requireAuth } from "../lib/identity";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatBody {
  projectId: string;
  messages: ChatMessage[];
  model?: string;
  designSystemId?: string | null;
}

/** Minimal type for a design-system document loaded inside the action. */
interface DesignSystemDoc {
  tokens?: DesignSystemTokens;
}

interface DesignSystemTokens {
  colors?: Record<string, string>;
  typography?: {
    fontFamily?: string;
    sizes?: Record<string, string>;
  };
  spacing?: Record<string, number>;
  borderRadius?: Record<string, number>;
  shadows?: Record<string, string>;
}

const BASE_SYSTEM_PROMPT = `You are DesignForge AI, an expert frontend engineer and UI/UX designer. You help users build web interfaces, dashboards, landing pages, and app prototypes.

When generating designs, follow these rules strictly:
- No emojis in UI
- No Inter font (use Geist, Satoshi, Outfit, or Cabinet Grotesk)
- No generic serif fonts (Times New Roman, Georgia, Garamond)
- No pure black (#000000) — use off-black or charcoal
- No neon/outer glow shadows
- No oversaturated accents
- No 3-column equal card layouts
- No overlapping elements
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen")
- No filler UI text ("Scroll to explore", "Swipe down")
- No centered Hero sections in asymmetric designs

You can generate HTML/CSS/React code for designs. When asked to create something, output clean, production-ready code.`;

/**
 * Build the system prompt by appending design-system token guidance.
 *
 * @param designSystem - Optional design system loaded from Convex.
 * @returns The complete system prompt string.
 */
function buildSystemPrompt(designSystem?: DesignSystemDoc): string {
  if (!designSystem?.tokens) {
    return BASE_SYSTEM_PROMPT;
  }

  const { tokens } = designSystem;
  let tokenSection = "\n\n## Design System Tokens\nA design system is active for this project. Use the following tokens. When generating HTML/CSS, prefer CSS custom properties that match these names (e.g., `var(--df-color-primary)`, `var(--df-font-family)`, `var(--df-spacing-md)`). The canvas will inject these CSS variables automatically.\n";

  if (tokens.colors) {
    tokenSection += "\nColors:\n";
    for (const [name, value] of Object.entries(tokens.colors)) {
      tokenSection += `- ${name}: ${value} (use var(--df-color-${name}))\n`;
    }
  }

  if (tokens.typography) {
    tokenSection += "\nTypography:\n";
    if (tokens.typography.fontFamily) {
      tokenSection += `- Font family: ${tokens.typography.fontFamily} (use var(--df-font-family))\n`;
    }
    if (tokens.typography.sizes) {
      for (const [name, value] of Object.entries(tokens.typography.sizes)) {
        tokenSection += `- ${name}: ${value} (use var(--df-font-size-${name}))\n`;
      }
    }
  }

  if (tokens.spacing) {
    tokenSection += "\nSpacing (px):\n";
    for (const [name, value] of Object.entries(tokens.spacing)) {
      tokenSection += `- ${name}: ${value}px (use var(--df-spacing-${name}))\n`;
    }
  }

  if (tokens.borderRadius) {
    tokenSection += "\nBorder Radius (px):\n";
    for (const [name, value] of Object.entries(tokens.borderRadius)) {
      tokenSection += `- ${name}: ${value}px (use var(--df-radius-${name}))\n`;
    }
  }

  if (tokens.shadows) {
    tokenSection += "\nShadows:\n";
    for (const [name, value] of Object.entries(tokens.shadows)) {
      tokenSection += `- ${name}: ${value} (use var(--df-shadow-${name}))\n`;
    }
  }

  return BASE_SYSTEM_PROMPT + tokenSection;
}

/** Narrow an unknown error to a safe string message. */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export const chatPOST = httpAction(async (ctx, req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Auth check
  const identity = await requireAuth(ctx);
  if (!identity) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body: ChatBody = await req.json();
  const { projectId, messages, model = "anthropic/claude-3.5-sonnet", designSystemId } = body;

  // Validate and cast IDs to Convex branded types
  const projectIdConvex = projectId as Id<"projects">;
  const designSystemIdConvex = designSystemId ? (designSystemId as Id<"designSystems">) : null;

  // Verify project ownership
  const project = await ctx.runQuery(api.projects.get, { id: projectIdConvex });
  if (!project || project.authorId !== identity.tokenIdentifier) {
    return new Response("Project not found", { status: 404 });
  }

  // Load design system if specified
  let designSystem: DesignSystemDoc | null = null;
  if (designSystemIdConvex) {
    designSystem = await ctx.runQuery(api.designSystems.get, { id: designSystemIdConvex });
  }

  // Save user message
  const userMessage = messages[messages.length - 1];
  if (userMessage && userMessage.role === "user") {
    await ctx.runMutation(api.chatMessages.create, {
      projectId: projectIdConvex,
      role: "user",
      content: userMessage.content,
    });
  }

  // Build messages for OpenRouter
  const systemPrompt = buildSystemPrompt(designSystem ?? undefined);
  const openRouterMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Stream from OpenRouter
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "DesignForge",
          },
          body: JSON.stringify({
            model,
            messages: openRouterMessages,
            stream: true,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          controller.enqueue(encoder.encode(`event: error\ndata: ${err}\n\n`));
          controller.close();
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                  );
                }
              } catch {
                /* skip malformed SSE lines */
              }
            }
          }
        }

        // Save assistant message
        await ctx.runMutation(api.chatMessages.create, {
          projectId: projectIdConvex,
          role: "assistant",
          content: fullContent,
        });

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err: unknown) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${errorMessage(err)}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
