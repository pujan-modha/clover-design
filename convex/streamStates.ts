import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getByProject = query({
  args: { projectId: v.id("projects") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, { projectId }) => {
    const states = await ctx.db
      .query("streamStates")
      .withIndex("byProjectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(1);
    return states[0] ?? null;
  },
});

export const getRunning = query({
  args: { projectId: v.id("projects") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, { projectId }) => {
    const states = await ctx.db
      .query("streamStates")
      .withIndex("byProjectAndStatus", (q) => q.eq("projectId", projectId).eq("status", "running"))
      .order("desc")
      .take(1);
    return states[0] ?? null;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    authorId: v.string(),
    messages: v.array(v.any()),
    model: v.string(),
    providerId: v.string(),
    designSystemId: v.optional(v.id("designSystems")),
    skillId: v.optional(v.string()),
  },
  returns: v.id("streamStates"),
  handler: async (ctx, args) => {
    // Cancel any existing running streams for this project
    const existing = await ctx.db
      .query("streamStates")
      .withIndex("byProjectAndStatus", (q) => q.eq("projectId", args.projectId).eq("status", "running"))
      .collect();
    for (const s of existing) {
      await ctx.db.patch(s._id, { status: "paused", updatedAt: Date.now() });
    }

    return await ctx.db.insert("streamStates", {
      ...args,
      status: "running",
      content: "",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateContent = mutation({
  args: {
    streamStateId: v.id("streamStates"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { streamStateId, content }) => {
    await ctx.db.patch(streamStateId, {
      content,
      updatedAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: {
    streamStateId: v.id("streamStates"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { streamStateId, content }) => {
    await ctx.db.patch(streamStateId, {
      status: "completed",
      content,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const pause = mutation({
  args: {
    streamStateId: v.id("streamStates"),
  },
  returns: v.null(),
  handler: async (ctx, { streamStateId }) => {
    await ctx.db.patch(streamStateId, {
      status: "paused",
      updatedAt: Date.now(),
    });
  },
});

export const error = mutation({
  args: {
    streamStateId: v.id("streamStates"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { streamStateId, error }) => {
    await ctx.db.patch(streamStateId, {
      status: "error",
      error,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    streamStateId: v.id("streamStates"),
  },
  returns: v.null(),
  handler: async (ctx, { streamStateId }) => {
    await ctx.db.delete(streamStateId);
  },
});
