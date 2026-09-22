import type { Identity } from '../types'
import { levelInfo } from '../level'
import { currentStage, stageIndex } from '../stage'
import { Sparkle } from '../Icons'
import { Hero } from './Hero'

/** 跨進新階段時的全螢幕進化動畫 */
export function EvolveOverlay({ identity, onClose }: { identity: Identity; onClose: () => void }) {
  const stage = currentStage(identity)
  const idx = stageIndex(identity)
  const prev = identity.stages[idx - 1]

  return (
    <div className="evolve" onClick={onClose}>
      <Sparkle size={40} className="lu-sp a" />
      <Sparkle size={24} className="lu-sp b" />
      <Sparkle size={34} className="lu-sp c" />
      <Sparkle size={18} className="lu-sp d" />

      <div className="ev-label mono">EVOLUTION</div>
      <Hero identity={identity} className="ev-hero" />

      <div className="ev-names">
        {prev && <span className="ev-old">{prev.name}</span>}
        {prev && <span className="ev-arrow">→</span>}
        <span className="ev-new">{stage.name}</span>
      </div>
      <div className="ev-sub mono">
        lv. {levelInfo(identity.exp).level} · 第 {idx + 1} 階段
      </div>
      <div className="reward-tap mono">點一下關閉</div>
    </div>
  )
}
