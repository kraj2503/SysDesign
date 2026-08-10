import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, History, TrendingUp } from 'lucide-react'
import { api, type QuizResultSummary } from '@/api/client'
import ProgressRing from '@/components/ProgressRing'
import { ringGradient } from '@/lib/ui'
import { formatDate } from '@/lib/format'

export default function Results() {
  const [results, setResults] = useState<QuizResultSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listQuizResults()
      .then(setResults)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load results'))
  }, [])

  if (error) return <p className="text-sm text-rose-400">{error}</p>
  if (!results) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )
  }

  const best = results.length ? Math.max(...results.map((r) => r.percent)) : 0
  const passed = results.filter((r) => r.percent >= 60).length

  return (
    <div className="space-y-8">
      <header className="reveal flex flex-wrap items-center justify-between gap-6">
        <div>
          <Link
            to="/progress"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" /> Back to progress
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">
            Past <span className="grad-text">quiz results</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-400">
            Every attempt with the full question-by-question breakdown — what you picked, what was
            correct, and why.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="card p-4 text-center">
            <div className="font-display text-2xl font-bold text-white">{results.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">attempts</div>
          </div>
          <div className="card p-4 text-center">
            <div className="font-display text-2xl font-bold text-emerald-300">{passed}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">passed</div>
          </div>
          <div className="card p-4 text-center">
            <div className="font-display text-2xl font-bold text-cyan-300">{best}%</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">best</div>
          </div>
        </div>
      </header>

      {results.length === 0 ? (
        <div className="card p-10 text-center">
          <History className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-4 font-display text-lg font-semibold text-white">No results yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Take your first quiz and every attempt will show up here.
          </p>
          <Link to="/syllabus" className="btn-primary mt-5 inline-flex">
            Browse topics
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r, i) => {
            const [from, to] = ringGradient(i)
            const passedThis = r.percent >= 60
            return (
              <Link
                key={r.id}
                to={`/results/${r.id}`}
                className="card card-hover group p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="chip mb-2 border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                      <TrendingUp className="h-3 w-3" /> {r.topicSlug}
                    </div>
                    <div className="font-display text-base font-semibold text-white">{r.topicTitle}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{formatDate(r.takenAt)}</div>
                  </div>
                  <ProgressRing
                    value={r.percent}
                    size={54}
                    stroke={5}
                    from={passedThis ? '#34d399' : from}
                    to={passedThis ? '#2dd4bf' : to}
                  >
                    <span className="font-display text-xs font-bold text-white">{r.percent}%</span>
                  </ProgressRing>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`chip ${
                      passedThis
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    {r.score}/{r.total} correct
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors group-hover:text-cyan-300">
                    Review <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
