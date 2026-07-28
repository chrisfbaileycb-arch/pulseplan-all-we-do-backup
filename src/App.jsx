import { useEffect, useRef, useState } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, Target, Sparkles, Send, TrendingUp, FileText, UserCircle2, Rocket } from 'lucide-react'
import { auth } from './lib/auth'
import PulseWave from './components/PulseWave'
import Dashboard from './pages/Dashboard'
import Strategy from './pages/Strategy'
import Content from './pages/Content'
import Outreach from './pages/Outreach'
import Growth from './pages/Growth'
import Brief from './pages/Brief'
import Deploy from './pages/Deploy'

const NAV = [
  { to: '/', label: 'Command', icon: LayoutDashboard },
  { to: '/strategy', label: 'Strategy', icon: Target },
  { to: '/content', label: 'Content', icon: Sparkles },
  { to: '/outreach', label: 'Outreach', icon: Send },
  { to: '/deploy', label: 'Deploy', icon: Rocket },
  { to: '/growth', label: 'Growth', icon: TrendingUp },
]

function ScrollReset({ scrollRef }) {
  const { pathname } = useLocation()
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [pathname, scrollRef])
  return null
}

function Wordmark({ small }) {
  return (
    <div className="flex flex-col leading-none">
      <span className={`font-display font-bold text-white ${small ? 'text-base' : 'text-xl'}`}>
        ALL WE DO
      </span>
      <span className="text-[10px] tracking-[0.28em] text-primary/80">AI AGENTS · REAL GROWTH</span>
    </div>
  )
}

function Gate({ onSignedIn }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="h-full overflow-y-auto pt-[env(safe-area-inset-top)]">
      <div className="max-w-md mx-auto w-full px-6 py-14 flex flex-col items-center text-center">
        <p className="text-[11px] tracking-[0.4em] text-primary/70 rise">AGENCY · RUN BY AGENTS</p>
        <h1 className="font-display text-5xl font-bold text-white mt-4 rise" style={{ animationDelay: '80ms' }}>
          ALL WE DO
        </h1>
        <p className="text-sm text-sky-200/70 mt-3 rise" style={{ animationDelay: '160ms' }}>
          Bring us your app. Our agents build the strategy, the pricing, the ad-spend plan,
          the daily content and the follow-ups — then learn from the results every day.
        </p>
        <PulseWave className="w-full h-40 my-6 rise" />
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const u = await auth.signIn()
            setBusy(false)
            if (u) onSignedIn(u)
          }}
          className="w-full py-4 rounded-2xl font-display font-bold tracking-wide text-[#04121f] bg-gradient-to-r from-primary to-secondary glow-cyan active:scale-[0.98] transition disabled:opacity-60"
        >
          {busy ? 'OPENING…' : 'START YOUR GROWTH FILE'}
        </button>
        <p className="text-[11px] text-sky-200/45 mt-4">
          Your product brief, plans and results stay on your account across devices.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(auth.getCurrentUser())
  const [ready, setReady] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    const unsub = auth.onAuthChange((u) => {
      setUser(u)
      setReady(true)
    })
    return unsub
  }, [])

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!user) return <Gate onSignedIn={setUser} />

  return (
    <HashRouter>
      <div className="h-full flex">
        {/* Desktop / tablet sidebar */}
        <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-sky-400/12 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-4">
          <Wordmark />
          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${
                    isActive
                      ? 'bg-primary/12 text-primary border border-primary/30'
                      : 'text-sky-200/60 hover:text-sky-100 hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1">
            <NavLink
              to="/brief"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${
                  isActive ? 'bg-secondary/12 text-secondary' : 'text-sky-200/60 hover:bg-white/5'
                }`
              }
            >
              <FileText size={18} /> Product brief
            </NavLink>
            <button
              onClick={() => auth.signIn()}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-sky-200/60 hover:bg-white/5 text-left"
            >
              <UserCircle2 size={18} />
              <span className="truncate">{user.displayName || user.email || 'Account'}</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="md:hidden shrink-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b border-sky-400/12">
            <Wordmark small />
            <button
              onClick={() => auth.signIn()}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-primary"
              aria-label="Account"
            >
              <UserCircle2 size={20} />
            </button>
          </header>

          <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
            <ScrollReset scrollRef={scrollRef} />
            <div className="max-w-6xl mx-auto w-full px-4 md:px-8 py-5 md:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/strategy" element={<Strategy />} />
                <Route path="/content" element={<Content />} />
                <Route path="/outreach" element={<Outreach />} />
                <Route path="/deploy" element={<Deploy />} />
                <Route path="/growth" element={<Growth />} />
                <Route path="/brief" element={<Brief />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>

        {/* Mobile tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom,0px)] bg-[#050b1c]/95 backdrop-blur border-t border-sky-400/15">
          <div className="flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 text-[10px] tracking-wide ${
                    isActive ? 'text-primary' : 'text-sky-200/45'
                  }`
                }
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </HashRouter>
  )
}
