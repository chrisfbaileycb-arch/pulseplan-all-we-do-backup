import { useState } from 'react'
import { Target, DollarSign, Megaphone, ListChecks, AlertCircle } from 'lucide-react'
import { db } from '../lib/db'
import { ai } from '../lib/ai'
import { useLive } from '../lib/useLive'
import { useBrief, briefPrompt } from '../hooks/useBrief'
import { Card, SectionTitle, AgentButton, Empty, Pill } from '../components/UI'
import Chart from '../components/Chart'

export default function Strategy() {
  const { brief } = useBrief()
  const { data: plans } = useLive('strategy-plans', { order: '-createdAt', limit: 20 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const plan = plans?.[0] || null

  const run = async () => {
    if (!brief) return
    setBusy(true)
    setError('')
    try {
      const history = (plans || []).slice(0, 2).map((p) => p.positioning).filter(Boolean)
      const { json } = await ai.run(
        `You are the Strategy Agent at a marketing agency called "All We Do". Build a concrete 30-day
growth strategy for this product. Be specific to the product and budget — no generic filler.

${briefPrompt(brief)}

${history.length ? `Previous positioning statements you produced (evolve, do not repeat):\n${history.join('\n')}` : ''}

Return JSON with exactly these fields:
{
  "positioning": "one sharp sentence of how to position this product",
  "audienceInsight": "the single most useful truth about this buyer",
  "channels": [{ "name": "channel", "why": "why it fits", "priority": "high|medium|low" }],
  "pricing": [{ "tier": "name", "price": "e.g. $19/mo", "includes": "short list", "target": "who buys it" }],
  "adSpend": [{ "channel": "channel", "amount": 250, "share": 40, "direction": "exactly what to run and target" }],
  "weekPlan": [{ "week": "Week 1", "focus": "focus", "actions": ["action", "action"] }],
  "risks": ["risk", "risk"]
}
adSpend amounts must add up to the stated monthly budget (if no budget given, assume $500) and share is percent.`,
        { json: true },
      )
      if (!json) {
        setError('The agent came back empty. Try running it again.')
        return
      }
      await db.insert('strategy-plans', { ...json, briefName: brief.name, day: new Date().toISOString().slice(0, 10) })
    } catch (e) {
      setError(e?.message || 'The agent could not finish. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!brief) {
    return (
      <div>
        <SectionTitle kicker="AGENT 01" title="Strategy Agent" />
        <Empty
          icon={Target}
          title="No product brief yet"
          body="Fill in the product brief first — the Strategy Agent needs to know what it's selling, to whom, and with what budget."
        />
      </div>
    )
  }

  const spend = (plan?.adSpend || []).filter((s) => typeof s.amount === 'number')

  return (
    <div>
      <SectionTitle
        kicker="AGENT 01"
        title="Strategy Agent"
        right={<AgentButton onClick={run} busy={busy}>{plan ? 'REBUILD PLAN' : 'BUILD PLAN'}</AgentButton>}
      />

      {error && (
        <div className="glass rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-sm text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {!plan ? (
        <Empty
          icon={Target}
          title="Ready when you are"
          body={`The agent will read your brief for ${brief.name} and return positioning, a pricing structure, an ad-spend split and a four-week action plan.`}
          action={<AgentButton onClick={run} busy={busy}>BUILD PLAN</AgentButton>}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-[10px] tracking-[0.3em] text-primary/70">POSITIONING</p>
            <p className="font-display text-xl md:text-2xl text-white mt-2 leading-snug">{plan.positioning}</p>
            {plan.audienceInsight && (
              <p className="text-sm text-sky-200/60 mt-3 border-l-2 border-secondary/50 pl-3">{plan.audienceInsight}</p>
            )}
            <p className="text-[11px] text-sky-200/35 mt-4">Version from {plan.day}</p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card delay={60}>
              <div className="flex items-center gap-2 text-secondary mb-3">
                <DollarSign size={16} />
                <span className="text-[11px] tracking-[0.25em]">PRICING STRUCTURE</span>
              </div>
              <div className="space-y-3">
                {(plan.pricing || []).map((t, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-white">{t.tier}</span>
                      <span className="font-display text-secondary">{t.price}</span>
                    </div>
                    <p className="text-xs text-sky-200/60 mt-1.5">{t.includes}</p>
                    {t.target && <p className="text-[11px] text-sky-200/40 mt-1">For: {t.target}</p>}
                  </div>
                ))}
              </div>
            </Card>

            <Card delay={120}>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Megaphone size={16} />
                <span className="text-[11px] tracking-[0.25em]">AD SPEND DIRECTION</span>
              </div>
              {spend.length > 0 && (
                <div className="mb-4">
                  <Chart
                    spec={{
                      kind: 'donut',
                      labels: spend.map((s) => s.channel),
                      series: [{ name: 'Spend', data: spend.map((s) => s.amount) }],
                      options: { title: 'Monthly split' },
                    }}
                  />
                </div>
              )}
              <div className="space-y-3">
                {(plan.adSpend || []).map((s, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white">{s.channel}</span>
                      <Pill tone="gold">{typeof s.amount === 'number' ? `$${s.amount}` : s.amount} · {s.share}%</Pill>
                    </div>
                    <p className="text-xs text-sky-200/60 mt-2">{s.direction}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card delay={180}>
            <div className="flex items-center gap-2 text-primary mb-3">
              <ListChecks size={16} />
              <span className="text-[11px] tracking-[0.25em]">FOUR-WEEK PLAN</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {(plan.weekPlan || []).map((w, i) => (
                <div key={i} className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
                  <Pill>{w.week}</Pill>
                  <p className="text-sm text-white mt-2">{w.focus}</p>
                  <ul className="mt-2 space-y-1.5">
                    {(w.actions || []).map((a, j) => (
                      <li key={j} className="text-xs text-sky-200/60 flex gap-2">
                        <span className="text-secondary">▸</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          {(plan.channels || []).length > 0 && (
            <Card delay={220}>
              <p className="text-[11px] tracking-[0.25em] text-sky-200/60 mb-3">CHANNEL PRIORITIES</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plan.channels.map((c, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{c.name}</span>
                      <Pill tone={c.priority === 'high' ? 'green' : c.priority === 'low' ? 'dim' : 'cyan'}>{c.priority}</Pill>
                    </div>
                    <p className="text-xs text-sky-200/60 mt-2">{c.why}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(plan.risks || []).length > 0 && (
            <Card delay={260}>
              <p className="text-[11px] tracking-[0.25em] text-amber-300/80 mb-3">WHAT COULD GO WRONG</p>
              <ul className="space-y-2">
                {plan.risks.map((r, i) => (
                  <li key={i} className="text-sm text-sky-200/65 flex gap-2">
                    <AlertCircle size={14} className="mt-1 text-amber-300/70 shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {plans.length > 1 && (
            <p className="text-[11px] text-sky-200/40 text-center pt-2">
              {plans.length} strategy versions on file — each rebuild evolves from the last.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
