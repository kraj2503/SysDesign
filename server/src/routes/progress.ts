import { Router } from 'express'
import { db } from '../db'
import { requireAuth } from '../middleware/auth'
import type { TopicProgress } from '../types'

const router = Router()

// GET /api/progress — all progress for the current user, joined with topic slugs
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.topic_id, t.slug AS topic_slug, p.status, p.quiz_best_score, p.quiz_attempts
       FROM progress p JOIN topics t ON t.id = p.topic_id
       WHERE p.user_id = ?
       ORDER BY t.order_index`,
    )
    .all(req.userId!) as TopicProgress[]
  res.json(rows)
})

// Note: there is intentionally no PUT /:slug here. Topic status is derived
// server-side (POST /api/quiz/results owns the unlock cascade); letting clients
// set status = 'completed' directly would let them skip the quiz entirely.

export default router
