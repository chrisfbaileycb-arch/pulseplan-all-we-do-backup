export default function PulseWave({ className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 400 140" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="pw1" x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
            <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="pw2" x1="0" x2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round">
          <path
            className="wave-c"
            d="M0,86 C40,40 66,120 104,72 C142,24 168,116 208,66 C248,16 276,110 314,70 C352,30 378,92 400,76"
            stroke="url(#pw2)"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <path
            className="wave-b"
            d="M0,78 C42,52 64,108 106,64 C148,20 170,108 210,60 C250,12 274,104 316,64 C356,26 380,86 400,70"
            stroke="url(#pw1)"
            strokeWidth="2"
            opacity="0.7"
          />
          <path
            className="wave-a"
            d="M0,92 C44,60 70,124 108,78 C146,32 172,124 212,70 C252,18 278,116 318,74 C356,34 382,98 400,80"
            stroke="url(#pw1)"
            strokeWidth="3"
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_50%,rgba(34,211,238,0.18),transparent_70%)]" />
    </div>
  )
}
