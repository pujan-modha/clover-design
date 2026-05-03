# DesignForge — Full Spec

> **Open-ended creation platform** — build anything from dashboards to landing pages to full app prototypes
> Built on TanStack Start + Convex + Better Auth + TanStack AI + Redis + Stitch design system
> References: intern3-chat (Convex HTTP streaming + auth), Stitch skills (design system pipeline), DESIGN.md spec

## 1. Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Framework | TanStack Start (RC) — full-stack React, SSR, file-based routing | RC |
| Backend / Database | Convex — real-time queries, mutations, actions, file storage, scheduling | Production |
| Auth | Better Auth — Email OTP (passwordless), Google OAuth, GitHub OAuth | Production |
| Auth UI | `@daveyplate/better-auth-tanstack` + `@daveyplate/better-auth-ui` | Production |
| AI / Streaming | TanStack AI (alpha) — `@tanstack/ai`, `@tanstack/ai-react`, `@tanstack/ai-openrouter` | Alpha |
| Fallback AI | Direct OpenRouter REST API — for when TanStack AI alpha breaks | Production |
| State (Server) | TanStack Query — data fetching, cache, mutations | Production |
| State (Client) | TanStack Store — local UI state (canvas, tweaks, UI prefs, tool state) | Alpha |
| Router | TanStack Router (built into Start) — type-safe routes, middleware, loaders | Production |
| Rate Limiting / Throttle | TanStack Pacer — pacer, throttle, debounce | Beta |
| Preloading | TanStack Intent — prefetch on hover/intent | Alpha |
| Styling | Tailwind CSS v4, shadcn/ui | Production |
| Caching / Session Store | Redis (via Better Auth secondaryStorage) | Production |
| Dev fallback | In-memory session store (Redis not required for local dev) | Dev |
| Email | Resend (via Better Auth email hooks) | Production |
| Design System Spec | DESIGN.md (Google `@google/design.md` spec) — structured design tokens | Production |

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TanStack Start App                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  TanStack Router (file-based, /routes/)          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │   │
│  │  │ Auth     │ │ Canvas + │ │ Design System │       │   │
│  │  │ Pages    │ │ Chat     │ │ Manager       │  ... │   │
│  │  └──────────┘ └──────────┘ └───────────────┘   │   │
│  │                                                   │   │
│  │  TanStack Query (server state cache + Convex)     │   │
│  │  TanStack Store (client state: canvas, UI, tools) │   │
│  │  TanStack AI React (useChat hook)                  │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↕                                │
│  Convex React Client (real-time queries, mutations)     │
│  Better Auth Client (session, sign in/out)              │
└───────────────────────┬─────────────────────────────────┘
                        ↕
┌───────────────────────┴─────────────────────────────────┐
│                    Convex Backend                        │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │ Schema   │ │ Queries/     │ │ HTTP Actions     │    │
│  │ (tables) │ │ Mutations    │ │ (AI streaming)   │    │
│  └──────────┘ └──────────────┘ └──────────────────┘    │
│                       ↕                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  TanStack AI (server-side, @tanstack/ai)        │   │
│  │  → openrouterText adapter → streaming to client  │   │
│  │  [!] Fallback: direct OpenRouter REST API        │   │
│  └─────────────────────────────────────────────────┘   │
│                       ↕                                 │
│  Better Auth (auth handler) —— Drizzle —— Postgres DB   │
│  Redis (Better Auth secondaryStorage, optional in dev)  │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Convex for backend + real-time** — All data lives in Convex tables. Queries are reactive. Mutations are atomic. AI streaming runs via Convex HTTP actions (same pattern as intern3-chat). Convex is the **app database**.

2. **Better Auth as the auth layer with its OWN database** — Better Auth is SEPARATE from Convex. It uses its own Postgres database via Drizzle ORM (storing users, sessions, accounts, verifications). Convex validates Better Auth JWTs via `auth.config.ts`. This is a critical architectural split:
   - **Convex DB**: app data (projects, chat messages, design systems, canvas state)
   - **Better Auth DB (Postgres)**: auth data (users, sessions, OAuth accounts, email verifications)
   - **Bridge**: Better Auth issues JWTs → Convex validates them via JWKS endpoint

