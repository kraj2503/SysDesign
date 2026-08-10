import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Zap } from 'lucide-react'
import { api, type QuizResultDetail } from '@/api/client'
import ProgressRing from '@/components/ProgressRing'
import { formatDate } from '@/lib/format'

export default function ResultsDetail() {
  const { id = '' } = useParams()
  const [result, setResult] = useState<QuizResultDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getQuizResult(id)
      .then(setResult)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load result'))
  }, [id])

  if (error) return <p className="text-sm text-rose-400">{error}</p>
  if (!result) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )
  }

  const passed = result.percent >= 60

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/results"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-300"
      >
        <ArrowLeft className="h-4 w-4" /> All results
      </Link>

      <header className="reveal relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-indigo-950/40 p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <ProgressRing
            value={result.percent}
            size={104}
            stroke={9}
            from={passed ? '#34d399' : '#22d3ee'}
            to={passed ? '#2dd4bf' : '#e879f9'}
          >
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-white">{result.percent}%</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500">score</div>
            </div>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <span className="grad-text">{result.topicTitle}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {result.score}/{result.total} correct · {formatDate(result.takenAt)}
            </p>
            <span
              className={`chip mt-3 ${
                passed
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400'
              }`}
            >
              {passed ? 'Passed' : 'Not passed'} · 60% needed
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {result.questions.length === 0 ? (
          <p className="card p-8 text-center text-sm text-slate-400">
            This attempt was recorded before per-question snapshots existed — no breakdown available.
          </p>
        ) : (
          result.questions.map((q, i) => {
            const ok =
              q.correct.every((c) => q.selected.includes(c)) && q.selected.length === q.correct.length
            return (
              <div key={i} className="card p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-100">{q.prompt}</p>
                      {q.is_tricky && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                          <Zap className="h-3 w-3" /> Tricky
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 space-y-1.5 text-sm">
                      <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
                        <p className="text-xs text-slate-500">You answered</p>
                        <p className={ok ? 'mt-0.5 text-emerald-300' : 'mt-0.5 text-rose-300'}>
                          {q.selected.length
                            ? q.selected.map((s) => q.options[s]).join(', ')
                            : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
                        <p className="text-xs text-slate-500">Correct answer</p>
                        <p className="mt-0.5 text-emerald-300">
                          {q.correct.map((c) => q.options[c]).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-3 rounded-xl border p-3 text-sm leading-relaxed ${
                        ok
                          ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-slate-300'
                          : 'border-cyan-500/20 bg-cyan-500/[0.06] text-slate-300'
                      }`}
                    >
                      <span className="font-medium text-slate-100">
                        {ok ? 'Nice one. ' : 'Why: '}
                      </span>
                      {q.explanation}
                    </div>
                  </div>
                  {ok ? (
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="mt-1 h-5 w-5 shrink-0 text-rose-400" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
