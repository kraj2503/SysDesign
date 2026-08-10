import { useMemo, useState } from 'react'

const NODE_COLORS = ['#22d3ee', '#4ade80', '#fbbf24', '#fb7185', '#a78bfa', '#60a5fa', '#f472b6', '#34d399']

function hashAngle(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

const KEYS = Array.from({ length: 24 }, (_, i) => `key-${i + 1}`)
const NEXT_NODE = ['Node F', 'Node G', 'Node H']

const CX = 160
const CY = 160
const R = 140

function polar(angleDeg: number, radius = R) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function ownerOf(keyAngle: number, nodeAngles: number[]): number {
  // next node clockwise (strictly greater angle, wrap around)
  let best = -1
  for (let i = 0; i < nodeAngles.length; i++) {
    if (nodeAngles[i] > keyAngle) {
      if (best === -1 || nodeAngles[i] < nodeAngles[best]) best = i
    }
  }
  return best === -1 ? 0 : best // wrap to the smallest angle node
}

export default function ConsistentHashing() {
  const [nodeNames, setNodeNames] = useState(['Node A', 'Node B', 'Node C', 'Node D'])
  const [lastMoved, setLastMoved] = useState<Set<string>>(new Set())
  const [lastNote, setLastNote] = useState('Four nodes on the ring. Add or remove one to see only the affected keys move.')

  const nodes = useMemo(
    () => nodeNames.map((name, i) => ({ name, angle: hashAngle(name), color: NODE_COLORS[i % NODE_COLORS.length] })),
    [nodeNames],
  )
  const nodeAngles = nodes.map((n) => n.angle)

  // which node owns each key
  const ownership = useMemo(
    () => KEYS.map((k) => ({ key: k, angle: hashAngle(k), owner: ownerOf(hashAngle(k), nodeAngles) })),
    [nodeAngles],
  )

  const addNode = () => {
    const available = NEXT_NODE.find((n) => !nodeNames.includes(n))
    if (!available) return
    const next = [...nodeNames, available]
    setNodeNames(next)
    const nextAngles = next.map((n) => hashAngle(n))
    const moved = KEYS.filter((k) => ownerOf(hashAngle(k), nextAngles) !== ownerOf(hashAngle(k), nodeAngles))
    setLastMoved(new Set(moved))
    setLastNote(`Added ${available} → ${moved.length} keys moved (only those on the new node's arc).`)
  }

  const removeNode = () => {
    if (nodeNames.length <= 1) return
    const victim = nodeNames[nodeNames.length - 1]
    const next = nodeNames.slice(0, -1)
    const nextAngles = next.map((n) => hashAngle(n))
    const moved = KEYS.filter((k) => ownerOf(hashAngle(k), nextAngles) !== ownerOf(hashAngle(k), nodeAngles))
    setNodeNames(next)
    setLastMoved(new Set(moved))
    setLastNote(`Removed ${victim} → ${moved.length} keys moved to the successor on the ring.`)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <svg viewBox="0 0 320 320" className="w-full rounded-xl border border-slate-800 bg-slate-950">
        {/* ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth="2" />
        {/* node arcs (slice between this node and next clockwise) */}
        {nodes.map((n, i) => {
          const next = nodes[(i + 1) % nodes.length]
          const start = n.angle
          const end = next.angle <= start ? next.angle + 360 : next.angle
          const largeArc = end - start > 180 ? 1 : 0
          const p1 = polar(start)
          const p2 = polar(end)
          return (
            <path
              key={n.name}
              d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y}`}
              fill="none"
              stroke={n.color}
              strokeOpacity="0.35"
              strokeWidth="10"
            />
          )
        })}
        {/* keys */}
        {ownership.map(({ key, angle, owner }) => {
          const p = polar(angle, R - 26)
          const moved = lastMoved.has(key)
          return (
            <circle
              key={key}
              cx={p.x}
              cy={p.y}
              r={moved ? 4 : 2.5}
              fill={moved ? '#fef08a' : nodes[owner].color}
              opacity={moved ? 1 : 0.85}
            />
          )
        })}
        {/* nodes */}
        {nodes.map((n) => {
          const p = polar(n.angle)
          return (
            <g key={n.name}>
              <circle cx={p.x} cy={p.y} r="9" fill={n.color} stroke="#0f172a" strokeWidth="2" />
              <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="9" fill="#e2e8f0">
                {n.name}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-col justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm leading-relaxed text-slate-300">{lastNote}</p>
        <div className="flex gap-2">
          <button
            onClick={addNode}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            + Add node
          </button>
          <button
            onClick={removeNode}
            className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-600"
          >
            − Remove node
          </button>
        </div>
        <ul className="mt-1 space-y-1 text-xs text-slate-500">
          <li>• Colored dots = keys, colored by their owning node.</li>
          <li>• Yellow dots = keys that <em>moved</em> after the last change.</li>
          <li>• Each key is owned by the next node clockwise.</li>
        </ul>
      </div>
    </div>
  )
}
