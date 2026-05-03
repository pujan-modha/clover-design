import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useRef, useEffect } from 'react'

export const Route = createFileRoute('/share/$token')({
  component: SharedProjectPage,
})

function SharedProjectPage() {
  const { token } = Route.useParams()
  const data = useQuery(api.shareTokens.getByToken, { token })

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-stone text-sm">Loading...</div>
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-ink">Link expired or invalid</h1>
          <p className="text-sm text-stone mt-2">This share link is no longer available.</p>
        </div>
      </div>
    )
  }

  const { project, messages, shareName } = data

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <header className="border-b border-stone/20 bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-terracotta text-white text-xs font-bold">
              D
            </span>
            <span className="text-sm font-medium text-ink">DesignForge</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone">Shared by {project.authorId.slice(0, 8)}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-linen text-stone">
              {shareName}
            </span>
          </div>
        </div>
      </header>

      <div className="h-[calc(100vh-53px)] flex">
        {/* Chat history (read-only) */}
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-stone/10 bg-cream">
          <div className="px-4 py-3 border-b border-stone/10">
            <h2 className="font-medium text-ink text-sm">{project.name}</h2>
            <p className="text-xs text-stone mt-0.5">{project.description || 'No description'}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
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
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-parchment">
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone/10 bg-cream">
            <span className="text-xs font-medium text-ink">Canvas</span>
            <span className="text-xs text-stone">View-only</span>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-start justify-center">
              <iframe
                title="Shared Canvas"
                className="bg-white rounded-lg shadow-sm border border-stone/10"
                style={{ width: 1024, minHeight: 640 }}
                sandbox="allow-scripts"
                srcDoc={typeof project.canvasContent === 'string' ? project.canvasContent : defaultHtml()}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function defaultHtml(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f7f4;color:#2a2927}
.placeholder{text-align:center;padding:48px}
.placeholder h2{font-size:1.25rem;font-weight:600;margin-bottom:8px;color:#c96442}
.placeholder p{font-size:.875rem;color:#8a8884;max-width:320px;line-height:1.6}
</style></head><body>
<div class="placeholder"><h2>Canvas</h2><p>No design content yet.</p></div>
</body></html>`
}
