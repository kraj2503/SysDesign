import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, BookOpen, FileQuestion, Lock } from 'lucide-react'
import { api, type TopicDetail } from '@/api/client'
import { useProgress } from '@/context/ProgressContext'
import DiagramCanvas from '@/components/DiagramCanvas'
import LessonDemo from '@/components/LessonDemo'

export default function Lesson() {
  const { slug = '' } = useParams()
  const { progressBySlug } = useProgress()
  const [topic, setTopic] = useState<TopicDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getTopic(slug)
      .then(setTopic)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load topic'))
  }, [slug])

  const progress = progressBySlug[slug]
  const locked = progress?.status === 'locked' || (progress === undefined && false)

  if (error) return <p className="text-sm text-rose-400">{error}</p>
  if (!topic)
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )

  return (
    <div className="space-y-8">
      <Link
        to="/syllabus"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-cyan-300"
      >
        <ArrowLeft className="h-4 w-4" /> Learning path
      </Link>

      {/* topic header */}
      <header className="reveal relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-indigo-950/40 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start gap-5">
          <span className="tile h-16 w-16 text-4xl bg-gradient-to-br from-cyan-500/25 via-indigo-500/25 to-fuchsia-600/20">
            {topic.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {topic.title}
              </h1>
              {locked && (
                <span className="chip border-amber-500/40 bg-amber-500/10 text-amber-300">
                  <Lock className="h-3.5 w-3.5" /> Locked
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{topic.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="chip">
                <BookOpen className="h-3.5 w-3.5 text-cyan-300" /> {topic.lessons.length} lessons
              </span>
              <span className="chip">
                <FileQuestion className="h-3.5 w-3.5 text-violet-300" /> 8-question randomized quiz
              </span>
              {topic.progress?.quiz_best_score != null && (
                <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  Best quiz score {topic.progress.quiz_best_score}%
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {locked && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <Lock className="h-4 w-4 shrink-0" /> Complete the previous topic's quiz to unlock this one.
        </div>
      )}

      {/* lessons */}
      <div className="space-y-6">
        {topic.lessons.map((lesson, i) => (
          <article
            key={lesson.id}
            className="reveal card overflow-hidden p-6 sm:p-8"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 font-display text-sm font-bold text-cyan-300 ring-1 ring-inset ring-cyan-500/25">
                {i + 1}
              </span>
              <h2 className="font-display text-xl font-semibold tracking-tight text-white">
                {lesson.title}
              </h2>
            </div>

            <div className="md-content max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body_md}</ReactMarkdown>
            </div>

            {lesson.demo && (
              <div className="mt-6">
                <LessonDemo demo={lesson.demo} />
              </div>
            )}
            {lesson.diagram_json && (
              <div className="mt-6">
                <DiagramCanvas diagram={lesson.diagram_json} />
              </div>
            )}
          </article>
        ))}
      </div>

      {/* quiz CTA */}
      {!locked && (
        <div className="reveal delay-1 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 p-6">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">Test yourself</h3>
            <p className="mt-0.5 text-sm text-slate-400">
              8 random questions · includes tricky gotchas · pass with 60%+ to mark this topic done.
            </p>
          </div>
          <Link to={`/topics/${slug}/quiz`} className="btn-primary">
            <FileQuestion className="h-4 w-4" /> Take the topic quiz
          </Link>
        </div>
      )}
    </div>
  )
}
