import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_dashboard/design-systems/')({
  component: DesignSystemsPage,
})

function DesignSystemsPage() {
  const designSystems = useQuery(api.designSystems.list)
  const createSystem = useMutation(api.designSystems.create)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    await createSystem({ name: newName.trim() })
    setNewName('')
    setIsCreating(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Design Systems</h1>
          <p className="mt-1 text-sm text-stone">Create and manage structured design tokens</p>
        </div>
      </div>

      {/* Create new */}
      <div className="flex gap-3">
        <Input
          placeholder="New design system name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="max-w-sm h-10"
        />
        <Button
          onClick={handleCreate}
          disabled={isCreating || !newName.trim()}
          className="h-10 bg-terracotta hover:bg-terracotta/90 text-white"
        >
          {isCreating ? 'Creating...' : 'New System'}
        </Button>
      </div>

      {designSystems === undefined ? (
        <div className="text-sm text-stone">Loading...</div>
      ) : designSystems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone/30 bg-cream/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-linen">
            <svg className="h-6 w-6 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-ink">No design systems yet</h3>
          <p className="mt-1 text-sm text-stone">Create your first system to define colors, typography, and spacing tokens</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designSystems.map((ds) => (
            <Link
              key={ds._id}
              to="/design-systems/$systemId"
              params={{ systemId: ds._id }}
              className="group rounded-xl border border-stone/20 bg-cream p-5 hover:border-terracotta/30 transition-colors no-underline"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-ink group-hover:text-terracotta transition-colors">
                  {ds.name}
                </h3>
                {ds.isDefault && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-terracotta/10 text-terracotta">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone capitalize">{ds.source} · {ds.status}</p>

              {/* Token preview */}
              {ds.tokens && (
                <div className="mt-4 space-y-3">
                  {ds.tokens.colors && (
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(ds.tokens.colors as Record<string, string>).slice(0, 6).map(([name, value]) => (
                        <div key={name} className="group/color relative">
                          <div
                            className="w-6 h-6 rounded-md border border-stone/10 shadow-sm"
                            style={{ backgroundColor: value }}
                          />
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-stone opacity-0 group-hover/color:opacity-100 transition-opacity whitespace-nowrap">
                            {name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ds.tokens.typography && (
                    <div className="text-xs text-stone">
                      {(ds.tokens.typography as { fontFamily?: string }).fontFamily}
                    </div>
                  )}
                </div>
              )}

              <p className="mt-4 text-xs text-stone">
                Updated {new Date(ds.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
