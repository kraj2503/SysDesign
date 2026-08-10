import { Router } from 'express'
import { db } from '../db'
import { requireAuth, verifyQuizToken } from '../middleware/auth'
import type { QuestionRow } from '../types'

const router = Router()

// A quiz session is bound to a signed token (see middleware/auth.ts) that records the
// exact random question subset. The client can submit answers for those questions and
// ask for per-question feedback, but it can never pick its own subset or report a score.

const MAX_QUIZ_QUESTIONS = 20

function isAnswerCorrect(correct: number[], selected: number[]): boolean {
  return correct.length === selected.length && correct.every((c) => selected.includes(c))
}

// Normalize a client-supplied `selected` array to unique, in-range integer indices.
// Returns null when it's not a valid selection shape.
function normalizeSelected(value: unknown, optionCount: number): number[] | null {
  if (!Array.isArray(value)) return null
  const out = [...new Set(value.map(Number))]
  if (out.some((n) => !Number.isInteger(n) || n < 0 || n >= optionCount)) return null
  if (out.length > optionCount) return null
  return out
}

// POST /api/quiz/check — reveal correctness + explanation for one answered question.
// Body: { token, question_id, selected }.
// The token proves the question belongs to the quiz session this user was served.
router.post('/check', requireAuth, (req, res) => {
  const { token, question_id, selected } = (req.body ?? {}) as {
    token?: unknown
    question_id?: unknown
    selected?: unknown
  }
  if (typeof token !== 'string' || typeof question_id !== 'number') {
    return res.status(400).json({ error: 'token and question_id are required' })
  }

  const payload = verifyQuizToken(token)
  if (!payload) return res.status(401).json({ error: 'Quiz session is invalid or expired — reload and retry' })
  if (payload.uid !== req.userId) return res.status(403).json({ error: 'Not your quiz session' })
  if (!payload.ids.includes(question_id)) {
    return res.status(400).json({ error: 'Question is not part of this quiz' })
  }

  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(question_id) as QuestionRow | undefined
  if (!row) return res.status(404).json({ error: 'Question not found' })

  const options = JSON.parse(row.options_json) as string[]
  const correct = JSON.parse(row.correct_json) as number[]
  const sel = normalizeSelected(selected, options.length)
  if (sel === null) return res.status(400).json({ error: 'Invalid answer selection' })

  res.json({
    correct: isAnswerCorrect(correct, sel),
    correctIndices: correct,
    explanation: row.explanation,
  })
})

