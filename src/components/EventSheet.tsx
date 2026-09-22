import type { Identity, RandomEvent } from '../types'
import { Sparkle } from '../Icons'
import { Hero } from './Hero'

/** 今日隨機事件：接取後會變成當天限定的每日任務 */
export function EventSheet({
  event,
  identity,
  onAccept,
  onDecline,
  onClose,
}: {
  event: RandomEvent
  identity: Identity
  onAccept: () => void
  /** 今天算了：這一天不再提起 */
  onDecline: () => void
  /** 點外框關掉：待會還可以從首頁的提示再打開 */
  onClose: () => void
}) {
  const exp = event.rare ? event.exp * 2 : event.exp
  return (
    <div className="backdrop" onClick={onClose}>
      <div className={'modal event' + (event.rare ? ' rare' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="event-head mono">
          <Sparkle size={14} />
          {event.rare ? '稀有事件' : '今日事件'}
          <Sparkle size={14} />
        </div>

        <div className="confirm-top">
          <Hero identity={identity} className="confirm-hero" />
          <div className="confirm-say">
            <p className="confirm-ask">路上遇到一件事</p>
            <p className="confirm-note mono">接取後今天內完成就有 exp</p>
          </div>
        </div>

        <div className="event-card">
          <span className="event-title">{event.title}</span>
          <span className="event-exp mono">+{exp} exp</span>
        </div>

        <div className="confirm-actions">
          <button className="ghost" onClick={onDecline}>
            今天算了
          </button>
          <button className="pill wide" onClick={onAccept}>
            接下任務
          </button>
        </div>
      </div>
    </div>
  )
}
