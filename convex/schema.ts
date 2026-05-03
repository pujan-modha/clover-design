import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
});