// POST /api/quiz/results — grade a finished quiz and record it. All grading happens
// here against the DB: the client's answers are checked against stored correct answers,
// and the client-supplied score is ignored entirely.
// Body: { token, answers: [{ question_id, selected }] }
router.post('/results', requireAuth, (req, res) => {
  const { token, answers } = (req.body ?? {}) as { token?: unknown; answers?: unknown }
  if (typeof token !== 'string' || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'token and answers are required' })
  }

  const payload = verifyQuizToken(token)
  if (!payload) return res.status(401).json({ error: 'Quiz session is invalid or expired — reload and retry' })
  if (payload.uid !== req.userId) return res.status(403).json({ error: 'Not your quiz session' })

  const topic = db.prepare('SELECT id, order_index FROM topics WHERE id = ?').get(payload.tid) as
    | { id: number; order_index: number }
    | undefined
  if (!topic) return res.status(404).json({ error: 'Topic not found' })

  if (answers.length > MAX_QUIZ_QUESTIONS || answers.length !== payload.ids.length) {
    return res.status(400).json({ error: `Answers must cover exactly the ${payload.ids.length} quiz questions` })
  }

  // Validate shape + full coverage + no duplicate question_ids.
  const tokenIds = new Set(payload.ids)
  const seen = new Set<number>()
  const normalized: { question_id: number; selected: number[] }[] = []
  for (const raw of answers as unknown[]) {
    const a = raw as { question_id?: unknown; selected?: unknown }
    if (typeof a.question_id !== 'number' || !Number.isInteger(a.question_id)) {
      return res.status(400).json({ error: 'Each answer needs a numeric question_id' })
    }
    if (!tokenIds.has(a.question_id) || seen.has(a.question_id)) {
      return res.status(400).json({ error: 'Duplicate or out-of-session question_id' })
    }
    seen.add(a.question_id)
    normalized.push({ question_id: a.question_id, selected: a.selected as number[] })
  }

  const placeholders = payload.ids.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`)
    .all(...payload.ids) as QuestionRow[]
  if (rows.length !== payload.ids.length) {
    return res.status(409).json({ error: 'Question bank changed — reload the quiz' })
  }
  const byId = new Map(rows.map((r) => [r.id, r]))

  // Grade against the DB.
  let score = 0
  const snapshot: unknown[] = []
  for (const a of normalized) {
    const q = byId.get(a.question_id)!
    const options = JSON.parse(q.options_json) as string[]
    const correct = JSON.parse(q.correct_json) as number[]
    const sel = normalizeSelected(a.selected, options.length)
    if (sel === null) return res.status(400).json({ error: 'Invalid answer selection' })
    if (isAnswerCorrect(correct, sel)) score++
    snapshot.push({
      question_id: q.id,
      prompt: q.prompt,
      type: q.type,
      options,
      correct,
      selected: sel,
      explanation: q.explanation,
      is_tricky: Boolean(q.is_tricky),
    })
  }

  const total = normalized.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const userId = req.userId!
  const now = new Date().toISOString()

  let resultId = 0
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO quiz_results (user_id, topic_id, score, total, answers_json, taken_at) VALUES (?,?,?,?,?,?)',
      )
      .run(userId, topic.id, score, total, JSON.stringify(snapshot), now)
    resultId = Number(info.lastInsertRowid)

    const existing = db
      .prepare('SELECT quiz_best_score, quiz_attempts, status FROM progress WHERE user_id = ? AND topic_id = ?')
      .get(userId, topic.id) as
      | { quiz_best_score: number | null; quiz_attempts: number; status: string }
      | undefined

    if (existing) {
      const best = Math.max(existing.quiz_best_score ?? 0, pct)
      db.prepare(
        'UPDATE progress SET quiz_best_score = ?, quiz_attempts = quiz_attempts + 1 WHERE user_id = ? AND topic_id = ?',
      ).run(best, userId, topic.id)
    } else {
      db.prepare(
        'INSERT INTO progress (user_id, topic_id, status, quiz_best_score, quiz_attempts) VALUES (?,?,?,?,1)',
      ).run(userId, topic.id, 'unlocked', pct)
    }

    // Pass the quiz -> mark completed and unlock the next topic (if not already done).
    if (pct >= 60 && existing?.status !== 'completed') {
      db.prepare('UPDATE progress SET status = ?, completed_at = ? WHERE user_id = ? AND topic_id = ?').run(
        'completed',
        now,
        userId,
        topic.id,
      )

      const next = db.prepare('SELECT id FROM topics WHERE order_index = ?').get(topic.order_index + 1) as
        | { id: number }
        | undefined
      if (next) {
        const nextProgress = db
          .prepare('SELECT status FROM progress WHERE user_id = ? AND topic_id = ?')
          .get(userId, next.id) as { status: string } | undefined
        if (!nextProgress) {
          db.prepare(
            'INSERT INTO progress (user_id, topic_id, status, quiz_best_score, quiz_attempts) VALUES (?,?,?,NULL,0)',
          ).run(userId, next.id, 'unlocked')
        } else if (nextProgress.status === 'locked') {
          db.prepare('UPDATE progress SET status = ? WHERE user_id = ? AND topic_id = ?').run(
            'unlocked',
            userId,
            next.id,
          )
        }
      }
    }
  })
  tx()

  res.json({ ok: true, percent: pct, result_id: resultId })
})

// GET /api/quiz/results — per-user attempt list (newest first), optional ?topic= filter.
router.get('/results', requireAuth, (req, res) => {
  const topicFilter = typeof req.query.topic === 'string' ? req.query.topic : null

  const params: unknown[] = [req.userId!]
  let sql = `SELECT qr.id, qr.score, qr.total, qr.taken_at, t.slug AS topic_slug, t.title AS topic_title
    FROM quiz_results qr JOIN topics t ON t.id = qr.topic_id
    WHERE qr.user_id = ?`
  if (topicFilter) {
    sql += ' AND t.slug = ?'
    params.push(topicFilter)
  }
  sql += ' ORDER BY qr.taken_at DESC'

  const rows = db.prepare(sql).all(...params) as {
    id: number
    score: number
    total: number
    taken_at: string
    topic_slug: string
    topic_title: string
  }[]

  res.json(
    rows.map((r) => ({
      id: r.id,
      topicSlug: r.topic_slug,
      topicTitle: r.topic_title,
      score: r.score,
      total: r.total,
      percent: r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
      takenAt: r.taken_at,
    })),
  )
})

// GET /api/quiz/results/:id — full snapshot for one attempt (ownership checked).
router.get('/results/:id', requireAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT qr.id, qr.score, qr.total, qr.taken_at, qr.answers_json,
              t.slug AS topic_slug, t.title AS topic_title
       FROM quiz_results qr JOIN topics t ON t.id = qr.topic_id
       WHERE qr.id = ? AND qr.user_id = ?`,
    )
    .get(req.params.id, req.userId!) as
    | { id: number; score: number; total: number; taken_at: string; answers_json: string; topic_slug: string; topic_title: string }
    | undefined
  if (!row) return res.status(404).json({ error: 'Result not found' })

  let parsed: unknown[] = []
  try {
    parsed = JSON.parse(row.answers_json) as unknown[]
  } catch {
    parsed = []
  }

  res.json({
    id: row.id,
    topicSlug: row.topic_slug,
    topicTitle: row.topic_title,
    score: row.score,
    total: row.total,
    percent: row.total > 0 ? Math.round((row.score / row.total) * 100) : 0,
    takenAt: row.taken_at,
    questions: parsed,
  })
})

// GET /api/quiz/streak — consecutive-days streak + best streak from this user's attempts.
router.get('/streak', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT taken_at FROM quiz_results WHERE user_id = ? ORDER BY taken_at')
    .all(req.userId!) as { taken_at: string }[]

  let streak = 0
  if (rows.length) {
    const today = toDateKey(new Date())
    const last = toDateKey(new Date(rows[rows.length - 1].taken_at))
    if (last === today) {
      streak = 1
      for (let i = rows.length - 2; i >= 0; i--) {
        const prev = toDateKey(new Date(rows[i].taken_at))
        if (prev === addDays(new Date(rows[i + 1].taken_at), -1).toISOString().slice(0, 10)) streak++
        else break
      }
    }
  }

  let best = 0
  let run = 0
  let prev: string | null = null
  for (const row of rows) {
    if (prev !== null && prev === addDays(new Date(row.taken_at), -1).toISOString().slice(0, 10)) run++
    else run = 1
    best = Math.max(best, run)
    prev = row.taken_at.slice(0, 10)
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
