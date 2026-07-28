import { useEffect, useState } from 'react'
import { FileText, Check } from 'lucide-react'
import { useBrief } from '../hooks/useBrief'
import { Card, SectionTitle, AgentButton, Field, inputClass } from '../components/UI'

const BLANK = {
  name: '', what: '', audience: '', pricing: '', budget: '', goal: '', tone: '', traction: '',
}

export default function Brief() {
  const { brief, loading, save } = useBrief()
  const [form, setForm] = useState(BLANK)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (brief) setForm({ ...BLANK, ...brief })
  }, [brief])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      await save({ ...form })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="text-sm text-sky-200/50">Loading your brief…</div>

  return (
    <div>
      <SectionTitle kicker="INTAKE" title="Your product brief" />
      <p className="text-sm text-sky-200/60 -mt-2 mb-6 max-w-2xl">
        This is the file every agent reads before it does anything. The more honest the detail,
        the sharper the strategy, pricing and content it produces.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 text-primary mb-4">
            <FileText size={16} />
            <span className="text-[11px] tracking-[0.25em]">THE PRODUCT</span>
          </div>
          <div className="space-y-4">
            <Field label="App / product name">
              <input className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. ShiftMate" />
            </Field>
            <Field label="What it does" hint="One or two plain sentences.">
              <textarea rows={3} className={inputClass} value={form.what} onChange={set('what')} placeholder="Scheduling app for small restaurant teams…" />
            </Field>
            <Field label="Who it's for">
              <input className={inputClass} value={form.audience} onChange={set('audience')} placeholder="Owners of 1–5 location restaurants" />
            </Field>
            <Field label="Traction so far">
              <input className={inputClass} value={form.traction} onChange={set('traction')} placeholder="40 signups, 6 paying" />
            </Field>
          </div>
        </Card>

        <Card delay={80}>
          <div className="flex items-center gap-2 text-secondary mb-4">
            <FileText size={16} />
            <span className="text-[11px] tracking-[0.25em]">THE MONEY & VOICE</span>
          </div>
          <div className="space-y-4">
            <Field label="Current pricing" hint="Leave rough — the strategy agent will propose a structure.">
              <input className={inputClass} value={form.pricing} onChange={set('pricing')} placeholder="$19/mo, no tiers yet" />
            </Field>
            <Field label="Monthly marketing budget">
              <input className={inputClass} value={form.budget} onChange={set('budget')} placeholder="$600" />
            </Field>
            <Field label="Primary goal (next 30 days)">
              <input className={inputClass} value={form.goal} onChange={set('goal')} placeholder="100 trial signups" />
            </Field>
            <Field label="Brand tone">
              <input className={inputClass} value={form.tone} onChange={set('tone')} placeholder="Direct, warm, no hype" />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <AgentButton onClick={submit} busy={busy} disabled={!form.name.trim()}>
          SAVE BRIEF
        </AgentButton>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-secondary">
            <Check size={16} /> Agents updated
          </span>
        )}
      </div>
    </div>
  )
}
