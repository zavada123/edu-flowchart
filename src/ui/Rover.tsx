/** Іскра, the Mars rover who guides the student. An original drawing. */
export const Rover = ({ size = 48, mood = "talk" }: { readonly size?: number; readonly mood?: "talk" | "happy" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="edu-fq-rover">
    <defs>
      <linearGradient id="edu-fq-rover-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fdba74" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
    </defs>
    {/* Mast with the camera head. */}
    <rect x="30" y="16" width="4" height="14" rx="2" fill="#94a3b8" />
    <rect className="edu-fq-rover-head" x="19" y="4" width="26" height="16" rx="7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
    {mood === "happy" ? (
      <>
        <path d="M24 13 q3 -4 6 0" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M34 13 q3 -4 6 0" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle className="edu-fq-rover-eye" cx="27" cy="12" r="3.2" fill="#0ea5e9" />
        <circle className="edu-fq-rover-eye" cx="37" cy="12" r="3.2" fill="#0ea5e9" />
      </>
    )}
    {/* Solar panel and body. */}
    <rect x="6" y="27" width="20" height="4" rx="1.5" fill="#3b82f6" />
    <rect x="10" y="30" width="44" height="16" rx="6" fill="url(#edu-fq-rover-body)" />
    <circle className="edu-fq-rover-light" cx="48" cy="36" r="2.5" fill="#fef08a" />
    <rect x="16" y="35" width="20" height="3" rx="1.5" fill="#fff7ed" opacity="0.7" />
    {/* Wheels. */}
    <rect x="12" y="46" width="40" height="3" rx="1.5" fill="#475569" />
    {[17, 32, 47].map((x) => (
      <g key={x}>
        <circle cx={x} cy="53" r="6.5" fill="#334155" />
        <circle cx={x} cy="53" r="2.5" fill="#cbd5e1" />
      </g>
    ))}
  </svg>
)
