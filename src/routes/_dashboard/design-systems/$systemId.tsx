import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DesignSystemTokens } from '@/lib/types'

export const Route = createFileRoute('/_dashboard/design-systems/$systemId')({
  component: DesignSystemDetailPage,
})

function DesignSystemDetailPage() {
  const { systemId: systemIdParam } = Route.useParams()
  const systemId = systemIdParam as Id<'designSystems'>

  const ds = useQuery(api.designSystems.get, { id: systemId })
  const updateSystem = useMutation(api.designSystems.update)
  const setDefault = useMutation(api.designSystems.setDefault)
  const removeSystem = useMutation(api.designSystems.remove)

  const [activeTab, setActiveTab] = useState<'tokens' | 'designmd'>('tokens')
  const [tokens, setTokens] = useState<DesignSystemTokens | null>(null)
  const [designMd, setDesignMd] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync local state when data loads
  if (ds && tokens === null) {
    setTokens((ds.tokens ?? {}) as DesignSystemTokens)
    setDesignMd(ds.designMd || '')
  }

  const handleSave = async () => {
    if (!ds) return
    setIsSaving(true)
    await updateSystem({
      id: systemId,
      tokens: tokens ?? undefined,
      designMd: designMd ?? undefined,
    })
    setHasChanges(false)
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!ds || !confirm('Delete this design system? This cannot be undone.')) return
    await removeSystem({ id: systemId })
    window.location.href = '/design-systems'
  }

  const updateTokenField = useCallback((path: string[], value: unknown) => {
    setTokens((prev) => {
      if (!prev) return prev
      const next: Record<string, unknown> = { ...prev }
      let target: Record<string, unknown> = next
      for (let i = 0; i < path.length - 1; i++) {
        target[path[i]] = { ...(target[path[i]] as Record<string, unknown>) }
        target = target[path[i]] as Record<string, unknown>
      }
      target[path[path.length - 1]] = value
      return next as DesignSystemTokens
    })
    setHasChanges(true)
  }, [])

  if (ds === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-stone text-sm">Loading design system...</div>
      </div>
    )
  }

  if (ds === null) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-center">
          <h2 className="text-lg font-medium text-ink">Design system not found</h2>
          <Link to="/design-systems" className="text-sm text-terracotta hover:underline mt-2 inline-block">
            Back to design systems
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/design-systems" className="text-xs text-stone hover:text-ink transition-colors no-underline">
              ← Design Systems
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1">{ds.name}</h1>
          <p className="text-sm text-stone mt-1 capitalize">{ds.source} · {ds.status}</p>
        </div>
        <div className="flex items-center gap-2">
          {!ds.isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDefault({ id: systemId })}
              className="border-stone/20 hover:bg-linen text-xs"
            >
              Set as default
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone/10">
        {(['tokens', 'designmd'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-terracotta border-b-2 border-terracotta'
                : 'text-stone hover:text-ink'
            }`}
          >
            {tab === 'tokens' ? 'Tokens' : 'DESIGN.md'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'tokens' && tokens && (
        <div className="space-y-8">
          {/* Colors */}
          <TokenSection title="Colors">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(tokens.colors || {}).map(([name, value]) => (
                <div key={name} className="flex items-center gap-3 p-3 rounded-lg border border-stone/10 bg-cream">
                  <input
                    type="color"
                    value={typeof value === 'string' ? value : '#000000'}
                    onChange={(e) => updateTokenField(['colors', name], e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-ink capitalize">{name}</div>
                    <input
                      type="text"
                      value={typeof value === 'string' ? value : ''}
                      onChange={(e) => updateTokenField(['colors', name], e.target.value)}
                      className="w-full text-xs text-stone bg-transparent outline-none border-b border-transparent focus:border-stone/20 mt-0.5 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
            <AddTokenButton
              onAdd={(name) => updateTokenField(['colors', name], '#000000')}
              placeholder="Add color..."
            />
          </TokenSection>

          {/* Typography */}
          <TokenSection title="Typography">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-stone w-24">Font Family</label>
                <Input
                  value={tokens.typography?.fontFamily || ''}
                  onChange={(e) => updateTokenField(['typography', 'fontFamily'], e.target.value)}
                  className="max-w-sm h-9 text-sm"
                />
              </div>

              <div className="rounded-lg border border-stone/10 bg-cream overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone/10 bg-linen/50">
                      <th className="text-left px-4 py-2 text-xs font-medium text-stone">Size</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-stone">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tokens.typography?.sizes || {}).map(([name, value]) => (
                      <tr key={name} className="border-b border-stone/5 last:border-0">
                        <td className="px-4 py-2 text-xs font-medium text-ink capitalize">{name}</td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) => updateTokenField(['typography', 'sizes', name], e.target.value)}
                            className="w-full text-xs bg-transparent outline-none border-b border-transparent focus:border-stone/20 font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TokenSection>

          {/* Spacing */}
          <TokenSection title="Spacing">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(tokens.spacing || {}).map(([name, value]) => (
                <div key={name} className="p-3 rounded-lg border border-stone/10 bg-cream">
                  <div className="text-xs font-medium text-ink capitalize mb-1">{name}</div>
                  <input
                    type="number"
                    value={typeof value === 'number' ? value : 0}
                    onChange={(e) => updateTokenField(['spacing', name], Number(e.target.value))}
                    className="w-full text-xs bg-transparent outline-none border-b border-transparent focus:border-stone/20 font-mono"
                  />
                  <div className="mt-2 h-1 bg-linen rounded-full overflow-hidden">
                    <div
                      className="h-full bg-terracotta/40 rounded-full"
                      style={{ width: `${Math.min(((typeof value === 'number' ? value : 0) / 64) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TokenSection>

          {/* Border Radius */}
          <TokenSection title="Border Radius">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(tokens.borderRadius || {}).map(([name, value]) => (
                <div key={name} className="p-3 rounded-lg border border-stone/10 bg-cream">
                  <div className="text-xs font-medium text-ink capitalize mb-2">{name}</div>
                  <input
                    type="number"
                    value={typeof value === 'number' ? value : 0}
                    onChange={(e) => updateTokenField(['borderRadius', name], Number(e.target.value))}
                    className="w-full text-xs bg-transparent outline-none border-b border-transparent focus:border-stone/20 font-mono mb-2"
                  />
                  <div
                    className="h-8 bg-terracotta/20 border border-terracotta/30"
                    style={{ borderRadius: `${typeof value === 'number' ? value : 0}px` }}
                  />
                </div>
              ))}
            </div>
          </TokenSection>
        </div>
      )}

      {activeTab === 'designmd' && (
        <div className="space-y-4">
          <p className="text-sm text-stone">
            Edit the raw DESIGN.md content. This is used for AI context and export.
          </p>
          <textarea
            value={designMd}
            onChange={(e) => { setDesignMd(e.target.value); setHasChanges(true) }}
            className="w-full h-[60vh] rounded-lg border border-stone/20 bg-cream p-4 text-sm font-mono leading-relaxed outline-none focus:border-terracotta/40 resize-none"
            placeholder="---\nversion: alpha\nname: My Design System\n..."
          />
        </div>
      )}

      {/* Save bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-full bg-sidebar text-white shadow-lg z-50">
          <span className="text-sm">Unsaved changes</span>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 bg-terracotta hover:bg-terracotta/90 text-white text-xs"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <button
            onClick={() => {
              setTokens((ds.tokens ?? {}) as DesignSystemTokens)
              setDesignMd(ds.designMd || '')
              setHasChanges(false)
            }}
            className="text-xs text-stone hover:text-white transition-colors"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  )
}

function TokenSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  )
}

function AddTokenButton({ onAdd, placeholder }: { onAdd: (name: string) => void; placeholder: string }) {
  const [value, setValue] = useState('')
  return (
    <div className="flex gap-2 mt-3">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onAdd(value.trim().toLowerCase().replace(/\s+/g, '-'))
            setValue('')
          }
        }}
        className="max-w-[200px] h-8 text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (value.trim()) {
            onAdd(value.trim().toLowerCase().replace(/\s+/g, '-'))
            setValue('')
          }
        }}
        className="h-8 text-xs border-stone/20 hover:bg-linen"
      >
        Add
      </Button>
    </div>
  )
}
