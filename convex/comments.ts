import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/identity";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await requireAuth(ctx);
    return await ctx.db
      .query("comments")
      .withIndex("byProjectId", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
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
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const now = Date.now();
    return await ctx.db.insert("comments", {
      ...args,
      authorId: identity.tokenIdentifier,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateText = mutation({
  args: {
    commentId: v.id("comments"),
    text: v.string(),
  },
  handler: async (ctx, { commentId, text }) => {
    await ctx.db.patch(commentId, {
      text,
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    commentId: v.id("comments"),
    status: v.union(v.literal("pending"), v.literal("applied")),
  },
  handler: async (ctx, { commentId, status }) => {
    await ctx.db.patch(commentId, {
      status,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    await ctx.db.delete(commentId);
  },
});
