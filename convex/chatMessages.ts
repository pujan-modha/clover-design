import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/identity";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    return await ctx.db
      .query("chatMessages")
      .withIndex("byProjectIdAndCreatedAt", (q) =>
        q.eq("projectId", args.projectId)
      )
      .order("asc")
      .take(200);
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    parts: v.optional(v.array(v.any())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    const now = Date.now();
    return await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      authorId: identity.tokenIdentifier,
      role: args.role,
      content: args.content,
      parts: args.parts ?? [],
      metadata: args.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateContent = mutation({
  args: {
    id: v.id("chatMessages"),
    content: v.string(),
    parts: v.optional(v.array(v.any())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const msg = await ctx.db.get(args.id);
    if (!msg || msg.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(args.id, {
      content: args.content,
      ...(args.parts !== undefined && { parts: args.parts }),
      ...(args.metadata !== undefined && { metadata: args.metadata }),
      updatedAt: Date.now(),
    });
  },
});
