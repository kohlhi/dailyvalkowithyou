import { useState } from 'react'
import { ambience, 音色清單 } from '../ambience'
import type { 音色 } from '../ambience'
import { sfx } from '../sound'
import { 清單角色圖 } from '../內容'

export function Lofi() {
  // 聲音本身是模組層級的，切到別的畫面也會繼續放；
  // 這裡的 state 只是畫面用，掛載時直接跟模組要現況。
  const [playing, setPlaying] = useState<音色 | null>(ambience.播放中)
  const [vol, setVol] = useState(ambience.音量)

  const 切換 = (id: 音色) => {
    sfx.tap()
    if (ambience.播放中 === id) {
      ambience.停止()
      setPlaying(null)
    } else {
      ambience.播放(id)
      setPlaying(id)
    }
  }

  return (
    <div className="lofi-page">
      <div className="lofi-list">
        {音色清單.map(({ id, 名稱, 說明 }) => {
          const on = playing === id
          return (
            <button key={id} className={'lofi-card' + (on ? ' on' : '')} onClick={() => 切換(id)}>
              <span className="lofi-wave" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="lofi-txt">
                <span className="lofi-name">{名稱}</span>
                <span className="lofi-desc">{說明}</span>
              </span>
              <span className="lofi-state mono">{on ? '播放中' : '播放'}</span>
            </button>
          )
        })}
      </div>

      <div className="lofi-vol">
        <span className="lofi-vol-label mono">音量</span>
        <input
          id="lofi-volume"
          className="lofi-slider"
          type="range"
          min={0}
          max={100}
          value={Math.round(vol * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100
            setVol(v)
            ambience.設音量(v)
          }}
        />
        <span className="lofi-vol-num mono">{Math.round(vol * 100)}</span>
      </div>

      <div className="focus-foot">
        <img className="focus-hero" src={清單角色圖} alt="" />
        <p className="foot-say">{playing ? '我也在聽，一起待著' : '想要一點聲音的話，挑一個'}</p>
      </div>

      <p className="hint mono">
        聲音是程式即時做出來的，不用網路也能放
        <br />
        手機鎖屏後聲音通常會停，這是網頁 App 的限制
      </p>
    </div>
  )
}
