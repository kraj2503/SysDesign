// Shared data shapes for the SysDesignLab backend

export interface Topic {
  id: number
  slug: string
  title: string
  summary: string
  order_index: number
  icon: string
  status: string
}

export interface Lesson {
  id: number
  topic_id: number
  slug: string
  title: string
  body_md: string
  diagram_json: unknown | null
  order_index: number
}

export type QuestionType = 'mcq' | 'multi' | 'scenario'

export interface QuestionRow {
  id: number
  topic_id: number
  prompt: string
  type: QuestionType
  options_json: string
  correct_json: string
  explanation: string
  difficulty: number
  is_tricky: number
  order_index: number
}

export interface Question {
  id: number
  topic_id: number
  prompt: string
  type: QuestionType
  options: string[]
  correct: number[]
  explanation: string
  difficulty: number
  is_tricky: boolean
}

export interface CaseStudy {
  id: number
  slug: string
  title: string
  summary: string
  steps: CaseStudyStep[]
}

export interface RequirementOption {
  id: string
  text: string
  kind: 'functional' | 'nonfunctional'
}

export interface RequirementsStepContent {
  options: RequirementOption[]
  correct: string[]
}

export interface EstimationItem {
  id: string
  label: string
  prompt: string
  answer: number
  unit: string
}

export interface EstimationStepContent {
  items: EstimationItem[]
}

export interface AssembleComponent {
  id: string
  label: string
  kind: DiagramNode['kind']
}

export interface AssembleStepContent {
  components: AssembleComponent[]
  correctOrder: string[]
}

export interface SimQuestion {
  prompt: string
  options: string[]
  correct: number[]
  explanation: string
  isTricky?: boolean
}

export interface DeepDiveStepContent {
  questions: SimQuestion[]
}

export type CaseStudyStepContent =
  | RequirementsStepContent
  | EstimationStepContent
  | AssembleStepContent
  | DeepDiveStepContent

export interface CaseStudyStep {
  id: string
  label: string
  type: 'requirements' | 'estimation' | 'assemble' | 'deepdive' | 'quiz'
  content: CaseStudyStepContent
}

export interface TopicProgress {
  topic_id: number
  topic_slug: string
  status: 'locked' | 'unlocked' | 'completed'
  quiz_best_score: number | null
  quiz_attempts: number
}

export interface DiagramNode {
  id: string
  label: string
  kind: 'client' | 'cdn' | 'lb' | 'server' | 'cache' | 'queue' | 'db' | 'other'
  x: number
  y: number
}

export interface DiagramEdge {
  from: string
  to: string
  label?: string
}

export interface Diagram {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export interface SeedQuestion {
  topicSlug: string
  prompt: string
  type: QuestionType
  options: string[]
  correct: number[]
  explanation: string
  difficulty: number
  isTricky?: boolean
}

export interface SeedTopic {
  slug: string
  title: string
  summary: string
  icon: string
}

export interface SeedLesson {
  topicSlug: string
  slug: string
  title: string
  bodyMd: string
  diagram?: Diagram | null
  demo?: 'cap-triangle' | 'cache-policies' | 'consistent-hashing' | 'lb-4-vs-7' | null
  orderIndex?: number
}

export interface SeedCaseStudy {
  slug: string
  title: string
  summary: string
  steps: CaseStudyStep[]
}
