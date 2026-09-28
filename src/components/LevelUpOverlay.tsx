import { useState } from 'react'
import type { Identity } from '../types'
import { displayName } from '../stage'
import { say } from '../台詞'
import { Sparkle } from '../Icons'

/** 升級時的全螢幕畫面，下方加一句小狼的話 */
export function LevelUpOverlay({ identity, level, onClose }: { identity: Identity; level: number; onClose: () => void }) {
  // 只抽一次，重新渲染不會換句
  const [line] = useState(() => say(identity, '升級', { 等級: level }))
  return (
    <div className="levelup" onClick={onClose}>
      <Sparkle size={44} className="lu-sp a" />
      <Sparkle size={26} className="lu-sp b" />
      <Sparkle size={36} className="lu-sp c" />
      <Sparkle size={20} className="lu-sp d" />
      <div className="lu-text">LEVEL UP</div>
      <div className="lu-level mono">lv. {level}</div>
      <div className="lu-name">{displayName(identity)}</div>
      {line && <p className="ev-say lu-say">{line}</p>}
    </div>
  )
}
