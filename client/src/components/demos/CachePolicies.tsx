import { useState } from 'react'

type Policy = 'read-through' | 'write-through' | 'write-around' | 'write-back'

const POLICIES: { id: Policy; label: string }[] = [
  { id: 'read-through', label: 'Cache-aside' },
  { id: 'write-through', label: 'Write-through' },
  { id: 'write-around', label: 'Write-around' },
  { id: 'write-back', label: 'Write-back' },
]

const DETAILS: Record<Policy, { flow: string[]; tradeoff: string }> = {
  'read-through': {
    flow: ['1. Read → cache first', '2. Cache miss → read DB', '3. Write result back to cache (TTL)', '4. Next read served from cache'],
    tradeoff: 'Simple and fast reads; first read pays a miss. If the cache evicts too early (small cache / short TTL) you get cache thrashing.',
  },
  'write-through': {
    flow: ['1. Write → cache AND DB on every write', '2. Both updated before acknowledging'],
    tradeoff: 'No stale reads — cache and DB agree. But every write pays two round-trips, so write latency goes up.',
  },
  'write-around': {
    flow: ['1. Write goes only to the DB', '2. Cache untouched', '3. Reads populate cache on miss'],
    tradeoff: 'Writes are fast and DB is the source of truth, but a just-written item will be read stale (miss) until the next read fills the cache.',
  },
  'write-back': {
    flow: ['1. Write → cache only (fast ack)', '2. Cache flushes to DB asynchronously', '3. If cache crashes before flush → data loss'],
    tradeoff: 'Best write throughput. Riskiest: committed writes live only in the cache until the async flush, so a crash can lose them.',
  },
}

function Box({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-lg border px-4 py-2 text-xs font-semibold" style={{ borderColor: color, color }}>
      {label}
    </div>
  )
}

export default function CachePolicies() {
  const [policy, setPolicy] = useState<Policy>('write-through')
  const d = DETAILS[policy]
  // write-around never touches the cache; the others all read or write through it.
  const touchesCache = ['read-through', 'write-through', 'write-back'].includes(policy)
  // label for the Client → Cache arrow
  const cacheLabel = policy === 'write-through' || policy === 'write-back' ? 'write' : 'read'
  // label for the Cache → DB arrow (write-through sync write, write-back async flush, read-through miss read)
  const dbLabel = policy === 'write-through' ? 'write' : policy === 'write-back' ? 'flush' : 'read'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {POLICIES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPolicy(p.id)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              policy === p.id
                ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <Box label="Client" color="#e2e8f0" />
        <Arrow to={touchesCache} label={touchesCache ? cacheLabel : ''} />
        <Box label="Cache" color="#fb7185" />
        <Arrow to={touchesCache} label={touchesCache ? dbLabel : ''} />
        <Box label="DB" color="#a78bfa" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sequence</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
            {d.flow.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                {step}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-400/80">Trade-off</div>
          <p className="mt-2 text-sm text-amber-200/90">{d.tradeoff}</p>
        </div>
      </div>
    </div>
  )
}

function Arrow({ to = true, label }: { to?: boolean; label?: string }) {
  return (
    <div className={`flex items-center gap-1 text-slate-500 ${to ? '' : 'opacity-30'}`}>
      <span className="text-xs">{label ?? ''}</span>
      <svg width="24" height="12" viewBox="0 0 24 12" className={to ? '' : 'opacity-0'}>
        <line x1="0" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="18,2 24,6 18,10" fill="currentColor" />
      </svg>
    </div>
  )
}
