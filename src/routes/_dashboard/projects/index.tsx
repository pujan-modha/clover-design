import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_dashboard/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const projects = useQuery(api.projects.list)
  const createProject = useMutation(api.projects.create)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    await createProject({ name: newName.trim() })
    setNewName('')
    setIsCreating(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-stone">Create and manage your designs</p>
        </div>
      </div>

      {/* Create new */}
      <div className="flex gap-3">
        <Input
          placeholder="New project name..."
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
          {isCreating ? 'Creating...' : 'New Project'}
        </Button>
      </div>

      {projects === undefined ? (
        <div className="text-sm text-stone">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone/30 bg-cream/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-linen">
            <svg className="h-6 w-6 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-ink">No projects yet</h3>
          <p className="mt-1 text-sm text-stone">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project._id}
              to="/projects/$projectId"
              params={{ projectId: project._id }}
              className="group rounded-xl border border-stone/20 bg-cream p-5 hover:border-terracotta/30 transition-colors no-underline"
            >
              <h3 className="font-medium text-ink group-hover:text-terracotta transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 text-sm text-stone line-clamp-2">{project.description}</p>
              )}
              <p className="mt-3 text-xs text-stone">
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
