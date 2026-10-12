import { useEffect, useReducer, useState } from 'react'
import {
  focus,
  useFocus,
  剩餘,
  格式,
  今日輪數,
  專注長度選項,
  休息長度選項,
} from '../focus'
import { sfx } from '../sound'
import { 開始守著, 響, 收工 } from '../chime'
import { 通知, 通知狀態, 要求許可 } from '../notify'
import type { 通知狀態 as 通知狀態型 } from '../notify'
import { 清單角色圖 } from '../內容'
import { useStore } from '../store'
import { inherited } from '../stage'
import { useImageUrl } from '../images'


export function Pomodoro() {
  const f = useFocus()
  const s = useStore()
  const me = s.identities.find((i) => i.id === s.currentIdentityId) ?? s.identities[0]
  const 小狼 = useImageUrl(inherited(me, 'images')[0] ?? null)
  // 每 250ms 重畫一次。真正的時間來源是 f.endsAt，這裡只是讓畫面跟上。
  const [, 重畫] = useReducer((n: number) => n + 1, 0)
  const [許可, 設許可] = useState<通知狀態型>(() => 通知狀態())
  // 專注中按一下黃色方塊會先變成「確定？」，三秒內再按才真的放棄
  const [確認, 設確認] = useState(false)
  useEffect(() => {
    if (!確認) return
    const id = setTimeout(() => 設確認(false), 3000)
    return () => clearTimeout(id)
  }, [確認])

  useEffect(() => {
    const 檢查 = () => {
      const r = focus.結算()
      // 用 <audio> 的鈴聲而不是 sfx，sfx 是純 Web Audio，鎖屏時會被暫停
      if (r) 響()
      if (r === 'focus-done') void 通知('專注結束', '休息一下，起來走走')
      else if (r === 'break-done') {
        void 通知('休息結束', '準備好就再來一輪')
        // 整輪跑完就不用再保住頁面了，省點電
        收工()
      }
      重畫()
    }
    檢查()
    const id = window.setInterval(檢查, 250)
    // 從背景回來時立刻重算一次，不然畫面會停在離開前的秒數
    document.addEventListener('visibilitychange', 檢查)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', 檢查)
    }
  }, [])

  const 剩 = 剩餘(f)
  const 總長 = (f.phase === 'break' ? f.breakMin : f.focusMin) * 60_000
  const 走完 = f.phase === 'idle' ? 0 : 1 - 剩 / 總長
  const 輪數 = 今日輪數(f)
  const 顯示 = f.phase === 'idle' ? 格式(f.focusMin * 60_000) : 格式(剩)
  const 跑著 = f.phase !== 'idle'

  const 開始 = () => {
    sfx.tap()
    // 趁這一下的點擊把鈴聲解鎖，並開始播聽不見的音訊保住頁面，
    // 時間到的時候已經沒有手勢可以做這些了
    開始守著()
    focus.開始專注()
  }
  const 結束 = () => {
    sfx.tap()
    設確認(false)
    focus.停止()
    收工()
  }

  /** 黃色方塊：閒置是開始；專注中按兩下才放棄（免得手滑）；休息中是收工 */
  const 按方塊 = () => {
    if (f.phase === 'idle') return 開始()
    if (f.phase === 'break') return 結束()
    if (確認) return 結束()
    sfx.tap()
    設確認(true)
  }

  return (
    <div className="focus-page">
      {/* 唱片盒：唱片在下面轉（計時中），上半部的紙卡包裝上放全部的控制 */}
      <div className={'cd-case' + (跑著 && s.prefs.animation ? ' running' : '') + (f.phase === 'break' ? ' rest' : '')}>
        <div className="cd-disc" aria-hidden="true">
          <div className="cd-disc-art" />
          <span className="cd-arc a" />
          <span className="cd-arc b" />
          <span className="cd-hub" />
        </div>

        <span className="cd-mark l" aria-hidden="true" />
        <span className="cd-mark r" aria-hidden="true" />
        <span className="cd-side mono" aria-hidden="true">
          VALKO · STAY WITH ME · ROUND {String(輪數).padStart(2, '0')}
        </span>

        <div className="cd-band">
          <div className="cd-barcode" aria-hidden="true">
            <i />
            <span className="mono">0705 {String(f.focusMin).padStart(2, '0')}{String(f.breakMin).padStart(2, '0')} 2026</span>
          </div>
          <span className="cd-round mono">MS - {String(輪數).padStart(2, '0')}</span>

          <div className="cd-left">
            <span className="cd-title">VALKO — {f.phase === 'focus' ? 'FOCUS' : f.phase === 'break' ? 'BREAK' : 'READY'}</span>
            <span className="cd-count" aria-live="off">
              {顯示}
            </span>

            <div className="cd-pick">
              <span className="cd-pick-label mono">專注</span>
              {專注長度選項.map((m) => (
                <button
                  key={m}
                  className={'cd-opt mono' + (f.focusMin === m ? ' on' : '')}
                  disabled={跑著}
                  onClick={() => {
                    sfx.tap()
                    focus.設定長度(m, f.breakMin)
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="cd-pick">
              <span className="cd-pick-label mono">休息</span>
              {休息長度選項.map((m) => (
                <button
                  key={m}
                  className={'cd-opt mono' + (f.breakMin === m ? ' on' : '')}
                  disabled={跑著}
                  onClick={() => {
                    sfx.tap()
                    focus.設定長度(f.focusMin, m)
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {許可 !== '不支援' && (
              <button
                className={'cd-notify mono' + (許可 === '已允許' ? ' on' : '')}
                disabled={許可 !== '可以問'}
                onClick={() => {
                  sfx.tap()
                  void 要求許可().then(設許可)
                }}
              >
                <span className="cd-check" aria-hidden="true" />
                {許可 === '已允許' ? '時間到會跳出橫幅' : 許可 === '被拒絕' ? '橫幅被關掉了，去手機設定開' : '時間到跳出橫幅通知我'}
              </button>
            )}
          </div>

          <div className="cd-right">
            <img className="cd-print" src={小狼 ?? 清單角色圖} alt="" />
            <p className="cd-fine mono">
              {f.phase === 'focus'
                ? '專注中。我在旁邊陪你，別分心，時間到我會叫你。'
                : f.phase === 'break'
                  ? '休息一下。起來走一走、喝口水，回來再說。'
                  : 輪數 > 0
                    ? `今天已經專注 ${輪數} 輪了。挑好長度，按黃色方塊再來一輪。`
                    : '挑好專注和休息的長度，按黃色方塊開始，唱片就會轉起來。'}
            </p>
          </div>

          <button className={'cd-go' + (確認 ? ' armed' : '')} onClick={按方塊}>
            <span className="cd-go-icon" aria-hidden="true">
              {f.phase === 'idle' ? '▶' : f.phase === 'break' ? '✓' : '✕'}
            </span>
            <span className="cd-go-label">
              {f.phase === 'idle' ? '開始' : f.phase === 'break' ? '收工' : 確認 ? '確定？' : '放棄'}
            </span>
          </button>

          {/* 包裝下緣的進度：走完多少 */}
          <span className="cd-progress" style={{ width: `${Math.round(走完 * 100)}%` }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
