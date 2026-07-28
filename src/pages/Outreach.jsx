import { useState } from 'react'
import { Send, Plus, Copy, Check, Mail, AlertCircle, Trash2, ChevronDown, Radar } from 'lucide-react'
import { db } from '../lib/db'
import { ai } from '../lib/ai'
import { http } from '../lib/http'
import { useLive } from '../lib/useLive'
import { useBrief, briefPrompt } from '../hooks/useBrief'
import { Card, SectionTitle, AgentButton, Empty, Pill, Field, inputClass } from '../components/UI'

const STAGES = ['new', 'drafted', 'contacted', 'replied', 'won', 'lost']
const STAGE_TONE = { new: 'dim', drafted: 'cyan', contacted: 'cyan', replied: 'gold', won: 'green', lost: 'dim' }

function LeadCard({ lead, brief, plan, delay }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  const draft = async () => {
    setBusy(true)
    setErr('')
    try {
      const { json } = await ai.run(
        `You are the Outreach Agent at the agency "All We Do". Write a short, specific, human outreach
email plus two follow-ups for ONE prospect. No hype, no "I hope this finds you well", under 120 words each.

Our product:
${briefPrompt(brief)}
${plan ? `Positioning: ${plan.positioning}` : ''}

Prospect: ${lead.name}${lead.company ? ` at ${lead.company}` : ''}
Role / context: ${lead.role || 'unknown'}
Why they might care: ${lead.note || 'not specified'}

Return JSON: { "subject": "...", "email": "...", "followUp1": "sent after 4 days", "followUp2": "final, sent after 10 days", "angle": "one line on why this angle" }`,
        { json: true },
      )
      if (!json?.email) {
        setErr('The agent came back empty. Try again.')
        return
      }
      await db.update('leads', lead.id, {
        subject: json.subject || '',
        emailBody: json.email,
        followUp1: json.followUp1 || '',
        followUp2: json.followUp2 || '',
        angle: json.angle || '',
        stage: lead.stage === 'new' ? 'drafted' : lead.stage,
      })
      setOpen(true)
    } catch (e) {
      setErr(e?.message || 'Draft failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (t) => {
    try {
      await navigator.clipboard.writeText(t)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setErr('Copy blocked — select the text manually.')
    }
  }

  return (
    <Card delay={delay}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-white truncate">{lead.name}</p>
          <p className="text-xs text-sky-200/50 truncate">
            {[lead.company, lead.role].filter(Boolean).join(' · ') || 'no company noted'}
          </p>
        </div>
        <Pill tone={STAGE_TONE[lead.stage] || 'dim'}>{(lead.stage || 'new').toUpperCase()}</Pill>
      </div>

      {lead.note && <p className="text-xs text-sky-200/55 mt-2">{lead.note}</p>}

      {err && (
        <p className="text-[11px] text-amber-300 mt-2 flex items-center gap-1"><AlertCircle size={12} /> {err}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {!lead.subject ? (
          <button
            onClick={draft}
            disabled={busy}
            className="px-3 py-2 rounded-lg text-xs bg-primary/12 border border-primary/30 text-primary active:scale-95 transition disabled:opacity-50"
          >
            {busy ? 'Writing…' : 'Draft outreach'}
          </button>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs bg-white/6 border border-white/10 text-sky-100"
          >
            {open ? 'Hide draft' : 'View draft'} <ChevronDown size={12} className={open ? 'rotate-180 transition' : 'transition'} />
          </button>
        )}

        <select
          value={lead.stage || 'new'}
          onChange={(e) => db.update('leads', lead.id, { stage: e.target.value, stageAt: new Date().toISOString() })}
          className="px-3 py-2 rounded-lg text-xs bg-[#08142c] border border-sky-400/18 text-sky-100 outline-none"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={() => db.delete('leads', lead.id)}
          className="ml-auto p-2 rounded-lg text-sky-200/40 hover:text-rose-300 transition"
          aria-label="Remove lead"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {open && lead.subject && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
            <p className="text-[10px] tracking-[0.25em] text-primary/70">SUBJECT</p>
            <p className="text-sm text-white mt-1">{lead.subject}</p>
            <p className="text-[10px] tracking-[0.25em] text-primary/70 mt-3">EMAIL</p>
            <p className="text-sm text-sky-200/75 mt-1 whitespace-pre-wrap">{lead.emailBody}</p>
            {lead.angle && <p className="text-[11px] text-secondary mt-2">Angle: {lead.angle}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => copy(`${lead.subject}\n\n${lead.emailBody || ''}`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/6 border border-white/10 text-sky-100"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
              </button>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.subject || '')}&body=${encodeURIComponent(lead.emailBody || '')}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-secondary/12 border border-secondary/30 text-secondary"
                >
                  <Mail size={12} /> Open in mail
                </a>
              )}
            </div>
          </div>

          {[['FOLLOW-UP · DAY 4', lead.followUp1], ['FOLLOW-UP · DAY 10', lead.followUp2]].map(([label, body]) =>
            body ? (
              <div key={label} className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                <p className="text-[10px] tracking-[0.25em] text-sky-200/50">{label}</p>
                <p className="text-sm text-sky-200/70 mt-1 whitespace-pre-wrap">{body}</p>
                <button
                  onClick={() => copy(body)}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-white/6 border border-white/10 text-sky-100"
                >
                  <Copy size={11} /> Copy
                </button>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Card>
  )
}

export default function Outreach() {
  const { brief } = useBrief()
  const { data: leads } = useLive('leads', { order: '-createdAt', limit: 100 })
  const { data: plans } = useLive('strategy-plans', { order: '-createdAt', limit: 1 })
  const [form, setForm] = useState({ name: '', company: '', role: '', email: '', note: '' })
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ideaBusy, setIdeaBusy] = useState(false)
  const [ideas, setIdeas] = useState(null)
  const [err, setErr] = useState('')
  const [src, setSrc] = useState({ titles: '', keywords: '', count: 25 })
  const [srcBusy, setSrcBusy] = useState(false)
  const [srcNote, setSrcNote] = useState('')

  const sourceLeads = async () => {
    setSrcBusy(true)
    setErr('')
    setSrcNote('')
    try {
      const titles = src.titles.split(',').map((t) => t.trim()).filter(Boolean)
      const per = Math.min(Math.max(Number(src.count) || 25, 1), 100)
      const res = await http.fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': '{{secrets.APOLLO_API_KEY}}',
        },
        body: JSON.stringify({
          person_titles: titles.length ? titles : undefined,
          q_keywords: src.keywords || undefined,
          page: 1,
          per_page: per,
        }),
      })
      if (res.status !== 200) {
        setErr(`Apollo answered ${res.status}. Check the API key and that the plan allows people search.`)
        return
      }
      let payload = {}
      try { payload = JSON.parse(res.body || '{}') } catch { payload = {} }
      const people = payload.people || payload.contacts || []
      if (!people.length) {
        setSrcNote('Apollo returned no matches for that search — try broader titles or keywords.')
        return
      }
      const rows = people.map((p) => {
        const email = p.email && !String(p.email).includes('not_unlocked') ? p.email : ''
        return {
          name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.name || 'Unknown',
          company: p.organization?.name || p.organization_name || '',
          role: p.title || '',
          email,
          note: [p.headline, p.city, p.country].filter(Boolean).join(' · '),
          source: 'apollo',
          stage: 'new',
        }
      })
      await db.insertMany('leads', rows)
      const locked = rows.filter((r) => !r.email).length
      setSrcNote(
        `Sourced ${rows.length} leads from Apollo.` +
          (locked ? ` ${locked} have no revealed email yet — unlock them in Apollo to email them.` : ''),
      )
    } catch (e) {
      setErr(
        e?.code === 'HOST_NOT_APPROVED'
          ? 'Lead sourcing is not switched on yet — All We Do still has to approve the Apollo connection.'
          : e?.code === 'SECRET_MISSING'
            ? 'The Apollo API key has not been entered yet.'
            : e?.message || 'Lead sourcing failed. Try again.',
      )
    } finally {
      setSrcBusy(false)
    }
  }

  const add = async () => {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      await db.insert('leads', { ...form, stage: 'new' })
      setForm({ name: '', company: '', role: '', email: '', note: '' })
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  const findProfiles = async () => {
    if (!brief) return
    setIdeaBusy(true)
    setErr('')
    try {
      const { json } = await ai.run(
        `You are the Prospecting Agent at "All We Do". Based on this product, describe the highest-value
prospect PROFILES to go after, and where to find them.

${briefPrompt(brief)}

Return JSON: { "profiles": [ { "who": "job title / persona", "where": "specific communities, directories, events or search queries to find them", "signal": "the buying signal to look for", "opener": "the one line that would get their attention" } ] }
Give 4 profiles. Be specific to this product's market — name real communities and search patterns.`,
        { json: true },
      )
      if (!json?.profiles) {
        setErr('Nothing came back. Try again.')
        return
      }
      setIdeas(json.profiles)
    } catch (e) {
      setErr(e?.message || 'Could not finish. Try again.')
    } finally {
      setIdeaBusy(false)
    }
  }

  if (!brief) {
    return (
      <div>
        <SectionTitle kicker="AGENT 03" title="Outreach Agent" />
        <Empty icon={Send} title="No product brief yet" body="Add your brief first — the Outreach Agent writes in your product's voice." />
      </div>
    )
  }

  const counts = STAGES.reduce((a, s) => ({ ...a, [s]: (leads || []).filter((l) => (l.stage || 'new') === s).length }), {})

  return (
    <div>
      <SectionTitle
        kicker="AGENT 03"
        title="Outreach Agent"
        right={
          <button
            onClick={() => setAdding((a) => !a)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-display bg-primary/12 border border-primary/30 text-primary active:scale-95 transition"
          >
            <Plus size={15} /> Add lead
          </button>
        }
      />
      <p className="text-sm text-sky-200/55 -mt-2 mb-5 max-w-2xl">
        Add the people worth reaching, and the agent writes each one a personal email plus two timed
        follow-ups. You review and send from your own inbox — nothing goes out behind your back.
      </p>

      {err && (
        <div className="glass rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-sm text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {err}
        </div>
      )}

      {adding && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dana Reyes" />
            </Field>
            <Field label="Company">
              <input className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Sunset Diner Group" />
            </Field>
            <Field label="Role">
              <input className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Operations lead" />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dana@example.com" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Why they'd care">
                <textarea rows={2} className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Running 3 locations on paper schedules" />
              </Field>
            </div>
          </div>
          <div className="mt-4">
            <AgentButton onClick={add} busy={busy} disabled={!form.name.trim()}>SAVE LEAD</AgentButton>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {STAGES.filter((s) => counts[s] > 0).map((s) => (
          <Pill key={s} tone={STAGE_TONE[s]}>{s} · {counts[s]}</Pill>
        ))}
      </div>

      <Card className="mb-4" delay={20}>
        <div className="flex items-center gap-2 text-primary mb-1">
          <Radar size={16} />
          <span className="text-[11px] tracking-[0.25em]">SOURCE LEADS · APOLLO</span>
        </div>
        <p className="text-sm text-sky-200/55 mb-3">
          Pull a targeted prospect list straight into your pipeline. Each one gets its own sequence written next.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Job titles" hint="Comma separated">
            <input
              className={inputClass}
              value={src.titles}
              onChange={(e) => setSrc({ ...src, titles: e.target.value })}
              placeholder="founder, head of marketing"
            />
          </Field>
          <Field label="Keywords" hint="Industry, tech, or market">
            <input
              className={inputClass}
              value={src.keywords}
              onChange={(e) => setSrc({ ...src, keywords: e.target.value })}
              placeholder="restaurant saas"
            />
          </Field>
          <Field label="How many" hint="Up to 100 per pull">
            <input
              type="number"
              min={1}
              max={100}
              className={inputClass}
              value={src.count}
              onChange={(e) => setSrc({ ...src, count: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <AgentButton onClick={sourceLeads} busy={srcBusy}>SOURCE LEADS</AgentButton>
          {srcNote && <span className="text-[11px] text-secondary">{srcNote}</span>}
        </div>
      </Card>

      <Card className="mb-4" delay={40}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.25em] text-secondary">WHO TO TARGET</p>
            <p className="text-sm text-sky-200/60 mt-1">Let the agent map the best prospect profiles and where they gather.</p>
          </div>
          <AgentButton tone="ghost" onClick={findProfiles} busy={ideaBusy}>FIND PROFILES</AgentButton>
        </div>
        {ideas && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {ideas.map((p, i) => (
              <div key={i} className="rounded-xl bg-white/[0.04] border border-white/8 p-3">
                <p className="text-sm text-white">{p.who}</p>
                <p className="text-xs text-sky-200/60 mt-1.5"><span className="text-primary/80">Where:</span> {p.where}</p>
                <p className="text-xs text-sky-200/60 mt-1"><span className="text-primary/80">Signal:</span> {p.signal}</p>
                {p.opener && <p className="text-xs text-secondary mt-1.5">“{p.opener}”</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {!leads?.length ? (
        <Empty icon={Send} title="No leads yet" body="Add your first prospect and the agent drafts the whole sequence." action={
          <button onClick={() => setAdding(true)} className="px-5 py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-primary to-secondary text-[#04121f]">ADD LEAD</button>
        } />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map((l, i) => (
            <LeadCard key={l.id} lead={l} brief={brief} plan={plans?.[0]} delay={i * 50} />
          ))}
        </div>
      )}
    </div>
  )
}
