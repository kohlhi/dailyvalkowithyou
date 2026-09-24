import { useRef, useState } from 'react'
import { Home } from './Home'
import { Pomodoro } from './Pomodoro'
import { Lofi } from './Lofi'
import { sfx } from '../sound'

/**
 * 首頁其實是三頁，左右滑動切換。
 * 底部分頁列管的是「日 / 週 / 成就」，跟這裡是兩個不同的方向，
 * 所以下面放了有字的切換列，不用只靠小圓點讓人猜。
 */
const 頁籤 = ['主頁', '番茄鐘', '陪伴']

export function HomePages({ onSwitch, onEvent }: { onSwitch: () => void; onEvent: () => void }) {
  const 軌道 = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  const 捲動時 = () => {
    const el = 軌道.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setPage(Math.max(0, Math.min(頁籤.length - 1, i)))
  }

  const 跳到 = (i: number) => {
    const el = 軌道.current
    if (!el) return
    sfx.tap()
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="home-pages">
      <div className="home-track" ref={軌道} onScroll={捲動時}>
        <div className="home-page">
          <Home onSwitch={onSwitch} onEvent={onEvent} />
        </div>
        <div className="home-page">
          <Pomodoro />
        </div>
        <div className="home-page">
          <Lofi />
        </div>
      </div>

      <div className="home-tabs" role="tablist">
        {頁籤.map((n, i) => (
          <button
            key={n}
            role="tab"
            aria-selected={i === page}
            className={'home-tab' + (i === page ? ' on' : '')}
            onClick={() => 跳到(i)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
