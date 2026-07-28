import { useEffect, useMemo, useState } from 'react'
import {
  Rocket, Check, AlertCircle, DollarSign, Layers, CalendarClock, ShieldCheck,
  Wrench, Sparkles, RefreshCw,
} from 'lucide-react'
import { db } from '../lib/db'
import { ai } from '../lib/ai'
import { auth } from '../lib/auth'
import { payments } from '../lib/payments'
import { useLiveShared } from '../lib/useLive'
import { useBrief, briefPrompt } from '../hooks/useBrief'
import { Card, SectionTitle, AgentButton, Empty, Pill, Field, inputClass } from '../components/UI'

const OPS_GROUP = 'key:allwedo-ops'
const INTENT_KEY = 'awd-deploy-intent'

export const LEVELS = [
  {
    id: 1,
    name: 'Level 1 — Ignition',
    fee: 50,
    minBudget: 100,
    suggested: 150,
    line: 'Staggered email campaign to 100 targeted leads',
    includes: [
      '100 leads sourced and qualified against your product',
      'One staggered email sequence + 2 timed follow-ups, written per lead',
      'Sends spread across the week so nothing looks like a blast',
      'Weekly reply / open / click readout',
    ],
  },
  {
    id: 2,
    name: 'Level 2 — Momentum',
    fee: 100,
    minBudget: 300,
    suggested: 450,
    line: 'Everything in Level 1, at 250 leads + one paid channel',
    includes: [
      '250 leads sourced, segmented into two angles',
      'Daily content pack: 5 post-ready pieces incl. one video script',
      'One paid channel run and optimised against your prepaid budget',
      'Learning agent rewrites the plan mid-week off the numbers',
    ],
  },
  {
    id: 3,
    name: 'Level 3 — Full Throttle',
    fee: 150,
    minBudget: 600,
    suggested: 900,
    line: 'Everything in Level 2, at 500 leads + multi-channel ads',
    includes: [
      '500 leads across every high-value profile we identify',
      'Multi-channel paid campaigns with creative + video scripts',
      'Twice-weekly optimisation pass and spend reallocation',
      'Platform / partner stack recommendations kept current',
    ],
  },
]

const STATUS = {
  reported: { label: 'Payment reported — verifying', tone: 'gold' },
  queued: { label: 'Verified · queued for this week', tone: 'cyan' },
  running: { label: 'Running now', tone: 'green' },
  delivered: { label: 'Delivered · report ready', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'dim' },
}
const STATUS_ORDER = ['reported', 'queued', 'running', 'delivered', 'cancelled']

function nextMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + ((8 - day) % 7 || 7))
  return d.toISOString().slice(0, 10)
}

// The next 10 Mondays — pick any of them, consecutive or not.
function upcomingMondays(count = 10) {
  const start = new Date(nextMonday() + 'T00:00:00')
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i * 7)
    return d.toISOString().slice(0, 10)
  })
}

