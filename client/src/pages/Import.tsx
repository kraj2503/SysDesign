import { useState } from 'react'
import { api } from '@/api/client'
import { CheckCircle2, Database, XCircle } from 'lucide-react'

type Mode = 'json' | 'csv'

const JSON_PLACEHOLDER = `// Paste an array of questions, or {"questions": [...]}
// Each question: { topicSlug, prompt, type, options, correct, explanation, difficulty?, isTricky? }
[
  {
    "topicSlug": "caching",
    "prompt": "Example question?",
    "type": "mcq",
    "options": ["A", "B", "C", "D"],
    "correct": [1],
    "explanation": "Why it's correct.",
    "difficulty": 1,
    "isTricky": false
  }
]`

const CSV_PLACEHOLDER = `topicSlug,prompt,type,options,correct,explanation,difficulty,isTricky
"databases","Which statement about indexes is correct?","mcq","[\"A\",\"B\"]","[1]","Explanation","2","false"`

export default function Import() {
  const [mode, setMode] = useState<Mode>('json')
  const [text, setText] = useState(JSON_PLACEHOLDER)
  const [topicSlug, setTopicSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runImport = async () => {
    setBusy(true)
    setResult(null)
    setError(null)
    try {
      let body: { questions?: unknown[]; csv?: string; topicSlug?: string }
      if (mode === 'json') {
        // The sample is annotated with // comments so people can read it — strip line-start
        // comments before parsing (URLs inside string values are safe: they aren't at line start).
        const parsed = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''))
        if (Array.isArray(parsed)) body = { questions: parsed }
        else if (parsed && Array.isArray(parsed.questions)) body = { questions: parsed.questions }
        else throw new Error('JSON must be an array of questions or { "questions": [...] }')
      } else {
        if (!topicSlug.trim()) throw new Error('A topicSlug is required for CSV import')
        body = { csv: text, topicSlug: topicSlug.trim() }
      }
      const res = await api.importQuestions(body)
      setResult({ inserted: res.inserted, skipped: res.skipped })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="reveal">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">
          Import <span className="grad-text">questions</span>
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Bulk-add questions to the bank via JSON or CSV. Sample files live in{' '}
          <code className="rounded border border-slate-700 bg-slate-800/70 px-1.5 py-0.5 font-mono text-xs text-cyan-300">
            server/examples/
          </code>
          .
        </p>
      </header>

      <div className="card reveal delay-1 p-6">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setMode('json')
              setText(JSON_PLACEHOLDER)
            }}
            className={`rounded-xl px-3 py-2.5 font-display text-sm font-semibold transition-all ${
              mode === 'json'
                ? 'bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-cyan-300 ring-1 ring-inset ring-cyan-500/40 shadow-[0_0_20px_-8px_rgba(34,211,238,0.6)]'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => {
              setMode('csv')
              setText(CSV_PLACEHOLDER)
            }}
            className={`rounded-xl px-3 py-2.5 font-display text-sm font-semibold transition-all ${
              mode === 'csv'
                ? 'bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-cyan-300 ring-1 ring-inset ring-cyan-500/40 shadow-[0_0_20px_-8px_rgba(34,211,238,0.6)]'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            CSV
          </button>
        </div>

        {mode === 'csv' && (
          <input
            value={topicSlug}
            onChange={(e) => setTopicSlug(e.target.value)}
            placeholder="topicSlug (e.g. caching)"
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm outline-none transition-colors focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]"
          />
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={16}
          className="mt-4 w-full resize-y rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-slate-300 outline-none transition-colors focus:border-cyan-500"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={() => void runImport()} disabled={busy} className="btn-primary">
            <Database className="h-4 w-4" />
            {busy ? 'Importing…' : 'Import'}
          </button>
          {result && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Inserted {result.inserted}
              {result.skipped.length > 0 && (
                <span className="text-slate-500"> · skipped {result.skipped.length}</span>
              )}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-sm text-rose-300">
              <XCircle className="h-4 w-4" /> {error}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
