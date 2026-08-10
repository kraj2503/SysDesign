import { db, initSchema } from '../db'
import { topics } from './content/topics'
import { lessons } from './content/lessons'
import { questions } from './content/questions'
import { caseStudies } from './content/caseStudies'

function reset() {
  db.exec(`
    DROP TABLE IF EXISTS quiz_results;
    DROP TABLE IF EXISTS progress;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS case_studies;
    DROP TABLE IF EXISTS questions;
    DROP TABLE IF EXISTS lessons;
    DROP TABLE IF EXISTS topics;
  `)
  initSchema()
}

function seed() {
  reset()
  console.log('Resetting database…')

  const insertTopic = db.prepare(
    'INSERT INTO topics (slug, title, summary, order_index, icon) VALUES (?, ?, ?, ?, ?)',
  )
  const topicIds = new Map<string, number>()
  topics.forEach((t, i) => {
    const info = insertTopic.run(t.slug, t.title, t.summary, i, t.icon)
    topicIds.set(t.slug, Number(info.lastInsertRowid))
  })

  const insertLesson = db.prepare(
    'INSERT INTO lessons (topic_id, slug, title, body_md, diagram_json, demo, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  let lessonCount = 0
  for (const l of lessons) {
    const topicId = topicIds.get(l.topicSlug)
    if (!topicId) continue
    insertLesson.run(
      topicId,
      l.slug,
      l.title,
      l.bodyMd,
      l.diagram ? JSON.stringify(l.diagram) : null,
      l.demo ?? null,
      l.orderIndex ?? 0,
    )
    lessonCount++
  }

  const insertQuestion = db.prepare(
    `INSERT INTO questions (topic_id, prompt, type, options_json, correct_json, explanation, difficulty, is_tricky, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  let questionCount = 0
  let trickyCount = 0
  questions.forEach((q, i) => {
    const topicId = topicIds.get(q.topicSlug)
    if (!topicId) return
    const isTricky = Boolean(q.isTricky)
    insertQuestion.run(
      topicId,
      q.prompt,
      q.type,
      JSON.stringify(q.options),
      JSON.stringify(q.correct),
      q.explanation,
      q.difficulty,
      isTricky ? 1 : 0,
      i,
    )
    questionCount++
    if (isTricky) trickyCount++
  })

  const insertCaseStudy = db.prepare(
    'INSERT INTO case_studies (slug, title, summary, steps_json) VALUES (?, ?, ?, ?)',
  )
  let caseStudyCount = 0
  for (const cs of caseStudies) {
    insertCaseStudy.run(cs.slug, cs.title, cs.summary, JSON.stringify(cs.steps))
    caseStudyCount++
  }

  console.log(`Seeded ${topics.length} topics, ${lessonCount} lessons, ${questionCount} questions (${trickyCount} tricky), ${caseStudyCount} case studies.`)
  console.log(`DB: ${import.meta.url ? '' : ''}server/data/sysdesign.db`)
}

seed()
