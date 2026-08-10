import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, RotateCcw, Zap } from 'lucide-react'
import type { CaseStudyStep, RequirementOption, SimQuestion } from '@/types'

interface SimulatorShellProps {
  title: string
  steps: CaseStudyStep[]
}

export default function SimulatorShell({ title, steps }: SimulatorShellProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [completed, setCompleted] = useState<boolean[]>(() => steps.map(() => false))
  // Answers live here (not mutated into step.content) so restart/back-navigation reset cleanly.
  const [answers, setAnswers] = useState<Record<string, unknown>>({})

  const step = steps[index]

  const advance = () => {
    setRevealed(false)
    if (index + 1 < steps.length) setIndex(index + 1)
  }

  const restart = () => {
    setIndex(0)
    setRevealed(false)
    setCompleted(steps.map(() => false))
    setAnswers({})
  }

  const setStepAnswer = (v: unknown) => setAnswers((prev) => ({ ...prev, [step.id]: v }))

  const allDone = completed.every(Boolean)

  if (allDone) {
    return (
      <div className="reveal relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-950/70 to-transparent p-10 text-center">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative">
          <div className="text-6xl">🏆</div>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
            {title} — session complete
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            You walked through requirements, estimation, assembling the architecture, and the tricky
            trade-offs like a senior engineer.
          </p>
          <button onClick={restart} className="btn-primary mt-6">
            <RotateCcw className="h-4 w-4" /> Run it again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => {
          const isActive = i === index
          const isDone = completed[i]
          return (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => !revealed && setIndex(i)}
                disabled={revealed}
                className={`inline-flex items-center gap-2 rounded-full py-2 pl-1.5 pr-3.5 text-xs font-medium transition-all duration-200 ${
                  isDone
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : isActive
                      ? 'bg-cyan-500/15 text-cyan-200 shadow-[0_0_20px_-8px_rgba(34,211,238,0.7)] ring-1 ring-inset ring-cyan-500/50'
                      : 'bg-slate-800/60 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 rounded-full bg-emerald-500/20 p-0.5 text-emerald-300" />
                ) : (
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                      isActive
                        ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                {s.label}
              </button>
              {i < steps.length - 1 && <span className="h-px w-4 bg-gradient-to-r from-slate-600 to-slate-700" />}
            </div>
          )
        })}
      </div>

      {/* step body */}
      <div className="reveal card overflow-hidden p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 font-display text-sm font-bold text-cyan-300 ring-1 ring-inset ring-cyan-500/25">
              {index + 1}
            </span>
            <h2 className="font-display text-lg font-semibold tracking-tight text-white">{step.label}</h2>
          </div>
          <span className="chip capitalize">{step.type}</span>
        </div>
        <div>
          <StepWidget
            step={step}
            revealed={revealed}
            value={answers[step.id]}
            onAnswer={setStepAnswer}
            onCheck={() => {
              setCompleted((c) => c.map((v, i) => (i === index ? true : v)))
              setRevealed(true)
            }}
          />
        </div>
      </div>

      {revealed && (
        <div className="flex justify-end">
          <button onClick={advance} className="btn-primary">
            {index + 1 >= steps.length ? 'Finish session' : 'Next step'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ step widgets ------------------------------ */

function StepWidget({
  step,
  revealed,
  value,
  onAnswer,
  onCheck,
}: {
  step: CaseStudyStep
  revealed: boolean
  value: unknown
  onAnswer: (v: unknown) => void
  onCheck: () => void
}) {
  const content = step.content
  const isCorrect = useMemo(() => {
    if (revealed) return computeCorrect(step, value)
    return false
  }, [revealed, step, value])

  return (
    <div className="space-y-4">
      <div className="min-h-[220px]">
        {step.type === 'requirements' && (
          <RequirementsWidget
            content={content}
            revealed={revealed}
            value={(value as { selected?: string[] } | undefined)?.selected ?? []}
            onChange={(selected) => onAnswer({ selected })}
          />
        )}
        {step.type === 'estimation' && (
          <EstimationWidget
            content={content}
            revealed={revealed}
            value={(value as { inputs?: Record<string, string> } | undefined)?.inputs ?? {}}
            onChange={(inputs) => onAnswer({ inputs })}
          />
        )}
        {step.type === 'assemble' && (
          <AssembleWidget
            content={content}
            revealed={revealed}
            value={(value as { order?: string[] } | undefined)?.order ?? []}
            onChange={(order) => onAnswer({ order })}
          />
        )}
        {(step.type === 'deepdive' || step.type === 'quiz') && (
          <QuizWidget
            content={content}
            revealed={revealed}
            value={(value as { selections?: Record<number, number[]> } | undefined)?.selections ?? {}}
            onChange={(selections) => onAnswer({ selections })}
          />
        )}
      </div>

      {!revealed && (
        <button onClick={onCheck} className="btn-primary">
          <CheckCircle2 className="h-4 w-4" /> Check step
        </button>
      )}
      {revealed && (
        <div
          className={`animate-pop flex items-center gap-2 rounded-xl border p-4 text-sm ${
            isCorrect
              ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent'
              : 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-transparent'
          }`}
        >
          <span className={isCorrect ? 'text-xl' : 'text-xl'}>{isCorrect ? '✅' : '💡'}</span>
          <span className="font-semibold text-slate-100">
            {isCorrect
              ? 'Step completed correctly.'
              : 'Not quite — check the notes above, then continue to the next step.'}
          </span>
        </div>
      )}
    </div>
  )
}

function computeCorrect(step: CaseStudyStep, answer: unknown): boolean {
  switch (step.type) {
    case 'requirements': {
      const sel = (answer as { selected?: string[] } | undefined)?.selected ?? []
      const correct = (step.content as { correct: string[] }).correct
      return sel.length === correct.length && correct.every((id) => sel.includes(id))
    }
    case 'estimation': {
      const inputs = (answer as { inputs?: Record<string, string> } | undefined)?.inputs ?? {}
      const items = (step.content as { items: { id: string; answer: number }[] }).items
      return items.every((it) => {
        const raw = Number(inputs[it.id])
        if (!Number.isFinite(raw)) return false
        const diff = Math.abs(raw - it.answer)
        return diff === 0 || diff / it.answer <= 0.2
      })
    }
    case 'assemble': {
      const order = (answer as { order?: string[] } | undefined)?.order ?? []
      const correctOrder = (step.content as { correctOrder: string[] }).correctOrder
      return order.length === correctOrder.length && correctOrder.every((id, i) => order[i] === id)
    }
    case 'deepdive':
    case 'quiz': {
      const selections = (answer as { selections?: Record<number, number[]> } | undefined)?.selections ?? {}
      const questions = (step.content as { questions: SimQuestion[] }).questions
      return questions.every((q, qi) => {
        const sel = selections[qi] ?? []
        return sel.length === q.correct.length && q.correct.every((x) => sel.includes(x))
      })
    }
  }
}

/* ------------------------------ requirements ------------------------------ */

function RequirementsWidget({
  content,
  value,
  onChange,
  revealed,
}: {
  content: unknown
  value: string[]
  onChange: (selected: string[]) => void
  revealed: boolean
}) {
  const c = content as { options: RequirementOption[]; correct: string[] }
  const selected = value

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Select the key requirements you would capture before designing. Functional = what the system
        does; non-functional = how well it does it.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {c.options.map((opt) => {
          const isSel = selected.includes(opt.id)
          const isRight = revealed && c.correct.includes(opt.id)
          const isWrong = revealed && isSel && !c.correct.includes(opt.id)
          const missed = revealed && !isSel && c.correct.includes(opt.id)
          return (
            <button
              key={opt.id}
              onClick={() => !revealed && toggle(opt.id)}
              disabled={revealed}
              className={`rounded-xl border p-3 text-left text-sm transition ${
                isRight
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : isWrong
                    ? 'border-rose-500/60 bg-rose-500/10'
                    : missed
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : isSel
                        ? 'border-cyan-500/60 bg-cyan-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
              }`}
            >
              <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {opt.kind}
              </span>
              <span className="block">{opt.text}</span>
              {revealed && (isRight || missed) && (
                <span className="mt-1 block text-xs text-emerald-400">✓ needed</span>
              )}
              {revealed && isWrong && <span className="mt-1 block text-xs text-rose-400">✗ not required</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------- estimation ------------------------------- */

function EstimationWidget({
  content,
  value,
  onChange,
  revealed,
}: {
  content: unknown
  value: Record<string, string>
  onChange: (inputs: Record<string, string>) => void
  revealed: boolean
}) {
  const c = content as { items: { id: string; label: string; prompt: string; answer: number; unit: string }[] }
  const inputs = value

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Do the back-of-the-envelope math. Round aggressively — we accept ±20%.
      </p>
      {c.items.map((it) => {
        const raw = Number(inputs[it.id])
        const ok = revealed && (raw === it.answer || (Number.isFinite(raw) && Math.abs(raw - it.answer) / it.answer <= 0.2))
        const bad = revealed && inputs[it.id] !== undefined && !ok
        return (
          <div key={it.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="text-sm font-medium">{it.label}</div>
            <div className="mt-1 text-xs text-slate-400">{it.prompt}</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={inputs[it.id] ?? ''}
                onChange={(e) => !revealed && onChange({ ...inputs, [it.id]: e.target.value })}
                disabled={revealed}
                placeholder="≈"
                className={`w-32 rounded-lg border bg-slate-900 px-3 py-1.5 text-sm outline-none ${
                  ok ? 'border-emerald-500/60 text-emerald-300' : bad ? 'border-rose-500/60 text-rose-300' : 'border-slate-700 focus:border-cyan-500'
                }`}
              />
              <span className="text-xs text-slate-500">{it.unit}</span>
              {revealed && (
                <span className={`ml-auto text-xs ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  answer ≈ {it.answer}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------- assemble -------------------------------- */

const KIND_STYLE: Record<string, { bg: string; border: string }> = {
  client: { bg: '#155e75', border: '#22d3ee' },
  cdn: { bg: '#5b21b6', border: '#a78bfa' },
  lb: { bg: '#92400e', border: '#fbbf24' },
  server: { bg: '#1e40af', border: '#60a5fa' },
  cache: { bg: '#9f1239', border: '#fb7185' },
  queue: { bg: '#166534', border: '#4ade80' },
  db: { bg: '#3b0764', border: '#a78bfa' },
  other: { bg: '#334155', border: '#94a3b8' },
}

function AssembleWidget({
  content,
  value,
  onChange,
  revealed,
}: {
  content: unknown
  value: string[]
  onChange: (order: string[]) => void
  revealed: boolean
}) {
  const c = content as {
    components: { id: string; label: string; kind: string }[]
    correctOrder: string[]
  }
  const order = value

  const add = (id: string) => {
    if (order.includes(id)) return
    onChange([...order, id])
  }

  const removeLast = () => onChange(order.slice(0, -1))

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Build the architecture: click components in the order requests would flow (client → …
        → storage). Tap a palette item to add it; the canvas fills left to right.
      </p>

      <div className="flex flex-wrap gap-2">
        {c.components.map((comp) => {
          const used = order.includes(comp.id)
          const st = KIND_STYLE[comp.kind] ?? KIND_STYLE.other
          return (
            <button
              key={comp.id}
              onClick={() => !revealed && !used && add(comp.id)}
              disabled={revealed || used}
              className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                used ? 'opacity-30' : 'hover:bg-white/[0.06]'
              }`}
              style={{ background: st.bg, borderColor: st.border, color: '#f8fafc' }}
            >
              {comp.label}
            </button>
          )
        })}
      </div>

      <div className="flex min-h-[90px] flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-3">
        {order.length === 0 && <span className="text-xs text-slate-600">Add components…</span>}
        {order.map((id, i) => {
          const comp = c.components.find((x) => x.id === id)!
          const st = KIND_STYLE[comp.kind] ?? KIND_STYLE.other
          const inRightPlace = revealed && c.correctOrder[i] === id
          return (
            <div key={id} className="flex items-center gap-2">
              <div
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                  revealed && !inRightPlace ? 'ring-2 ring-rose-500/70' : ''
                }`}
                style={{ background: st.bg, borderColor: st.border, color: '#f8fafc' }}
              >
                {comp.label}
              </div>
              {i < order.length - 1 && <span className="text-slate-600">→</span>}
            </div>
          )
        })}
        {order.length > 0 && (
          <button
            onClick={removeLast}
            disabled={revealed}
            className="ml-auto rounded p-1 text-slate-500 hover:text-rose-400"
            aria-label="Remove last"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------------------------- deep dive / quiz ----------------------------- */

function QuizWidget({
  content,
  value,
  onChange,
  revealed,
}: {
  content: unknown
  value: Record<number, number[]>
  onChange: (selections: Record<number, number[]>) => void
  revealed: boolean
}) {
  const c = content as { questions: SimQuestion[] }
  const selections = value

  const toggle = (qi: number, opt: number) => {
    const cur = selections[qi] ?? []
    const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]
    onChange({ ...selections, [qi]: next })
  }

  return (
    <div className="space-y-6">
      {c.questions.map((q, qi) => {
        const sel = selections[qi] ?? []
        const allRight = revealed && q.correct.length === sel.length && q.correct.every((x) => sel.includes(x))
        return (
          <div key={qi} className="space-y-2.5">
            <p className="flex items-start gap-2 text-sm font-semibold text-slate-100">
              {q.isTricky && <Zap className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />}
              {q.prompt}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => {
                const isSel = sel.includes(oi)
                const isRight = revealed && q.correct.includes(oi)
                const isWrong = revealed && isSel && !q.correct.includes(oi)
                return (
                  <button
                    key={oi}
                    onClick={() => !revealed && toggle(qi, oi)}
                    disabled={revealed}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left text-sm transition-all duration-200 ${
                      isRight
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_20px_-8px_rgba(52,211,153,0.5)]'
                        : isWrong
                          ? 'border-rose-400/60 bg-rose-500/10 text-rose-100'
                          : isSel
                            ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100'
                            : 'border-slate-800 bg-slate-900/60 hover:-translate-y-0.5 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold ${
                        isRight
                          ? 'bg-emerald-400 text-slate-950'
                          : isWrong
                            ? 'bg-rose-400 text-slate-950'
                            : isSel
                              ? 'bg-cyan-400 text-slate-950'
                              : 'border border-slate-600 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="min-w-0 flex-1">{opt}</span>
                  </button>
                )
              })}
            </div>
            {revealed && (
              <div
                className={`animate-pop rounded-xl border p-3 text-xs leading-relaxed ${
                  allRight
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                }`}
              >
                {q.explanation}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
