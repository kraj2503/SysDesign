import { Router } from 'express'
import { db } from '../db'

const router = Router()

// POST /api/quiz/results — record a quiz result, update best score + attempts
router.post('/results', (req, res) => {
  const { topic_slug, score, total, answers } = (req.body ?? {}) as {
    topic_slug?: string
    score?: number
    total?: number
    answers?: unknown
  }

  if (typeof topic_slug !== 'string' || typeof score !== 'number' || typeof total !== 'number') {
    return res.status(400).json({ error: 'topic_slug, score, and total are required' })
  }

  const topic = db.prepare('SELECT id FROM topics WHERE slug = ?').get(topic_slug) as
    | { id: number }
    | undefined
  if (!topic) return res.status(404).json({ error: 'Topic not found' })

  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  db.prepare('INSERT INTO quiz_results (topic_id, score, total, answers_json, taken_at) VALUES (?,?,?,?,?)')
    .run(topic.id, score, total, JSON.stringify(answers ?? []), new Date().toISOString())

  const existing = db.prepare('SELECT quiz_best_score, quiz_attempts FROM progress WHERE topic_id = ?').get(topic.id) as
    | { quiz_best_score: number | null; quiz_attempts: number }
    | undefined

  if (existing) {
    const best = Math.max(existing.quiz_best_score ?? 0, pct)
    db.prepare('UPDATE progress SET quiz_best_score = ?, quiz_attempts = quiz_attempts + 1 WHERE topic_id = ?')
      .run(best, topic.id)
  } else {
    db.prepare(
      'INSERT INTO progress (topic_id, status, quiz_best_score, quiz_attempts) VALUES (?,?,?,1)',
    ).run(topic.id, 'unlocked', pct)
  }

  res.json({ ok: true, percent: pct })
})

// GET /api/quiz/streak — consecutive days with at least one quiz result
router.get('/streak', (_req, res) => {
  const rows = db
    .prepare('SELECT DISTINCT date(taken_at) AS d FROM quiz_results ORDER BY d DESC')
    .all() as { d: string }[]

  const today = new Date()
  const todayStr = toDateKey(today)
  const dayKeys = new Set(rows.map((r) => r.d))

  let streak = 0
  let cursor = new Date(todayStr)
  if (!dayKeys.has(todayStr)) {
    // streak may still count if you studied yesterday
    cursor = addDays(cursor, -1)
  }
  while (dayKeys.has(toDateKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }

  // longest streak
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const row of rows) {
    if (prev !== null && prev === addDays(new Date(row.d), -1).toISOString().slice(0, 10)) run++
    else run = 1
    best = Math.max(best, run)
    prev = row.d
  }

  res.json({ streak, best })
})

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default router
