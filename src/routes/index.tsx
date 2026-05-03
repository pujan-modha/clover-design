import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center">
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-ink">
          Build anything with
          <br />
          <span className="text-terracotta">AI and design systems</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-stone">
          DesignForge helps you create dashboards, landing pages, and app prototypes 
          with intelligent design assistance and real-time collaboration.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/register">
            <Button className="h-11 px-6 bg-terracotta hover:bg-terracotta/90 text-white text-base">
              Get started
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="h-11 px-6 text-base border-stone/20 hover:bg-linen">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-stone/10 bg-cream/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            <FeatureCard
              title="AI-Powered Design"
              description="Describe what you want and watch the AI generate responsive layouts, components, and styles in real time."
            />
            <FeatureCard
              title="Design Systems"
              description="Create, extract, and apply structured design tokens. Maintain consistency across every project."
            />
            <FeatureCard
              title="Real-time Canvas"
              description="Collaborate live with reactive updates. Edit, iterate, and export your designs seamlessly."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-stone/10 bg-cream p-6">
      <h3 className="font-medium text-ink">{title}</h3>
      <p className="mt-2 text-sm text-stone leading-relaxed">{description}</p>
    </div>
  )
}
