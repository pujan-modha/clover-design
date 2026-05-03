# DesignForge Feature Audit
## Reference Repos: intern3-chat, open-design, open-codesign, huashu-design

---

## 1. AI PROVIDER / MODEL SYSTEM

### What intern3-chat has:
- **Core providers**: openai, anthropic, google, groq, fal — each with encrypted API keys stored per-user in Convex
- **Custom providers**: fully editable name, endpoint URL, API key, enabled toggle
- **Custom models**: user-defined modelId, providerId, contextLength, maxTokens, abilities array
- **Provider registry** (`getUserRegistryInternal`): dynamically builds available providers + models map at runtime
- **Model selector UI**: Command palette with provider icons, ability badges (reasoning/vision/web_search/image_generation), grouped by provider
- **Model store** (`lib/model-store.ts`): persisted selected model, reasoning effort per model
- **Adapter resolution** (`get_model.ts`): resolves `provider:modelId` to actual AI SDK provider instance with custom endpoints
- **Per-provider options**: google thinkingConfig, openai reasoningEffort, anthropic thinking budgetTokens
- **BYOK + internal keys**: `i3-*` prefix for internal API keys, plain prefix for user BYOK
- **Image generation models**: separate mode with size selection, tool-call mock UI
- **Title generation**: separate lightweight completion with configurable model
- **Token usage tracking**: promptTokens, completionTokens, reasoningTokens per message

### What open-design has:
- **Multi-adapter agent system**: Claude Code, Codex, Gemini, Cursor, OpenCode, Hermes, Kimi, Qwen, Copilot, Direct API
- **Capability-driven UI**: disables features adapter can't support
- **Model selection per adapter**: fallbackModels + dynamic listModels/fetchModels
- **Reasoning options**: Codex exposes none/minimal/low/medium/high/xhigh with per-model clamping
- **Direct API fallback**: Topology C runs Anthropic Messages API directly from browser

### What open-codesign has:
- **Provider compatibility layer**: Anthropic, OpenAI, OpenRouter, Claude Code imported, Codex, custom proxies
- **Wire-protocol abstraction**: `anthropic-messages`, `openai-completions`, `openai-responses`, `openai-codex-responses`
- **OAuth token refresh**: per-turn API key refresh with 5-min buffers
- **Reasoning self-healing**: auto-flips reasoning knob on mismatch errors
- **Canonical base URL normalization**: trailing slashes, endpoint suffixes

### What DesignForge CURRENTLY has:
- **Single hardcoded OpenRouter** in `convex/chat/post.route.ts` with `process.env.OPENROUTER_API_KEY`
- **No model selector UI** at all
- **No provider settings** stored in database
- **No custom endpoint support**
- **No custom model support**
- **No token usage tracking**
- **No reasoning effort controls**
- **No image generation mode**

### GAP: CRITICAL — This is what Pujan asked to fix first.

---

## 2. STREAMING / CHAT INFRASTRUCTURE

### What intern3-chat has:
- **Resumable streams**: `ResumableStream` table, `getResumableStreamContext`, stream ID tracking
- **Vercel AI SDK**: `createDataStream`, `streamText`, `smoothStream`, `experimental_transform`
- **Tool call streaming**: `toolCallStreaming: true`, real-time tool invocations
- **Manual stream transform**: custom pipeTransform handling text/reasoning/tool-call/tool-result/error/file parts
- **Message parts schema**: TextUIPart, ReasoningUIPart, ToolInvocationUIPart, FileUIPart, ErrorUIPart
- **Patch message during stream**: updates assistant message in DB as parts accumulate
- **Abort controller**: `remoteCancel` for client-side stop
- **Thread streaming state**: `isLive`, `streamStartedAt`, `currentStreamId`
- **Name generation**: async thread title generation after first message
- **Stream error handling**: `onError` callback marks thread not live
- **Image generation as tool call**: mock tool call with progress UI

### What open-design has:
- **SSE streaming**: daemon → web via SSE with tool-call/events
- **Session management**: per-web-tab sessions with active agent, skill, artifact
- **Artifact store**: plain files on disk + metadata + append-only history

### What open-codesign has:
- **pi-agent-core integration**: multi-turn agentic runtime with `Agent` class
- **Event streaming**: `turn_start`, `turn_end`, `message_update`, `tool_execution_start/end`
- **Sliding-window context pruning**: compacts old tool results
- **First-turn retry guard**: blocks retry if messages grew during attempt
- **Iframe pool with LRU**: one iframe per design, instant switching
- **Srcdoc builder**: vendored React 18 + Babel, sandbox shim, deck bridge, comment bridge