3. **Better Auth route handler for TanStack Start** — Better Auth's API endpoints (`/api/auth/*`) need to be served. In TanStack Start, this is done via a **server route**:
   ```
   app/routes/api/auth/$.ts → proxy to Better Auth handler
   ```
   Better Auth's `auth.handler` processes all auth endpoints (sign-in, OAuth callback, email verification, sessions, JWKS).

4. **TanStack AI for AI streaming** — `@tanstack/ai` server-side for tool calling + streaming. `@tanstack/ai-react` for client-side `useChat` hook. OpenRouter adapter (massive model selection).

5. **TanStack AI fallback plan** — Since TanStack AI is alpha, a direct OpenRouter REST API fallback is ready:
   - Server function calls OpenRouter `/v1/chat/completions` with `stream: true`
   - Returns SSE response to client
   - Client processes raw SSE events and builds message parts
   - This ensures app works even if `@tanstack/ai` breaks

6. **TanStack Query + Convex hybrid** — Convex `useQuery`/`useMutation` for real-time data. `@convex-dev/react-query` for Convex-backed TanStack Query integration. TanStack Query for auth session state and cross-cutting caching.

7. **Design System as first-class feature** — Users can create, reference, and apply design systems to their canvas:
   - **DESIGN.md format** (Google `@google/design.md` spec) — structured tokens (colors, typography, spacing, components)
   - **Token reference system** — `${colors.primary}`, `${typography.h1.fontFamily}` — apply tokens to generated designs
   - **Stitch integration** — export DESIGN.md to Stitch-compatible prompts for visual generation
   - **Design system browser** — browse available design systems, preview tokens, assign to projects

8. **Redis via Better Auth secondaryStorage** — Session caching, rate limiting. Not required for local dev — falls back to in-memory.

## 3. Data Model

### Convex Schema (app data)

#### projects
```typescript
{
  _id: Id<"projects">,
  name: string,
  description: string | null,
  authorId: string, // Better Auth user ID
  canvasContent: {} | null, // current canvas state (serialized)
  designSystemId: Id<"designSystems"> | null,
  createdAt: number,
  updatedAt: number,
  deletedAt: number | null, // soft delete
}
// Indexes: byAuthorId, byAuthorAndUpdatedAt
```

#### chatMessages
```typescript
{
  _id: Id<"chatMessages">,
  projectId: Id<"projects">,
  authorId: string,
  role: "user" | "assistant" | "system",
  content: string,
  parts: array, // structured UI parts (text, tool-call, tool-result, reasoning)
  metadata: {} | null, // model info, tokens, timing
  createdAt: number,
  updatedAt: number,
}
// Indexes: byProjectId, byProjectIdAndCreatedAt
```

#### designSystems
```typescript
{
  _id: Id<"designSystems">,
  authorId: string,
  name: string,
  status: "draft" | "published",
  isDefault: boolean,
  source: "manual" | "ai-extracted" | "uploaded",
  // DESIGN.md format tokens
  designMd: string | null, // raw DESIGN.md file content
  tokens: DesignTokens, // parsed token values
  assets: array<DesignAsset>, // reference screenshots, style guides
  createdAt: number,
  updatedAt: number,
}
// Indexes: byAuthorId, byAuthorAndUpdatedAt
```

#### canvasSnapshots
```typescript
{
  _id: Id<"canvasSnapshots">,
  projectId: Id<"projects">,
  name: string,
  content: {}, // full canvas state at snapshot time
  createdAt: number,
}
// Indexes: byProjectId
```

### Better Auth Database (Postgres, separate from Convex)

