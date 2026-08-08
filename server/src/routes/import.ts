import { Router } from 'express'
import { db } from '../db'

const router = Router()

/**
 * POST /api/import — bulk-import questions.
 * Body: { questions: ImportQuestion[] }  (JSON), or
 *       { csv: "<text>", topicSlug: "..." }  (CSV, first row = headers).
 *
 * JSON item shape:
 *   { topicSlug, prompt, type?, options[], correct[], explanation?, difficulty?, isTricky? }
 *
 * CSV columns (header row): topicSlug, prompt, type, options (JSON array), correct (JSON array),
 *   explanation, difficulty, isTricky
 */
router.post('/', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>

  let items: unknown[]
  if (Array.isArray(body.questions)) {
    items = body.questions
  } else if (typeof body.csv === 'string' && typeof body.topicSlug === 'string') {
    items = parseCsv(body.csv as string, body.topicSlug as string)
  } else {
    return res.status(400).json({ error: 'Provide { questions: [...] } or { csv, topicSlug }' })
  }

  const insert = db.prepare(
    `INSERT INTO questions (topic_id, prompt, type, options_json, correct_json, explanation, difficulty, is_tricky)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const inserted: { slug: string; prompt: string }[] = []
  const skipped: string[] = []
  const topicCache = new Map<string, number>()

  const tx = db.transaction(() => {
    for (const raw of items) {
      const q = raw as {
        topicSlug?: string
        prompt?: string
        type?: string
        options?: unknown
        correct?: unknown
        explanation?: string
        difficulty?: unknown
        isTricky?: unknown
      }
      if (typeof q.prompt !== 'string' || !q.prompt.trim()) {
        skipped.push('missing prompt')
        continue
      }
      const slug = q.topicSlug ?? body.topicSlug
      if (typeof slug !== 'string') {
        skipped.push(`no topicSlug for "${q.prompt.slice(0, 40)}"`)
        continue
      }
      let topicId = topicCache.get(slug)
      if (!topicId) {
        const row = db.prepare('SELECT id FROM topics WHERE slug = ?').get(slug) as { id: number } | undefined
        if (!row) {
          skipped.push(`unknown topic "${slug}"`)
          continue
        }
        topicId = row.id
        topicCache.set(slug, topicId)
      }

      const options = Array.isArray(q.options) ? (q.options as string[]) : []
      const correct = Array.isArray(q.correct) ? (q.correct as number[]).map(Number) : [0]
      const type = ['mcq', 'multi', 'scenario'].includes(String(q.type)) ? String(q.type) : 'mcq'
      const difficulty = Number(q.difficulty) >= 1 && Number(q.difficulty) <= 3 ? Number(q.difficulty) : 1
      const isTricky = q.isTricky === true || q.isTricky === 'true' || q.isTricky === 1 ? 1 : 0

      insert.run(topicId, q.prompt, type, JSON.stringify(options), JSON.stringify(correct), q.explanation ?? '', difficulty, isTricky)
      inserted.push({ slug, prompt: q.prompt })
    }
  })

  tx()
  res.json({ ok: true, inserted: inserted.length, skipped })
})

function parseCsv(text: string, defaultTopicSlug: string): unknown[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim())
  const idx = (name: string) => headers.indexOf(name)

  return lines.slice(1).map((line) => {
    // naive CSV split (handles quoted fields)
    const fields = splitCsvLine(line)
    const get = (name: string) => {
      const i = idx(name)
      return i >= 0 ? fields[i] : undefined
    }
    return {
      topicSlug: get('topicSlug') || defaultTopicSlug,
      prompt: get('prompt') ?? '',
      type: get('type') || 'mcq',
      options: parseJsonArray(get('options')),
      correct: parseJsonArray(get('correct')),
      explanation: get('explanation') ?? '',
      difficulty: Number(get('difficulty')) || 1,
      isTricky: get('isTricky') === 'true' || get('isTricky') === '1',
    }
  })
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

function parseJsonArray(value: string | undefined): number[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(Number) : []
  } catch {
    return value
      .split(/[;,]/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
  }
}

export default router
