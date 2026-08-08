import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type TopicWithProgress } from '@/api/client'
import type { TopicProgress } from '@/types'

interface ProgressContextValue {
  topics: TopicWithProgress[]
  progress: TopicProgress[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  markCompleted: (slug: string) => Promise<void>
  progressBySlug: Record<string, TopicProgress>
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [topics, setTopics] = useState<TopicWithProgress[]>([])
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api.listTopics(), api.getProgress()])
      setTopics(t)
      setProgress(p)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const markCompleted = useCallback(
    async (slug: string) => {
      await api.setProgress(slug, { status: 'completed' })
      await refresh()
    },
    [refresh],
  )

  const progressBySlug = useMemo(() => {
    const map: Record<string, TopicProgress> = {}
    for (const p of progress) map[p.topic_slug] = p
    return map
  }, [progress])

  const value = useMemo(
    () => ({ topics, progress, loading, error, refresh, markCompleted, progressBySlug }),
    [topics, progress, loading, error, refresh, markCompleted, progressBySlug],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
