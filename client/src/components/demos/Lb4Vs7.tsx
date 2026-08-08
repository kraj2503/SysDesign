import { useState } from 'react'

type Layer = 'L4' | 'L7'

export default function Lb4Vs7() {
  const [layer, setLayer] = useState<Layer>('L7')

  const isL7 = layer === 'L7'
  const rows: { label: string; l4: boolean; l7: boolean }[] = [
    { label: 'See source/dest IP + port', l4: true, l7: true },
    { label: 'See TLS handshake / SNI', l4: true, l7: true },
    { label: 'Inspect URL path & headers', l4: false, l7: true },
    { label: 'Route /users/* to one pool, /billing/* to another', l4: false, l7: true },
    { label: 'Parse & rewrite HTTP (redirects, gzip, auth)', l4: false, l7: true },
    { label: 'Terminate TLS', l4: false, l7: true },
    { label: 'See request body (e.g. for auth)', l4: false, l7: true },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLayer('L4')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              !isL7 ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50' : 'bg-slate-800 text-slate-400'
            }`}
          >
            L4 · transport
          </button>
          <button
            onClick={() => setLayer('L7')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isL7 ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50' : 'bg-slate-800 text-slate-400'
            }`}
          >
            L7 · application
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm">
          {isL7 ? (
            <p>
              <span className="font-semibold text-slate-200">L7 load balancer</span>{' '}
              <span className="text-slate-300">
                terminates HTTP, reads the URL, headers, and body — so it can route by path, do TLS
                termination, auth, and rewrite. More powerful, but more CPU per packet and a place
                where a bug can touch application logic.
              </span>
            </p>
          ) : (
            <p>
              <span className="font-semibold text-slate-200">L4 load balancer</span>{' '}
              <span className="text-slate-300">
                forwards TCP/UDP by IP and port, blind to content. Fast, minimal overhead, great for
                raw throughput — but it can't route by URL or terminate TLS.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capabilities</div>
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => {
            const available = isL7 ? r.l7 : r.l4
            return (
              <li key={r.label} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                    available ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700 text-slate-700'
                  }`}
                >
                  {available ? '✓' : '—'}
                </span>
                <span className={available ? 'text-slate-300' : 'text-slate-600'}>{r.label}</span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-400">Interview tip:</span> choose L4 when you need
          pure throughput or a non-HTTP protocol; choose L7 when you need path-based routing, TLS
          termination, or auth at the edge.
        </p>
      </div>
    </div>
  )
}
