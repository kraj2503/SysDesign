import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Lock, PlayCircle } from 'lucide-react'
import { useProgress } from '@/context/ProgressContext'
import ProgressRing from '@/components/ProgressRing'
import { barGradient, tileGradient } from '@/lib/ui'

export default function Syllabus() {
  const { topics, progressBySlug, loading } = useProgress()

  if (loading)
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )

  const completed = Object.values(progressBySlug).filter((p) => p.status === 'completed').length
  const pct = topics.length ? Math.round((completed / topics.length) * 100) : 0

  return (
    <div className="space-y-8">
      <header className="reveal flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Your learning <span className="grad-text">path</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-400">
            Finish each topic's quiz to unlock the next one. Every quiz is randomized and stacked
            with tricky questions.
          </p>
        </div>
        <ProgressRing value={pct} size={88} stroke={8} from="#22d3ee" to="#e879f9">
          <div className="text-center">
            <div className="font-display text-xl font-bold text-white">{pct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">done</div>
          </div>
        </ProgressRing>
      </header>

      <ol className="relative space-y-3">
        <div className="absolute bottom-6 left-[2.35rem] top-6 w-px bg-gradient-to-b from-cyan-500/40 via-slate-700/50 to-transparent" />
        {topics.map((t, i) => {
          const p = progressBySlug[t.slug]
          const locked = !p || p.status === 'locked'
          const done = p?.status === 'completed'
          const best = p?.quiz_best_score ?? 0

          return (
            <li key={t.slug} className="reveal relative" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
              <Link
                to={`/topics/${t.slug}`}
                className={`group relative flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300 ${
                  locked
                    ? 'border-slate-800/70 bg-slate-900/30 opacity-55'
                    : done
                      ? 'border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.07] to-transparent hover:border-emerald-400/40'
                      : 'border-white/[0.08] bg-slate-900/50 hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-slate-900/80 hover:shadow-[0_12px_40px_-14px_rgba(34,211,238,0.4)]'
                }`}
              >
                {/* step number */}
                <span
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
                    done
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : locked
                        ? 'border border-slate-700 bg-slate-900 text-slate-600'
                        : 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  }`}
                >
                  {i + 1}
                </span>

                <span className={`tile text-2xl ${tileGradient(i)} ${locked ? 'grayscale' : ''}`}>{t.icon}</span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-semibold text-white">{t.title}</span>
                    {done ? (
                      <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Completed</span>
                    ) : locked ? (
                      <span className="chip border-slate-700 bg-slate-800/50 text-slate-500">Locked</span>
                    ) : (
                      <span className="chip border-cyan-500/30 bg-cyan-500/10 text-cyan-300">Available</span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-slate-400">{t.summary}</span>
                </span>

                <span className="hidden w-24 sm:block">
                  {done ? (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> 100%
                    </div>
                  ) : locked ? (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
                      <Lock className="h-4 w-4" /> locked
                    </div>
                  ) : best > 0 ? (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-cyan-300">
                      <PlayCircle className="h-4 w-4" /> best {best}%
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
                      <Circle className="h-4 w-4" /> start
                    </div>
                  )}
                </span>

                {/* progress underline */}
                {!locked && (
                  <span className="absolute inset-x-4 bottom-0 h-[2px] overflow-hidden rounded-full">
                    <span
                      className={`block h-full rounded-full bg-gradient-to-r transition-all duration-700 ${done ? barGradient(i) : 'from-cyan-400 to-indigo-500'}`}
                      style={{ width: `${done ? 100 : best}%` }}
                    />
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
