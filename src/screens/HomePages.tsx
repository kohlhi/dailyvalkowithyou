import { useLayoutEffect, useRef, useState } from 'react'
import { Home } from './Home'
import { Pomodoro } from './Pomodoro'
import { Lofi } from './Lofi'
import { Notes } from './Notes'
import { sfx } from '../sound'

/**
 * 首頁其實是四頁，左右滑動切換：記事本在主頁左邊，番茄鐘、陪伴在右邊。
 * 打開時停在主頁，所以一開始要先把軌道捲到第二頁。
 * 底部分頁列管的是「日 / 週 / 成就」，跟這裡是兩個不同的方向，
 * 所以下面放了有字的切換列，不用只靠小圓點讓人猜。
 */
const 頁籤 = ['記事本', '主頁', '番茄鐘', '陪伴']
const 主頁 = 1

export function HomePages({
  intro,
  onIntroSeen,
  onSwitch,
  onEvent,
}: {
  intro: string | null
  onIntroSeen: () => void
  onSwitch: () => void
  onEvent: () => void
}) {
  const 軌道 = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(主頁)

  // 畫面畫出來之前就捲到主頁，不然會先閃一下記事本
  useLayoutEffect(() => {
    const el = 軌道.current
    if (el) el.scrollLeft = 主頁 * el.clientWidth
  }, [])

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
          <Notes />
        </div>
        <div className="home-page">
          <Home intro={intro} onIntroSeen={onIntroSeen} onSwitch={onSwitch} onEvent={onEvent} />
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
