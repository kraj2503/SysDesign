import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Compass, ListOrdered } from 'lucide-react'
import { api } from '@/api/client'
import type { CaseStudy as CaseStudyType } from '@/types'
import SimulatorShell from '@/components/simulator/SimulatorShell'

export default function CaseStudy() {
  const { slug = '' } = useParams()
  const [study, setStudy] = useState<CaseStudyType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getCaseStudy(slug)
      .then(setStudy)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load case study'))
  }, [slug])

  if (error) return <p className="text-sm text-rose-400">{error}</p>
  if (!study)
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <header className="reveal relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-emerald-950/40 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-4">
          <span className="tile h-14 w-14 text-emerald-300 bg-gradient-to-br from-emerald-500/25 to-teal-600/20">
            <Compass className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {study.title}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">{study.summary}</p>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <ListOrdered className="h-3.5 w-3.5" /> {study.steps.length}-step guided session
              </span>
            </div>
          </div>
        </div>
      </header>

      <SimulatorShell title={study.title} steps={study.steps} />
    </div>
  )
}