### What DesignForge CURRENTLY has:
- **Manual SSE parsing**: reads raw response body, parses `data:` lines manually
- **No parts system**: only plain text content, no tool calls, no reasoning, no images
- **No resumability**: stream dies if client disconnects
- **No abort controller exposed to UI properly**
- **No tool streaming**
- **Basic message storage**: only role/content/parts (parts as any array)
- **No thread system**: only per-project message list
- **No title generation**

### GAP: CRITICAL

---

## 3. SETTINGS / CONFIGURATION UI

### What intern3-chat has:
- **Settings page**: full provider management UI with tabs
- **Core AI providers**: toggle + API key input per provider
- **Custom AI providers**: add/edit/delete custom providers with name/endpoint/key
- **Custom models**: add/edit/delete custom models with all fields
- **General providers**: supermemory, firecrawl, tavily, brave, serper with per-provider configs
- **MCP servers**: add/edit/delete SSE/HTTP MCP servers with headers
- **Search provider selector**: firecrawl/brave/tavily/serper
- **Theme management**: custom theme URLs
- **Customization**: AI personality, additional context, user name
- **Onboarding**: dialog + provider
- **Encryption**: `encryptKey`/`decryptKey` for all API keys in DB

### What DesignForge CURRENTLY has:
- **NO settings UI at all**
- **NO provider management**
- **NO user customization**

### GAP: CRITICAL

---

## 4. DESIGN SYSTEM SYSTEM

