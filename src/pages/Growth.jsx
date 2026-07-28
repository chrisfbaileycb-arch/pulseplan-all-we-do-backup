import { useMemo, useState } from 'react'
import { TrendingUp, Brain, Plus, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { db } from '../lib/db'
import { useLive } from '../lib/useLive'
import { useBrief } from '../hooks/useBrief'
import { generateLearning, today } from '../hooks/agents'
import { Card, SectionTitle, AgentButton, Empty, Pill, Field, inputClass } from '../components/UI'
import Chart from '../components/Chart'

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export default function Growth() {
  const { brief } = useBrief()
  const { data: metrics } = useLive('metrics', { order: '-day', limit: 90 })
  const { data: logs } = useLive('agent-log', { order: '-createdAt', limit: 30 })
  const { data: posts } = useLive('content-posts', { order: '-createdAt', limit: 60 })
  const { data: leads } = useLive('leads', { limit: 100 })
  const { data: plans } = useLive('strategy-plans', { order: '-createdAt', limit: 1 })

  const [form, setForm] = useState({ day: today(), reach: '', clicks: '', signups: '', revenue: '' })
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const asc = useMemo(() => [...(metrics || [])].sort((a, b) => String(a.day).localeCompare(String(b.day))), [metrics])

  const growth = useMemo(() => {
    const vals = asc.map((m) => Number(m.reach) || 0).filter(Boolean)
    if (vals.length < 2) return null
    const half = Math.max(1, Math.floor(vals.length / 2))
    const prev = vals.slice(0, half).reduce((a, b) => a + b, 0) / half
    const recent = vals.slice(-half).reduce((a, b) => a + b, 0) / half
    if (!prev) return null
    return Math.round(((recent - prev) / prev) * 100)
  }, [asc])

  const totals = useMemo(() => ({
    reach: asc.reduce((a, m) => a + (Number(m.reach) || 0), 0),
    signups: asc.reduce((a, m) => a + (Number(m.signups) || 0), 0),
    revenue: asc.reduce((a, m) => a + (Number(m.revenue) || 0), 0),
  }), [asc])

  const saveMetric = async () => {
    if (!form.day) return
    setSaving(true)
    try {
      await db.upsert('metrics', {
        day: form.day,
        reach: num(form.reach),
        clicks: num(form.clicks),
        signups: num(form.signups),
        revenue: num(form.revenue),
      }, form.day)
      setForm({ day: today(), reach: '', clicks: '', signups: '', revenue: '' })
    } finally {
      setSaving(false)
    }
  }

  const learn = async () => {
    if (!brief) return
    setBusy(true)
    setErr('')
    try {
      await generateLearning({ brief, plan: plans?.[0], metrics: metrics || [], posts: posts || [], leads: leads || [] })
    } catch (e) {
      setErr(e?.message || 'The agent could not finish. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const latest = logs?.[0]

  return (
    <div>
      <SectionTitle
        kicker="AGENT 04"
        title="Growth & Learning"
        right={<AgentButton onClick={learn} busy={busy} disabled={!brief}>RUN LEARNING PASS</AgentButton>}
      />
      <p className="text-sm text-sky-200/55 -mt-2 mb-5 max-w-2xl">
        Log what actually happened each day. The Learning Agent reads the numbers, the posts you
        published and your pipeline, then changes what the agency does next.
      </p>

      {err && (
        <div className="glass rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-sm text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {err}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          ['TOTAL REACH', totals.reach.toLocaleString()],
          ['SIGNUPS', totals.signups.toLocaleString()],
          ['REVENUE', `$${totals.revenue.toLocaleString()}`],
        ].map(([k, v], i) => (
          <Card key={k} delay={i * 60} className="text-center">
            <p className="text-[9px] md:text-[10px] tracking-[0.2em] text-sky-200/50">{k}</p>
            <p className="font-display text-xl md:text-3xl text-white mt-1">{v}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" delay={80}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp size={16} />
              <span className="text-[11px] tracking-[0.25em]">GROWTH TRACKER</span>
            </div>
            {growth !== null && (
              <span className={`flex items-center gap-1 font-display text-lg ${growth >= 0 ? 'text-amber-300' : 'text-rose-300'}`}>
                {growth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {growth > 0 ? '+' : ''}{growth}% REACH
              </span>
            )}
          </div>
          {asc.length >= 2 ? (
            <Chart
              spec={{
                kind: 'line',
                labels: asc.map((m) => String(m.day).slice(5)),
                series: [
                  { name: 'Reach', data: asc.map((m) => Number(m.reach) || 0) },
                  { name: 'Signups', data: asc.map((m) => Number(m.signups) || 0) },
                ],
                options: { title: 'Reach & signups by day' },
              }}
            />
          ) : (
            <p className="text-sm text-sky-200/50 py-8 text-center">
              Log two days of numbers and the tracker draws your curve.
            </p>
          )}
        </Card>

        <Card delay={140}>
          <div className="flex items-center gap-2 text-secondary mb-3">
            <Plus size={16} />
            <span className="text-[11px] tracking-[0.25em]">LOG A DAY</span>
          </div>
          <div className="space-y-3">
            <Field label="Date">
              <input type="date" className={inputClass} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reach">
                <input type="number" inputMode="numeric" className={inputClass} value={form.reach} onChange={(e) => setForm({ ...form, reach: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Clicks">
                <input type="number" inputMode="numeric" className={inputClass} value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Signups">
                <input type="number" inputMode="numeric" className={inputClass} value={form.signups} onChange={(e) => setForm({ ...form, signups: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Revenue">
                <input type="number" inputMode="numeric" className={inputClass} value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} placeholder="0" />
              </Field>
            </div>
            <AgentButton onClick={saveMetric} busy={saving} className="w-full">SAVE DAY</AgentButton>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-primary mb-3">
          <Brain size={16} />
          <span className="text-[11px] tracking-[0.25em]">LEARNING LOG</span>
        </div>

        {!logs?.length ? (
          <Empty
            icon={Brain}
            title="The agent hasn't studied you yet"
            body="Run a learning pass — it reads your results and decides what changes in today's marketing."
            action={<AgentButton onClick={learn} busy={busy} disabled={!brief}>RUN LEARNING PASS</AgentButton>}
          />
        ) : (
          <div className="space-y-4">
            {logs.map((l, i) => (
              <Card key={l.id} delay={i * 50}>
                <div className="flex items-center justify-between gap-2">
                  <Pill tone={l === latest ? 'green' : 'dim'}>{l.day}</Pill>
                  <Pill tone={l.confidence === 'high' ? 'green' : l.confidence === 'low' ? 'dim' : 'cyan'}>
                    confidence: {l.confidence || 'n/a'}
                  </Pill>
                </div>
                <p className="text-sm text-sky-200/75 mt-3">{l.readout}</p>
                {l.changeToday && (
                  <div className="mt-3 rounded-xl bg-primary/8 border border-primary/25 p-3">
                    <p className="text-[10px] tracking-[0.25em] text-primary/80">CHANGE TODAY</p>
                    <p className="text-sm text-white mt-1">{l.changeToday}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {[['WORKING', l.working, 'text-secondary'], ['STOPPING', l.stopping, 'text-rose-300/80']].map(
                    ([label, list, tone]) =>
                      (list || []).length > 0 && (
                        <div key={label} className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
                          <p className={`text-[10px] tracking-[0.25em] ${tone}`}>{label}</p>
                          <ul className="mt-2 space-y-1.5">
                            {list.map((x, j) => (
                              <li key={j} className="text-xs text-sky-200/65">• {x}</li>
                            ))}
                          </ul>
                        </div>
                      ),
                  )}
                </div>
                {l.experiment?.name && (
                  <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/8 p-3">
                    <p className="text-[10px] tracking-[0.25em] text-amber-300/80">NEXT EXPERIMENT</p>
                    <p className="text-sm text-white mt-1">{l.experiment.name}</p>
                    <p className="text-xs text-sky-200/60 mt-1">{l.experiment.hypothesis}</p>
                    {l.experiment.measure && <p className="text-xs text-primary/80 mt-1">Measured by: {l.experiment.measure}</p>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
