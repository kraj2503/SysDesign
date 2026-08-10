import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, History, Lock, PlayCircle, Repeat } from 'lucide-react'
import { useProgress } from '@/context/ProgressContext'
import ProgressRing from '@/components/ProgressRing'
import { ringGradient, tileGradient } from '@/lib/ui'

export default function ProgressPage() {
  const { topics, progressBySlug, loading } = useProgress()

  if (loading)
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )

  const completed = Object.values(progressBySlug).filter((p) => p.status === 'completed').length
  const attempts = Object.values(progressBySlug).reduce((n, p) => n + (p.quiz_attempts ?? 0), 0)
  const pct = topics.length ? Math.round((completed / topics.length) * 100) : 0
  const avgScore = (() => {
    const scored = Object.values(progressBySlug).filter((p) => p.quiz_best_score != null)
    if (!scored.length) return 0
    return Math.round(scored.reduce((n, p) => n + (p.quiz_best_score ?? 0), 0) / scored.length)
  })()

  return (
    <div className="space-y-8">
      <header className="reveal flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Your <span className="grad-text">progress</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-400">
            {completed} of {topics.length} topics mastered · {attempts} quizzes taken · {avgScore}%
            average best score.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ProgressRing value={pct} size={88} stroke={8} from="#22d3ee" to="#e879f9">
            <div className="text-center">
              <div className="font-display text-xl font-bold text-white">{pct}%</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">overall</div>
            </div>
          </ProgressRing>
          <Link
            to="/results"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
          >
            <History className="h-3.5 w-3.5" /> Past results
          </Link>
        </div>
      </header>

      <div className="reveal delay-1 h-3 overflow-hidden rounded-full bg-slate-800/70 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t, i) => {
          const p = progressBySlug[t.slug]
          const done = p?.status === 'completed'
          const locked = !p || p.status === 'locked'
          const best = p?.quiz_best_score ?? null
          const [from, to] = ringGradient(i)

          return (
            <Link
              key={t.slug}
              to={`/topics/${t.slug}`}
              className={`card card-hover group p-5 ${locked ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`tile text-2xl ${tileGradient(i)} ${locked ? 'grayscale' : ''}`}>{t.icon}</div>
                <ProgressRing value={best ?? 0} size={46} stroke={4} from={from} to={to}>
                  <span className={`font-display text-[11px] font-bold ${best != null ? 'text-white' : 'text-slate-500'}`}>
                    {best != null ? `${best}%` : '—'}
                  </span>
                </ProgressRing>
              </div>

              <div className="mt-3 font-display text-base font-semibold text-white">{t.title}</div>

              <div className="mt-1 text-xs text-slate-500">{t.summary}</div>

              <div className="mt-4 flex items-center justify-between">
                {done ? (
                  <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                  </span>
                ) : locked ? (
                  <span className="chip">
                    <Lock className="h-3.5 w-3.5" /> Locked
                  </span>
                ) : (
                  <span className="chip border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                    <PlayCircle className="h-3.5 w-3.5" /> In progress
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Repeat className="h-3.5 w-3.5" /> {p?.quiz_attempts ?? 0} attempts
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${
                    done ? 'from-emerald-400 to-teal-500' : best != null ? 'from-cyan-400 to-indigo-500' : ''
                  }`}
                  style={{ width: `${done ? 100 : best ?? 0}%` }}
                />
              </div>

              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors group-hover:text-cyan-300">
                {done ? 'Review topic' : locked ? 'Unlocks later' : 'Continue'}
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
