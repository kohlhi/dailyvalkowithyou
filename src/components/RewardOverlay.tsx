import { useMemo } from 'react'
import type { Identity } from '../types'
import { pick } from '../level'
import { displayName, inherited } from '../stage'
import { useImageUrl } from '../images'
import { Sparkle } from '../Icons'

/** 完成當日全部每日任務：全螢幕獎勵圖 */
export function RewardOverlay({ identity, onClose }: { identity: Identity; onClose: () => void }) {
  const rewards = inherited(identity, 'rewards')
  const id = useMemo(() => pick(rewards) ?? null, [rewards])
  const url = useImageUrl(id)

  return (
    <div className="reward" onClick={onClose}>
      <Sparkle size={40} className="lu-sp a" />
      <Sparkle size={24} className="lu-sp b" />
      <Sparkle size={32} className="lu-sp c" />
      <Sparkle size={18} className="lu-sp d" />

      <div className="reward-text">今日任務全數完成</div>
      {url ? (
        <img src={url} alt="" className="reward-img pop-in" />
      ) : (
        <div className="reward-fallback pop-in">
          <div className="reward-big mono">DAILY CLEAR</div>
          <p className="help">在「身份編輯 → 獎勵圖庫」放入自己的 gif，這裡就會播放。</p>
        </div>
      )}
      <div className="reward-name">{displayName(identity)}</div>
      <div className="reward-tap mono">點一下關閉</div>
    </div>
  )
}
