import type { ReactNode } from 'react'
import { MousePointerClick } from 'lucide-react'
import CapTriangle from '@/components/demos/CapTriangle'
import CachePolicies from '@/components/demos/CachePolicies'
import ConsistentHashing from '@/components/demos/ConsistentHashing'
import Lb4Vs7 from '@/components/demos/Lb4Vs7'

type DemoName = 'cap-triangle' | 'cache-policies' | 'consistent-hashing' | 'lb-4-vs-7' | null

const HINTS: Record<string, string> = {
  'cap-triangle': 'Drag the point around the triangle',
  'cache-policies': 'Compare cache write policies live',
  'consistent-hashing': 'Add / remove nodes on the ring',
  'lb-4-vs-7': 'Toggle between load-balancer layers',
}

function DemoFrame({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Live demo</span>
        <span className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500">
          <MousePointerClick className="h-3.5 w-3.5" /> {hint}
        </span>
      </div>
      {children}
    </div>
  )
}

export default function LessonDemo({ demo }: { demo: DemoName }) {
  if (!demo) return null

  return (
    <DemoFrame hint={HINTS[demo] ?? 'Interact with the simulation'}>
      {demo === 'cap-triangle' && <CapTriangle />}
      {demo === 'cache-policies' && <CachePolicies />}
      {demo === 'consistent-hashing' && <ConsistentHashing />}
      {demo === 'lb-4-vs-7' && <Lb4Vs7 />}
    </DemoFrame>
  )
}
