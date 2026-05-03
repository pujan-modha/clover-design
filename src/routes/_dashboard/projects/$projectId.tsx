import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { useState, useCallback, useEffect, useRef } from 'react'
import { PropertyPanel } from '@/components/canvas/PropertyPanel'
import { CANVAS_INJECTOR_SCRIPT, postToCanvas } from '@/lib/canvas-injector'
import type { ElementData } from '@/lib/canvas-injector'
import { PinOverlay, CommentBubble, CommentsToolbar } from '@/components/canvas/CommentOverlay'
import { TweakPanel } from '@/components/canvas/TweakPanel'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { buildSrcdoc } from '@/lib/srcdoc-builder'
import { exportCanvas } from '@/lib/export'
import { lintArtifact, formatLintResult } from '@/lib/lint-artifact'
import type { CommentRow, CommentRect, ChatMessageRow } from '@/lib/types'
import { errorMessage } from '@/lib/types'

export const Route = createFileRoute('/_dashboard/projects/$projectId')({
  component: ProjectPage,
})

/**
 * Main project workspace page.
 *
 * Layout:
 * - Left sidebar: chat history + design-system selector + input
 * - Center: canvas toolbar + iframe preview (with comment pins + tweak panel)
 * - Right (conditional): property panel when an element is selected
 *
 * State is split between Convex (messages, comments, project metadata) and
 * local React state (canvas modes, zoom, modals, selection).
 */
