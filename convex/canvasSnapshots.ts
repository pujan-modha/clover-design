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
      .query("canvasSnapshots")
      .withIndex("byProjectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(50);
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    content: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    return await ctx.db.insert("canvasSnapshots", {
      projectId: args.projectId,
      name: args.name,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("canvasSnapshots") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const snap = await ctx.db.get(args.id);
    if (!snap) throw new Error("Not found");
    const project = await ctx.db.get(snap.projectId);
    if (!project || project.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});
