import { useState } from 'react'
import { ambience, 音色清單, 項目id } from '../ambience'
import type { 項目 } from '../ambience'
import { sfx } from '../sound'
import { 清單角色圖, 自訂音樂 } from '../內容'

export function Lofi() {
  // 聲音本身是模組層級的，切到別的畫面也會繼續放；
  // 這裡的 state 只是畫面用，掛載時直接跟模組要現況。
  const [playing, setPlaying] = useState<string | null>(ambience.播放中)
  const [vol, setVol] = useState(ambience.音量)

  const 切換 = (項: 項目) => {
    sfx.tap()
    const id = 項目id(項)
    if (ambience.播放中 === id) {
      ambience.停止()
      setPlaying(null)
    } else {
      ambience.播放(項)
      setPlaying(id)
    }
  }

  const 卡片 = (項: 項目, 名稱: string, 副標: string) => {
    const id = 項目id(項)
    const on = playing === id
    return (
      <button key={id} className={'lofi-card' + (on ? ' on' : '')} onClick={() => 切換(項)}>
        <span className="lofi-wave" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="lofi-txt">
          <span className="lofi-name">{名稱}</span>
          <span className="lofi-desc">{副標}</span>
        </span>
        <span className="lofi-state mono">{on ? '播放中' : '播放'}</span>
      </button>
    )
  }

  return (
    <div className="lofi-page">
      {自訂音樂.length > 0 && <h2 className="lofi-group mono">音樂</h2>}
      {自訂音樂.length > 0 && (
        <div className="lofi-list">
          {自訂音樂.map((曲) => 卡片({ 種類: '音樂', 曲 }, 曲.名稱, 曲.作者 ?? '你放的音樂'))}
        </div>
      )}

      {自訂音樂.length > 0 && <h2 className="lofi-group mono">環境音</h2>}
      <div className="lofi-list">
        {音色清單.map(({ id, 名稱, 說明 }) => 卡片({ 種類: '合成', id }, 名稱, 說明))}
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
        環境音是程式即時做出來的，不用網路也能放
        <br />
        鎖屏後也會繼續放，鎖定畫面可以直接暫停
      </p>
    </div>
  )
}
