import type { BadgeIcon, Tier } from '../achievements'
import {
  CheckIcon,
  DiceIcon,
  FlameIcon,
  GridIcon,
  KeyIcon,
  PotionIcon,
  SmileyIcon,
  Sparkle,
  SparkleIcon,
  SwordIcon,
} from '../Icons'

const GLYPH = {
  sword: SwordIcon,
  flame: FlameIcon,
  check: CheckIcon,
  potion: PotionIcon,
  star: Sparkle,
  sparkle: SparkleIcon,
  key: KeyIcon,
  dice: DiceIcon,
  smiley: SmileyIcon,
  grid: GridIcon,
} as const

/** 徽章：外框依等第變化，鎖住時只留輪廓 */
export function Badge({
  icon,
  tier,
  locked,
  size = 76,
}: {
  icon: BadgeIcon
  tier: Tier
  locked?: boolean
  size?: number
}) {
  const Glyph = GLYPH[icon] ?? SwordIcon
  const cls = `badge tier${tier}` + (locked ? ' locked' : '')
  return (
    <span className={cls} style={{ width: size, height: size }}>
      <span className="badge-ring" />
      {tier === 3 && <span className="badge-ring outer" />}
      <Glyph size={Math.round(size * 0.42)} />
      {locked && <span className="badge-lock">?</span>}
    </span>
  )
}
