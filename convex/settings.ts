import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/identity";
import { decryptKey, encryptKey } from "./lib/encryption";

const DEFAULT_SETTINGS = {
  coreProviders: {} as Record<string, { enabled: boolean; encryptedKey: string }>,
  customProviders: {} as Record<string, { name: string; enabled: boolean; endpoint: string; protocol: "openai" | "anthropic" | "google"; encryptedKey: string }>,
  customModels: {} as Record<string, { enabled: boolean; name?: string; modelId: string; providerId: string; contextLength?: number; maxTokens?: number; abilities: ("reasoning" | "vision" | "function_calling" | "pdf" | "effort_control" | "image_generation")[] }>,
  selectedModel: undefined as string | undefined,
  reasoningEffort: "medium" as "low" | "medium" | "high",
};

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    if (!identity) {
      return null;
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("byUser", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    if (!settings) {
      return {
        ...DEFAULT_SETTINGS,
        userId: identity.tokenIdentifier,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    return settings;
  },
});

export const getSettingsInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("byUser", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings) {
      return {
        ...DEFAULT_SETTINGS,
        userId: args.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    return settings;
  },
});

/** Returns a registry of available providers (with decrypted keys) and models for the authenticated user. */
export const getProviderRegistry = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    if (!identity) {
      return { providers: {}, models: {} };
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("byUser", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    const providers: Record<string, { key: string; endpoint?: string; protocol?: string; name?: string }> = {};
    const models: Record<string, any> = {};

    // Shared model definitions (built-in)
    const SHARED_MODELS = [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai", abilities: ["vision", "function_calling", "pdf"] },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", abilities: ["vision", "function_calling", "pdf"] },
      { id: "o3-mini", name: "o3 Mini", provider: "openai", abilities: ["reasoning", "function_calling", "effort_control"] },
      { id: "o4-mini", name: "o4 Mini", provider: "openai", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
      { id: "claude-opus-4", name: "Claude Opus 4", provider: "anthropic", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
      { id: "claude-3-7-sonnet", name: "Claude Sonnet 3.7", provider: "anthropic", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
      { id: "claude-3-5-sonnet", name: "Claude Sonnet 3.5", provider: "anthropic", abilities: ["vision", "function_calling", "pdf"] },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", abilities: ["vision", "function_calling", "reasoning", "pdf", "effort_control"] },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", abilities: ["vision", "function_calling", "pdf"] },
    ];

    // Core providers
    for (const [providerId, provider] of Object.entries(settings?.coreProviders ?? {})) {
      if (!provider.enabled) continue;
      try {
        const key = await decryptKey(provider.encryptedKey);
        providers[providerId] = { key, name: providerId };
      } catch {
        // skip corrupted keys
      }
    }

    // Custom providers
    for (const [providerId, provider] of Object.entries(settings?.customProviders ?? {})) {
      if (!provider.enabled) continue;
      try {
        const key = await decryptKey(provider.encryptedKey);
        providers[providerId] = {
          key,
          endpoint: provider.endpoint,
          protocol: provider.protocol,
          name: provider.name,
        };
      } catch {
        // skip corrupted keys
      }
    }

    // Shared models: only include if their provider is available
    for (const model of SHARED_MODELS) {
      if (model.provider in providers) {
        models[model.id] = {
          ...model,
          adapter: `${model.provider}:${model.id}`,
        };
      }
    }

    // Custom models
    for (const [modelId, model] of Object.entries(settings?.customModels ?? {})) {
      if (!model.enabled) continue;
      if (model.providerId in providers) {
        models[modelId] = {
          id: model.modelId,
          name: model.name ?? model.modelId,
          provider: model.providerId,
          adapter: `${model.providerId}:${model.modelId}`,
          abilities: model.abilities,
          contextLength: model.contextLength,
          maxTokens: model.maxTokens,
          isCustom: true,
        };
      }
    }

    return { providers, models };
  },
});

