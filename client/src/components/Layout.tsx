import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BookOpen, Database, LayoutDashboard, LogOut, Trophy } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/syllabus', label: 'Syllabus', icon: BookOpen, end: false },
  { to: '/progress', label: 'Progress', icon: Trophy, end: false },
  { to: '/import', label: 'Import', icon: Database, end: false },
]

function Logo() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-400 to-fuchsia-500 shadow-lg shadow-cyan-500/30">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-950" fill="currentColor">
        <path d="M6.5 14l4.5-7.5 1.6 3.4 3.9-6-1.5 7.4H10z" />
      </svg>
    </div>
  )
}

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      <div className="bg-grid absolute inset-0" />
      <div className="blob animate-float left-[-10%] top-[-15%] h-[42rem] w-[42rem] bg-cyan-500/20" />
      <div className="blob animate-float-slow right-[-12%] top-[5%] h-[38rem] w-[38rem] bg-violet-600/20" />
      <div className="blob animate-float bottom-[-20%] left-[28%] h-[34rem] w-[34rem] bg-fuchsia-600/10" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/80 to-transparent" />
    </div>
  )
}

// Mobile primary navigation — fixed bottom tab bar (>=44px touch targets, safe-area aware).
function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-slate-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
    >
      <div className="grid grid-cols-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              `flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors duration-150 ${
                isActive ? 'text-cyan-300' : 'text-slate-500 active:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-300' : ''}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/auth', { replace: true })
  }

  const initial = (user?.name ?? user?.email ?? '?').trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen font-sans text-slate-100">
      <Backdrop />

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink to="/" className="group flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight text-white">
              SysDesign<span className="grad-text">Lab</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2.5">
            <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-4 w-4 transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300'}`}
                      />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {user && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-1">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-indigo-400 to-fuchsia-500 font-display text-xs font-bold text-slate-950">
                  {initial}
                </span>
                <span className="hidden max-w-[9rem] truncate text-sm font-medium text-slate-200 sm:block">
                  {user.name ?? user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  title="Log out"
                  aria-label="Log out"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-rose-300 active:scale-95"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 sm:pb-12">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  )
}
