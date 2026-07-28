export function Card({ children, className = '', delay = 0 }) {
  return (
    <div
      className={`glass rounded-2xl p-4 md:p-5 rise ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ kicker, title, right }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        {kicker && <p className="text-[10px] tracking-[0.3em] text-primary/70">{kicker}</p>}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-white mt-1">{title}</h2>
      </div>
      {right}
    </div>
  )
}

export function AgentButton({ children, onClick, busy, disabled, tone = 'primary', className = '' }) {
  const tones = {
    primary: 'from-primary to-secondary text-[#04121f]',
    ghost: 'from-white/10 to-white/5 text-sky-100 border border-sky-400/20',
  }
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`px-5 py-3 rounded-xl font-display font-bold text-sm tracking-wide bg-gradient-to-r ${tones[tone]} active:scale-[0.98] transition disabled:opacity-50 ${className}`}
    >
      {busy ? 'AGENT WORKING…' : children}
    </button>
  )
}

export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="glass rounded-2xl px-6 py-12 text-center rise">
      {Icon && (
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
          <Icon size={24} />
        </div>
      )}
      <h3 className="font-display text-lg text-white mt-4">{title}</h3>
      <p className="text-sm text-sky-200/55 mt-2 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.2em] text-sky-200/60 uppercase">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-sky-200/40 mt-1">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'mt-2 w-full bg-[#08142c]/80 border border-sky-400/18 rounded-xl px-4 py-3 text-sm text-sky-50 placeholder:text-sky-200/30 outline-none focus:border-primary/60'

export function Pill({ children, tone = 'cyan' }) {
  const tones = {
    cyan: 'bg-primary/12 text-primary border-primary/30',
    green: 'bg-secondary/12 text-secondary border-secondary/30',
    gold: 'bg-amber-400/12 text-amber-300 border-amber-400/30',
    dim: 'bg-white/5 text-sky-200/60 border-white/10',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] tracking-wide border ${tones[tone]}`}>
      {children}
    </span>
  )
}