function weekLabel(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function money(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function LevelCard({ level, active, recommended, onPick }) {
  return (
    <div
      className={`rounded-2xl p-4 md:p-5 border transition rise ${
        active
          ? 'border-primary/60 bg-primary/[0.07] glow-cyan'
          : 'border-white/10 bg-white/[0.03] hover:border-primary/30'
      }`}
      style={{ animationDelay: `${level.id * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-primary/70">LEVEL {level.id}</p>
          <p className="font-display text-lg text-white mt-1">{level.name.split('— ')[1]}</p>
        </div>
        {recommended && <Pill tone="green">AGENT PICK</Pill>}
      </div>

      <div className="flex items-baseline gap-1.5 mt-3">
        <span className="font-display text-3xl text-secondary">{money(level.fee)}</span>
        <span className="text-xs text-sky-200/50">/ week execution fee</span>
      </div>
      <p className="text-[11px] text-sky-200/45 mt-1">
        + your marketing spend prepaid (from {money(level.minBudget)}) — passed through, never marked up
      </p>

      <p className="text-sm text-sky-100/85 mt-3">{level.line}</p>
      <ul className="mt-3 space-y-1.5">
        {level.includes.map((i, k) => (
          <li key={k} className="text-xs text-sky-200/60 flex gap-2">
            <Check size={13} className="text-secondary shrink-0 mt-0.5" /> {i}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onPick(level)}
        className={`mt-4 w-full py-3 rounded-xl font-display text-sm tracking-wide transition active:scale-[0.98] ${
          active
            ? 'bg-gradient-to-r from-primary to-secondary text-[#04121f]'
            : 'bg-white/6 border border-sky-400/20 text-sky-100'
        }`}
      >
        {active ? 'SELECTED' : 'CHOOSE THIS LEVEL'}
      </button>
    </div>
  )
}

export default function Deploy() {
  const { brief } = useBrief()
  const { data: orders } = useLiveShared('deployments', { order: '-createdAt', limit: 100 })
  const [picked, setPicked] = useState(null)
  const [budget, setBudget] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [rec, setRec] = useState(null)
  const [recBusy, setRecBusy] = useState(false)
  const [isOwner, setIsOwner] = useState(() => auth.isAppOwner())
  const [weeks, setWeeks] = useState(() => [nextMonday()])
  const [awaiting, setAwaiting] = useState(() => {
    try { return JSON.parse(localStorage.getItem(INTENT_KEY) || 'null') } catch { return null }
  })

  useEffect(() => {
    const unsub = auth.onAuthChange(() => setIsOwner(auth.isAppOwner()))
    return unsub
  }, [])

  // Landed back from the payment page
  useEffect(() => {
    const r = payments.checkoutResult()
    if (r?.status === 'success') {
      const pending = (() => {
        try { return JSON.parse(localStorage.getItem(INTENT_KEY) || 'null') } catch { return null }
      })()
      if (pending) recordOrder(pending, true)
    } else if (r?.status === 'canceled') {
      setNotice('Payment was cancelled — nothing was charged and no week was booked.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const weekOptions = useMemo(() => upcomingMondays(10), [])
  const sortedWeeks = useMemo(() => [...weeks].sort(), [weeks])
  const weekCount = sortedWeeks.length
  const budgetNum = Number(budget || 0)
  const feePerWeek = isOwner ? 0 : (picked?.fee || 0)
  const feeTotal = feePerWeek * weekCount
  const spendTotal = (budgetNum || 0) * weekCount
  const total = picked ? feeTotal + spendTotal : 0
  const budgetOk = picked && budgetNum >= picked.minBudget && weekCount > 0

  const toggleWeek = (w) =>
    setWeeks((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]))

  const pick = (lvl) => {
    setPicked(lvl)
    setErr('')
    if (!budget || Number(budget) < lvl.minBudget) setBudget(String(lvl.suggested))
  }

  async function recordOrder(intent, confirmed) {
    try {
      const list = intent.weeks?.length ? intent.weeks : [intent.weekOf]
      const now = new Date().toISOString()
      const rows = list.map((w) => ({
        level: intent.level,
        levelName: intent.levelName,
        fee: intent.fee,
        budget: intent.budget,
        total: intent.fee + intent.budget,
        currency: 'USD',
        product: intent.product || 'unnamed product',
        weekOf: w,
        weeksInBooking: list.length,
        status: intent.ownerRun ? 'queued' : 'reported',
        ownerRun: !!intent.ownerRun,
        feeWaived: !!intent.ownerRun,
        paymentReported: !intent.ownerRun,
        paymentConfirmedByProvider: !!confirmed,
        reportedAt: now,
      }))
      await db.insertManyShared('deployments', rows, {
        groupId: OPS_GROUP,
        visibleTo: 'creator-and-admin',
        writableBy: 'admins',
      })
      localStorage.removeItem(INTENT_KEY)
      setAwaiting(null)
      setNotice(
        intent.ownerRun
          ? `${list.length} owner week${list.length > 1 ? 's' : ''} queued with the execution fee waived (${list.map(weekLabel).join(', ')}). You still cover the actual marketing spend directly.`
          : `${list.length} week${list.length > 1 ? 's' : ''} booked (${list.map(weekLabel).join(', ')}). All We Do verifies the payment, then deployment starts — you will see each week move through the stages below.`,
      )
    } catch (e) {
      setErr(e?.message || 'Could not record the booking. Take a screenshot of your receipt and try again.')
    }
  }

  const bookAsOwner = async () => {
    if (!picked || !budgetOk) return
    setBusy(true)
    setErr('')
    setNotice('')
    await recordOrder({
      level: picked.id,
      levelName: picked.name,
      fee: 0,
      budget: budgetNum,
      product: brief?.name,
      weeks: sortedWeeks,
      ownerRun: true,
    }, false)
    setBusy(false)
  }

  const startCheckout = async () => {
    if (!picked || !budgetOk) return
    setBusy(true)
    setErr('')
    setNotice('')
    const intent = {
      level: picked.id,
      levelName: picked.name,
      fee: picked.fee,
      budget: budgetNum,
      total: feeTotal + spendTotal,
      product: brief?.name,
      weeks: sortedWeeks,
    }
    try {
      localStorage.setItem(INTENT_KEY, JSON.stringify(intent))
      setAwaiting(intent)
      await payments.checkout({
        sku: `deploy-l${picked.id}`,
        name: `${picked.name} — ${weekCount} week${weekCount > 1 ? 's' : ''} (${sortedWeeks.map(weekLabel).join(', ')}) · fee ${money(feeTotal)} + spend ${money(spendTotal)}`,
        amount: intent.total,
        currency: 'USD',
        metadata: { level: String(picked.id), weeks: sortedWeeks.join(',') },
      })
    } catch (e) {
      localStorage.removeItem(INTENT_KEY)
      setAwaiting(null)
      setErr(
        e?.code === 'NO_CONNECTION'
          ? 'Card payments are not switched on yet — All We Do still has to connect its payment account.'
          : e?.message || 'Could not open the payment page. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const recommend = async () => {
    if (!brief) return
    setRecBusy(true)
    setErr('')
    try {
      const { json } = await ai.run(
        `You are the Deployment Agent at the marketing agency "All We Do". Recommend which weekly
deployment level this client should run, how much marketing spend to prepay, and the best
outside platforms/tools/partner agencies to pair with it. Be specific and decisive.

${briefPrompt(brief)}

Our levels (weekly execution fee, client prepays the actual marketing spend on top):
${LEVELS.map((l) => `Level ${l.id} — ${l.name}: fee $${l.fee}/week, min prepaid spend $${l.minBudget}. ${l.line}. Includes: ${l.includes.join('; ')}`).join('\n')}

Return JSON: {
  "level": 1,
  "prepaidBudget": 300,
  "why": "2-3 sentences tying the choice to this product, audience and budget",
  "weeklyOutcome": "what one week at this level realistically produces — no hype, ranges are fine",
  "rampPlan": ["week 1 ...", "week 2 ...", "week 3 ..."],
  "stack": [{ "name": "platform or tool", "category": "e.g. email sending, ads, analytics, landing pages", "why": "why it fits this product", "cost": "rough monthly cost" }],
  "partners": [{ "name": "kind of agency or specialist to bring in", "when": "the point at which it is worth it", "why": "what they add that we do not" }]
}
Give 4-6 stack items and 2-3 partners. prepaidBudget must be at least the level's minimum.`,
        { json: true },
      )
      if (!json?.level) {
        setErr('The agent came back empty. Try again.')
        return
      }
      setRec(json)
      const lvl = LEVELS.find((l) => l.id === Number(json.level)) || LEVELS[0]
      setPicked(lvl)
      setBudget(String(Math.max(Number(json.prepaidBudget) || lvl.suggested, lvl.minBudget)))
    } catch (e) {
      setErr(e?.message || 'The agent could not finish. Try again.')
    } finally {
      setRecBusy(false)
    }
  }

  const myOrders = orders || []

  return (
    <div>
      <SectionTitle
        kicker="AGENT 05"
        title="Deployment Levels"
        right={<AgentButton tone="ghost" onClick={recommend} busy={recBusy}>{rec ? 'RE-ASSESS' : 'RECOMMEND MY LEVEL'}</AgentButton>}
      />
      <p className="text-sm text-sky-200/55 -mt-2 mb-5 max-w-3xl">
        Hands-free weekly execution. You pay a flat weekly fee for the work, and prepay the actual
        marketing spend — we never mark it up. No contracts: every campaign is booked one week at a
        time — consecutive or not. Run a week, skip two, run another; you simply don't book a week to pause.
      </p>

      {err && (
        <div className="glass rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-sm text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {err}
        </div>
      )}
      {notice && (
        <div className="glass rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-sm text-secondary">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" /> {notice}
        </div>
      )}

      {rec && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="green">AGENT RECOMMENDS LEVEL {rec.level}</Pill>
            <Pill tone="gold">PREPAY {money(rec.prepaidBudget)}</Pill>
          </div>
          <p className="text-sm text-sky-100/85 mt-3">{rec.why}</p>
          {rec.weeklyOutcome && (
            <p className="text-sm text-sky-200/65 mt-2 border-l-2 border-secondary/50 pl-3">{rec.weeklyOutcome}</p>
          )}
          {(rec.rampPlan || []).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {rec.rampPlan.map((w, i) => (
                <div key={i} className="rounded-xl bg-white/[0.04] border border-white/8 p-3 text-xs text-sky-200/65">
                  <Pill>W{i + 1}</Pill>
                  <p className="mt-2">{w}</p>
                </div>
              ))}
            </div>
          )}

          {(rec.stack || []).length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-primary mb-3">
                <Wrench size={15} />
                <span className="text-[11px] tracking-[0.25em]">RECOMMENDED PLATFORM STACK</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rec.stack.map((s, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white">{s.name}</span>
                      {s.cost && <Pill tone="gold">{s.cost}</Pill>}
                    </div>
                    <p className="text-[11px] text-primary/70 mt-1">{s.category}</p>
                    <p className="text-xs text-sky-200/60 mt-1.5">{s.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(rec.partners || []).length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-secondary mb-3">
                <Sparkles size={15} />
                <span className="text-[11px] tracking-[0.25em]">WHO ELSE TO BRING IN</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {rec.partners.map((p, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                    <p className="text-sm text-white">{p.name}</p>
                    <p className="text-[11px] text-secondary mt-1">{p.when}</p>
                    <p className="text-xs text-sky-200/60 mt-1.5">{p.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {!brief && (
        <Card className="mb-4">
          <p className="text-sm text-sky-200/70">
            Fill in your product brief first and the Deployment Agent can pick the right level for you —
            you can still book a level below without it.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LEVELS.map((l) => (
          <LevelCard
            key={l.id}
            level={l}
            active={picked?.id === l.id}
            recommended={rec?.level === l.id}
            onPick={pick}
          />
        ))}
      </div>

      {picked && (
        <Card className="mt-4" delay={60}>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Rocket size={16} />
            <span className="text-[11px] tracking-[0.25em]">PICK YOUR WEEKS</span>
          </div>
          <p className="text-sm text-sky-200/60 mb-4">
            {picked.name} · {isOwner ? 'execution fee waived on your own account' : `execution fee ${money(picked.fee)} per week booked`}. Choose any
            weeks you like — they don't have to be back-to-back. Skip a week, run one, skip two, run again.
          </p>

          <div className="flex flex-wrap gap-2 mb-5">
            {weekOptions.map((w) => {
              const on = weeks.includes(w)
              return (
                <button
                  key={w}
                  onClick={() => toggleWeek(w)}
                  className={`px-3 py-2.5 rounded-xl text-xs border transition active:scale-[0.97] ${
                    on
                      ? 'bg-primary/15 border-primary/50 text-primary'
                      : 'bg-white/[0.04] border-white/10 text-sky-200/55 hover:border-primary/30'
                  }`}
                >
                  wk of {weekLabel(w)}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <Field
              label="Prepaid marketing spend (USD)"
              hint={`Minimum ${money(picked.minBudget)} for this level. This is your actual ad / sending budget — spent on your campaigns, itemised in the weekly report.`}
            >
              <input
                type="number"
                inputMode="decimal"
                min={picked.minBudget}
                className={inputClass}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={String(picked.suggested)}
              />
            </Field>

            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
              <div className="flex justify-between text-sm text-sky-200/70">
                <span>
                  Execution fee × {weekCount} week{weekCount === 1 ? '' : 's'}
                  {isOwner && <span className="text-secondary"> · waived</span>}
                </span>
                <span>{money(feeTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-sky-200/70 mt-2">
                <span>Marketing spend × {weekCount}</span>
                <span>{money(spendTotal)}</span>
              </div>
              <div className="h-px bg-white/10 my-3" />
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] tracking-[0.25em] text-sky-200/50">
                  {isOwner ? 'YOUR SPEND' : 'DUE NOW'}
                </span>
                <span className="font-display text-2xl text-secondary">{money(total)}</span>
              </div>
              <p className="text-[11px] text-sky-200/40 mt-2">
                {weekCount ? sortedWeeks.map(weekLabel).join(' · ') : 'No weeks selected'}
              </p>
              <p className="text-[11px] text-sky-200/40 mt-1">
                No contract, no auto-renewal — nothing runs on a week you didn't select.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {isOwner ? (
              <AgentButton onClick={bookAsOwner} busy={busy} disabled={!budgetOk}>
                QUEUE MY WEEKS — FEE WAIVED
              </AgentButton>
            ) : (
              <AgentButton onClick={startCheckout} busy={busy} disabled={!budgetOk}>
                PREPAY &amp; DEPLOY
              </AgentButton>
            )}
            {!weekCount && (
              <span className="text-[11px] text-amber-300">Select at least one week.</span>
            )}
            {weekCount > 0 && budgetNum < picked.minBudget && (
              <span className="text-[11px] text-amber-300">
                Enter at least {money(picked.minBudget)} of marketing spend per week.
              </span>
            )}
          </div>

          {isOwner && (
            <p className="text-[11px] text-secondary/80 mt-3 flex items-start gap-1.5">
              <ShieldCheck size={13} className="mt-0.5 shrink-0" />
              Owner account recognised — the {money(picked.fee)}/week execution fee is waived for your own
              products. You still cover the real marketing spend directly at the ad and sending platforms.
            </p>
          )}

          {awaiting && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
              <p className="text-sm text-sky-100">
                Payment page opened for {money(awaiting.total)}. Once you've paid, confirm here so we can
                book the week — if you closed it without paying, discard it.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => recordOrder(awaiting, false)}
                  className="px-4 py-2.5 rounded-lg text-xs bg-secondary/12 border border-secondary/30 text-secondary"
                >
                  I've completed payment
                </button>
                <button
                  onClick={() => { localStorage.removeItem(INTENT_KEY); setAwaiting(null) }}
                  className="px-4 py-2.5 rounded-lg text-xs bg-white/6 border border-white/10 text-sky-200/70"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2 text-sky-200/60 mb-3">
          <CalendarClock size={16} />
          <span className="text-[11px] tracking-[0.25em]">
            {isOwner ? 'ALL BOOKED DEPLOYMENTS' : 'YOUR BOOKED WEEKS'}
          </span>
        </div>

        {!myOrders.length ? (
          <Empty
            icon={Layers}
            title="No weeks booked yet"
            body="Pick a level above. Each booking is one week of hands-free execution — leads, sequences, content and spend handled for you."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myOrders.map((o, i) => {
              const st = STATUS[o.status] || STATUS.reported
              return (
                <Card key={o.id} delay={i * 40}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-white">{o.levelName || `Level ${o.level}`}</p>
                      <p className="text-xs text-sky-200/50 mt-0.5">
                        Week of {o.weekOf} · {o.product}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Pill tone={st.tone}>{st.label}</Pill>
                      {o.ownerRun && <Pill tone="gold">OWNER · FEE WAIVED</Pill>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-sky-200/65">
                    <span className="flex items-center gap-1"><DollarSign size={12} /> Fee {money(o.fee)}</span>
                    <span>Spend {money(o.budget)}</span>
                    <span className="text-secondary">
                      {o.ownerRun ? `Spend ${money(o.total)}` : `Paid ${money(o.total)}`}
                    </span>
                  </div>

                  {o.deliveryNote && (
                    <p className="text-xs text-sky-200/70 mt-3 rounded-xl bg-white/[0.04] border border-white/8 p-3 whitespace-pre-wrap">
                      {o.deliveryNote}
                    </p>
                  )}

                  {isOwner && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-[10px] tracking-[0.25em] text-primary/70 mb-2">AGENCY CONSOLE</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_ORDER.map((s) => (
                          <button
                            key={s}
                            onClick={() => db.updateShared('deployments', o.id, { status: s, statusAt: new Date().toISOString() })}
                            className={`px-3 py-2 rounded-lg text-[11px] border transition ${
                              o.status === s
                                ? 'bg-primary/15 border-primary/40 text-primary'
                                : 'bg-white/5 border-white/10 text-sky-200/60'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        defaultValue={o.deliveryNote || ''}
                        placeholder="What was delivered this week — sends, reach, spend, results…"
                        onBlur={(e) => {
                          if (e.target.value !== (o.deliveryNote || '')) {
                            db.updateShared('deployments', o.id, { deliveryNote: e.target.value })
                          }
                        }}
                        className={inputClass}
                      />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Card className="mt-6" delay={120}>
        <div className="flex items-center gap-2 text-sky-200/60 mb-2">
          <RefreshCw size={15} />
          <span className="text-[11px] tracking-[0.25em]">HOW EXECUTION ACTUALLY WORKS</span>
        </div>
        <ul className="space-y-2 text-xs text-sky-200/60">
          <li>· Agents source and qualify the leads, then write every email and follow-up in your product's voice.</li>
          <li>· All We Do sends the staggered campaign and runs the paid channels from the agency's own sending and ad accounts — not from your browser, and nothing leaves without a human release.</li>
          <li>· Your prepaid spend is used only on your campaigns and itemised back to you in the weekly report.</li>
          <li>· Each booking covers one week. Nothing renews on its own.</li>
        </ul>
      </Card>
    </div>
  )
}
