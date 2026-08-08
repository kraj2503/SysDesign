import { useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Diagram } from '@/types'
import { Network } from 'lucide-react'

const KIND_STYLE: Record<string, { bg: string; border: string }> = {
  client: { bg: '#155e75', border: '#22d3ee' },
  cdn: { bg: '#5b21b6', border: '#a78bfa' },
  lb: { bg: '#92400e', border: '#fbbf24' },
  server: { bg: '#1e40af', border: '#60a5fa' },
  cache: { bg: '#9f1239', border: '#fb7185' },
  queue: { bg: '#166534', border: '#4ade80' },
  db: { bg: '#3b0764', border: '#a78bfa' },
  other: { bg: '#334155', border: '#94a3b8' },
}

const LEGEND: Record<string, string> = {
  client: '#22d3ee',
  cdn: '#a78bfa',
  lb: '#fbbf24',
  server: '#60a5fa',
  cache: '#fb7185',
  queue: '#4ade80',
  db: '#a78bfa',
  other: '#94a3b8',
}

export default function DiagramCanvas({ diagram }: { diagram: Diagram }) {
  const { nodes, edges, kinds } = useMemo(() => {
    const kindsSet = new Set<string>()
    const nodes: FlowNode[] = diagram.nodes.map((n) => {
      kindsSet.add(n.kind)
      const style = KIND_STYLE[n.kind] ?? KIND_STYLE.other
      return {
        id: n.id,
        position: { x: n.x, y: n.y },
        data: { label: n.label },
        style: {
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: '#f8fafc',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 12,
          fontWeight: 600,
          boxShadow: `0 0 18px -6px ${style.border}55`,
        },
      }
    })
    const edges: FlowEdge[] = diagram.edges.map((e, i) => ({
      id: `e-${e.from}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      label: e.label,
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'Inter, sans-serif' },
      animated: true,
      style: { stroke: '#475569', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
    }))
    return { nodes, edges, kinds: Array.from(kindsSet) }
  }, [diagram])

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Network className="h-3.5 w-3.5 text-cyan-300" /> Architecture diagram
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          {kinds.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ background: LEGEND[k] ?? '#94a3b8' }} />
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="h-80 w-full">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background color="#1e293b" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="#1e3a5f" maskColor="rgba(2,6,23,0.6)" />
        </ReactFlow>
      </div>
    </div>
  )
}
