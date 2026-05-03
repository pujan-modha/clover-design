import { Link } from '@tanstack/react-router'

export default function Header() {
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
          <Link
            to="/login"
            className="text-sm font-medium text-stone hover:text-ink transition-colors no-underline"
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  )
}
