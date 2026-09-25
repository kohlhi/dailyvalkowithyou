import { useRef, useState } from 'react'
import {
  CalendarIcon,
  CheckIcon,
  DiceIcon,
  GiftIcon,
  Sparkle,
  StarIcon,
  StepIcon,
  TrophyIcon,
} from '../Icons'

interface Card {
  title: string
  body: string
  art: () => React.ReactElement
}

/** 教學圖卡裡的讀書小狼 */
const WOLF = '/heroes/valko-study-1.webp'

const Wolf = ({ className = '' }: { className?: string }) => (
  <img className={'tut-wolf ' + className} src={WOLF} alt="讀書小狼" draggable={false} />
)

const CARDS: Card[] = [
  {
    title: '每天都是與小狼一起變強的冒險',
    body: '自由設定自己的目標，完成就拿經驗值。小狼會跟著你一起升級，為每天做的事都會留下痕跡。',
    art: () => (
      <div className="tut-art tut-hero">
        <Sparkle size={26} className="tut-sp a" />
        <Sparkle size={16} className="tut-sp b" />
        <Sparkle size={30} className="tut-sp c" />
        <Wolf />
        <div className="tut-exp mono">
          <span>lv.1</span>
          <span className="tut-bar">
            <i />
          </span>
          <span>+300 exp</span>
        </div>
      </div>
    ),
  },
  {
    title: '三種任務，各有節奏',
    body: '星星是每日任務，每天 00:00 重置。月曆是週任務，每週一重置。獎盃是成就，完成後永久保留。',
    art: () => (
      <div className="tut-art tut-tabs">
        <span className="tut-col">
          <span className="tut-circle on">
            <StarIcon size={30} />
          </span>
          <span className="tut-cap mono">00:00</span>
        </span>
        <span className="tut-col">
          <span className="tut-circle">
            <CalendarIcon size={30} />
          </span>
          <span className="tut-cap mono">每週一</span>
        </span>
        <span className="tut-col">
          <span className="tut-circle">
            <TrophyIcon size={30} />
          </span>
          <span className="tut-cap mono">永久</span>
        </span>
      </div>
    ),
  },
  {
    title: '完成任務後點一下，小狼會先問你',
    body: '確認之後才算完成，而且完成後不能取消。有次數的任務要點滿，有步驟的任務要逐項打勾。',
    art: () => (
      <div className="tut-art tut-stack">
        <div className="tut-ask">
          <Wolf className="small" />
          <span className="tut-bubble">確定完成了嗎？</span>
        </div>
        <div className="tut-card done">
          <span>喝 2500ml 的水</span>
          <CheckIcon size={24} />
        </div>
        <div className="tut-card">
          <span>運動 3 次</span>
          <b className="mono">2/3</b>
        </div>
        <div className="tut-card">
          <span>整理房間</span>
          <span className="tut-steps">
            <StepIcon size={18} done />
            <StepIcon size={18} done />
            <StepIcon size={18} />
          </span>
        </div>
      </div>
    ),
  },
  {
    title: '身份與技能',
    body: '不同目標的小狼各是一個身份，和不同目標的小狼一起努力升級吧。任務可以指定給某個小狼，完成時對應的技能也會一起升等。',
    art: () => (
      <div className="tut-art tut-chips">
        <Wolf className="small" />
        <div className="tut-row">
          <span className="tut-pill on">假裝在讀書的狼</span>
          <span className="tut-pill">抖著拿啞鈴的狼</span>
        </div>
        <div className="tut-row">
          <span className="tut-chip">
            專注 <b>lv.4</b>
          </span>
          <span className="tut-chip">
            智力 <b>lv.2</b>
          </span>
          <span className="tut-chip">
            持續 <b>lv.3</b>
          </span>
        </div>
      </div>
    ),
  },
  {
    title: '事件、獎勵與徽章',
    body: '每天開啟有機會遇到小狼給你的額外任務。當天的每日任務全部清空時，小狼會一起來慶祝。累積的紀錄還會自動變成徽章，收在任務總覽的徽章櫃裡。',
    art: () => (
      <div className="tut-art tut-trio">
        <span className="tut-col">
          <span className="tut-circle">
            <DiceIcon size={30} />
          </span>
          <span className="tut-cap">事件</span>
        </span>
        <span className="tut-col">
          <span className="tut-circle">
            <GiftIcon size={30} />
          </span>
          <span className="tut-cap">慶祝</span>
        </span>
        <span className="tut-col">
          <span className="tut-circle">
            <TrophyIcon size={30} />
          </span>
          <span className="tut-cap">徽章</span>
        </span>
        <Wolf className="corner" />
      </div>
    ),
  },
]

/** 第一次使用的五張圖卡教學，之後可在使用者偏好重看 */
export function Tutorial({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const last = i >= CARDS.length - 1

  const goto = (n: number) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="tutorial">
      <div className="tut-top">
        <span className="mono small">
          {i + 1} / {CARDS.length}
        </span>
        <button className="tut-skip mono" onClick={onDone}>
          跳過
        </button>
      </div>

      <div
        className="tut-track"
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget
          const n = Math.round(el.scrollLeft / el.clientWidth)
          if (n !== i) setI(n)
        }}
      >
        {CARDS.map((c) => (
          <section className="tut-page" key={c.title}>
            <c.art />
            <h2 className="tut-title">{c.title}</h2>
            <p className="tut-body">{c.body}</p>
          </section>
        ))}
      </div>

      <div className="tut-dots">
        {CARDS.map((c, n) => (
          <button
            key={c.title}
            className={'tut-dot' + (n === i ? ' on' : '')}
            aria-label={`第 ${n + 1} 張`}
            onClick={() => goto(n)}
          />
        ))}
      </div>

      <button className="pill wide" onClick={() => (last ? onDone() : goto(i + 1))}>
        {last ? '開始冒險' : '下一張'}
      </button>
    </div>
  )
}
