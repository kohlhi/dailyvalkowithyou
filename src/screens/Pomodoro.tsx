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

const 圓周 = 2 * Math.PI * 118

export function Pomodoro() {
  const f = useFocus()
  const s = useStore()
  // 每 250ms 重畫一次。真正的時間來源是 f.endsAt，這裡只是讓畫面跟上。
  const [, 重畫] = useReducer((n: number) => n + 1, 0)
  const [許可, 設許可] = useState<通知狀態型>(() => 通知狀態())

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
  const [分, 秒] = 顯示.split(':')
  const 跑著 = f.phase !== 'idle'

  const 開始 = () => {
    sfx.tap()
    // 趁這一下的點擊把鈴聲解鎖，並開始播聽不見的音訊保住頁面，
    // 時間到的時候已經沒有手勢可以做這些了
    開始守著()
    focus.開始專注()
  }

  return (
    <div className="focus-page">
      {/* 儀表盤：外圈刻度在計時時會轉，左邊是倒數，中間橘紅色的圓是開始按鈕 */}
      <div className={'dial' + (跑著 && s.prefs.animation ? ' running' : '') + (f.phase === 'break' ? ' rest' : '')}>
        <svg className="dial-svg" viewBox="0 0 340 340" aria-hidden="true">
          <circle className="dial-face" cx="170" cy="170" r="164" />
          {/* 最外圈：長短不一的弧線與幾塊粗黑條，順時針慢轉 */}
          <g className="dial-spin cw">
            <circle className="dial-arc thin" cx="170" cy="170" r="154" strokeDasharray="70 16 10 34 120 22 6 40 90 18 30 60 14 50 140 30" />
            <circle className="dial-arc bold" cx="170" cy="170" r="154" strokeDasharray="30 260 16 330 22 297" />
          </g>
          {/* 第二圈：細刻度，逆時針轉 */}
          <g className="dial-spin ccw">
            <circle className="dial-ticks" cx="170" cy="170" r="136" strokeDasharray="1.2 6" />
            <circle className="dial-ticks long" cx="170" cy="170" r="136" strokeDasharray="1.6 69.6" />
          </g>
          {/* 進度：走完多少，從正上方開始 */}
          <circle className="dial-track" cx="170" cy="170" r="118" />
          <circle
            className="dial-progress"
            cx="170"
            cy="170"
            r="118"
            strokeDasharray={圓周}
            strokeDashoffset={圓周 * (1 - 走完)}
          />
          {/* 內圈虛線，順時針轉得比較快 */}
          <g className="dial-spin cw fast">
            <circle className="dial-arc dash" cx="170" cy="170" r="100" strokeDasharray="3 7" />
          </g>
          <text className="dial-label" x="170" y="34" textAnchor="middle">
            FOCUS {f.focusMin} · BREAK {f.breakMin}
          </text>
          <text className="dial-label" x="170" y="318" textAnchor="middle">
            ROUND {String(輪數).padStart(2, '0')}
          </text>
        </svg>

        <div className="dial-count">
          <span className="dial-min">{分}</span>
          <span className="dial-sec mono">{秒} 秒</span>
          <span className="dial-sub mono">{f.phase === 'focus' ? '專注中' : f.phase === 'break' ? '休息中' : '準備好了嗎'}</span>
        </div>

        {f.phase === 'idle' ? (
          <button className="dial-core" onClick={開始}>
            <span>開始</span>
            <span>專注</span>
          </button>
        ) : (
          <div className="dial-core busy" aria-live="polite">
            <span className="mono">{Math.floor(走完 * 100)}%</span>
            <small>{f.phase === 'focus' ? '專注中' : '休息一下'}</small>
          </div>
        )}
      </div>

      {f.phase === 'idle' && (
        <>
          <div className="focus-pick">
            <span className="focus-pick-label">專注</span>
            <div className="focus-opts">
              {專注長度選項.map((m) => (
                <button
                  key={m}
                  className={'focus-opt mono' + (f.focusMin === m ? ' on' : '')}
                  onClick={() => {
                    sfx.tap()
                    focus.設定長度(m, f.breakMin)
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="focus-pick">
            <span className="focus-pick-label">休息</span>
            <div className="focus-opts">
              {休息長度選項.map((m) => (
                <button
                  key={m}
                  className={'focus-opt mono' + (f.breakMin === m ? ' on' : '')}
                  onClick={() => {
                    sfx.tap()
                    focus.設定長度(f.focusMin, m)
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {許可 !== '不支援' && (
            <button
              className={'focus-notify' + (許可 === '已允許' ? ' on' : '')}
              disabled={許可 !== '可以問'}
              onClick={() => {
                sfx.tap()
                void 要求許可().then(設許可)
              }}
            >
              {許可 === '已允許'
                ? '時間到會跳出橫幅 ✓'
                : 許可 === '被拒絕'
                  ? '橫幅被關掉了，要去手機設定裡開'
                  : '時間到時也跳出橫幅通知我'}
            </button>
          )}
        </>
      )}

      {f.phase === 'focus' && (
        <button
          className="ghost"
          onClick={() => {
            sfx.tap()
            focus.停止()
            收工()
          }}
        >
          放棄這一輪
        </button>
      )}

      {f.phase === 'break' && (
        <button
          className="pill"
          onClick={() => {
            sfx.tap()
            focus.停止()
            收工()
          }}
        >
          休息夠了，收工
        </button>
      )}

      <div className="focus-foot">
        <img className="focus-hero" src={清單角色圖} alt="" />
        <p className="foot-say">
          {f.phase === 'focus'
            ? '我在旁邊陪你，別分心'
            : f.phase === 'break'
              ? '起來走一走，喝口水'
              : 輪數 > 0
                ? `今天已經專注 ${輪數} 輪了，很可以`
                : '點中間的圓開始，我陪你坐著'}
        </p>
      </div>
    </div>
  )
}
