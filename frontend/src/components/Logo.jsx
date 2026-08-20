// Reusable Techin By Raj logo — custom ascending-candlestick monogram.
export function LogoMark({ size = 36, className = "" }) {
  return (
    <span
      className={`grid place-items-center rounded-lg bg-[#E2FF4A] shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Techin By Raj logo"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        {/* ascending candlesticks */}
        <g stroke="#050505" strokeWidth="2.1" strokeLinecap="round">
          <line x1="5" y1="15" x2="5" y2="21" />
          <line x1="12" y1="9" x2="12" y2="18" />
          <line x1="19" y1="3" x2="19" y2="14" />
        </g>
        <g fill="#050505">
          <rect x="3.4" y="15.5" width="3.2" height="4.2" rx="0.7" />
          <rect x="10.4" y="10" width="3.2" height="6.2" rx="0.7" />
          <rect x="17.4" y="4.4" width="3.2" height="7.4" rx="0.7" />
        </g>
        {/* trend arrow */}
        <path d="M4 19 L11 12 L15 15 L21 6" stroke="#050505" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
      </svg>
    </span>
  );
}

export function LogoWordmark() {
  return (
    <span className="font-display font-extrabold text-lg tracking-tight leading-none">
      Techin<span className="text-[#E2FF4A]">.</span>
      <span className="block text-[9px] font-mono tracking-[0.3em] text-zinc-500 uppercase">by Raj</span>
    </span>
  );
}
