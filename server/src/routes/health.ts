import { Router } from 'express'
import { db } from '../db'

const router = Router()

router.get('/', (_req, res) => {
  const topicCount = (db.prepare('SELECT COUNT(*) AS c FROM topics').get() as { c: number }).c
  const questionCount = (db.prepare('SELECT COUNT(*) AS c FROM questions').get() as { c: number }).c
  res.json({
    ok: true,
    name: 'sysdesignlab-api',
    version: '0.1.0',
    topicCount,
    questionCount,
  })
})

export default router
