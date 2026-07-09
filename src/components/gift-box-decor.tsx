// Floating gift-box silhouettes used as page decor (registry page).
// Pure SVG so it scales crisply; low opacity + blur reads as a soft shadow.
export function GiftBoxDecor() {
  return (
    <>
      <GiftBox className="fixed -top-16 -left-10 h-[280px] w-[280px] float-a" fill="var(--wine)" opacity={0.10} blur={2} />
      <GiftBox className="fixed top-[18%] right-[-60px] h-[220px] w-[220px] float-b" fill="var(--cherry)" opacity={0.09} blur={1} ribbon="var(--wine)" />
      <GiftBox className="fixed top-[55%] left-[8%] h-[160px] w-[160px] float-c" fill="var(--rose)" opacity={0.14} blur={0} />
      <GiftBox className="fixed bottom-[-40px] right-[12%] h-[320px] w-[320px] float-a" fill="var(--sage)" opacity={0.12} blur={3} ribbon="var(--wine)" />
      <GiftBox className="fixed bottom-[20%] left-[38%] h-[120px] w-[120px] float-b" fill="var(--wine)" opacity={0.08} blur={0} />
    </>
  );
}

function GiftBox({ className = "", fill, ribbon, opacity = 0.12, blur = 0 }: { className?: string; fill: string; ribbon?: string; opacity?: number; blur?: number }) {
  const r = ribbon ?? fill;
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className={`pointer-events-none z-0 ${className}`}
      style={{ opacity, filter: blur ? `blur(${blur}px)` : undefined }}
    >
      {/* box body */}
      <rect x="24" y="70" width="152" height="110" rx="14" fill={fill} />
      {/* lid */}
      <rect x="16" y="56" width="168" height="28" rx="10" fill={fill} />
      {/* vertical ribbon */}
      <rect x="90" y="56" width="20" height="124" fill={r} opacity="0.75" />
      {/* horizontal ribbon */}
      <rect x="24" y="76" width="152" height="18" fill={r} opacity="0.75" />
      {/* bow */}
      <path d="M100 56 C 70 20, 40 40, 100 60 C 160 40, 130 20, 100 56 Z" fill={r} opacity="0.85" />
      <circle cx="100" cy="58" r="6" fill={fill} />
    </svg>
  );
}
