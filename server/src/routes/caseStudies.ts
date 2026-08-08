import { Router } from 'express'
import { db } from '../db'
import type { CaseStudy, CaseStudyStep } from '../types'

const router = Router()

function mapCaseStudy(row: { id: number; slug: string; title: string; summary: string; steps_json: string }): CaseStudy {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    steps: JSON.parse(row.steps_json) as CaseStudyStep[],
  }
}

// GET /api/case-studies
router.get('/', (_req, res) => {
  const rows = db
    .prepare('SELECT id, slug, title, summary, steps_json FROM case_studies ORDER BY id')
    .all() as { id: number; slug: string; title: string; summary: string; steps_json: string }[]
  res.json(rows.map(mapCaseStudy))
})

// GET /api/case-studies/:slug
router.get('/:slug', (req, res) => {
  const row = db
    .prepare('SELECT id, slug, title, summary, steps_json FROM case_studies WHERE slug = ?')
    .get(req.params.slug) as { id: number; slug: string; title: string; summary: string; steps_json: string } | undefined
  if (!row) return res.status(404).json({ error: 'Case study not found' })
  res.json(mapCaseStudy(row))
})

export default router
