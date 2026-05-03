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
      .query("shareTokens")
      .withIndex("byProjectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(20);
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    const token = crypto.randomUUID().replace(/-/g, "");
    return await ctx.db.insert("shareTokens", {
      projectId: args.projectId,
      token,
      name: args.name,
      createdAt: Date.now(),
      expiresAt: args.expiresAt ?? undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("shareTokens") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const st = await ctx.db.get(args.id);
    if (!st) throw new Error("Not found");
    const project = await ctx.db.get(st.projectId);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

// Public query - no auth required
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shareTokens")
      .withIndex("byToken", (q) => q.eq("token", args.token))
      .unique();
    if (!share) return null;
    if (share.expiresAt && share.expiresAt < Date.now()) return null;

    const project = await ctx.db.get(share.projectId);
    if (!project || project.deletedAt) return null;

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("byProjectIdAndCreatedAt", (q) =>
        q.eq("projectId", share.projectId)
      )
      .order("asc")
      .take(100);

    return { project, messages, shareName: share.name };
  },
});