Better Auth manages its own schema via Drizzle ORM:
- `user` — id, name, email, emailVerified, image, createdAt, updatedAt
- `session` — id, userId, token, expiresAt, ipAddress, userAgent, createdAt
- `account` — id, userId, accountId, providerId, accessToken, refreshToken, idToken, expiresAt, password, createdAt
- `verification` — id, identifier, value, expiresAt, createdAt

### DesignTokens (embedded in designSystems)
```typescript
{
  colors: Record<string, string>,        // e.g. { "primary": "#1A1C1E", "tertiary": "#B8422E" }
  typography: {
    fontFamily: string,
    sizes: Record<string, string>,       // e.g. { "h1": "3rem", "body": "1rem" }
    weights: Record<string, number>,
    lineHeight: Record<string, string>,
  },
  spacing: Record<string, number>,
  borderRadius: Record<string, number>,
  shadows: Record<string, string> | null,
}
```

## 4. Route Structure (TanStack Router)

```
/routes/
  __root.tsx                     - Root layout, providers (Convex, Better Auth, Query, AI)
  index.tsx                      - Home — project grid
  _auth/                         - Auth group (public routes)
    login.tsx                    - Sign in (Better Auth pages)
    register.tsx                 - Sign up
  _dashboard/                    - Dashboard group (protected routes)
    projects/
      index.tsx                  - Project list
      $projectId.tsx             - Project workspace (chat + canvas + design system sidebar)
    design-systems/
      index.tsx                  - Design system library (browse / create / import)
      $systemId.tsx              - Single design system detail, editor, token viewer
    settings.tsx                 - User settings
```

## 5. Auth Flow

### Better Auth — Three Providers

1. **Email OTP (passwordless)** — Primary auth method. User enters email → OTP sent via Resend → code verified → session created. NO password.
2. **Google OAuth** — Standard OAuth flow.
3. **GitHub OAuth** — Standard OAuth flow.

### Better Auth Server Setup

Better Auth needs its own server configuration with Drizzle adapter pointing to Postgres:

```typescript
// lib/auth.ts (server-side)
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/postgres-js"
import { emailOTP } from "better-auth/plugins/email-otp"   // dedicated import for tree-shaking

export const auth = betterAuth({
  database: drizzleAdapter(drizzle(postgresClient), {
    provider: "pg",
    schema: { ... }
  }),
  plugins: [emailOTP()],
  socialProviders: {
    google: { ... },
    github: { ... },
  },
  advanced: {
    generateId: () => crypto.randomUUID(),
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
})
```

### TanStack Start — Route Handler for Better Auth

Better Auth endpoints must be served at `/api/auth/*`. In TanStack Start:

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

### Convex auth.config.ts — JWT Validation

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
```

> [!NOTE]
> `BETTER_AUTH_URL` inside Convex functions comes from Convex env vars (set via `npx convex env set`), NOT from `.env.local`. These are separate environments.

### RS256 Key Setup

Better Auth auto-generates RS256 JWKS keys at runtime for JWT signing. The JWKS endpoint is served automatically by the Better Auth handler at `/api/auth/jwks` — no manual key generation needed.

For production, ensure the `BETTER_AUTH_SECRET` is set to a stable value so keys are deterministic across restarts.

### TanStack Router Auth Protection

```typescript
// Group route file: src/routes/_dashboard.tsx
export const Route = createFileRoute("/_dashboard")({
  beforeLoad: async ({ location }) => {
    const session = await getSession()  // from @daveyplate/better-auth-tanstack
    if (!session) throw redirect({ to: "/login", search: { redirect: location.href } })
  },
})
```

## 6. AI Generation Pipeline

Based on intern3-chat's Convex HTTP action streaming pattern + TanStack AI:

### Primary Path (TanStack AI)
1. User sends prompt in chat → `useChat` from `@tanstack/ai-react`
2. `useChat` calls Convex HTTP action (`POST /chat/projects/:id/generate`)
3. Convex HTTP action:
   - Saves user message to Convex
   - Calls `streamText` via `@tanstack/ai` with OpenRouter adapter
   - Streams tokens back through Convex response
   - Uses `createDataStream` for structured streaming (text, tool-calls, reasoning)
4. Client receives streaming tokens via the Convex HTTP response
5. On completion, final message is saved to Convex

### Fallback Path (Direct OpenRouter)
1. If TanStack AI alpha breaks, server function calls OpenRouter REST API directly
2. `POST https://openrouter.ai/api/v1/chat/completions` with `stream: true`
3. Client processes raw SSE events manually
4. Parts are constructed from the delta chunks
5. Message is persisted via Convex mutation

