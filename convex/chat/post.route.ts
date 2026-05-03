import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";
import { requireAuth } from "../lib/identity";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatBody {
  projectId: string;
  messages: ChatMessage[];
  model?: string;
}

const SYSTEM_PROMPT = `You are DesignForge AI, an expert frontend engineer and UI/UX designer. You help users build web interfaces, dashboards, landing pages, and app prototypes.

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
  const { projectId, messages, model = "anthropic/claude-3.5-sonnet" } = body;

  // Verify project ownership
  const project = await ctx.runQuery(api.projects.get, { id: projectId as any });
  if (!project || project.authorId !== identity.tokenIdentifier) {
    return new Response("Project not found", { status: 404 });
  }

  // Save user message
  const userMessage = messages[messages.length - 1];
  if (userMessage && userMessage.role === "user") {
    await ctx.runMutation(api.chatMessages.create, {
      projectId: projectId as any,
      role: "user",
      content: userMessage.content,
    });
  }

  // Build messages for OpenRouter
  const openRouterMessages = [
    { role: "system", content: SYSTEM_PROMPT },
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
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                  );
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        }

        // Save assistant message
        await ctx.runMutation(api.chatMessages.create, {
          projectId: projectId as any,
          role: "assistant",
          content: fullContent,
        });

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${err.message}\n\n`)
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
