import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { requireAuth } from "../lib/identity";
import { streamText, smoothStream } from "ai";
import { resolveModel } from "../lib/models";
import { decryptKey } from "../lib/encryption";
import { loadSkill, formatSkillForPrompt } from "../lib/skills";
import { estimateUsage } from "../lib/usage";
import { designForgeTools } from "../lib/toolkit";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatBody {
  projectId: string;
  messages: ChatMessage[];
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
  designSystemId?: string | null;
  skillId?: string;
  skillInputs?: Record<string, string>;
  enableTools?: boolean;
  resume?: boolean;
  streamStateId?: string;
}

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
- Use CSS custom properties for design tokens when a design system is active
- Prefer semantic HTML and accessible patterns
- Generate clean, production-ready code
- Add data-df-id attributes to major sections for comment targeting
- Use the TWEAK_DEFAULTS pattern for adjustable parameters:
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"accentHue":210,"density":1.0}/*EDITMODE-END*/;
- Respond with HTML code wrapped in \`\`\`html blocks
- You have access to tools: webSearch (research), generateImage (image gen), editFile (surgical HTML edits). Use them when helpful.`;

function buildSystemPrompt(designSystem?: DesignSystemDoc, skillPrompt?: string): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (designSystem?.tokens) {
    const { tokens } = designSystem;
    prompt += "\n\n## Design System Tokens\nA design system is active. Use these CSS custom properties:\n";
    if (tokens.colors) {
      for (const [name, value] of Object.entries(tokens.colors)) {
        prompt += `- --df-color-${name}: ${value}\n`;
      }
    }
    if (tokens.typography?.fontFamily) {
      prompt += `- --df-font-family: ${tokens.typography.fontFamily}\n`;
    }
    if (tokens.spacing) {
      for (const [name, value] of Object.entries(tokens.spacing)) {
        prompt += `- --df-spacing-${name}: ${value}px\n`;
      }
    }
  }

  if (skillPrompt) {
    prompt += "\n\n" + skillPrompt;
  }

  return prompt;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

function buildProviderOptions(
  providerId: string,
  modelId: string,
  reasoningEffort?: "low" | "medium" | "high"
) {
  const options: Record<string, any> = {};

  if (["o1", "o3", "o4"].some((m) => modelId.includes(m)) && reasoningEffort) {
    options.openai = { reasoningEffort, reasoningSummary: "detailed" };
  }

  if (
    ["sonnet-4", "4-sonnet", "4-opus", "opus-4", "3.7"].some((m) => modelId.includes(m)) &&
    reasoningEffort
  ) {
    options.anthropic = {
      thinking: {
        type: "enabled",
        budgetTokens:
          reasoningEffort === "low" ? 1000 : reasoningEffort === "medium" ? 6000 : 12000,
      },
    };
  }

  if (["2.5-flash", "2.5-pro"].some((m) => modelId.includes(m)) && reasoningEffort) {
    options.google = {
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget:
          reasoningEffort === "low" ? 1000 : reasoningEffort === "medium" ? 6000 : 12000,
      },
    };
  }

  return options;
}

