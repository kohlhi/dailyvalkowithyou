import { byId } from '../achievements'
import { Sparkle } from '../Icons'
import { Badge } from './Badge'

/** 解鎖成就時的全螢幕徽章動畫 */
export function BadgeOverlay({ id, note, onClose }: { id: string; note?: string; onClose: () => void }) {
  const a = byId.get(id)
  if (!a) return null

  return (
    <div className="badge-pop" onClick={onClose}>
      <Sparkle size={38} className="lu-sp a" />
      <Sparkle size={22} className="lu-sp b" />
      <Sparkle size={32} className="lu-sp c" />
      <Sparkle size={18} className="lu-sp d" />

      <div className="ev-label mono">ACHIEVEMENT</div>
      <div className="badge-stage">
        <Badge icon={a.icon} tier={a.tier} size={150} />
      </div>
      <div className="badge-name">{a.name}</div>
      <div className="badge-desc">{a.desc}</div>
      {note && <div className="badge-note mono">{note}</div>}
      <div className="reward-tap mono">點一下關閉</div>
    </div>
  )
}
