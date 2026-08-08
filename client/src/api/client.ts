// Typed fetch wrapper for the SysDesignLab backend (proxied via Vite /api)

import type { CaseStudy, HealthResponse, Lesson, Question, Topic, TopicProgress } from '@/types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`API ${res.status} ${path}: ${detail}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<HealthResponse>('/health'),

  listTopics: () => request<TopicWithProgress[]>('/topics'),
  getTopic: (slug: string) => request<TopicDetail>(`/topics/${slug}`),
  getLesson: (topicSlug: string, lessonSlug: string) =>
    request<Lesson>(`/topics/${topicSlug}/lessons/${lessonSlug}`),

  getQuiz: (topicSlug: string, count = 8) =>
    request<Question[]>(`/topics/${topicSlug}/quiz?count=${count}`),
  submitQuizResult: (result: { topic_slug: string; score: number; total: number; answers: unknown }) =>
    request<{ ok: boolean }>('/quiz/results', { method: 'POST', body: JSON.stringify(result) }),
  getStreak: () => request<{ streak: number; best: number }>('/quiz/streak'),

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
