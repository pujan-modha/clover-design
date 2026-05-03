import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

export async function getUserIdentity(ctx: QueryCtx | MutationCtx | ActionCtx) {
  return await ctx.auth.getUserIdentity();
}

export async function requireAuth(ctx: MutationCtx | QueryCtx | ActionCtx) {
  const identity = await getUserIdentity(ctx);
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function getAuthUserId(ctx: MutationCtx | QueryCtx | ActionCtx) {
  const identity = await requireAuth(ctx);
  return identity.tokenIdentifier;
}
