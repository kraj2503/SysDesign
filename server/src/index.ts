import express from 'express'
import cors from 'cors'
import { initSchema } from './db'
import healthRouter from './routes/health'
import topicsRouter from './routes/topics'
import quizRouter from './routes/quiz'
import progressRouter from './routes/progress'
import caseStudiesRouter from './routes/caseStudies'
import importRouter from './routes/import'

initSchema()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/health', healthRouter)
app.use('/api/topics', topicsRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/progress', progressRouter)
app.use('/api/case-studies', caseStudiesRouter)
app.use('/api/import', importRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unknown error'
  console.error('[api]', err)
  res.status(500).json({ error: message })
})

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`SysDesignLab API listening on http://localhost:${PORT}`)
})
