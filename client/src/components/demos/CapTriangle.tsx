import { useRef, useState } from 'react'

// Triangle vertices (SVG space 400x360)
const C = { x: 200, y: 40 }
const A = { x: 50, y: 320 }
const P = { x: 350, y: 320 }

type Corner = 'C' | 'A' | 'P'

const CORNER_INFO: Record<Corner, { title: string; body: string; accent: string }> = {
  C: {
    title: 'Prioritizing Consistency',
    body: 'Every read returns the latest write. Trade-off: during a partition you may refuse requests (lower availability) to avoid serving stale data. Think: ZooKeeper, HDFS, a single-leader DB with synchronous replication.',
    accent: '#22d3ee',
  },
  A: {
    title: 'Prioritizing Availability',
    body: 'Every request gets a response, even if it might be stale. Trade-off: during a partition, replicas may diverge and need reconciliation later. Think: DynamoDB, Cassandra (tunable consistency).',
    accent: '#4ade80',
  },
  P: {
    title: 'Partition tolerance is not optional',
    body: 'In real distributed systems, the network can always drop or delay messages between nodes. You cannot design it away — so CAP is really a choice between C and A once a partition happens.',
    accent: '#fbbf24',
  },
}

function clampToTriangle(x: number, y: number): { x: number; y: number } {
  // barycentric clamp: keeps the point strictly inside the triangle
  const v0 = { x: B.x - A.x, y: B.y - A.y }
  const v1 = { x: C.x - A.x, y: C.y - A.y }
  const v2 = { x: x - A.x, y: y - A.y }
  const d00 = v0.x * v0.x + v0.y * v0.y
  const d01 = v0.x * v1.x + v0.y * v1.y
  const d11 = v1.x * v1.x + v1.y * v1.y
  const d20 = v2.x * v0.x + v2.y * v0.y
  const d21 = v2.x * v1.x + v2.y * v1.y
  const denom = d00 * d11 - d01 * d01
  let v = (d11 * d20 - d01 * d21) / denom
  let w = (d00 * d21 - d01 * d20) / denom
  let u = 1 - v - w
  // clamp to [0,1] and renormalize
  const min = Math.min(0, u, v, w)
  if (min < 0) {
    u -= min
    v -= min
    w -= min
  }
  const sum = u + v + w
  u /= sum
  v /= sum
  w /= sum
  return {
    x: u * A.x + v * B.x + w * C.x,
    y: u * A.y + v * B.y + w * C.y,
  }
}

function nearestCorner(x: number, y: number): Corner {
  const dC = Math.hypot(x - C.x, y - C.y)
  const dA = Math.hypot(x - A.x, y - A.y)
  const dP = Math.hypot(x - P.x, y - P.y)
  if (dC <= dA && dC <= dP) return 'C'
  if (dA <= dP) return 'A'
  return 'P'
}

const B = { x: 350, y: 40 } // top-right placeholder (unused visually; A/P/C form the triangle)

export default function CapTriangle() {
  const [pos, setPos] = useState({ x: 200, y: 180 })
  const dragging = useRef(false)

  const corner = nearestCorner(pos.x, pos.y)
  const info = CORNER_INFO[corner]

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = 400 / rect.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    setPos(clampToTriangle(x, y))
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <svg
        viewBox="0 0 400 360"
        className="w-full cursor-grab touch-none select-none rounded-xl border border-slate-800 bg-slate-950"
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          handlePointer(e)
        }}
        onPointerMove={handlePointer}
        onPointerUp={() => (dragging.current = false)}
      >
        {/* triangle */}
        <polygon
          points={`${C.x},${C.y} ${A.x},${A.y} ${P.x},${P.y}`}
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="2"
        />
        {/* corner labels */}
        <text x={C.x} y={C.y - 12} textAnchor="middle" fill="#22d3ee" fontSize="18" fontWeight="700">
          C
        </text>
        <text x={A.x} y={A.y + 28} textAnchor="middle" fill="#4ade80" fontSize="18" fontWeight="700">
          A
        </text>
        <text x={P.x} y={P.y + 28} textAnchor="middle" fill="#fbbf24" fontSize="18" fontWeight="700">
          P
        </text>
        <text x={200} y={356} textAnchor="middle" fill="#64748b" fontSize="11">
          drag the dot — CAP is about picking two under partition
        </text>
        {/* draggable dot */}
        <circle cx={pos.x} cy={pos.y} r="10" fill={info.accent} stroke="#0f172a" strokeWidth="2" />
        <circle cx={pos.x} cy={pos.y} r="20" fill={info.accent} opacity="0.15" />
      </svg>

      <div className="flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: info.accent }} />
          <span className="text-sm font-semibold">{info.title}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{info.body}</p>
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-400">Key insight:</span> a "CA" system is a myth —
          once the network can partition, you must pick C or A.
        </p>
      </div>
    </div>
  )
}