### What intern3-chat has:
- None (it's a chat app, not a design tool)

### What open-design has:
- **DESIGN.md format**: 9-section schema (Visual Theme, Color Palette, Typography, Component Stylings, Layout Principles, Depth & Elevation, Do's and Don'ts, Responsive Behavior, Agent Prompt Guide)
- **Design-system resolver**: finds DESIGN.md in project, hot-reloads
- **Injection strategy**: system-prompt prefix, file in CWD, Mustache template variable
- **Swatch extraction**: parses colors from markdown to render picker thumbnails
- **Preview renderer**: builds showcase HTML page from DESIGN.md
- **Showcase renderer**: builds fully-formed product webpage from tokens
- **Standard tokens**: --bg, --surface, --fg, --muted, --border, --accent, --font-display, --font-body, --font-mono

### What open-codesign has:
- **Design system extraction**: `StoredDesignSystem` with colors, fonts, spacing, radius, shadows, sourceFiles
- **XML escaping**: wraps in `<untrusted_scanned_content>` to prevent prompt injection

### What DesignForge CURRENTLY has:
- **Basic designSystems table**: authorId, name, status, isDefault, source, designMd, tokens, assets
- **Basic token injection in prompt**: Colors, typography, spacing, borderRadius, shadows appended to system prompt
- **No DESIGN.md parser**
- **No showcase renderer**
- **No swatch extraction UI**
- **No token preview**

### GAP: MEDIUM — basic structure exists but needs polish

---

## 5. CANVAS / PREVIEW SYSTEM

### What open-design has:
- **Iframe sandbox**: `allow-scripts` only, no `allow-same-origin`
- **Srcdoc builder**: minimal doctype shell, base href, localStorage/sessionStorage polyfill
- **Renderer registry**: html, deck-html, react-component (vendored React 18 + Babel), markdown, svg
- **Hot-reload**: debounced 100ms on artifact writes
- **Multi-frame preview**: desktop/tablet/phone widths
- **Deck bridge**: horizontal scroll, class-toggle, visibility-only conventions
- **Comment bridge**: `[data-od-id]` and `[data-screen-label]` scanning, postMessage protocol
- **Export pipeline**: HTML blob, PDF (window.print), ZIP, Markdown, JSX, Project ZIP

### What open-codesign has:
- **Iframe pool LRU**: keeps recent designs in DOM (display:none), instant switching
- **Srcdoc builder**: vendored React 18 + ReactDOM + Babel, Google Fonts preloads, window-scoped components
- **Stable key optimization**: replaces EDITMODE content with `__STABLE__` for tweak updates
- **Viewport modes**: desktop, tablet, mobile (PhoneFrame with hardware chrome)
- **Zoom**: CSS transform:scale on wrapper
- **Interaction modes**: default (blocks navigation) and comment (hover/click selection)
- **Error handling**: IFRAME_ERROR postMessages surface in CanvasErrorBar
- **File tabs**: pinned Files tab + dynamic tabs from virtual FS

### What DesignForge CURRENTLY has:
- **Basic iframe**: writes HTML via `doc.open/write/close`, no srcdoc
- **No sandbox isolation**: uses `allow-scripts` but writes to contentDocument directly
- **No React/JSX runtime**: only plain HTML
- **No srcdoc builder**: no base href, no polyfills, no bridges
- **Zoom**: CSS transform scale
- **Grid overlay**: simple CSS grid background
- **No viewport modes**: fixed 1024px width
- **No file tabs**
- **No export pipeline**
- **No error handling from iframe**

### GAP: CRITICAL

---

## 6. COMMENT / ELEMENT SELECTION SYSTEM

### What open-design has:
- **Comment mode**: click captures elements with `[data-od-id]` or `[data-screen-label]`
- **Snapshot data**: elementId, selector, label, text, position (bounding rect), htmlHint
- **Comment attachment flow**: stored as PreviewComment, attached to next chat message as ChatCommentAttachment
- **XML formatting**: `<attached-preview-comments>` block appended to user message
- **Surgical edit instruction**: scoped context for agent to edit specific element
- **Adapter translation**: Claude Code native tool loop, weaker agents get regenerate constraint
- **Overlay rendering**: comment overlay bounds scaled to iframe size

### What open-codesign has:
- **Two comment kinds**: `note` (yellow) and `edit` (orange)
- **Scope**: `element` vs `global`
- **Edit statuses**: pending, applied, dismissed
- **Inline comment flow**: Comment mode → hover outline → click-to-pin → CommentBubble anchored at rect
- **PinOverlay**: numbered pins tracking live element positions via ELEMENT_RECTS postMessages
- **CommentsPanel**: slide-out sidebar listing all comments
- **Draft preservation**: bubbleDraftsRef Map keyed by edit/new selector
- **Apply flow**: accumulated edits sent to agent in one go

### What DesignForge CURRENTLY has:
- **Basic comments table**: projectId, selector, tag, outerHTML, rect, text, kind, status
- **CommentOverlay component**: exists but let's check implementation
- **No comment mode UI**
- **No element inspector overlay in iframe**
- **No live rect tracking**
- **No apply flow**
- **No comment attachment to messages**

### GAP: CRITICAL

---

## 7. TWEAK / PARAMETER SYSTEM

### What open-design has:
- **Parameter sliders**: declared in skill front-matter (hue, spacing, font-scale, opacity)
- **Tweaks skill**: dedicated skill with 5 standard knobs (accent, scale, density, mode, motion)
- **Live updates**: slider movements re-send parameterized prompts without full chat round-trip
- **Persistence**: localStorage keyed by artifact identifier
- **Keyboard shortcuts**: T toggle panel, R reset

### What open-codesign has:
- **EDITMODE marker block**: `const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{...}/*EDITMODE-END*/;`
- **TWEAK_SCHEMA block**: per-token UI hints (color, number, enum, boolean, string)
- **Live updates without reload**: posts `codesign:tweaks:update` to iframe, bridge substitutes block, re-compiles via Babel, re-evaluates into same React root
- **Debounced persistence**: 400ms back to previewHtml
- **Draggable panel**: position persisted to localStorage

### What DesignForge CURRENTLY has:
- **Basic tweak parser**: `lib/tweak-parser.ts` — parse/replace EDITMODE blocks
- **TweakPanel component**: exists but let's check
- **No live iframe updates without reload**
- **No TWEAK_SCHEMA**
- **No draggable panel**

### GAP: MEDIUM

---

## 8. SKILLS SYSTEM

### What open-design has:
- **Skill format**: SKILL.md with YAML front-matter + Markdown body
- **OD extensions**: mode, preview type, design system requirements, craft references, inputs, parameters, outputs, capabilities
- **Three-tier loading**: `./.claude/skills/` > `./skills/` > `~/.claude/skills/`
- **Symlink strategy**: `~/.open-design/skills/` canonical, symlinked to agent skill dirs
- **Skill installation CLI**: `od skill add/list/remove`
- **Skill types**: prototype-skill, deck-skill, template-skill, design-system-skill
- **Preflight injection**: auto-injects assets/template.html, references/layouts.md as hard pre-flight rules

### What open-codesign has:
- **Three-tier loading**: builtin > user (`~/.config/open-codesign/skills`) > project (`<project>/.codesign/skills`)
- **Custom YAML parser**: lightweight inline parser without library dependency
- **Validation**: Zod schema for frontmatter
- **Provider filtering**: drops skills with provider restrictions
- **Lazy loading**: ESM-compatible via import.meta.url

### What DesignForge CURRENTLY has:
- **NOTHING** — no skills system at all

### GAP: CRITICAL

---

## 9. TOOLS / AGENT LOOP

### What intern3-chat has:
- **Toolkit system**: `getToolkit` returns tools based on enabled abilities
- **Web search tools**: firecrawl, brave, tavily, serper integrations
- **Image generation tool**: `generateAndStoreImage` with size selection
- **MCP tool**: dynamic tool discovery from MCP servers
- **Supermemory integration**: semantic search over chat history
- **Max steps**: 100-step agent loop with `streamText`
- **Smooth stream**: `experimental_transform: smoothStream()`

### What open-codesign has:
- **pi-native tool shape**: AgentTool with TypeBox parameters
- **Default toolset**: set_todos, str_replace_based_edit_tool, list_files, declare_tweak_schema, done, generate_image_asset, read_url, read_design_system
- **Done tool verification**: static lint (JSX balance, HTML unclosed tags, duplicate IDs) + optional runtime verification in hidden BrowserWindow
- **Tool-use guidance**: 600-line AGENTIC_TOOL_GUIDANCE for edit mode, polish passes, component discipline

### What DesignForge CURRENTLY has:
- **NO tools system** — only basic chat completion

### GAP: CRITICAL

---

## 10. AUTH / USER MANAGEMENT

### What intern3-chat has:
- **Better Auth**: email OTP + OAuth (Google, GitHub, X)
- **Anonymous users**: `allowAnons: true` for chat without login
- **Identity resolution**: `getUserIdentity` with token identifier

### What DesignForge CURRENTLY has:
- **Better Auth**: email OTP + OAuth (Google, GitHub)
- **Basic session hook**: `useSession` from auth-client
- **No anonymous support**

### GAP: LOW — auth is functional

---

## 11. EXPORT / DELIVERY

### What open-design has:
- **HTML**: Blob download of inlined srcdoc
- **PDF**: Popup window with window.print()
- **ZIP**: Stored-mode ZIP of artifact
- **Markdown/JSX**: Pass-through download
- **Project ZIP**: Daemon bundles on-disk project tree

### What open-codesign has:
- **Virtual FS**: per-design file tree stored in SQLite
- **File tabs**: dynamic tabs from virtual FS

### What DesignForge CURRENTLY has:
- **NOTHING** — no export functionality

### GAP: MEDIUM

---

## 12. ANTI-AI-SLOP / QUALITY

### What open-design has:
- **lint-artifact.ts**: deterministic linter for generated HTML
- **Severity levels**: P0 (must-fix), P1 (should-fix), P2 (nice-to-fix)
- **Flags**: purple gradients, blue→cyan trust gradients, indigo #6366f1, emoji icons, rounded card + left border, invented metrics, filler copy, missing data-od-id
- **Integration**: wired into artifact save flow + standalone POST endpoint

### What open-codesign has:
- **Done tool verification**: static + runtime checks
- **AGENTIC_TOOL_GUIDANCE**: 600-line prompt covering polish passes, component discipline, token budgets

### What DesignForge CURRENTLY has:
- **Basic system prompt rules**: No emojis, no Inter, no pure black, no neon, no 3-column equal cards, no filler copy
- **No automated linting**

### GAP: MEDIUM

---

## 13. PROMPT COMPOSITION

### What open-design has:
- **Layered stack**: discovery + philosophy → official designer identity → DESIGN.md → craft references → skill body → project metadata → deck framework → media generation contract

### What open-codesign has:
- **composeSystemPrompt()**: mode (create/revise), user prompt, skill blobs
- **Context sections**: design system, attachments, reference URL appended to user message

### What DesignForge CURRENTLY has:
- **Basic system prompt**: 10 anti-slop rules + design token appendix
- **No layered composition**
- **No craft references**
- **No skill body injection**
- **No project metadata block**

### GAP: MEDIUM

---

## SUMMARY OF GAPS (PRIORITIZED)

| Priority | Feature | Effort |
|----------|---------|--------|
| P0 | Multi-provider AI (frontend-managed providers, models, endpoints) | High |
| P0 | Settings UI for provider/model management | High |
| P0 | Refactor streaming to use Vercel AI SDK (createDataStream, streamText) | High |
| P0 | Remove all hardcoded OpenRouter references | Low |
| P0 | Model selector UI with ability badges | Medium |
| P1 | Message parts system (text/reasoning/tool/image/error) | High |
| P1 | Resumable streams | Medium |
| P1 | Tool system (web search, image gen, file edit) | High |
| P1 | Skills system architecture | Very High |
| P1 | Canvas srcdoc builder with sandbox, bridges, React runtime | High |
| P1 | Comment system with element inspector overlay | High |
| P1 | Tweak panel with live updates | Medium |
| P2 | Export pipeline (HTML, PDF, ZIP) | Medium |
| P2 | Anti-AI-slop linter | Medium |
| P2 | Design system showcase renderer | Medium |
| P2 | Title generation | Low |
| P2 | Token usage tracking | Low |
| P3 | Iframe pool LRU | Low |
| P3 | File tabs / virtual FS | Medium |
| P3 | Onboarding flow | Low |
