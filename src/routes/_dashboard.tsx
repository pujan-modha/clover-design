import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useSession } from '@/lib/auth-client'
import { useEffect } from 'react'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async ({ location }) => {
    // Server-side: we can't easily check Better Auth session here without
    // parsing cookies manually. Convex auth will enforce on data access.
    // Client-side redirect happens in DashboardLayout below.
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { data: session, isPending } = useSession()

  // Client-side redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      window.location.href = '/login'
    }
  }, [session, isPending])

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-sm text-stone">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-sm text-stone">Redirecting to sign in...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Outlet />
    </div>
  )
}
