// Shared visual helpers — literal Tailwind class strings so they survive purging.

export const TILE_GRADIENTS = [
  'bg-gradient-to-br from-cyan-500/30 to-sky-600/20 text-cyan-300',
  'bg-gradient-to-br from-violet-500/30 to-fuchsia-600/20 text-violet-300',
  'bg-gradient-to-br from-emerald-500/30 to-teal-600/20 text-emerald-300',
  'bg-gradient-to-br from-amber-500/30 to-orange-600/20 text-amber-300',
  'bg-gradient-to-br from-rose-500/30 to-pink-600/20 text-rose-300',
  'bg-gradient-to-br from-indigo-500/30 to-blue-600/20 text-indigo-300',
]

export const BAR_GRADIENTS = [
  'from-cyan-400 to-sky-500',
  'from-violet-400 to-fuchsia-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-blue-500',
]

export const RING_GRADIENTS: [string, string][] = [
  ['#22d3ee', '#a78bfa'],
  ['#a78bfa', '#e879f9'],
  ['#34d399', '#2dd4bf'],
  ['#fbbf24', '#fb923c'],
  ['#fb7185', '#f472b6'],
  ['#818cf8', '#60a5fa'],
]

export function tileGradient(i: number): string {
  return TILE_GRADIENTS[((i % TILE_GRADIENTS.length) + TILE_GRADIENTS.length) % TILE_GRADIENTS.length]
}

export function barGradient(i: number): string {
  return BAR_GRADIENTS[((i % BAR_GRADIENTS.length) + BAR_GRADIENTS.length) % BAR_GRADIENTS.length]
}

export function ringGradient(i: number): [string, string] {
  return RING_GRADIENTS[((i % RING_GRADIENTS.length) + RING_GRADIENTS.length) % RING_GRADIENTS.length]
}
