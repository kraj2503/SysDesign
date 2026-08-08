import { Router } from 'express'
import { db } from '../db'
import type { TopicProgress } from '../types'

const router = Router()

// GET /api/progress — all progress joined with topic slugs
router.get('/', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.topic_id, t.slug AS topic_slug, p.status, p.quiz_best_score, p.quiz_attempts
       FROM progress p JOIN topics t ON t.id = p.topic_id
       ORDER BY t.order_index`,
    )
    .all() as TopicProgress[]
  res.json(rows)
})

// PUT /api/progress/:slug — update status for a topic
router.put('/:slug', (req, res) => {
  const topic = db.prepare('SELECT id FROM topics WHERE slug = ?').get(req.params.slug) as
    | { id: number }
    | undefined
  if (!topic) return res.status(404).json({ error: 'Topic not found' })

  const { status } = (req.body ?? {}) as { status?: string }
  if (!status || !['locked', 'unlocked', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'status must be locked | unlocked | completed' })
  }

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO progress (topic_id, status, quiz_best_score, quiz_attempts, completed_at)
     VALUES (?, ?, NULL, 0, ?)
     ON CONFLICT(topic_id) DO UPDATE SET status = excluded.status,
       completed_at = CASE WHEN excluded.status = 'completed' THEN excluded.completed_at ELSE progress.completed_at END`,
  ).run(topic.id, status, now)

  const row = db
    .prepare(
      `SELECT p.topic_id, t.slug AS topic_slug, p.status, p.quiz_best_score, p.quiz_attempts
       FROM progress p JOIN topics t ON t.id = p.topic_id WHERE p.topic_id = ?`,
    )
    .get(topic.id) as TopicProgress

  res.json(row)
})

export default router
