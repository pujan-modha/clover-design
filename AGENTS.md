# DesignForge — AGENTS.md

> Open-ended creation platform. TanStack Start + Convex + Better Auth + TanStack AI + Redis + DESIGN.md design system
> Reference: intern3-chat for Convex/AI/streaming patterns

## Required Skills — Load BEFORE Working on Each Domain

### TanStack Start setup / routing / SSR
- `tanstack-start-best-practices` — Server functions, middleware, SSR, file organization, deployment

### TanStack Query caching / mutations
- `tanstack-query-best-practices` — Query keys, caching, mutations, error handling, prefetching

### Convex schema / queries / mutations
- `convex-quickstart` — Project setup, provider wiring, dev loop
- `convex` — General routing for Convex tasks
- `convex-create-component` — Reusable Convex component patterns
- `convex-migration-helper` — Schema migrations (needed for phase transitions)
- `convex-performance-audit` — Query/mutation performance

### Convex Auth integration
- `convex-setup-auth` — Auth provider setup, identity mapping, access control

### Better Auth
- `better-auth-best-practices` — Server config, database adapters, plugins, security
- `create-auth-skill` — Full auth scaffolding flow
- `better-auth-security-best-practices` — Security hardening

> [!IMPORTANT]
> This app uses **Email OTP (passwordless)** via the `emailOTP` plugin, NOT email+password. Do NOT load `email-and-password-best-practices` — it describes a different flow.

### Frontend / React
- `vercel-react-best-practices` — React patterns, hooks, component organization
- `web-design-guidelines` — UI/UX guidelines
- `react-components` — Stitch-to-React component conversion patterns (for component extraction from Stitch output)

### Design System & Visual Design
- `design-md` — Google `@google/design.md` token spec format (authoring, linting, exporting)
- `stitch-design-taste` — Premium design system generation rules, anti-patterns, color/typography standards
- `stitch-design` — Stitch design workflow (prompt enhancement, DESIGN.md synthesis, screen gen)
- `stitch-loop` — Iterative baton-passing site-building pattern (for reference on Stitch integration)
- `enhance-prompt` — Transforming vague UI ideas into structured, Stitch-optimized prompts
- `canvas-design` — Design philosophy / visual art creation (for high-quality design inspiration)

### CRITICAL: Check TanStack Solution First

Before implementing ANY feature, check if a TanStack solution exists:
1. **State management** → TanStack Store before Zustand/Redux
2. **Data fetching** → TanStack Query before raw fetch
3. **Rate limiting** → TanStack Pacer before custom implementations
4. **Preloading** → TanStack Intent before custom prefetch
5. **AI** → TanStack AI before Vercel AI SDK
6. **Database access** → TanStack DB before raw SQL
7. **Forms** → TanStack Form before react-hook-form
8. **Routing** → TanStack Router (built-in with Start)
9. **Virtualization** → TanStack Virtual before react-virtualized

> Note: TanStack Store, Pacer, and Intent have no installable skills yet. Consult their npm/docs directly.

## CRITICAL Architecture Decisions

### 1. Two Databases — Convex + Postgres

This is the most important architectural split:

| What | Database | Why |
|------|----------|-----|
| App data (projects, messages, design systems, canvas) | **Convex** | Real-time, reactive, file storage, built-in auth |
| Auth data (users, sessions, OAuth accounts, verifications) | **Postgres** via Better Auth + Drizzle | Better Auth requires a relational DB. Convex is not relational enough for auth schema (user → session → account → verification join patterns) |

**Bridge mechanism:** Better Auth issues RS256 JWTs. Convex validates them via `auth.config.ts` pointing at Better Auth's JWKS endpoint.

### 2. Better Auth Route Handler in TanStack Start

Better Auth serves its API at `/api/auth/*`. In TanStack Start, this requires a server route:
```typescript
// src/routes/api/auth/$.ts
// Catches all /api/auth/* requests and passes to Better Auth handler
import { createAPIFileRoute } from "@tanstack/start/api"
import { auth } from "../../../lib/auth"

export const Route = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
})
```

> [!NOTE]
> `createAPIFileRoute` is the TanStack Start RC pattern. If the import changes in a newer release, adjust accordingly. The key mechanism is a catch-all route at `/api/auth/$` that delegates to `auth.handler`.

### 3. Email OTP (Passwordless) — NOT Email+Password

Auth is entirely passwordless. No email+password plugin. Only:
- `emailOTP` plugin — sends OTP via Resend
- Google OAuth
- GitHub OAuth

### 4. RS256 Key Setup

