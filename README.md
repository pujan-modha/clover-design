# DesignForge

Open-ended creation platform. Build anything from dashboards to landing pages to full app prototypes with AI assistance.

## Stack

- **Framework**: TanStack Start (RC) — full-stack React, SSR, file-based routing
- **Backend/DB**: Convex — real-time queries, mutations, HTTP actions, file storage
- **Auth**: Better Auth — Email OTP (passwordless), Google OAuth, GitHub OAuth
- **AI/Streaming**: OpenRouter SSE via Convex HTTP actions
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Design System**: DESIGN.md token spec (Google `@google/design.md`)

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm

### Install

```bash
pnpm install
```

### Environment Variables

Copy `.env.local` and fill in the required values:

```bash
cp .env.local .env.local.production  # or just edit .env.local
```

Required:
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `OPENROUTER_API_KEY` — get from openrouter.ai
- `RESEND_API_KEY` — for email OTP (optional in dev)
- OAuth credentials — for social login (optional)

### Start Convex (in a separate terminal)

```bash
npx convex dev
```

### Start the App

```bash
pnpm dev
```

## Project Structure

```
convex/                      # Convex backend
  schema.ts                  # Database schema
  auth.config.ts             # JWT validation (Better Auth)
  projects.ts                # Project CRUD
  chatMessages.ts            # Chat message CRUD
  chat/
    post.route.ts            # AI streaming HTTP action
  http.ts                    # HTTP route registration
  lib/
    identity.ts              # Auth helpers
src/
  routes/                    # TanStack Router file-based routes
  components/
    ui/                      # shadcn/ui components
    chat/                    # Chat panel
    canvas/                  # Canvas preview
  lib/
    auth-client.ts           # Better Auth client
    convex.ts                # Convex client
    stores/                  # TanStack Store definitions
  hooks/
    useChatStream.ts         # Custom SSE chat hook
lib/
  auth.ts                    # Better Auth server config
DESIGN.md                    # Design language spec
```

## Architecture

### Auth Flow
1. User signs in via Email OTP or OAuth
2. Better Auth issues RS256 JWT
3. Convex validates JWT via `auth.config.ts`
4. All Convex functions check `ctx.auth.getUserIdentity()`

### AI Streaming
1. User sends message → saved to Convex
2. Frontend calls Convex HTTP action (`/chat/projects/:id/generate`)
3. HTTP action streams from OpenRouter SSE
4. Frontend receives chunks and renders in real-time
5. Final message saved to Convex when stream ends

### Canvas
- Renders HTML in a sandboxed iframe
- Supports zoom, grid overlay
- AI-generated code is injected into the iframe

## Design System

See `DESIGN.md` for the full token spec. Key values:
- **Colors**: parchment, terracotta, ink, stone, linen, cream
- **Typography**: Fraunces (display), DM Sans (body), JetBrains Mono (mono)
- **Spacing**: 8px base grid

## Phase Status

- [x] Phase 1: Foundation (scaffold, auth, Convex, routes, design system)
- [x] Phase 2: Core Features (chat, AI streaming, canvas, stores)
- [ ] Phase 3: Design System Feature (token editor, AI extraction, apply)
- [ ] Phase 4: Polish (export, snapshots, share, collaboration)
