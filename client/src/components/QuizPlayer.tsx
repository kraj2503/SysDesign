import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useProgress } from '@/context/ProgressContext'
import type { Question } from '@/types'
import { ArrowRight, CheckCircle2, History, Loader2, RotateCcw, Timer, XCircle, Zap } from 'lucide-react'
import ProgressRing from '@/components/ProgressRing'

interface QuizPlayerProps {
  topicSlug: string
  topicTitle: string
  count?: number
  timePerQuestionSec?: number // 0 disables the timer
  passThreshold?: number // percent required to mark completed
}

interface AnswerRecord {
  question: Question
  selected: number[]
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  2: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  3: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
}

export default function QuizPlayer({
  topicSlug,
  topicTitle,
  count = 8,
  timePerQuestionSec = 45,
  passThreshold = 60,
}: QuizPlayerProps) {
  const { refresh } = useProgress()
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [finished, setFinished] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resultId, setResultId] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(timePerQuestionSec)
  const [retakeNonce, setRetakeNonce] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api
      .getQuiz(topicSlug, count)
      .then(setQuestions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load quiz'))
  }, [topicSlug, count, retakeNonce])

  const current = questions?.[index] ?? null

  // per-question timer
  useEffect(() => {
    if (!current || revealed || submitted) return
    if (timePerQuestionSec <= 0) return
    setSecondsLeft(timePerQuestionSec)
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [current, revealed, submitted, timePerQuestionSec])

  // auto-submit when the timer runs out
  useEffect(() => {
    if (secondsLeft === 0 && current && !revealed && !submitted && timePerQuestionSec > 0) {
      handleCheck()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  const toggle = useCallback((i: number) => {
    if (!current) return
    if (current.type === 'multi') {
      setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
    } else {
      setSelected([i])
    }
  }, [current])

  const handleCheck = useCallback(() => {
    if (!current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setAnswers((prev) => [...prev, { question: current, selected }])
    setRevealed(true)
  }, [current, selected])

  const handleNext = useCallback(() => {
    setSelected([])
    setRevealed(false)
    if (index + 1 >= (questions?.length ?? 0)) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }, [index, questions?.length])

  const score = useMemo(
    () => answers.filter((a) => a.question.correct.every((c) => a.selected.includes(c)) && a.selected.length === a.question.correct.length).length,
    [answers],
  )
  const percent = questions?.length ? Math.round((score / questions.length) * 100) : 0

  const handleSubmit = useCallback(async () => {
    if (submitted || saving) return
    setSaving(true)
    setSubmitError(null)
    try {
      const res = await api.submitQuizResult({
        topic_slug: topicSlug,
        score,
        total: questions?.length ?? 0,
        answers: answers.map((a) => ({
          question_id: a.question.id,
          prompt: a.question.prompt,
          type: a.question.type,
          options: a.question.options,
          correct: a.question.correct,
          selected: a.selected,
          explanation: a.question.explanation,
          is_tricky: a.question.is_tricky,
        })),
      })
      setResultId(res.result_id)
      // The server marks the topic completed + unlocks the next one — refresh to reflect it.
      await refresh()
      setSubmitted(true)
    } catch (e) {
      // Keep the quiz on screen and let the user retry — never claim it was saved.
      setSubmitError(e instanceof Error ? e.message : 'Failed to save result — check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }, [submitted, saving, topicSlug, score, questions?.length, answers, refresh])

  // In-app retake: reset every piece of local state and re-fetch a fresh random quiz.
  const handleRetake = useCallback(() => {
    setIndex(0)
    setSelected([])
    setRevealed(false)
    setAnswers([])
    setFinished(false)
    setSubmitted(false)
    setSubmitError(null)
    setResultId(null)
    setQuestions(null)
    setRetakeNonce((n) => n + 1)
  }, [])

  if (error) return <p className="text-sm text-rose-400">{error}</p>
  if (!questions) return <p className="text-sm text-slate-400">Loading questions…</p>
  if (questions.length === 0) return <p className="text-sm text-slate-400">No questions for this topic yet.</p>

  if (finished) {
    const passed = percent >= passThreshold
    return (
      <div className="space-y-6">
        <div className="reveal relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-indigo-950/40 p-8 text-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-fuchsia-600/10 blur-3xl" />
          <div className="relative">
            <div className="text-5xl">{passed ? '🎉' : '💪'}</div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white">
              {passed ? 'Topic cleared!' : 'So close — keep pushing'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {topicTitle} · {score}/{questions.length} correct
            </p>

            <div className="mx-auto mt-6 w-fit">
              <ProgressRing
                value={percent}
                size={124}
                stroke={10}
                from={passed ? '#34d399' : '#22d3ee'}
                to={passed ? '#2dd4bf' : '#e879f9'}
              >
                <div className="text-center">
                  <div className="font-display text-3xl font-bold text-white">{percent}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">score</div>
                </div>
              </ProgressRing>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              {passed
                ? 'Passed! Topic marked as completed.'
                : `Need ${passThreshold}% to pass — retry anytime to improve your best score.`}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {!submitted ? (
                <button onClick={() => void handleSubmit()} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Save result'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Result saved
                </span>
              )}
              <button onClick={handleRetake} className="btn-ghost">
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
            </div>

            {submitError && (
              <p className="mt-3 text-xs font-medium text-rose-300" role="alert">
                {submitError}
              </p>
            )}

            {submitted && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                {resultId != null && (
                  <Link to={`/results/${resultId}`} className="btn-ghost">
                    <History className="h-4 w-4" /> Review this attempt
                  </Link>
                )}
                <Link
                  to="/results"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
                >
                  <History className="h-3.5 w-3.5" /> View past results
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {answers.map((a, i) => {
            const ok =
              a.question.correct.every((c) => a.selected.includes(c)) &&
              a.selected.length === a.question.correct.length
            return (
              <div key={i} className="card card-hover p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      ok
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100">{a.question.prompt}</p>
                    <div className="mt-1.5 space-y-1 text-xs">
                      <p className="text-slate-400">
                        <span className="text-slate-500">You chose:</span>{' '}
                        <span className={ok ? 'text-emerald-300' : 'text-rose-300'}>
                          {a.selected.length
                            ? a.selected.map((s) => a.question.options[s]).join(', ')
                            : '—'}
                        </span>
                      </p>
                      <p className="text-slate-400">
                        <span className="text-slate-500">Correct:</span>{' '}
                        <span className="text-emerald-300">
                          {a.question.correct.map((c) => a.question.options[c]).join(', ')}
                        </span>
                      </p>
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
          })}
        </div>
      </div>
    )
  }

  if (!current) return null

  const isCorrect =
    revealed &&
    current.correct.every((c) => selected.includes(c)) &&
    selected.length === current.correct.length

  return (
    <div className="reveal space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 items-center rounded-lg bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 px-2.5 font-display text-sm font-bold text-cyan-300 ring-1 ring-inset ring-cyan-500/25">
            Q{index + 1}
          </span>
          <span className="text-sm text-slate-400">
            of <span className="font-semibold text-slate-200">{questions.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {timePerQuestionSec > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono font-medium ${
                secondsLeft <= 10
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300'
              }`}
            >
              <Timer className="h-3.5 w-3.5" /> {secondsLeft}s
            </span>
          )}
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-medium ${DIFFICULTY_COLORS[current.difficulty]}`}>
            {current.difficulty === 3 ? 'Hard' : current.difficulty === 2 ? 'Medium' : 'Easy'}
          </span>
          {current.is_tricky && (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 font-medium text-purple-300">
              <Zap className="h-3.5 w-3.5" /> Tricky
            </span>
          )}
        </div>
      </div>

      {/* segmented progress */}
      <div className="flex gap-1.5">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
              i < index
                ? 'bg-cyan-400'
                : i === index
                  ? revealed
                    ? isCorrect
                      ? 'bg-emerald-400'
                      : 'bg-rose-400'
                    : 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                  : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* prompt */}
      <p className="font-display text-xl font-semibold leading-snug text-white">{current.prompt}</p>

      {/* options */}
      <div className="space-y-2.5">
        {current.options.map((opt, i) => {
          const isSelected = selected.includes(i)
          const showCorrect = revealed && current.correct.includes(i)
          const showWrong = revealed && isSelected && !current.correct.includes(i)
          const dimmed = revealed && !current.correct.includes(i) && !isSelected
          return (
            <button
              key={i}
              onClick={() => !revealed && toggle(i)}
              disabled={revealed}
              className={`group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-all duration-200 ${
                showCorrect
                  ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_24px_-8px_rgba(52,211,153,0.5)]'
                  : showWrong
                    ? 'border-rose-400/60 bg-rose-500/10 text-rose-100 shadow-[0_0_24px_-8px_rgba(251,113,133,0.5)]'
                    : isSelected
                      ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100 shadow-[0_0_24px_-8px_rgba(34,211,238,0.5)]'
                      : dimmed
                        ? 'border-slate-800 bg-slate-900/40 text-slate-500'
                        : 'border-slate-800 bg-slate-900/60 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-900'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold transition-colors ${
                  showCorrect
                    ? 'bg-emerald-400 text-slate-950'
                    : showWrong
                      ? 'bg-rose-400 text-slate-950'
                      : isSelected
                        ? 'bg-cyan-400 text-slate-950'
                        : 'border border-slate-600 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-200'
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1 pt-0.5">{opt}</span>
              {showCorrect && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />}
              {showWrong && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />}
            </button>
          )
        })}
      </div>

      {/* feedback */}
      {revealed && (
        <div
          className={`animate-pop rounded-2xl border p-4 text-sm ${
            isCorrect
              ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent'
              : 'border-rose-500/40 bg-gradient-to-br from-rose-500/10 to-transparent'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-white">
            {isCorrect ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-300" />
            )}
            {isCorrect ? 'Correct! Nice one.' : 'Not quite — here\'s the gotcha.'}
          </div>
          <p className="mt-2 leading-relaxed text-slate-300">{current.explanation}</p>
        </div>
      )}

      {/* actions */}
      <div className="flex justify-end">
        {!revealed ? (
          <button onClick={handleCheck} disabled={selected.length === 0} className="btn-primary">
            <CheckCircle2 className="h-4 w-4" /> Check answer
          </button>
        ) : (
          <button onClick={handleNext} className="btn-ghost">
            {index + 1 >= questions.length ? 'See results' : 'Next'} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
