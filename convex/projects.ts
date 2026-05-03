import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/identity";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    return await ctx.db
      .query("projects")
      .withIndex("byAuthorId", (q) => q.eq("authorId", identity.tokenIdentifier))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(50);
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      return null;
    }
    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const now = Date.now();
    return await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      authorId: identity.tokenIdentifier,
      canvasContent: null,
      designSystemId: undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    canvasContent: v.optional(v.any()),
    designSystemId: v.optional(v.id("designSystems")),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.canvasContent !== undefined && { canvasContent: args.canvasContent }),
      ...(args.designSystemId !== undefined && { designSystemId: args.designSystemId }),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await ctx.db.get(args.id);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
    });
  },
});
