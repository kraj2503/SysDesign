import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Syllabus from '@/pages/Syllabus'
import Lesson from '@/pages/Lesson'
import CaseStudy from '@/pages/CaseStudy'
import Quiz from '@/pages/Quiz'
import ProgressPage from '@/pages/Progress'
import Import from '@/pages/Import'
import { ProgressProvider } from '@/context/ProgressContext'

export default function App() {
  return (
    <ProgressProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/syllabus" element={<Syllabus />} />
          <Route path="/topics/:slug" element={<Lesson />} />
          <Route path="/topics/:slug/quiz" element={<Quiz />} />
          <Route path="/case-studies/:slug" element={<CaseStudy />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/import" element={<Import />} />
        </Route>
      </Routes>
    </ProgressProvider>
  )
}