Better Auth auto-generates RS256 JWKS keys at runtime for JWT signing. The JWKS endpoint is served automatically by the Better Auth handler at `/api/auth/jwks` — no manual key generation needed.

For production, ensure the `BETTER_AUTH_SECRET` is set to a stable value so keys are deterministic across restarts.

Convex auth.config.ts references `BETTER_AUTH_URL/api/auth/jwks` — this env var must be set in the Convex runtime separately: `npx convex env set BETTER_AUTH_URL <url>`

### 5. TanStack Start Convex URL

TanStack Start (Vite-based) uses a single Convex env var:

```
VITE_CONVEX_URL=https://your-project.convex.cloud
```

### 6. TanStack AI Alpha — Fallback Required

TanStack AI (`@tanstack/ai`) is alpha. Implement a **dual-path** system:

**Primary:** TanStack AI `streamText` + `createDataStream` → Convex HTTP action → SSE to client
**Fallback:** Direct OpenRouter REST API → Server function → SSE to client

Detection: Wrap the TanStack AI call in a try/catch. If it throws a module-not-found or API mismatch, switch to fallback. This is configured at the model level, not globally.

### 7. Redis Optional in Dev

Better Auth supports Redis for secondaryStorage (session caching). In development:
- If `REDIS_URL` is set → use Redis
- If not set → fall back to in-memory session store (Better Auth default)
- No Redis required for local development

### 8. Convex HTTP Actions for AI Streaming

AI streaming MUST use Convex HTTP actions (not mutations, not server functions). Pattern from intern3-chat:

```typescript
// convex/chat/post.route.ts
export const chatPOST = httpAction(async (ctx, req) => {
  const body = await req.json()
  // 1. Verify Better Auth JWT via ctx.auth
  // 2. Save user message to Convex
  // 3. streamText via TanStack AI (or fallback)
  // 4. Return Response with SSE stream
})
```

### 9. Design System Token Application

Design system tokens (from DESIGN.md) are applied to the canvas via:
1. **AI prompt injection** — active design system tokens are injected into the AI system prompt as context
2. **CSS variable injection** — tokens become CSS custom properties in the preview iframe
3. **Token reference syntax** — `${colors.primary}`, `${typography.h1.fontFamily}` in user prompts

## Key Files Structure

```
designforge/
├── convex/                        # Convex backend
│   ├── schema.ts                  # DB schema (app data only)
│   ├── auth.config.ts             # Better Auth JWT validation
│   ├── projects.ts                # Project queries + mutations
│   ├── chatMessages.ts            # Messages CRUD
│   ├── designSystems.ts           # Design system CRUD
│   ├── canvasSnapshots.ts         # Version snapshots
│   ├── chat/
│   │   ├── post.route.ts          # AI streaming HTTP action
│   │   ├── prompt.ts              # System prompt builder (with design system context)
│   │   └── generate.ts            # Design generation helper + anti-pattern rules
│   └── lib/
│       ├── identity.ts            # getUserIdentity from Better Auth JWT
│       └── models.ts              # Model definitions (primary + fallback)
├── src/
│   ├── routes/
│   │   ├── __root.tsx             # Root layout + providers
│   │   ├── index.tsx              # Home / project grid
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── $.tsx          # Better Auth route handler
│   │   ├── _auth/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   └── _dashboard/
│   │       ├── projects/
│   │       │   ├── index.tsx
│   │       │   └── $projectId.tsx  # Chat + canvas + design system bar
│   │       ├── design-systems/
│   │       │   ├── index.tsx
│   │       │   └── $systemId.tsx
│   │       └── settings.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── canvas/                # Canvas, toolbar, preview iframe
│   │   ├── chat/                  # Chat panel, messages, input, streaming
│   │   ├── design-systems/        # Token viewer, editor, browser cards
│   │   └── projects/              # ProjectCard, grid
│   ├── lib/
│   │   ├── auth-client.ts         # Better Auth client (emailOTP plugin)
│   │   ├── convex.ts              # ConvexReactClient
│   │   ├── stores/                # TanStack Store definitions (canvas, ui, tools)
│   │   └── utils.ts               # cn(), token reference parser, etc.
│   └── styles/
│       └── globals.css            # Tailwind v4
├── lib/                           # Server-only utilities
│   ├── auth.ts                    # Better Auth server config (Drizzle + plugins)
│   └── db.ts                      # Drizzle/Postgres connection for Better Auth
├── app.config.ts                  # TanStack Start config
├── package.json
├── DESIGN.md                       # Project design language tokens
└── .env.local
```

## Patterns from intern3-chat Reference

