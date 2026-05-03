import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/projects/$projectId')({
  component: ProjectPage,
})

function ProjectPage() {
  const { projectId } = Route.useParams()

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4">
      {/* Chat sidebar */}
      <aside className="w-80 flex-shrink-0 rounded-xl border border-stone/20 bg-cream flex flex-col">
        <div className="p-4 border-b border-stone/10">
          <h2 className="font-medium text-ink">Chat</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-sm text-stone">Chat messages will appear here</p>
        </div>
        <div className="p-4 border-t border-stone/10">
          <input
            type="text"
            placeholder="Ask the AI..."
            className="w-full rounded-lg border border-stone/20 bg-parchment px-3 py-2 text-sm outline-none focus:border-terracotta/40"
          />
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex-1 rounded-xl border border-stone/20 bg-cream flex flex-col">
        <div className="p-4 border-b border-stone/10 flex items-center justify-between">
          <h2 className="font-medium text-ink">Canvas</h2>
          <span className="text-xs text-stone">Project: {projectId}</span>
        </div>
        <div className="flex-1 p-4">
          <div className="h-full rounded-lg border-2 border-dashed border-stone/20 flex items-center justify-center">
            <p className="text-sm text-stone">Canvas preview will render here</p>
          </div>
        </div>
      </main>
    </div>
  )
}
