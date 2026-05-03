import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const ModelAbilitySchema = v.union(
  v.literal("reasoning"),
  v.literal("vision"),
  v.literal("function_calling"),
  v.literal("pdf"),
  v.literal("effort_control"),
  v.literal("image_generation")
);

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    authorId: v.string(),
    canvasContent: v.optional(v.any()),
    designSystemId: v.optional(v.id("designSystems")),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("byAuthorId", ["authorId"])
    .index("byAuthorAndUpdatedAt", ["authorId", "updatedAt"]),

  chatMessages: defineTable({
    projectId: v.id("projects"),
    authorId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    parts: v.optional(v.array(v.any())),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byProjectId", ["projectId"])
    .index("byProjectIdAndCreatedAt", ["projectId", "createdAt"]),

  designSystems: defineTable({
    authorId: v.string(),
    name: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    isDefault: v.boolean(),
    source: v.union(v.literal("manual"), v.literal("ai-extracted"), v.literal("uploaded")),
    designMd: v.optional(v.string()),
    tokens: v.optional(v.any()),
    assets: v.optional(v.array(v.any())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byAuthorId", ["authorId"])
    .index("byAuthorAndUpdatedAt", ["authorId", "updatedAt"]),

  canvasSnapshots: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    content: v.any(),
    createdAt: v.number(),
  })
    .index("byProjectId", ["projectId"]),

  shareTokens: defineTable({
    projectId: v.id("projects"),
    token: v.string(),
    name: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("byProjectId", ["projectId"])
    .index("byToken", ["token"]),

  comments: defineTable({
    projectId: v.id("projects"),
    authorId: v.string(),
    selector: v.string(),
    tag: v.string(),
    outerHTML: v.string(),
    rect: v.object({
      top: v.number(),
      left: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    text: v.string(),
    kind: v.union(v.literal("note"), v.literal("edit")),
    status: v.union(v.literal("pending"), v.literal("applied")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byProjectId", ["projectId"])
    .index("byProjectIdAndCreatedAt", ["projectId", "createdAt"]),

  /** User settings including AI provider and model configuration. */
  settings: defineTable({
    userId: v.string(),
    /** Core providers: openai, anthropic, google */
    coreProviders: v.record(
      v.string(),
      v.object({
        enabled: v.boolean(),
        encryptedKey: v.string(),
      })
    ),
    /** Custom providers with editable endpoints. */
    customProviders: v.record(
      v.string(),
      v.object({
        name: v.string(),
        enabled: v.boolean(),
        endpoint: v.string(),
        protocol: v.union(v.literal("openai"), v.literal("anthropic"), v.literal("google")),
        encryptedKey: v.string(),
      })
    ),
    /** Custom models defined by the user. */
    customModels: v.record(
      v.string(),
      v.object({
        enabled: v.boolean(),
        name: v.optional(v.string()),
        modelId: v.string(),
        providerId: v.string(),
        contextLength: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
        abilities: v.array(ModelAbilitySchema),
      })
    ),
    /** Last selected model ID per project (or global). */
    selectedModel: v.optional(v.string()),
    /** Reasoning effort preference. */
    reasoningEffort: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    /** UI preferences. */
    uiPreferences: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]),


  /** Stream state for resumable AI generation */
  streamStates: defineTable({
    projectId: v.id("projects"),
    authorId: v.string(),
    status: v.union(v.literal("running"), v.literal("paused"), v.literal("completed"), v.literal("error")),
    content: v.string(),
    messages: v.array(v.any()),
    model: v.string(),
    providerId: v.string(),
    designSystemId: v.optional(v.id("designSystems")),
    skillId: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("byProjectId", ["projectId"])
    .index("byProjectAndStatus", ["projectId", "status"]),

  files: defineTable({
    projectId: v.optional(v.id("projects")),
    authorId: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("byProjectId", ["projectId"])
    .index("byAuthorId", ["authorId"]),
});