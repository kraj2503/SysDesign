import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import Auth from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import Syllabus from '@/pages/Syllabus'
import Lesson from '@/pages/Lesson'
import CaseStudy from '@/pages/CaseStudy'
import Quiz from '@/pages/Quiz'
import ProgressPage from '@/pages/Progress'
import Results from '@/pages/Results'
import ResultsDetail from '@/pages/ResultsDetail'
import Import from '@/pages/Import'
import { ProgressProvider } from '@/context/ProgressContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
      </div>
    )
  }
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route
          element={
            <RequireAuth>
              <ProgressProvider>
                <Layout />
              </ProgressProvider>
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/syllabus" element={<Syllabus />} />
          <Route path="/topics/:slug" element={<Lesson />} />
          <Route path="/topics/:slug/quiz" element={<Quiz />} />
          <Route path="/case-studies/:slug" element={<CaseStudy />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:id" element={<ResultsDetail />} />
          <Route path="/import" element={<Import />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
