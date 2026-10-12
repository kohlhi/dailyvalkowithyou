import { useRef, useState } from 'react'
import { ambience, 音色清單, 項目id } from '../ambience'
import type { 項目 } from '../ambience'
import { sfx } from '../sound'
import { 自訂音樂 } from '../內容'
import { useStore } from '../store'
import { sceneLayers } from '../series'
import { inherited } from '../stage'
import { useImageUrl } from '../images'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from '../Icons'

interface 曲目 {
  項: 項目
  名稱: string
  副標: string
  標籤: string
}

/* 膠囊與音量弧線共用的座標：膠囊寬 100、高 128，下緣半圓的圓心在 (50, 78)，弧線半徑比膠囊大一圈 */
const CX = 50
const CY = 78
const R = 58

/** 音量 0～1 對應到弧線上的點：0 在左邊，經過底部，1 在右邊 */
function 弧上的點(v: number) {
  const a = Math.PI - Math.PI * v
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
}

/**
 * 陪伴頁：照音樂播放器的排版。上面是下緣圓弧的膠囊（小狼的房間＋正在播的名字），
 * 膠囊下緣的弧線是音量，拖得動；中間是曲目清單；最下面上一首／播放／下一首。
 * 聲音本身是模組層級的，切到別的畫面也會繼續放；這裡的 state 只是畫面用。
 */
export function Lofi() {
  const s = useStore()
  const me = s.identities.find((i) => i.id === s.currentIdentityId) ?? s.identities[0]
  const 背景 = sceneLayers(me)?.圖層.slice(0, 2) ?? []
  const 小狼 = useImageUrl(inherited(me, 'images')[0] ?? null)

  const 清單: 曲目[] = [
    ...自訂音樂.map((曲) => ({ 項: { 種類: '音樂', 曲 } as 項目, 名稱: 曲.名稱, 副標: 曲.作者 ?? '你放的音樂', 標籤: '音樂' })),
    ...音色清單.map(({ id, 名稱, 說明 }) => ({ 項: { 種類: '合成', id } as 項目, 名稱, 副標: 說明, 標籤: '環境音' })),
  ]

  const [playing, setPlaying] = useState<string | null>(ambience.播放中)
  const [選, 設選] = useState(() => Math.max(0, 清單.findIndex((c) => 項目id(c.項) === ambience.播放中)))
  const [vol, setVol] = useState(ambience.音量)
  const 弧 = useRef<SVGSVGElement>(null)

  const 目前 = 清單[選]

  const 播 = (i: number) => {
    sfx.tap()
    ambience.播放(清單[i].項)
    setPlaying(項目id(清單[i].項))
    設選(i)
  }
  const 停 = () => {
    sfx.tap()
    ambience.停止()
    setPlaying(null)
  }
  const 點曲目 = (i: number) => (playing === 項目id(清單[i].項) ? 停() : 播(i))
  const 換 = (d: number) => 播((選 + d + 清單.length) % 清單.length)

  const 調音量 = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = 弧.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    const a = Math.atan2(p.y - CY, p.x - CX)
    // 只認下半圈；手指跑到上半圈時貼齊最近的一端
    const v = a >= 0 ? (Math.PI - a) / Math.PI : p.x < CX ? 0 : 1
    const 新 = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100
    setVol(新)
    ambience.設音量(新)
  }

  const 起 = 弧上的點(0)
  const 到 = 弧上的點(vol)
  const 終 = 弧上的點(1)

  return (
    <div className="lofi-page">
      <div className="lofi-capsule-wrap">
        <div className="lofi-capsule">
          {背景.map((l, i) => (
            <img key={l.圖 + i} src={l.圖} alt="" />
          ))}
          {小狼 && <img className="lofi-capsule-hero" src={小狼} alt="" />}
          <div className="lofi-capsule-txt">
            <span className="lofi-now">{playing ? 目前?.名稱 : '還沒開始播'}</span>
            <span className="lofi-now-sub">{playing ? 目前?.副標 : '挑一個聲音，我陪你待著'}</span>
          </div>
        </div>

        {/* 音量弧線：從左邊經過底部到右邊，手指按著拖就能調 */}
        <svg
          ref={弧}
          className="lofi-arc"
          viewBox="0 0 100 128"
          role="slider"
          aria-label="音量"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(vol * 100)}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            調音量(e)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) 調音量(e)
          }}
          onKeyDown={(e) => {
            const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.05 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.05 : 0
            if (!d) return
            const 新 = Math.round(Math.min(1, Math.max(0, vol + d)) * 100) / 100
            setVol(新)
            ambience.設音量(新)
          }}
        >
          <path className="lofi-arc-track" d={`M ${起.x} ${起.y} A ${R} ${R} 0 0 0 ${終.x} ${終.y}`} />
          {vol > 0 && <path className="lofi-arc-fill" d={`M ${起.x} ${起.y} A ${R} ${R} 0 0 0 ${到.x} ${到.y}`} />}
          <circle className="lofi-arc-knob" cx={到.x} cy={到.y} r="3.2" />
        </svg>
      </div>

      <div className="lofi-vol-num mono">音量 {Math.round(vol * 100)}</div>

      <ul className="lofi-tracks">
        {清單.map((c, i) => {
          const on = playing === 項目id(c.項)
          return (
            <li key={項目id(c.項)}>
              <button className={'lofi-track' + (on ? ' on' : '')} onClick={() => 點曲目(i)}>
                <span className="lofi-track-name">{c.名稱}</span>
                {on ? (
                  <span className="lofi-wave" aria-label="播放中">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <span className="lofi-track-tag mono">{c.標籤}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="lofi-transport">
        <button className="lofi-skip" aria-label="上一個" onClick={() => 換(-1)}>
          <PrevIcon size={22} />
        </button>
        <button className="lofi-play" aria-label={playing ? '暫停' : '播放'} onClick={() => (playing ? 停() : 播(選))}>
          {playing ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
        </button>
        <button className="lofi-skip" aria-label="下一個" onClick={() => 換(1)}>
          <NextIcon size={22} />
        </button>
      </div>

      <p className="hint mono">環境音是程式即時做出來的，不用網路也能放 · 鎖屏後也會繼續</p>
    </div>
  )
}
