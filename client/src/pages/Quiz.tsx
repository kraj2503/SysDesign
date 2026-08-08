import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Timer, Zap } from 'lucide-react'
import { api, type TopicDetail } from '@/api/client'
import QuizPlayer from '@/components/QuizPlayer'

export default function Quiz() {
  const { slug = '' } = useParams()
  const [topic, setTopic] = useState<TopicDetail | null>(null)

  useEffect(() => {
    api.getTopic(slug).then(setTopic).catch(() => setTopic(null))
  }, [slug])

  if (!topic) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to={`/topics/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {topic.title}
      </Link>

      <header className="reveal relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-violet-950/40 p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative">
          <span className="chip mb-3 border-violet-500/30 bg-violet-500/10 text-violet-300">
            <Zap className="h-3.5 w-3.5" /> Randomized quiz
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Test yourself on <span className="grad-text">{topic.title}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            8 random questions pulled from the bank — tricky gotchas included. Pass with 60%+ to mark
            the topic complete.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="chip">
              <Timer className="h-3.5 w-3.5 text-amber-300" /> 45s per question
            </span>
            <span className="chip">
              <Zap className="h-3.5 w-3.5 text-purple-300" /> Tricky questions flagged ⚡
            </span>
          </div>
        </div>
      </header>

      <QuizPlayer topicSlug={slug} topicTitle={topic.title} count={8} />
    </div>
  )
}
