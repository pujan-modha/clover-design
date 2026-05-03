import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    setLoading(true)
    // TODO: integrate with Better Auth emailOTP
    await new Promise((r) => setTimeout(r, 1000))
    setStep('otp')
    setLoading(false)
  }

  const verifyOtp = async () => {
    setLoading(true)
    // TODO: integrate with Better Auth emailOTP
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {step === 'email' ? 'Welcome back' : 'Enter your code'}
        </h1>
        <p className="mt-2 text-sm text-stone">
          {step === 'email'
            ? 'Sign in with your email'
            : `We sent a code to ${email}`}
        </p>
      </div>

      {step === 'email' ? (
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
          <Button
            className="w-full h-11 bg-terracotta hover:bg-terracotta/90 text-white"
            onClick={sendOtp}
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Continue'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="h-11 text-center tracking-[0.5em] font-mono"
            maxLength={6}
          />
          <Button
            className="w-full h-11 bg-terracotta hover:bg-terracotta/90 text-white"
            onClick={verifyOtp}
            disabled={loading || otp.length < 6}
          >
            {loading ? 'Verifying...' : 'Sign in'}
          </Button>
          <button
            onClick={() => setStep('email')}
            className="w-full text-sm text-stone hover:text-ink transition-colors"
          >
            Back to email
          </button>
        </div>
      )}

      <div className="text-center text-xs text-stone">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-terracotta hover:underline">
          Get started
        </Link>
      </div>
    </div>
  )
}
