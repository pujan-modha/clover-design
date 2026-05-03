import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useState, useCallback, useEffect, useRef } from 'react'

export const Route = createFileRoute('/_dashboard/projects/$projectId')({
  component: ProjectPage,
})

export default function ProjectPage() {
  const { projectId } = Route.useParams()
  const project = useQuery(api.projects.get, { id: projectId as any })
  const messages = useQuery(api.chatMessages.listByProject, { projectId: projectId as any })
  const createMessage = useMutation(api.chatMessages.create)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const chatMessages = messages || []

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return
    const content = input.trim()
    setInput('')
    setIsLoading(true)
    setError(null)
    setStreamContent('')

    try {
      await createMessage({
        projectId: projectId as any,
        role: 'user',
        content,
      })
    } catch (e: any) {
      setError('Failed to save message: ' + e.message)
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
          messages: [...chatMessages, { role: 'user' as const, content }].map(m => ({
            role: m.role,
            content: m.content,
          })),
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                setStreamContent(fullContent)
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'AI request failed')
      }
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, projectId, chatMessages, createMessage])

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

  return (
    <div className="h-[calc(100vh-140px)] flex gap-0 rounded-xl border border-stone/20 overflow-hidden bg-cream">
      {/* Chat sidebar */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-stone/10">
        <div className="px-4 py-3 border-b border-stone/10">
          <h2 className="font-medium text-ink text-sm truncate">{project.name}</h2>
          <p className="text-xs text-stone mt-0.5 truncate">{project.description || 'No description'}</p>
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
            onSubmit={(e) => { e.preventDefault(); handleSend() }}
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

      {/* Canvas */}
      <main className="flex-1 flex flex-col min-w-0">
        <CanvasPreview content={project.canvasContent} />
      </main>
    </div>
  )
}

function CanvasPreview({ content }: { content?: any }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument
    const html = typeof content === 'string' ? content : defaultCanvasHtml()
    doc.open()
    doc.write(html)
    doc.close()
  }, [content])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone/10 bg-cream">
        <span className="text-xs font-medium text-ink">Canvas</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="h-6 w-6 flex items-center justify-center rounded text-stone hover:text-ink hover:bg-linen text-xs">
            −
          </button>
          <span className="text-xs text-stone w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="h-6 w-6 flex items-center justify-center rounded text-stone hover:text-ink hover:bg-linen text-xs">
            +
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-parchment">
        <div className="min-h-full flex items-start justify-center p-6">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <iframe
              ref={iframeRef}
              title="Canvas"
              className="bg-white rounded-lg shadow-sm border border-stone/10"
              style={{ width: 1024, minHeight: 640 }}
              sandbox="allow-scripts"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function defaultCanvasHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f7f4;color:#2a2927}
.placeholder{text-align:center;padding:48px}
.placeholder h2{font-size:1.25rem;font-weight:600;margin-bottom:8px;color:#c96442}
.placeholder p{font-size:.875rem;color:#8a8884;max-width:320px;line-height:1.6}
</style></head><body>
<div class="placeholder"><h2>Canvas</h2><p>Your design will appear here. Ask the AI to generate HTML, CSS, or React components.</p></div>
</body></html>`
}