### Design Generation (Special Case)
- Prompt is enhanced with design system context (DESIGN.md tokens, anti-pattern rules from stitch-design-taste)
- System prompt explicitly bans AI design clichés (see §10 Anti-Patterns)
- Output rendered live in iframe canvas
- Results streamed as structured data, parsed into canvas content

### Toolkit System
- Modular tools registered per-model (web search, image gen, design system lookup, canvas edit)
- Pattern from intern3-chat: tools registered in a map keyed by tool name
- Each tool has schema, execute function, and description

## 7. Design Systems Feature

Users can reference, create, and apply design systems — this is a core feature built on the DESIGN.md spec:

### Design System Sources
1. **Create from scratch** — User defines tokens (colors, typography, spacing) in a structured editor
2. **AI-extracted** — User pastes a URL or uploads a screenshot → AI extracts tokens and generates a DESIGN.md
3. **Upload DESIGN.md** — Direct upload of a valid `@google/design.md` spec file
4. **From Stitch** — Import from existing Stitch projects via Stitch MCP

### DESIGN.md Format (Google Spec)
The `@google/design.md` spec has YAML front matter for tokens + markdown body for rationale:
```md
---
version: alpha
name: Heritage
description: Architectural minimalism meets journalistic gravitas.
colors:
  primary: "#1A1C1E"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: "Public Sans"
    fontSize: 3rem
    fontWeight: 700
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "#FFFFFF"
---
## Overview
...

## Colors
- Primary (#1A1C1E): Deep ink for headlines
- Tertiary (#B8422E): "Boston Clay" — the sole driver for interaction
```

### Applying Design Systems to Canvas
- Select a design system for the current project
- AI prompts automatically include the selected system's tokens
- Live preview shows designs rendered with the system's tokens
- Theme variables injected into the preview iframe

### Stitch Integration
- Export DESIGN.md → Stitch-compatible design prompt
- Use `stitch-design` skill patterns for prompt enhancement
- Use `enhance-prompt` patterns for vague → structured prompts
- Reference `stitch-design-taste` anti-patterns for premium output
- Generate visual screens via Stitch MCP (optional, Stitch API required)

## 8. Real-time Canvas

Canvas is refreshed reactively through Convex queries:
- `useQuery(api.projects.getCanvas, { projectId })` — auto-updates when canvas changes
- Edits go through Convex mutations
- Canvas state in TanStack Store for local UI (zoom, grid, mode toggles, tool selection)
- AI streaming updates canvas progressively via `useChat` message parts
- Debounced saves via TanStack Pacer (debounce canvas saves by 500ms)

## 9. Environment Variables

```env
# Convex
VITE_CONVEX_URL=https://your-project.convex.cloud  # Convex deployment URL (Vite-based)

# Better Auth
BETTER_AUTH_SECRET=***                              # rand -base64 32
BETTER_AUTH_URL=http://localhost:3000               # Server URL, must match production in prod

# Convex also needs BETTER_AUTH_URL for JWT validation (set separately):
#   npx convex env set BETTER_AUTH_URL http://localhost:3000

# Better Auth — Email OTP
RESEND_API_KEY=re_***                               # For sending OTP emails

# Better Auth — OAuth
GITHUB_CLIENT_ID=***
GITHUB_CLIENT_SECRET=***
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***

# Redis (Better Auth secondaryStorage, optional in dev)
REDIS_URL=redis://localhost:6379

# OpenRouter (AI)
VITE_OPENROUTER_API_KEY=***                         # TanStack AI + fallback

# Database (Better Auth — separate Postgres via Drizzle)
DATABASE_URL=postgres://user:pass@localhost:5432/designforge
```

