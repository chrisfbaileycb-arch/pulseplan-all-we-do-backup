import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Megaphone, Send, Brain, FileText, AlertCircle, ArrowUpRight, Zap } from 'lucide-react'
import { useLive } from '../lib/useLive'
import { useBrief } from '../hooks/useBrief'
import { generateContentPack, generateLearning, today } from '../hooks/agents'
import PulseWave from '../components/PulseWave'
import { Card, AgentButton, Pill } from '../components/UI'

export default function Dashboard() {
  const { brief, loading } = useBrief()
  const { data: posts } = useLive('content-posts', { order: '-createdAt', limit: 60 })
  const { data: plans } = useLive('strategy-plans', { order: '-createdAt', limit: 5 })
  const { data: leads } = useLive('leads', { limit: 100 })
  const { data: metrics } = useLive('metrics', { order: '-day', limit: 30 })
  const { data: logs } = useLive('agent-log', { order: '-createdAt', limit: 10 })

  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')
  const [err, setErr] = useState('')

  const plan = plans?.[0]
  const todaysPosts = (posts || []).filter((p) => p.day === today())
  const todaysLog = (logs || []).find((l) => l.day === today())
  const pipeline = (leads || []).filter((l) => ['drafted', 'contacted', 'replied'].includes(l.stage)).length

  const growth = useMemo(() => {
    const vals = [...(metrics || [])]
      .sort((a, b) => String(a.day).localeCompare(String(b.day)))
      .map((m) => Number(m.reach) || 0)
      .filter(Boolean)
    if (vals.length < 2) return null
    const half = Math.max(1, Math.floor(vals.length / 2))
    const prev = vals.slice(0, half).reduce((a, b) => a + b, 0) / half
    const recent = vals.slice(-half).reduce((a, b) => a + b, 0) / half
    return prev ? Math.round(((recent - prev) / prev) * 100) : null
  }, [metrics])

  const timeline = useMemo(() => {
    const days = new Set()
    ;(logs || []).forEach((l) => days.add(l.day))
    ;(posts || []).forEach((p) => days.add(p.day))
    return [...days].filter(Boolean).sort().slice(-5)
  }, [logs, posts])

  const runCycle = async () => {
    if (!brief) return
    setBusy(true)
    setErr('')
    try {
      setStep('Content Agent is writing today\'s pack…')
      await generateContentPack({
        brief,
        plan,
        recentHooks: (posts || []).slice(0, 8).map((p) => p.hook).filter(Boolean),
      })
      setStep('Learning Agent is studying your results…')
      await generateLearning({ brief, plan, metrics: metrics || [], posts: posts || [], leads: leads || [] })
    } catch (e) {
      setErr(e?.message || 'The cycle stopped early. Try again.')
    } finally {
      setBusy(false)
      setStep('')
    }
  }

  const agents = [
    {
      to: '/content',
      icon: Sparkles,
      label: 'DAILY CONTENT',
      value: `${todaysPosts.length} / 5 today`,
      progress: Math.min(100, (todaysPosts.length / 5) * 100),
      sub: 'Captions, scripts, visuals',
    },
    {
      to: '/strategy',
      icon: Megaphone,
      label: 'AD CAMPAIGNS',
      value: plan ? 'Plan active' : 'Not built',
      progress: plan ? 100 : 0,
      sub: plan ? 'Targeted & optimized' : 'Awaiting strategy pass',
    },
    {
      to: '/outreach',
      icon: Send,
      label: 'OUTREACH PLANS',
      value: `${pipeline} in flight`,
      progress: Math.min(100, pipeline * 20),
      sub: 'Engage & connect',
    },
  ]

  return (
    <div>
      {/* Hero */}
      <div className="glass rounded-3xl overflow-hidden rise">
        <div className="px-5 pt-6 text-center">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white">ALL WE DO</h1>
          <p className="text-[11px] md:text-xs tracking-[0.32em] text-primary/80 mt-2">
            AI AGENTS EVOLVE YOUR REACH
          </p>
        </div>
        <PulseWave className="w-full h-32 md:h-44 mt-2" />
        <div className="px-5 pb-5 -mt-2 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <div>
            <p className="text-sm text-white font-display">
              {brief ? brief.name : 'No product on file'}
            </p>
            <p className="text-xs text-sky-200/55 mt-0.5">
              {brief ? (todaysLog ? 'Today\'s cycle complete — the agents adapted.' : 'Today\'s cycle is waiting to run.') : 'Add your brief so the agents know what to sell.'}
            </p>
          </div>
          {brief ? (
            <AgentButton onClick={runCycle} busy={busy}>
              <span className="flex items-center gap-2"><Zap size={15} /> RUN TODAY'S CYCLE</span>
            </AgentButton>
          ) : (
            <Link
              to="/brief"
              className="px-5 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-[#04121f] text-center"
            >
              START INTAKE
            </Link>
          )}
        </div>
      </div>

      {busy && step && (
        <div className="mt-4 glass rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-primary">
          <span className="w-2 h-2 rounded-full bg-primary pulse-dot" /> {step}
        </div>
      )}
      {err && (
        <div className="mt-4 glass rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {err}
        </div>
      )}

      {/* Agent tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {agents.map((a, i) => (
          <Link key={a.label} to={a.to} className="block">
            <Card delay={i * 70} className="h-full hover:border-primary/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.22em] text-sky-200/60">{a.label}</span>
                <a.icon size={16} className="text-primary" />
              </div>
              <p className="font-display text-lg text-white mt-3">{a.value}</p>
              <div className="h-1.5 rounded-full bg-white/8 mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                  style={{ width: `${a.progress}%` }}
                />
              </div>
              <p className="text-[11px] text-sky-200/45 mt-2">{a.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Timeline + growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="lg:col-span-2" delay={120}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] tracking-[0.25em] text-sky-200/60">CYCLE TIMELINE</span>
            <Link to="/growth" className="text-[11px] text-primary flex items-center gap-1">
              Growth tracker <ArrowUpRight size={12} />
            </Link>
          </div>
          {timeline.length === 0 ? (
            <p className="text-sm text-sky-200/50 py-6 text-center">No cycles run yet.</p>
          ) : (
            <div className="flex items-center justify-between">
              {timeline.map((d, i) => {
                const isLast = i === timeline.length - 1
                return (
                  <div key={d} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && <div className="absolute left-0 right-1/2 top-2 h-px bg-sky-400/25" />}
                    {!isLast && <div className="absolute left-1/2 right-0 top-2 h-px bg-sky-400/25" />}
                    <div
                      className={`relative w-4 h-4 rounded-full border ${
                        isLast
                          ? 'bg-secondary border-secondary glow-cyan pulse-dot'
                          : 'bg-[#0b1a38] border-sky-400/40'
                      }`}
                    />
                    <span className={`text-[10px] mt-2 ${isLast ? 'text-secondary' : 'text-sky-200/45'}`}>
                      {isLast ? 'TODAY' : d.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {todaysLog?.changeToday && (
            <div className="mt-5 rounded-xl bg-primary/8 border border-primary/25 p-3">
              <p className="text-[10px] tracking-[0.25em] text-primary/80 flex items-center gap-1.5">
                <Brain size={12} /> TODAY'S ADAPTATION
              </p>
              <p className="text-sm text-white mt-1.5">{todaysLog.changeToday}</p>
            </div>
          )}
        </Card>

        <Card delay={180}>
          <span className="text-[10px] tracking-[0.25em] text-sky-200/60">GROWTH TRACKER</span>
          <p className="font-display text-4xl mt-3 text-amber-300">
            {growth === null ? '—' : `${growth > 0 ? '+' : ''}${growth}%`}
          </p>
          <p className="text-xs text-sky-200/50 mt-1">
            {growth === null ? 'Log daily numbers to see your curve' : 'reach vs. earlier period'}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Pill tone="cyan">{(posts || []).filter((p) => p.status === 'posted').length} posted</Pill>
            <Pill tone="green">{(leads || []).filter((l) => l.stage === 'won').length} won</Pill>
            <Pill tone="dim">{(plans || []).length} strategy versions</Pill>
          </div>
          <Link
            to="/brief"
            className="mt-5 flex items-center gap-2 text-xs text-sky-200/60 hover:text-sky-100"
          >
            <FileText size={13} /> {brief ? 'Update product brief' : 'Add product brief'}
          </Link>
        </Card>
      </div>

      {loading && <p className="text-xs text-sky-200/40 mt-4">Loading your file…</p>}
    </div>
  )
}
