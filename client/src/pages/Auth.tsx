import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Auth() {
  const { user, loading, login, register } = useAuth()
  const [params] = useSearchParams()
  const googleError = params.get('google') === 'error'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'register') await register(name, email, password)
      else await login(email, password)
      // success -> <Navigate> above flips once `user` is set
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (next: 'login' | 'register') => {
    setMode(next)
    setError(null)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 font-sans">
      {/* backdrop */}
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="blob animate-float pointer-events-none absolute left-[-10%] top-[-15%] h-[34rem] w-[34rem] bg-cyan-500/20" />
      <div className="blob animate-float-slow pointer-events-none absolute bottom-[-20%] right-[-12%] h-[30rem] w-[30rem] bg-fuchsia-600/15" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-400 to-fuchsia-500 shadow-lg shadow-cyan-500/30">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-950" fill="currentColor">
              <path d="M6.5 14l4.5-7.5 1.6 3.4 3.9-6-1.5 7.4H10z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Welcome to <span className="grad-text">SysDesignLab</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Sign in to track your progress and review past quizzes.
          </p>
        </div>

        <div className="card relative overflow-hidden border-white/[0.08] bg-slate-900/70 p-6 backdrop-blur-xl">
          {/* tabs */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-800/60 p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Create account'}
              </button>
            ))}
          </div>

          {(googleError || error) && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {googleError ? 'Google sign-in failed. Try again or use email.' : error}
            </div>
          )}

          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <UserIcon className="h-3.5 w-3.5" /> Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Lock className="h-3.5 w-3.5" /> Password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 12 characters' : '••••••••'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full justify-center disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'login' ? 'Log in' : 'Create account'}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-600">
            <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/auth/google'
            }}
            className="btn-ghost w-full justify-center"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <p className="mt-5 text-center text-xs text-slate-500">
            Passing a quiz (60%+) marks the topic complete and unlocks the next one.
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.58-5.17 3.58-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.39-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}
