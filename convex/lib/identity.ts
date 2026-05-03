import type { QueryCtx, MutationCtx } from "../_generated/server";

export async function getUserIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return identity;
}

export async function requireAuth(ctx: MutationCtx | QueryCtx) {
  const identity = await getUserIdentity(ctx);
  if (!identity) {
    // Anonymous dev fallback — use a stable test user id
    return { tokenIdentifier: "anonymous:dev" };
  }
  return identity;
}