export const chatPOST = httpAction(async (ctx, req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const identity = await requireAuth(ctx);
  if (!identity) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body: ChatBody = await req.json();
  const { projectId, messages, model: requestedModel, reasoningEffort, designSystemId, skillId, skillInputs, enableTools, resume, streamStateId } = body;

  const projectIdConvex = projectId as Id<"projects">;
  const designSystemIdConvex = designSystemId ? (designSystemId as Id<"designSystems">) : null;

  const project = await ctx.runQuery(api.projects.get, { id: projectIdConvex });
  if (!project || project.authorId !== identity.tokenIdentifier) {
    return new Response("Project not found", { status: 404 });
  }

  let designSystem: DesignSystemDoc | null = null;
  if (designSystemIdConvex) {
    designSystem = await ctx.runQuery(api.designSystems.get, { id: designSystemIdConvex });
  }

  const settings = await ctx.runQuery(api.settings.getSettings);
  if (!settings) {
    return new Response("Settings not found", { status: 500 });
  }

  // Build provider map with decrypted keys
  const providers: Record<string, { key: string; endpoint?: string; protocol?: "openai" | "anthropic" | "google"; name?: string }> = {};
  for (const [pid, p] of Object.entries(settings.coreProviders ?? {})) {
    if (!p.enabled) continue;
    try {
      providers[pid] = { key: await decryptKey(p.encryptedKey), name: pid };
    } catch {
      /* skip corrupted */
    }
  }
  for (const [pid, p] of Object.entries(settings.customProviders ?? {})) {
    if (!p.enabled) continue;
    try {
      providers[pid] = {
        key: await decryptKey(p.encryptedKey),
        endpoint: p.endpoint,
        protocol: p.protocol,
        name: p.name,
      };
    } catch {
      /* skip corrupted */
    }
  }

  if (Object.keys(providers).length === 0) {
    return new Response(
      JSON.stringify({ error: "No AI providers configured. Please add an API key in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Resolve model adapter
  let adapter = requestedModel;
  if (!adapter) {
    if (settings.selectedModel) {
      adapter = settings.selectedModel;
    } else {
      const SHARED_MODELS = [
        { id: "gpt-4o", provider: "openai" },
        { id: "claude-3-5-sonnet", provider: "anthropic" },
        { id: "gemini-2.0-flash", provider: "google" },
      ];
      for (const m of SHARED_MODELS) {
        if (m.provider in providers) {
          adapter = `${m.provider}:${m.id}`;
          break;
        }
      }
    }
  }

  if (!adapter) {
    return new Response(
      JSON.stringify({ error: "No available model. Please configure providers in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!adapter.includes(":")) {
    const SHARED_MAP: Record<string, string> = {
      "gpt-4o": "openai:gpt-4o",
      "gpt-4o-mini": "openai:gpt-4o-mini",
      "o3-mini": "openai:o3-mini",
      "o4-mini": "openai:o4-mini",
      "claude-sonnet-4": "anthropic:claude-sonnet-4-0",
      "claude-opus-4": "anthropic:claude-opus-4-0",
      "claude-3-7-sonnet": "anthropic:claude-3-7-sonnet",
      "claude-3-5-sonnet": "anthropic:claude-3-5-sonnet",
      "gemini-2.5-pro": "google:gemini-2.5-pro",
      "gemini-2.5-flash": "google:gemini-2.5-flash",
      "gemini-2.0-flash": "google:gemini-2.0-flash",
    };
    adapter = SHARED_MAP[adapter] ?? adapter;
    if (!adapter.includes(":")) {
      const customModel = settings.customModels?.[adapter];
      if (customModel) {
        adapter = `${customModel.providerId}:${customModel.modelId}`;
      }
    }
  }

  let resolved;
  try {
    resolved = resolveModel(adapter, providers);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Failed to resolve model: ${errorMessage(err)}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Load skill if specified
  let skillPrompt: string | undefined;
  if (skillId) {
    try {
      const skill = loadSkill(skillId);
      if (skill) {
        skillPrompt = formatSkillForPrompt(skill, skillInputs);
      }
    } catch {
      // skill loading failure is non-fatal
    }
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

  // Auto-generate title on first message
  if (messages.length <= 1 && userMessage && (!project.name || project.name === "New Project" || project.name === "Untitled")) {
    try {
      const titleResult = streamText({
        model: resolved.model,
        system: "Generate a concise, creative project title (max 4 words) for this design request. Respond with ONLY the title, no quotes.",
        messages: [{ role: "user", content: userMessage.content }],
      });
      let title = "";
      const reader = titleResult.textStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        title += value;
      }
      title = title.trim().replace(/^["']|["']$/g, "").slice(0, 60);
      if (title) {
        await ctx.runMutation(api.projects.update, { id: projectIdConvex, name: title });
      }
    } catch {
      // title generation failure is non-fatal
    }
  }

  const systemPrompt = buildSystemPrompt(designSystem ?? undefined, skillPrompt);
  const providerOptions = buildProviderOptions(
    resolved.providerId,
    resolved.modelId,
    reasoningEffort ?? (settings.reasoningEffort as "low" | "medium" | "high" | undefined)
  );

  const streamStartTime = Date.now();
  const promptText = messages.map((m) => m.content).join("\n");

  // Create stream state record
  const streamStateIdCreated = await ctx.runMutation(api.streamStates.create, {
    projectId: projectIdConvex,
    authorId: identity.tokenIdentifier,
    messages: messages as any,
    model: adapter,
    providerId: resolved.providerId,
    designSystemId: designSystemIdConvex ?? undefined,
    skillId: skillId ?? undefined,
  });

  const result = streamText({
    model: resolved.model,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    experimental_transform: smoothStream(),
    providerOptions,
    tools: enableTools !== false ? designForgeTools : undefined,
  });

  const encoder = new TextEncoder();
  let fullContent = "";

  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        const reader = result.textStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += value;

          // Update stream state periodically (every ~500 chars to reduce DB writes)
          if (fullContent.length % 500 < 100) {
            await ctx.runMutation(api.streamStates.updateContent, {
              streamStateId: streamStateIdCreated,
              content: fullContent,
            });
          }

          controller.enqueue(
            encoder.encode(`0:${JSON.stringify({ type: "content", chunk: value })}\n`)
          );
        }

        // Calculate usage
        const usage = estimateUsage(resolved.modelId, promptText, fullContent);

        // Mark stream as completed
        await ctx.runMutation(api.streamStates.complete, {
          streamStateId: streamStateIdCreated,
          content: fullContent,
        });

        // Stream usage info as final event
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify({ type: "usage", usage })}\n`)
        );

        await ctx.runMutation(api.chatMessages.create, {
          projectId: projectIdConvex,
          role: "assistant",
          content: fullContent,
          metadata: {
            modelId: resolved.modelId,
            modelName: resolved.modelName,
            providerId: resolved.providerId,
            serverDurationMs: Date.now() - streamStartTime,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            costUsd: usage.costUsd,
            streamStateId: streamStateIdCreated,
          },
        });

        controller.enqueue(
          encoder.encode(`0:${JSON.stringify({ type: "done", streamStateId: streamStateIdCreated })}\n`)
        );
        controller.close();
      } catch (err) {
        // Mark stream as error
        await ctx.runMutation(api.streamStates.error, {
          streamStateId: streamStateIdCreated,
          error: errorMessage(err),
        });
        controller.error(err);
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Stream-State-Id": streamStateIdCreated,
    },
  });
});