export const updateSettings = mutation({
  args: {
    coreProviders: v.optional(
      v.record(
        v.string(),
        v.object({
          enabled: v.boolean(),
          newKey: v.optional(v.string()),
        })
      )
    ),
    customProviders: v.optional(
      v.record(
        v.string(),
        v.union(
          v.object({
            name: v.string(),
            enabled: v.boolean(),
            endpoint: v.string(),
            protocol: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
            newKey: v.optional(v.string()),
          }),
          v.null()
        )
      )
    ),
    customModels: v.optional(
      v.record(
        v.string(),
        v.union(
          v.object({
            enabled: v.boolean(),
            name: v.optional(v.string()),
            modelId: v.string(),
            providerId: v.string(),
            contextLength: v.optional(v.number()),
            maxTokens: v.optional(v.number()),
            abilities: v.array(
              v.union(
                v.literal("reasoning"),
                v.literal("vision"),
                v.literal("function_calling"),
                v.literal("pdf"),
                v.literal("effort_control"),
                v.literal("image_generation")
              )
            ),
          }),
          v.null()
        )
      )
    ),
    selectedModel: v.optional(v.string()),
    reasoningEffort: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("byUser", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    const now = Date.now();

    if (existing) {
      const patch: any = { updatedAt: now };

      if (args.coreProviders) {
        patch.coreProviders = { ...existing.coreProviders };
        for (const [id, update] of Object.entries(args.coreProviders)) {
          const current = patch.coreProviders[id];
          patch.coreProviders[id] = {
            enabled: update.enabled,
            encryptedKey: update.newKey
              ? await encryptKey(update.newKey)
              : current?.encryptedKey ?? "",
          };
        }
      }

      if (args.customProviders) {
        patch.customProviders = { ...existing.customProviders };
        for (const [id, update] of Object.entries(args.customProviders)) {
          if (update === null) {
            delete patch.customProviders[id];
          } else {
            const current = patch.customProviders[id];
            patch.customProviders[id] = {
              name: update.name,
              enabled: update.enabled,
              endpoint: update.endpoint,
              protocol: update.protocol,
              encryptedKey: update.newKey
                ? await encryptKey(update.newKey)
                : current?.encryptedKey ?? "",
            };
          }
        }
      }

      if (args.customModels) {
        patch.customModels = { ...existing.customModels };
        for (const [id, update] of Object.entries(args.customModels)) {
          if (update === null) {
            delete patch.customModels[id];
          } else {
            patch.customModels[id] = {
              enabled: update.enabled,
              name: update.name,
              modelId: update.modelId,
              providerId: update.providerId,
              contextLength: update.contextLength,
              maxTokens: update.maxTokens,
              abilities: update.abilities,
            };
          }
        }
      }

      if (args.selectedModel !== undefined) {
        patch.selectedModel = args.selectedModel;
      }
      if (args.reasoningEffort !== undefined) {
        patch.reasoningEffort = args.reasoningEffort;
      }

      await ctx.db.patch(existing._id, patch);
    } else {
      const doc: any = {
        userId: identity.tokenIdentifier,
        coreProviders: {},
        customProviders: {},
        customModels: {},
        createdAt: now,
        updatedAt: now,
      };

      if (args.coreProviders) {
        for (const [id, update] of Object.entries(args.coreProviders)) {
          doc.coreProviders[id] = {
            enabled: update.enabled,
            encryptedKey: update.newKey ? await encryptKey(update.newKey) : "",
          };
        }
      }

      if (args.customProviders) {
        for (const [id, update] of Object.entries(args.customProviders)) {
          if (update !== null) {
            doc.customProviders[id] = {
              name: update.name,
              enabled: update.enabled,
              endpoint: update.endpoint,
              protocol: update.protocol,
              encryptedKey: update.newKey ? await encryptKey(update.newKey) : "",
            };
          }
        }
      }

      if (args.customModels) {
        for (const [id, update] of Object.entries(args.customModels)) {
          if (update !== null) {
            doc.customModels[id] = {
              enabled: update.enabled,
              name: update.name,
              modelId: update.modelId,
              providerId: update.providerId,
              contextLength: update.contextLength,
              maxTokens: update.maxTokens,
              abilities: update.abilities,
            };
          }
        }
      }

      if (args.selectedModel !== undefined) {
        doc.selectedModel = args.selectedModel;
      }
      if (args.reasoningEffort !== undefined) {
        doc.reasoningEffort = args.reasoningEffort;
      }

      await ctx.db.insert("settings", doc);
    }
  },
});
