import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../data')
mkdirSync(DATA_DIR, { recursive: true })

export const DB_PATH = resolve(DATA_DIR, 'sysdesign.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      icon TEXT NOT NULL DEFAULT '📘',
      status TEXT NOT NULL DEFAULT 'published'
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      body_md TEXT NOT NULL DEFAULT '',
      diagram_json TEXT,
      demo TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      UNIQUE(topic_id, slug)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'mcq',
      options_json TEXT NOT NULL,
      correct_json TEXT NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      difficulty INTEGER NOT NULL DEFAULT 1,
      is_tricky INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS case_studies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      steps_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'unlocked',
      quiz_best_score INTEGER,
      quiz_attempts INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (user_id, topic_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '[]',
      taken_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_topic ON lessons(topic_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
  `)
}