### Convex HTTP Action for AI Streaming
```typescript
// convex/chat/post.route.ts
import { httpAction } from "../_generated/server"
import { createDataStream, streamText } from "@tanstack/ai"
import { openrouterText } from "@tanstack/ai-openrouter"

export const chatPOST = httpAction(async (ctx, req) => {
  const body = await req.json()
  // Auth check via ctx.auth
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return new Response("Unauthorized", { status: 401 })
  
  // Save user message
  await ctx.runMutation(api.chatMessages.saveMessage, {
    projectId: body.projectId,
    role: "user",
    content: body.message,
  })
  
  // Build system prompt with design system context
  const systemPrompt = await buildPrompt(ctx, body.projectId)
  
  // Stream with TanStack AI
  const stream = createDataStream({
    execute: async (dataStream) => {
      try {
        const result = streamText({
          model: openrouterText(body.model),
          messages: [...systemPrompt, ...body.messages],
          tools: toolkit,
        })
        dataStream.merge(result.fullStream)
        await result.consumeStream()
      } catch (e) {
        // FALLBACK: direct OpenRouter
        await fallbackOpenRouter(dataStream, body, systemPrompt)
      }
    },
  })
  
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: { "Content-Type": "text/event-stream" },
  })
})
```

### Convex + Better Auth Integration
```typescript
// convex/auth.config.ts
export default {
  providers: [{
    type: "customJwt",
    applicationID: "designforge",
    issuer: process.env.BETTER_AUTH_URL,           // Set via: npx convex env set BETTER_AUTH_URL <url>
    jwks: `${process.env.BETTER_AUTH_URL}/api/auth/jwks`,
    algorithm: "RS256",
  }]
}

// src/lib/auth-client.ts
import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
  plugins: [emailOTPClient()]
})
```

## Phase 1 Checklist (Do This First)

- [ ] `pnpm create tanstack-app designforge` — scaffold TanStack Start
- [ ] Add Convex: `pnpx convex dev`
- [ ] Add Better Auth: `pnpm add better-auth @better-auth/kit` + Drizzle + Postgres
- [ ] Better Auth auto-generates JWKS keys (no manual key step needed)
- [ ] Create `src/routes/api/auth/$.ts` — Better Auth handler
- [ ] Create `convex/auth.config.ts` — JWT validation
- [ ] Create `lib/auth.ts` — Better Auth server config
- [ ] Create `lib/db.ts` — Drizzle connection
- [ ] Create `convex/schema.ts` — projects, chatMessages, designSystems, canvasSnapshots
- [ ] Wire providers in `__root.tsx` (Convex + Query + Auth + AI)
- [ ] Add Tailwind v4: `pnpm add tailwindcss @tailwindcss/postcss`
- [ ] Add shadcn/ui: `pnpx shadcn@latest init`
- [ ] Create `_auth/login.tsx` and `_auth/register.tsx` with better-auth-ui
- [ ] Create `_dashboard.tsx` with `beforeLoad` auth guard
- [ ] Create `convex/projects.ts` — basic CRUD
- [ ] Home page with project list
- [ ] Create project root `DESIGN.md` with design language tokens
- [ ] Initialize git repo

## AI Generation System Prompt Anti-Pattern Rules

The system prompt for design generation MUST include these banned patterns:

```
DESIGN RULES - NEVER DO:
- No emojis in UI
- No Inter font (use Geist, Satoshi, Outfit, or Cabinet Grotesk)
- No generic serif fonts (Times New Roman, Georgia, Garamond)
- No pure black (#000000) - use off-black or charcoal
- No neon/outer glow shadows
- No oversaturated accents
- No 3-column equal card layouts
- No overlapping elements
- No AI copywriting clichés (elevate, seamless, unleash, next-gen)
- No filler UI text ("scroll to explore", "swipe down")
- No centered Hero sections in asymmetric/high-variance designs
- No generic placeholder names (John Doe, Acme Corp)
```

## Stitch Skill Usage Guide

These skills enhance design generation but are NOT required for the core app:

| Skill | When to Use |
|-------|-------------|
| `stitch-design-taste` | Creating DESIGN.md files, defining design system rules, encoding anti-patterns |
| `stitch-design` | When doing Stitch MCP screen generation (optional feature) |
| `stitch-loop` | For autonomous multi-page site building with Stitch (reference only) |
| `enhance-prompt` | When building the design prompt enhancement feature |
| `react-components` | When converting Stitch-generated screens to React components |
| `canvas-design` | For design philosophy inspiration / high-quality visual design references |
| `design-md` | For authoring, linting, and exporting DESIGN.md spec files |
