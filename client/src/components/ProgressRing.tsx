import { useId, type ReactNode } from 'react'

interface ProgressRingProps {
  value: number // 0–100
  size?: number
  stroke?: number
  from?: string
  to?: string
  children?: ReactNode
  className?: string
}

export default function ProgressRing({
  value,
  size = 60,
  stroke = 5,
  from = '#22d3ee',
  to = '#a78bfa',
  children,
  className = '',
}: ProgressRingProps) {
  const rawId = useId()
  const id = `pg-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, value))
  const offset = c - (clamped / 100) * c

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true" focusable="false">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
