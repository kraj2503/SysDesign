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

  // GET /api/topics embeds an authoritative, complete `progress` per topic (first topic
  // unlocked, rest locked by default) — prefer it over the sparse /api/progress rows so
  // untouched topics aren't mistaken for unlocked. The flat list fills any gaps.
  const progressBySlug = useMemo(() => {
    const map: Record<string, TopicProgress> = {}
    for (const t of topics) if (t.progress) map[t.slug] = t.progress
    for (const p of progress) if (!map[p.topic_slug]) map[p.topic_slug] = p
    return map
  }, [topics, progress])

  const value = useMemo(
    () => ({ topics, progress, loading, error, refresh, progressBySlug }),
    [topics, progress, loading, error, refresh, progressBySlug],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