## 10. Design Anti-Patterns (from stitch-design-taste)

These rules MUST be encoded in the design generation system prompt to avoid AI-generated clichés:

**BANNED (never use):**
- ❌ Emojis in UI
- ❌ `Inter` font — use distinctive fonts (Geist, Outfit, Satoshi, Cabinet Grotesk)
- ❌ Generic serif fonts (Times New Roman, Georgia, Garamond) — distinctive modern serifs only
- ❌ Pure black `#000000` — use off-black, zinc-950, or charcoal
- ❌ Neon/outer glow shadows
- ❌ Oversaturated accents (saturation < 80%)
- ❌ Excessive gradient text on large headers
- ❌ Custom mouse cursors
- ❌ Overlapping elements — clean spatial separation always
- ❌ 3-column equal card layouts (boring)
- ❌ Generic names ("John Doe", "Acme Corp", "Nexus")
- ❌ Fake round numbers (99.99%, 50%+)
- ❌ AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize")
- ❌ Filler UI text ("Scroll to explore", "Swipe down")
- ❌ Broken image links — use picsum.photos or inline SVG
- ❌ Centered Hero sections in high-variance designs

## 11. Design Language (from original claude-design-clone)

Warm editorial minimalism with premium material finishes:

- **Colors**: Warm parchment (#f8f7f4), terracotta accent (#c96442), dark sidebar (#1a1917)
- **Typography**: Fraunces (serif, headlines), DM Sans (sans, body), JetBrains Mono (mono)
- **Spatial**: 8px base unit, 6/10/16/24px border radii, ring-based shadows
- **Motion**: 200ms ease-out panels, 300ms staggered fade-in generation, 150ms hovers
- **Layout**: Three-panel (chat sidebar 320px | canvas flex | tweaks panel right-bottom)

> Tokens for this design language should be formalized in a DESIGN.md file at project root.

## 12. Implementation Phases

### Phase 1: Foundation
- [ ] Scaffold TanStack Start project with pnpm
- [ ] Set up Convex dev deployment + schema
- [ ] Set up Better Auth with Postgres (Drizzle + separate DB)
- [ ] Better Auth route handler at `/api/auth/$`
- [ ] Better Auth auto-generates JWKS keys (no manual key step needed)
- [ ] Convex auth.config.ts with Better Auth JWT validation
- [ ] Set up TanStack Query + Router
- [ ] Create root layout with providers (Convex + Query + Auth + AI)
- [ ] Basic auth pages (login/register via better-auth-ui)
- [ ] Home page with project grid
- [ ] Tailwind v4 + shadcn/ui base
- [ ] Design language DESIGN.md file at project root

### Phase 2: Core Features
- [ ] Project CRUD (Convex mutations + queries)
- [ ] Chat panel (TanStack AI + Convex HTTP streaming with fallback)
- [ ] Canvas with iframe rendering
- [ ] AI design generation pipeline with anti-pattern rules
- [ ] Real-time canvas updates via Convex
- [ ] TanStack Store for canvas UI state (zoom, grid, modes)
- [ ] TanStack Pacer for debounced saves + rate limited AI calls
- [ ] TanStack Intent for prefetching project data

### Phase 3: Design System Feature
- [ ] Design system CRUD (Convex)
- [ ] DESIGN.md token editor / viewer
- [ ] AI-extracted design systems (URL → tokens)
- [ ] Token application to canvas (theme injection into preview iframe)
- [ ] Design system browser with preview cards
- [ ] Token reference syntax (`${colors.primary}`) in AI prompts

### Phase 4: Polish & Extras
- [ ] Canvas snapshots / version history
- [ ] Export (HTML, React components, ZIP)
- [ ] Share links with view-only mode
- [ ] Canvas collaboration (Convex presence)
- [ ] Stitch integration (optional API-based design generation)
- [ ] Custom domains (via zrok)
