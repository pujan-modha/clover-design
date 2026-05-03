import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/identity";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    return await ctx.db
      .query("designSystems")
      .withIndex("byAuthorId", (q) => q.eq("authorId", identity.tokenIdentifier))
      .order("desc")
      .take(100);
  },
});

export const get = query({
  args: { id: v.id("designSystems") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const ds = await ctx.db.get(args.id);
    if (!ds || ds.authorId !== identity.tokenIdentifier) {
      return null;
    }
    return ds;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    designMd: v.optional(v.string()),
    tokens: v.optional(v.any()),
    source: v.optional(v.union(v.literal("manual"), v.literal("ai-extracted"), v.literal("uploaded"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const now = Date.now();

    // If this is the first design system for this user, make it default
    const existing = await ctx.db
      .query("designSystems")
      .withIndex("byAuthorId", (q) => q.eq("authorId", identity.tokenIdentifier))
      .take(1);
    const isDefault = existing.length === 0;

    return await ctx.db.insert("designSystems", {
      authorId: identity.tokenIdentifier,
      name: args.name,
      status: "draft",
      isDefault,
      source: args.source ?? "manual",
      designMd: args.designMd ?? null,
      tokens: args.tokens ?? defaultTokens(),
      assets: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("designSystems"),
    name: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    designMd: v.optional(v.string()),
    tokens: v.optional(v.any()),
    assets: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const ds = await ctx.db.get(args.id);
    if (!ds || ds.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.status !== undefined && { status: args.status }),
      ...(args.designMd !== undefined && { designMd: args.designMd }),
      ...(args.tokens !== undefined && { tokens: args.tokens }),
      ...(args.assets !== undefined && { assets: args.assets }),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("designSystems") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const ds = await ctx.db.get(args.id);
    if (!ds || ds.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

export const setDefault = mutation({
  args: { id: v.id("designSystems") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const ds = await ctx.db.get(args.id);
    if (!ds || ds.authorId !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }

    // Unset previous default
    const existing = await ctx.db
      .query("designSystems")
      .withIndex("byAuthorId", (q) => q.eq("authorId", identity.tokenIdentifier))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .take(100);

    for (const item of existing) {
      if (item._id !== args.id) {
        await ctx.db.patch(item._id, { isDefault: false });
      }
    }

    await ctx.db.patch(args.id, { isDefault: true });
  },
});

function defaultTokens() {
  return {
    colors: {
      primary: "#1A1C1E",
      secondary: "#8A8884",
      accent: "#C96442",
      background: "#F8F7F4",
      surface: "#FDFCFA",
      text: "#2A2927",
      muted: "#8A8884",
    },
    typography: {
      fontFamily: "DM Sans",
      sizes: {
        h1: "3rem",
        h2: "2.25rem",
        h3: "1.5rem",
        body: "1rem",
        small: "0.875rem",
      },
      weights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.1,
        normal: 1.6,
        relaxed: 1.75,
      },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 6,
      md: 10,
      lg: 16,
      xl: 24,
    },
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.05)",
      md: "0 4px 6px rgba(0,0,0,0.07)",
      lg: "0 10px 15px rgba(0,0,0,0.1)",
    },
  };
}