export default function ProjectPage() {
  const { projectId: projectIdParam } = Route.useParams()
  /** Convex branded ID derived from the URL param. */
  const projectId = projectIdParam as Id<'projects'>

  /* ── Convex data ── */
  const project = useQuery(api.projects.get, { id: projectId })
  const messages = useQuery(api.chatMessages.listByProject, { projectId })
  const designSystems = useQuery(api.designSystems.list)
  const comments = useQuery(api.comments.listByProject, { projectId })

  const createMessage = useMutation(api.chatMessages.create)
  const updateProject = useMutation(api.projects.update)
  const createComment = useMutation(api.comments.create)
  const updateCommentText = useMutation(api.comments.updateText)
  const deleteComment = useMutation(api.comments.remove)

  /* ── Local UI state ── */
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  /* Canvas */
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [zoom, setZoom] = useState(1)
  const [zoomDisplay, setZoomDisplay] = useState(100)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null)
  const [hoverInfo, setHoverInfo] = useState<string | null>(null)

  /* Comments */
  const [commentMode, setCommentMode] = useState(false)
  const [activeComment, setActiveComment] = useState<string | null>(null)
  const [liveRects, setLiveRects] = useState<Record<string, CommentRect>>({})

  /* Modals */
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showShare, setShowShare] = useState(false)

  /* Derived */
  const chatMessages: ChatMessageRow[] = messages ?? []
  const selectedDesignSystem = designSystems?.find(ds => ds._id === project?.designSystemId)
  const commentList: CommentRow[] = comments ?? []

  /**
   * Ref that always holds the latest chatMessages array.
   * Used inside callbacks that close over stale state (e.g. streaming loop).
   */
  const messagesRef = useRef<ChatMessageRow[]>(chatMessages)
  useEffect(() => { messagesRef.current = chatMessages }, [chatMessages])

  /* ── Inject canvas script & sync modes ── */
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const timer = setTimeout(() => {
      try {
        const doc = iframe.contentDocument
        if (!doc) return

        if (!doc.querySelector('script[data-df-injector]')) {
          const script = doc.createElement('script')
          script.dataset.dfInjector = 'true'
          script.textContent = CANVAS_INJECTOR_SCRIPT
          doc.body.appendChild(script)
        }

        postToCanvas(iframe, selectMode ? 'ENABLE' : 'DISABLE')
        iframe.contentWindow.postMessage(
          { type: 'designforge:comments:setMode', enabled: commentMode },
          '*'
        )

        const selectors = commentList.map(c => c.selector)
        const cw = iframe.contentWindow as Window & { __LIVE_COMMENT_SELECTORS__?: string[] }
        if (selectors.length > 0 && cw.__LIVE_COMMENT_SELECTORS__) {
          cw.__LIVE_COMMENT_SELECTORS__ = selectors
        }
      } catch {
        /* iframe may be cross-origin restricted */
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [selectMode, commentMode, viewMode, project?.canvasContent, commentList.length])

  /* Keep iframe live selectors updated whenever comment list changes */
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    try {
      const cw = iframe.contentWindow as Window & { __LIVE_COMMENT_SELECTORS__?: string[] }
      cw.__LIVE_COMMENT_SELECTORS__ = commentList.map(c => c.selector)
    } catch {
      /* noop */
    }
  }, [commentList])

  /* ── Message listener from iframe ── */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as Record<string, unknown>
      if (!msg || typeof msg !== 'object') return

      /* Canvas selection messages */
      if (msg.source === 'designforge-canvas') {
        const type = String(msg.type)
        const data = msg.data as Record<string, unknown> | undefined
        switch (type) {
          case 'ELEMENT_SELECTED':
            if (data) setSelectedElement(data as unknown as ElementData)
            break
          case 'ELEMENT_DESELECTED':
            setSelectedElement(null)
            break
          case 'ELEMENT_HOVERED':
            setHoverInfo(`${data?.tag} — ${String(data?.selector).slice(0, 60)}`)
            break
          case 'HTML_CONTENT':
            if (data?.html) {
              updateProject({ id: projectId, canvasContent: String(data.html) })
            }
            break
        }
      }

      /* Comment messages */
      if (msg.type === 'designforge:comment:clicked') {
        void handleCreateComment(msg as unknown as {
          selector: string
          tag: string
          outerHTML: string
          rect: CommentRect
        })
      }
      if (msg.type === 'designforge:comment:liveRects') {
        const rects = msg.rects as Record<string, CommentRect> | undefined
        if (rects) setLiveRects(rects)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [projectId, updateProject, commentList.length])

  /** Create a comment pin after the user clicks an element in comment mode. */
  const handleCreateComment = async (data: {
    selector: string
    tag: string
    outerHTML: string
    rect: CommentRect
  }) => {
    try {
      const id = await createComment({
        projectId,
        selector: data.selector,
        tag: data.tag,
        outerHTML: data.outerHTML,
        rect: data.rect,
        text: '',
        kind: 'edit',
      })
      setActiveComment(id)
      setCommentMode(false)
    } catch (e: unknown) {
      setError('Failed to create comment: ' + errorMessage(e))
    }
  }

  /** Send a comment to Claude as a design-revision prompt. */
  const handleSendCommentToClaude = async (commentId: string, text: string) => {
    if (!text.trim()) return
    await updateCommentText({ commentId: commentId as Id<'comments'>, text })
    setActiveComment(null)

    const comment = commentList.find(c => c._id === commentId)
    if (!comment) return

    const prompt = `Edit the design: "${text}". Target element: ${comment.tag} at selector "${comment.selector}". Current outerHTML: ${comment.outerHTML.slice(0, 400)}`
    setInput(prompt)
    setTimeout(() => void handleSendFromPrompt(prompt), 100)
  }

  /* Model selection */
  const [selectedModel, setSelectedModel] = useState<string>('')

  /** Core streaming send logic. Accepts an explicit prompt so it can be reused by comment flow. */
  const handleSendFromPrompt = useCallback(async (promptText: string) => {
    if (!promptText.trim() || isLoading) return
    const content = promptText.trim()
    setIsLoading(true)
    setError(null)
    setStreamContent('')

    try {
      await createMessage({ projectId, role: 'user', content })
    } catch (e: unknown) {
      setError('Failed to save message: ' + errorMessage(e))
      setIsLoading(false)
      return
    }

    const abortController = new AbortController()
    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL
      const res = await fetch(`${convexUrl}/chat/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: [...messagesRef.current, { role: 'user' as const, content }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel || undefined,
          designSystemId: project?.designSystemId ?? null,
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('0:')) continue
          try {
            const parsed = JSON.parse(line.slice(2))
            if (parsed.type === 'content' && parsed.chunk) {
              fullContent += parsed.chunk
              setStreamContent(fullContent)
            }
          } catch {
            /* skip malformed line */
          }
        }
      }

      const htmlMatch = fullContent.match(/```html\n([\s\S]*?)\n```/)
      if (htmlMatch) {
        const html = htmlMatch[1].trim()
        await updateProject({ id: projectId, canvasContent: html })
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        /* user cancelled — no error surface */
      } else {
        const msg = errorMessage(e)
        setError(msg || 'AI request failed')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, projectId, createMessage, project?.designSystemId, updateProject, selectedModel])

  const handleDesignSystemChange = async (dsId: string | null) => {
    await updateProject({
      id: projectId,
      designSystemId: dsId ? (dsId as Id<'designSystems'>) : undefined,
    })
  }

  const handleUpdateStyle = useCallback((styles: Record<string, string>) => {
    postToCanvas(iframeRef.current, 'UPDATE_STYLE', { styles })
  }, [])

  const handleUpdateText = useCallback((text: string) => {
    postToCanvas(iframeRef.current, 'UPDATE_TEXT', { text })
  }, [])

  const handleDeleteElement = useCallback(() => {
    postToCanvas(iframeRef.current, 'DELETE_ELEMENT')
    setSelectedElement(null)
  }, [])

  const handleNavigate = useCallback((selector: string) => {
    postToCanvas(iframeRef.current, 'SELECT_BY_SELECTOR', { selector })
  }, [])

  const handleSaveCanvas = useCallback(() => {
    postToCanvas(iframeRef.current, 'GET_HTML')
  }, [])

  const handleSend = useCallback(async () => {
    await handleSendFromPrompt(input)
    setInput('')
  }, [input, handleSendFromPrompt])

  const handleZoomChange = useCallback((delta: number) => {
    setZoomDisplay(prev => {
      const next = Math.max(25, Math.min(200, prev + delta))
      setZoom(next / 100)
      return next
    })
  }, [])

  if (project === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-stone text-sm">Loading project...</div>
      </div>
    )
  }

  if (project === null) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-center">
          <h2 className="text-lg font-medium text-ink">Project not found</h2>
          <Link to="/projects" className="text-sm text-terracotta hover:underline mt-2 inline-block">
            Back to projects
          </Link>
        </div>
      </div>
    )
  }

  const canvasHtml = typeof project.canvasContent === 'string'
    ? project.canvasContent
    : defaultCanvasHtml(selectedDesignSystem)

  return (
    <div className="h-[calc(100vh-140px)] flex gap-0 rounded-xl border border-stone/20 overflow-hidden bg-cream">
      {/* ── Chat sidebar ── */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-stone/10">
        <div className="px-4 py-3 border-b border-stone/10 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink text-sm truncate">{project.name}</h2>
            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
          </div>
          <p className="text-xs text-stone truncate">{project.description || 'No description'}</p>

          <div className="pt-1">
            <label className="text-[10px] font-medium text-stone uppercase tracking-wider">Design System</label>
            <select
              value={project.designSystemId ?? ''}
              onChange={(e) => handleDesignSystemChange(e.target.value || null)}
              className="mt-1 w-full rounded-md border border-stone/20 bg-parchment px-2 py-1.5 text-xs outline-none focus:border-terracotta/40"
            >
              <option value="">None</option>
              {designSystems?.map(ds => (
                <option key={ds._id} value={ds._id}>
                  {ds.name}{ds.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((msg) => (
            <div key={msg._id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-terracotta text-white'
                  : 'bg-linen text-ink border border-stone/10'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {streamContent && (
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-linen text-ink border border-stone/10">
                <div className="whitespace-pre-wrap">{streamContent}</div>
                <span className="inline-block w-1.5 h-3 bg-terracotta/60 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {isLoading && !streamContent && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 bg-linen border border-stone/10">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-stone/10">
          <form
            onSubmit={(e) => { e.preventDefault(); void handleSend() }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI..."
              disabled={isLoading}
              className="flex-1 rounded-md border border-stone/20 bg-parchment px-3 py-2 text-xs outline-none focus:border-terracotta/40 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-8 w-8 flex items-center justify-center rounded-md bg-terracotta text-white disabled:opacity-40 hover:bg-terracotta/90 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Canvas workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-stone/10 bg-cream">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-linen rounded-md p-0.5">
              <button
                onClick={() => setViewMode('preview')}
                className={`h-6 px-2 rounded text-xs font-medium transition-colors ${
                  viewMode === 'preview' ? 'bg-cream text-ink shadow-sm' : 'text-stone hover:text-ink'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`h-6 px-2 rounded text-xs font-medium transition-colors ${
                  viewMode === 'code' ? 'bg-cream text-ink shadow-sm' : 'text-stone hover:text-ink'
                }`}
              >
                Code
              </button>
            </div>

            <button
              onClick={() => {
                setSelectMode(prev => !prev)
                if (!selectMode) setCommentMode(false)
              }}
              className={`h-7 px-2 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                selectMode ? 'bg-terracotta/10 text-terracotta' : 'text-stone hover:text-ink hover:bg-linen'
              }`}
              title="Select and edit elements"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Select
            </button>

            <CommentsToolbar
              commentMode={commentMode}
              onToggle={() => {
                setCommentMode(prev => !prev)
                if (!commentMode) setSelectMode(false)
              }}
              count={commentList.length}
            />

            {selectMode && hoverInfo && (
              <span className="text-[10px] text-stone truncate max-w-[200px]">{hoverInfo}</span>
            )}

            {selectedDesignSystem && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta">
                {selectedDesignSystem.name}
              </span>
            )}
            <button
              onClick={() => {
                const result = lintArtifact(canvasHtml)
                alert(formatLintResult(result))
              }}
              className="h-7 px-2 rounded text-xs font-medium text-stone hover:text-ink hover:bg-linen transition-colors"
              title="Lint for AI slop"
            >
              Lint
            </button>
          </div>

          <div className="flex items-center gap-1">
            {selectMode && (
              <button
                onClick={handleSaveCanvas}
                className="h-7 px-2 rounded text-xs font-medium bg-terracotta text-white hover:bg-terracotta/90 transition-colors"
              >
                Save changes
              </button>
            )}

            <ToolbarButton onClick={() => setShowSnapshots(true)} title="Snapshots">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </ToolbarButton>

            <ToolbarButton onClick={() => setShowExport(true)} title="Export">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </ToolbarButton>

            <ToolbarButton onClick={() => setShowShare(true)} title="Share">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </ToolbarButton>

            <div className="w-px h-4 bg-stone/20 mx-1" />

            <button onClick={() => handleZoomChange(-10)} className="h-6 w-6 flex items-center justify-center rounded text-stone hover:text-ink hover:bg-linen text-xs">
              −
            </button>
            <span className="text-xs text-stone w-10 text-center">{zoomDisplay}%</span>
            <button onClick={() => handleZoomChange(10)} className="h-6 w-6 flex items-center justify-center rounded text-stone hover:text-ink hover:bg-linen text-xs">
              +
            </button>
          </div>
        </div>

        {/* Canvas / Code area */}
        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 overflow-auto bg-parchment relative">
            {viewMode === 'preview' ? (
              <div className="min-h-full flex items-start justify-center p-6 relative">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }} className="relative">
                  <iframe
                    ref={iframeRef}
                    title="Canvas"
                    className="bg-white rounded-lg shadow-sm border border-stone/10"
                    style={{ width: 1024, minHeight: 640 }}
                    sandbox="allow-scripts"
                    srcDoc={buildSrcdoc({
                      html: canvasHtml,
                      designSystemTokens: selectedDesignSystem?.tokens,
                      commentBridge: true,
                      tweakBridge: true,
                    })}
                  />
                  <PinOverlay
                    comments={commentList}
                    zoom={zoomDisplay}
                    onPinClick={(c) => setActiveComment(c._id)}
                    liveRects={liveRects}
                  />
                  <TweakPanel
                    previewHtml={canvasHtml}
                    iframeRef={iframeRef}
                    onHtmlChange={(html) => updateProject({ id: projectId, canvasContent: html })}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full p-4">
                <textarea
                  value={canvasHtml}
                  readOnly
                  className="w-full h-full rounded-lg border border-stone/20 bg-sidebar text-linen p-4 text-xs font-mono leading-relaxed resize-none outline-none"
                />
              </div>
            )}
          </div>

          {viewMode === 'preview' && (
            <PropertyPanel
              element={selectedElement}
              onUpdateStyle={handleUpdateStyle}
              onUpdateText={handleUpdateText}
              onDelete={handleDeleteElement}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </main>

      {/* Active comment bubble */}
      {activeComment && commentList.find(c => c._id === activeComment) && (
        <CommentBubble
          comment={commentList.find(c => c._id === activeComment)!}
          zoom={zoomDisplay}
          onClose={() => setActiveComment(null)}
          onSendToClaude={(text) => void handleSendCommentToClaude(activeComment, text)}
          onDelete={async () => {
            await deleteComment({ commentId: activeComment as Id<'comments'> })
            setActiveComment(null)
          }}
        />
      )}

      {/* Modals */}
      {showSnapshots && (
        <SnapshotsModal projectId={projectId} currentContent={typeof project.canvasContent === 'string' ? project.canvasContent : null} onClose={() => setShowSnapshots(false)} />
      )}
      {showExport && (
        <ExportModal content={canvasHtml} projectName={project.name} onClose={() => setShowExport(false)} />
      )}
      {showShare && (
        <ShareModal projectId={projectId} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}

/* ───────────────────────── ToolbarButton ───────────────────────── */

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-7 px-2 flex items-center gap-1.5 rounded text-xs text-stone hover:text-ink hover:bg-linen transition-colors"
    >
      {children}
      <span className="hidden sm:inline">{title}</span>
    </button>
  )
}

/* ───────────────────────── Snapshots Modal ───────────────────────── */

function SnapshotsModal({ projectId, currentContent, onClose }: {
  projectId: Id<'projects'>
  currentContent: string | null
  onClose: () => void
}) {
  const snapshots = useQuery(api.canvasSnapshots.listByProject, { projectId })
  const createSnapshot = useMutation(api.canvasSnapshots.create)
  const removeSnapshot = useMutation(api.canvasSnapshots.remove)
  const updateProject = useMutation(api.projects.update)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || isSaving) return
    setIsSaving(true)
    await createSnapshot({
      projectId,
      name: name.trim(),
      content: currentContent ?? null,
    })
    setName('')
    setIsSaving(false)
  }

  const handleRestore = async (content: string | null) => {
    if (!content) return
    await updateProject({ id: projectId, canvasContent: content })
  }

  return (
    <Modal onClose={onClose} title="Snapshots">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Snapshot name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            className="flex-1 rounded-md border border-stone/20 bg-parchment px-3 py-2 text-xs outline-none focus:border-terracotta/40"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={isSaving || !name.trim()}
            className="px-3 py-2 rounded-md bg-terracotta text-white text-xs disabled:opacity-40 hover:bg-terracotta/90 transition-colors"
          >
            Save
          </button>
        </div>

        {snapshots === undefined ? (
          <div className="text-xs text-stone">Loading...</div>
        ) : snapshots.length === 0 ? (
          <div className="text-xs text-stone text-center py-4">No snapshots yet. Save versions of your design to compare or restore later.</div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {snapshots.map((snap) => (
              <div key={snap._id} className="flex items-center justify-between p-3 rounded-lg border border-stone/10 bg-cream">
                <div>
                  <div className="text-xs font-medium text-ink">{snap.name}</div>
                  <div className="text-[10px] text-stone mt-0.5">
                    {new Date(snap.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void handleRestore(snap.content)}
                    className="h-7 px-2 rounded text-xs text-stone hover:text-ink hover:bg-linen transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => removeSnapshot({ id: snap._id })}
                    className="h-7 px-2 rounded text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ───────────────────────── Export Modal ───────────────────────── */

function ExportModal({ content, projectName, onClose }: {
  content: string
  projectName: string
  onClose: () => void
}) {
  const html = content || '<!-- No content -->'

  const downloadHtml = () => {
    void exportCanvas(html, { format: 'html', filename: projectName.replace(/\s+/g, '-').toLowerCase() })
  }

  const downloadPdf = () => {
    void exportCanvas(html, { format: 'pdf', filename: projectName.replace(/\s+/g, '-').toLowerCase() })
  }

  const downloadZip = () => {
    void exportCanvas(html, { format: 'zip', filename: projectName.replace(/\s+/g, '-').toLowerCase() })
  }

  const copyHtml = () => {
    navigator.clipboard.writeText(html)
  }

  return (
    <Modal onClose={onClose} title="Export">
      <div className="space-y-3">
        <ExportOption
          icon="html"
          title="Download HTML"
          description="Single .html file with embedded styles"
          onClick={downloadHtml}
        />
        <ExportOption
          icon="pdf"
          title="Download PDF"
          description="Print-ready PDF using browser print"
          onClick={downloadPdf}
        />
        <ExportOption
          icon="zip"
          title="Download ZIP"
          description="HTML + README + assets bundle"
          onClick={downloadZip}
        />
        <ExportOption
          icon="copy"
          title="Copy HTML"
          description="Copy raw HTML to clipboard"
          onClick={copyHtml}
        />
      </div>
    </Modal>
  )
}

function ExportOption({ icon, title, description, onClick }: {
  icon: 'html' | 'pdf' | 'zip' | 'copy'
  title: string
  description: string
  onClick: () => void
}) {
  const colors = {
    html: 'bg-orange-100 text-orange-600',
    pdf: 'bg-red-100 text-red-600',
    zip: 'bg-purple-100 text-purple-600',
    copy: 'bg-blue-100 text-blue-600',
  }
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-stone/10 bg-cream hover:border-terracotta/30 transition-colors text-left"
    >
      <div className={`h-8 w-8 rounded-md flex items-center justify-center ${colors[icon]}`}>
        {icon === 'html' && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )}
        {icon === 'pdf' && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
        {icon === 'zip' && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        )}
        {icon === 'copy' && (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-ink">{title}</div>
        <div className="text-[10px] text-stone">{description}</div>
      </div>
    </button>
  )
}

/* ───────────────────────── Share Modal ───────────────────────── */

function ShareModal({ projectId, onClose }: { projectId: Id<'projects'>; onClose: () => void }) {
  const tokens = useQuery(api.shareTokens.listByProject, { projectId })
  const createToken = useMutation(api.shareTokens.create)
  const removeToken = useMutation(api.shareTokens.remove)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    await createToken({ projectId, name: name.trim() })
    setName('')
    setIsCreating(false)
  }

  const copyLink = (token: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Modal onClose={onClose} title="Share">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Link name (e.g., Client review)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            className="flex-1 rounded-md border border-stone/20 bg-parchment px-3 py-2 text-xs outline-none focus:border-terracotta/40"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={isCreating || !name.trim()}
            className="px-3 py-2 rounded-md bg-terracotta text-white text-xs disabled:opacity-40 hover:bg-terracotta/90 transition-colors"
          >
            Create link
          </button>
        </div>

        {tokens === undefined ? (
          <div className="text-xs text-stone">Loading...</div>
        ) : tokens.length === 0 ? (
          <div className="text-xs text-stone text-center py-4">No share links yet</div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {tokens.map((st) => (
              <div key={st._id} className="flex items-center justify-between p-3 rounded-lg border border-stone/10 bg-cream">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink truncate">{st.name}</div>
                  <div className="text-[10px] text-stone mt-0.5">
                    Created {new Date(st.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyLink(st.token)}
                    className="h-7 px-2 rounded text-xs text-stone hover:text-ink hover:bg-linen transition-colors"
                  >
                    {copied === st.token ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => removeToken({ id: st._id })}
                    className="h-7 px-2 rounded text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ───────────────────────── Modal Shell ───────────────────────── */

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 rounded-xl border border-stone/20 bg-cream shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone/10">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-stone hover:text-ink transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Utils ───────────────────────── */

function injectScriptIntoHtml(html: string): string {
  if (html.includes('__dfInjectorLoaded')) return html
  const scriptTag = `<script data-df-injector="true">${CANVAS_INJECTOR_SCRIPT}</script>`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${scriptTag}</body>`)
  }
  if (html.includes('</html>')) {
    return html.replace('</html>', `${scriptTag}</html>`)
  }
  return html + scriptTag
}

/** Generate a placeholder HTML canvas when no content exists yet. */
function defaultCanvasHtml(designSystem?: { tokens?: { colors?: Record<string, string>; typography?: { fontFamily?: string } } }): string {
  const tokens = designSystem?.tokens
  const cssVars = tokens ? generateCssVars(tokens) : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
:root {
${cssVars}
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--df-font-family, -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif);min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--df-color-background, #f8f7f4);color:var(--df-color-text, #2a2927)}
.placeholder{text-align:center;padding:48px}
.placeholder h2{font-size:1.25rem;font-weight:600;margin-bottom:8px;color:var(--df-color-accent, #c96442)}
.placeholder p{font-size:.875rem;color:var(--df-color-muted, #8a8884);max-width:320px;line-height:1.6}
</style></head><body>
<div class="placeholder"><h2>Canvas</h2><p>Your design will appear here. Ask the AI to generate HTML, CSS, or React components.</p></div>
</body></html>`
}

function generateCssVars(tokens: { colors?: Record<string, string>; typography?: { fontFamily?: string }; spacing?: Record<string, number>; borderRadius?: Record<string, number>; shadows?: Record<string, string> }): string {
  const lines: string[] = []

  if (tokens.colors) {
    for (const [name, value] of Object.entries(tokens.colors)) {
      lines.push(`  --df-color-${name}: ${value};`)
    }
  }

  if (tokens.typography?.fontFamily) {
    lines.push(`  --df-font-family: ${tokens.typography.fontFamily};`)
  }

  if (tokens.spacing) {
    for (const [name, value] of Object.entries(tokens.spacing)) {
      lines.push(`  --df-spacing-${name}: ${value}px;`)
    }
  }

  if (tokens.borderRadius) {
    for (const [name, value] of Object.entries(tokens.borderRadius)) {
      lines.push(`  --df-radius-${name}: ${value}px;`)
    }
  }

  if (tokens.shadows) {
    for (const [name, value] of Object.entries(tokens.shadows)) {
      lines.push(`  --df-shadow-${name}: ${value};`)
    }
  }

  return lines.join('\n')
}
