type P = { size?: number; className?: string }

const base = (size = 24, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
})

export const GridIcon = ({ size, className }: P) => (
  <svg {...base(size, className)} stroke="none">
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" fill="currentColor" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" fill="currentColor" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" fill="currentColor" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" fill="currentColor" />
  </svg>
)

export const SmileyIcon = ({ size, className }: P) => (
  <svg {...base(size, className)} stroke="none">
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <rect x="7.5" y="7.5" width="2.6" height="5" rx="1.3" className="hole" />
    <rect x="13.9" y="7.5" width="2.6" height="5" rx="1.3" className="hole" />
    <path d="M8 15.5c1.2 1.8 6.8 1.8 8 0" className="hole-stroke" />
  </svg>
)

export const SwordIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M19 5 9.5 14.5" />
    <path d="M19 5h-4.2M19 5v4.2" />
    <path d="M7.2 12.8l4 4" />
    <path d="M9.2 14.8 4.5 19.5" />
  </svg>
)

export const PotionIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M9 3h6" />
    <path d="M10 3v5.2L5.8 14.6A4.2 4.2 0 0 0 9.4 21h5.2a4.2 4.2 0 0 0 3.6-6.4L14 8.2V3" />
    <path d="M7 15h10" />
    <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const KeyIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="8" cy="15.5" r="4" />
    <path d="M11 12.5 20 3.5" />
    <path d="M17 6.5l2.5 2.5" />
    <path d="M14 9.5l2.5 2.5" />
  </svg>
)

export const PlusIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const MinusIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M5 12h14" />
  </svg>
)

export const CheckIcon = ({ size, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </svg>
)

export const BackIcon = ({ size, className }: P) => (
  <svg {...base(size, className)} strokeWidth={2.6}>
    <path d="M15 5.5 8.5 12l6.5 6.5" />
  </svg>
)

export const PencilIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" />
    <path d="m13 7 4 4" />
  </svg>
)

export const TrashIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

export const CloseIcon = ({ size, className }: P) => (
  <svg {...base(size, className)} strokeWidth={2.6}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const Sparkle = ({ size = 18, className }: P) => (
  <svg width={size} height={size} viewBox="-12 -12 24 24" className={className} aria-hidden="true">
    <path d="M0-12C2-4 4-2 12 0 4 2 2 4 0 12-2 4-4 2-12 0-4-2-2-4 0-12Z" fill="currentColor" />
  </svg>
)

/** 預設小人：可在「使用者偏好」換成自己的圖 */
export const DefaultHero = () => (
  <svg viewBox="0 0 220 240" className="hero-svg" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      {/* 劍（畫在身體後面） */}
      <path d="M147 152l22-22" />
      <path d="M152 163 84 231" strokeWidth="4" />
      <path d="M155 152 165 162 92 236 84 228 Z" fill="var(--paper)" strokeWidth="3" />
      <path d="M144 148l24 22" strokeWidth="5" />
      <circle cx="176" cy="130" r="6" fill="currentColor" />
      {/* 頭盔 */}
      <path d="M78 62c0-24 12-38 34-38s34 14 34 38v18H78V62Z" fill="var(--paper)" />
      <path d="M96 20l6 8M112 14v10M128 20l-6 8" />
      <rect x="86" y="48" width="52" height="9" rx="4" fill="currentColor" stroke="none" />
      <path d="M86 80h52v16c0 6-4 10-10 10h-32c-6 0-10-4-10-10V80Z" fill="var(--paper)" />
      <path d="M100 96h24" />
      {/* 身體 */}
      <path d="M70 108c10-8 74-8 84 0l6 44c-8 8-88 8-96 0l6-44Z" fill="currentColor" />
      {/* 右手握劍 */}
      <path d="M150 114c10 6 16 16 16 28" />
      <circle cx="160" cy="150" r="9" fill="var(--paper)" />
      {/* 盾 */}
      <path d="M52 110l40 8v34c-8 22-24 30-40 34-16-4-32-12-40-34v-34l40-8Z" fill="var(--paper)" />
      <path d="M52 124v52M32 146h40" />
      {/* 腿 */}
      <path d="M88 156v40c0 4-2 8-6 10h20c-2-2-2-6-2-10v-38" fill="var(--paper)" />
      <path d="M120 158v38c0 4 0 8 2 10h20c-4-2-6-6-6-10v-40" fill="var(--paper)" />
      <path d="M76 206h32M128 206h32" strokeWidth="4" />
    </g>
    <g fill="currentColor">
      <path d="M40 40c1.5-6 3-7.5 9-9-6-1.5-7.5-3-9-9-1.5 6-3 7.5-9 9 6 1.5 7.5 3 9 9Z" />
      <path d="M62 62c1-4 2-5 6-6-4-1-5-2-6-6-1 4-2 5-6 6 4 1 5 2 6 6Z" />
      <path d="M192 196c2-8 4-10 12-12-8-2-10-4-12-12-2 8-4 10-12 12 8 2 10 4 12 12Z" />
      <path d="M200 226c1-4 2-5 6-6-4-1-5-2-6-6-1 4-2 5-6 6 4 1 5 2 6 6Z" />
    </g>
  </svg>
)

export const FlameIcon = ({ size, className }: P) => (
  <svg {...base(size, className)} stroke="none">
    <path
      d="M12 2c.5 4 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.6 2-4.6.3 1.6 1.2 2.4 2.3 2.6C10.7 8.6 10.5 5 12 2Z"
      fill="currentColor"
    />
  </svg>
)

export const ImageIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 18 5-5 3 3 2.5-2.5L20 18" />
  </svg>
)

export const SoundIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
)

export const MuteIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
    <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" />
  </svg>
)

export const StepIcon = ({ size, className, done }: P & { done?: boolean }) => (
  <svg {...base(size, className)} strokeWidth={2.4}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill={done ? 'currentColor' : 'none'} />
    {done && <path d="m7.5 12.5 3 3 6-6.5" className="hole-stroke" strokeWidth={2.6} />}
  </svg>
)

export const DiceIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

export const GiftIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="3.5" y="9" width="17" height="11.5" rx="2.5" />
    <path d="M2.5 6.5h19V9h-19z" />
    <path d="M12 6.5v14" />
    <path d="M12 6.5C10.5 3 8.8 2.5 7.8 3.2c-1.2.9-.6 3.3 4.2 3.3Z" />
    <path d="M12 6.5c1.5-3.5 3.2-4 4.2-3.3 1.2.9.6 3.3-4.2 3.3Z" />
  </svg>
)

export const SparkleIcon = ({ size, className }: P) => (
  <svg {...base(size, className)} stroke="none">
    <path d="M12 2c1.6 6.6 2.4 7.4 9 9-6.6 1.6-7.4 2.4-9 9-1.6-6.6-2.4-7.4-9-9 6.6-1.6 7.4-2.4 9-9Z" fill="currentColor" />
  </svg>
)

export const BookIcon = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
    <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5V5.5Z" />
  </svg>
)
