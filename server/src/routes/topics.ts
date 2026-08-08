import { Router } from 'express'
import { db } from '../db'
import type { Question, QuestionRow, Topic, TopicProgress } from '../types'

const router = Router()

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    topic_id: row.topic_id,
    prompt: row.prompt,
    type: row.type as Question['type'],
    options: JSON.parse(row.options_json) as string[],
    correct: JSON.parse(row.correct_json) as number[],
    explanation: row.explanation,
    difficulty: row.difficulty,
    is_tricky: Boolean(row.is_tricky),
  }
}

// GET /api/topics — list topics with progress
router.get('/', (_req, res) => {
  const topics = db
    .prepare(
      `SELECT t.*, p.status AS p_status, p.quiz_best_score, p.quiz_attempts
       FROM topics t
       LEFT JOIN progress p ON p.topic_id = t.id
       ORDER BY t.order_index`,
    )
    .all() as (Topic & { p_status: string | null; quiz_best_score: number | null; quiz_attempts: number | null })[]

  res.json(
    topics.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      order_index: t.order_index,
      icon: t.icon,
      status: t.status,
      progress: {
        topic_id: t.id,
        topic_slug: t.slug,
        status: (t.p_status ?? 'unlocked') as TopicProgress['status'],
        quiz_best_score: t.quiz_best_score,
        quiz_attempts: t.quiz_attempts ?? 0,
      } satisfies TopicProgress,
    })),
  )
})

// GET /api/topics/:slug — topic with lessons + progress
router.get('/:slug', (req, res) => {
  const topic = db.prepare('SELECT * FROM topics WHERE slug = ?').get(req.params.slug) as
    | Topic
    | undefined
  if (!topic) return res.status(404).json({ error: 'Topic not found' })

  const lessons = db
    .prepare('SELECT * FROM lessons WHERE topic_id = ? ORDER BY order_index')
    .all(topic.id)
    .map((l) => ({
      ...(l as Record<string, unknown>),
      diagram_json: (l as { diagram_json: string | null }).diagram_json
        ? JSON.parse((l as { diagram_json: string }).diagram_json)
        : null,
    }))

  const progress = db
    .prepare('SELECT * FROM progress WHERE topic_id = ?')
    .get(topic.id) as TopicProgress | undefined

  res.json({ ...topic, lessons, progress: progress ?? null })
})

// GET /api/topics/:slug/lessons/:lessonSlug
router.get('/:slug/lessons/:lessonSlug', (req, res) => {
  const topic = db.prepare('SELECT id FROM topics WHERE slug = ?').get(req.params.slug) as
    | { id: number }
    | undefined
  if (!topic) return res.status(404).json({ error: 'Topic not found' })

  const lesson = db
    .prepare('SELECT * FROM lessons WHERE topic_id = ? AND slug = ?')
    .get(topic.id, req.params.lessonSlug) as { id: number; diagram_json: string | null } | undefined
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' })

  res.json({
    ...lesson,
    diagram_json: lesson.diagram_json ? JSON.parse(lesson.diagram_json) : null,
  })
})

// GET /api/topics/:slug/quiz?count=N — random questions (tricky guaranteed)
router.get('/:slug/quiz', (req, res) => {
  const topic = db.prepare('SELECT id FROM topics WHERE slug = ?').get(req.params.slug) as
    | { id: number }
    | undefined
  if (!topic) return res.status(404).json({ error: 'Topic not found' })

  const count = Math.max(1, Math.min(20, Number(req.query.count) || 8))

  const all = db
    .prepare('SELECT * FROM questions WHERE topic_id = ?')
    .all(topic.id) as QuestionRow[]

  if (all.length === 0) return res.json([])

  const tricky = all.filter((q) => Boolean(q.is_tricky))
  const normal = all.filter((q) => !Boolean(q.is_tricky))

  const trickyCount = Math.min(tricky.length, Math.max(1, Math.ceil(count / 4)))
  const normalCount = count - trickyCount

  const pick = <T>(arr: T[], n: number): T[] => {
    const copy = [...arr]
    const out: T[] = []
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
    }
    return out
  }

  const selected = [...pick(tricky, trickyCount), ...pick(normal, normalCount)]
  // shuffle
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[selected[i], selected[j]] = [selected[j], selected[i]]
  }

  res.json(selected.map(mapQuestion))
})

export default router
