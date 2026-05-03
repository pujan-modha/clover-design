import { Link, useRouter } from '@tanstack/react-router'
import { useSession, signOut } from '@/lib/auth-client'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.invalidate()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone/20 bg-cream/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink no-underline">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-terracotta text-white text-xs font-bold">
            D
          </span>
          DesignForge
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/projects"
                  className="text-sm font-medium text-stone hover:text-ink transition-colors no-underline"
                >
                  Projects
                </Link>
                <Link
                  to="/design-systems"
                  className="text-sm font-medium text-stone hover:text-ink transition-colors no-underline"
                >
                  Design Systems
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-sm text-stone hidden lg:inline max-w-[120px] truncate">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-stone hover:text-ink transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                to="/login"
                className="text-sm font-medium text-stone hover:text-ink transition-colors no-underline"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-terracotta text-white px-4 py-2 rounded-md hover:bg-terracotta/90 transition-colors no-underline"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
