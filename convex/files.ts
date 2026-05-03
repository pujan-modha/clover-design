import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/* ── Upload URL generation ── */

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/* ── Record file metadata after upload ── */

export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  returns: v.id("files"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("files", {
      ...args,
      authorId: identity.tokenIdentifier,
      createdAt: Date.now(),
    });
  },
});

/* ── Queries ── */

export const listByProject = query({
  args: { projectId: v.id("projects") },
  returns: v.array(v.any()),
  handler: async (ctx, { projectId }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("byProjectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();

    // Attach public URLs
    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});

export const listByAuthor = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const files = await ctx.db
      .query("files")
      .withIndex("byAuthorId", (q) => q.eq("authorId", identity.tokenIdentifier))
      .order("desc")
      .take(50);

    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});

export const get = query({
  args: { fileId: v.id("files") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) return null;
    return {
      ...file,
      url: await ctx.storage.getUrl(file.storageId),
    };
  },
});

/* ── Delete ── */

export const remove = mutation({
  args: { fileId: v.id("files") },
  returns: v.null(),
  handler: async (ctx, { fileId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const file = await ctx.db.get(fileId);
    if (!file || file.authorId !== identity.tokenIdentifier) {
      throw new Error("File not found or unauthorized");
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(fileId);
    return null;
  },
});
