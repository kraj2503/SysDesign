// Typed fetch wrapper for the SysDesignLab backend (proxied via Vite /api)

import type {
  CaseStudy,
  HealthResponse,
  Lesson,
  Question,
  QuestionType,
  Topic,
  TopicProgress,
} from '@/types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    let detail = await res.text().catch(() => '')
    try {
      const parsed = JSON.parse(detail) as { error?: string }
      if (parsed?.error) detail = parsed.error
    } catch {
      // keep raw text
    }
    throw new Error(detail || `API ${res.status} ${path}`)
  }
  return res.json() as Promise<T>
}

export interface User {
  id: number
  email: string
  name: string | null
  avatar_url: string | null
}

export interface QuizAnswerSnapshot {
  question_id: number
  prompt: string
  type: QuestionType
  options: string[]
  correct: number[]
  selected: number[]
  explanation: string
  is_tricky: boolean
}

export interface QuizResultSummary {
  id: number
  topicSlug: string
  topicTitle: string
  score: number
  total: number
  percent: number
  takenAt: string
}

export interface QuizResultDetail extends QuizResultSummary {
  questions: QuizAnswerSnapshot[]
}

export const api = {
  health: () => request<HealthResponse>('/health'),

  auth: {
    me: () => request<{ user: User | null }>('/auth/me'),
    register: (payload: { name: string; email: string; password: string }) =>
      request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload: { email: string; password: string }) =>
      request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  },

  listTopics: () => request<TopicWithProgress[]>('/topics'),
  getTopic: (slug: string) => request<TopicDetail>(`/topics/${slug}`),
  getLesson: (topicSlug: string, lessonSlug: string) =>
    request<Lesson>(`/topics/${topicSlug}/lessons/${lessonSlug}`),

  getQuiz: (topicSlug: string, count = 8) =>
    request<Question[]>(`/topics/${topicSlug}/quiz?count=${count}`),
  submitQuizResult: (result: {
    topic_slug: string
    score: number
    total: number
    answers: QuizAnswerSnapshot[]
  }) =>
    request<{ ok: boolean; percent: number; result_id: number }>('/quiz/results', {
      method: 'POST',
      body: JSON.stringify(result),
    }),
  getStreak: () => request<{ streak: number; best: number }>('/quiz/streak'),

  listQuizResults: (topic?: string) =>
    request<QuizResultSummary[]>(`/quiz/results${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`),
  getQuizResult: (id: number | string) => request<QuizResultDetail>(`/quiz/results/${id}`),

  getProgress: () => request<TopicProgress[]>('/progress'),
  setProgress: (slug: string, patch: { status?: string }) =>
    request<TopicProgress>(`/progress/${slug}`, { method: 'PUT', body: JSON.stringify(patch) }),

  listCaseStudies: () => request<CaseStudy[]>('/case-studies'),
  getCaseStudy: (slug: string) => request<CaseStudy>(`/case-studies/${slug}`),

  importQuestions: (body: { questions?: unknown[]; csv?: string; topicSlug?: string }) =>
    request<{ ok: boolean; inserted: number; skipped: string[] }>('/import', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

export interface TopicWithProgress extends Topic {
  progress?: TopicProgress
}

export interface TopicDetail extends Topic {
  lessons: Lesson[]
  progress?: TopicProgress
}
