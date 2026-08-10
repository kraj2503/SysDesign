import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Compass, Flame, Layers, Sparkles, Target, Zap } from 'lucide-react'
import { api } from '@/api/client'
import { useProgress } from '@/context/ProgressContext'
import type { CaseStudy, HealthResponse } from '@/types'
import ProgressRing from '@/components/ProgressRing'
import { tileGradient } from '@/lib/ui'

export default function Dashboard() {
  const { topics, progress, loading } = useProgress()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthLoaded, setHealthLoaded] = useState(false)
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [streak, setStreak] = useState<{ streak: number; best: number } | null>(null)

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setHealthLoaded(true))
    api.listCaseStudies().then(setCaseStudies).catch(() => setCaseStudies([]))
    api.getStreak().then(setStreak).catch(() => setStreak(null))
  }, [])

  const completed = progress.filter((p) => p.status === 'completed').length
  const total = topics.length
  const pct = total ? Math.round((completed / total) * 100) : 0
  const attempts = progress.reduce((n, p) => n + (p.quiz_attempts ?? 0), 0)

  return (
    <div className="space-y-10">
      {/* -------- hero -------- */}
      <section className="reveal relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-indigo-950/40 p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-72 w-72 rounded-full bg-fuchsia-600/15 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="chip mb-5 border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" /> Interactive · scenario-driven · tricky-question packed
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Master <span className="grad-text">high-level system design</span> by doing, not reading.
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-400">
            Live architecture diagrams, hands-on concept demos, guided case studies, and randomized
            quizzes with the gotchas real interviews hide.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/syllabus" className="btn-primary">
              Start learning <ArrowRight className="h-4 w-4" />
            </Link>
            {caseStudies.length > 0 && (
              <Link to={`/case-studies/${caseStudies[0].slug}`} className="btn-ghost">
                <Compass className="h-4 w-4 text-emerald-300" /> Try a design session
              </Link>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="chip">
              <Layers className="h-3.5 w-3.5 text-cyan-300" /> {total} topics
            </span>
            <span className="chip">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              {health
                ? `${health.questionCount}+ questions`
                : healthLoaded
                  ? 'question count unavailable'
                  : 'loading questions…'}
            </span>
            <span className="chip">
              <Target className="h-3.5 w-3.5 text-emerald-300" /> {caseStudies.length} case studies
            </span>
          </div>
        </div>
      </section>

      {/* -------- stats -------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<ProgressRing value={pct} size={52} stroke={5} from="#22d3ee" to="#a78bfa"><span className="font-display text-sm font-bold text-white">{pct}%</span></ProgressRing>}
          label="Topics mastered"
          value={`${completed}/${total || '–'}`}
          sub={loading ? 'syncing…' : pct === 100 ? 'you did it 🎉' : 'keep the streak alive'}
          accent="text-cyan-300"
        />
        <StatCard
          icon={
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10">
              <BookOpen className="h-6 w-6 text-violet-300" />
            </div>
          }
          label="Quizzes taken"
          value={String(attempts)}
          sub="each one randomized"
          accent="text-violet-300"
        />
        <StatCard
          icon={
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10">
              <Flame className="h-6 w-6 text-amber-300" />
            </div>
          }
          label="Day streak"
          value={streak ? `${streak.streak}` : '0'}
          sub={streak && streak.streak > 0 ? `best ${streak.best} days 🔥` : 'take a quiz to ignite'}
          accent="text-amber-300"
        />
        <StatCard
          icon={
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10">
              <Target className="h-6 w-6 text-emerald-300" />
            </div>
          }
          label="Learning status"
          value={loading ? '…' : pct === 100 ? 'Done' : 'In progress'}
          sub={loading ? 'loading' : pct === 100 ? 'course complete' : 'next: keep going'}
          accent="text-emerald-300"
        />
      </section>

      {/* -------- continue learning -------- */}
      <section className="reveal delay-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight text-white">
            Continue learning
          </h2>
          <Link to="/syllabus" className="group inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-cyan-200">
            Full syllabus
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.slice(0, 6).map((t, i) => {
            const p = t.progress
            const done = p?.status === 'completed'
            const best = p?.quiz_best_score ?? 0
            return (
              <Link
                key={t.slug}
                to={`/topics/${t.slug}`}
                className="card card-hover group p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`tile text-2xl ${tileGradient(i)}`}>{t.icon}</div>
                  {done ? (
                    <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Completed</span>
                  ) : best > 0 ? (
                    <span className="chip border-cyan-500/30 bg-cyan-500/10 text-cyan-300">Best {best}%</span>
                  ) : (
                    <span className="chip">Not started</span>
                  )}
                </div>
                <div className="mt-3 font-display text-base font-semibold text-white">{t.title}</div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-400">{t.summary}</div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${done ? 'from-emerald-400 to-teal-500' : best > 0 ? 'from-cyan-400 to-indigo-500' : ''}`}
                      style={{ width: `${done ? 100 : best > 0 ? best : 0}%` }}
                    />
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-cyan-300" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* -------- case studies -------- */}
      {caseStudies.length > 0 && (
        <section className="reveal delay-2">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold tracking-tight text-white">Guided design sessions</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {caseStudies.map((cs, i) => (
              <Link
                key={cs.slug}
                to={`/case-studies/${cs.slug}`}
                className="card card-hover group p-5"
              >
                <div className={`tile text-2xl ${tileGradient(i + 2)}`}>
                  <Compass className="h-6 w-6" />
                </div>
                <div className="mt-3 font-display text-base font-semibold text-white">{cs.title}</div>
                <div className="mt-1 line-clamp-3 text-sm text-slate-400">{cs.summary}</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    {cs.steps.length}-step session
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-emerald-300" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  sub: string
  accent: string
}) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
        {icon}
      </div>
      <div className={`mt-2 font-display text-3xl font-bold tracking-tight ${accent}`}>{value}</div>
      <div className="mt-0.5 truncate text-xs text-slate-500">{sub}</div>
    </div>
  )
}
