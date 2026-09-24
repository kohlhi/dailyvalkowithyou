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

const 圓周 = 2 * Math.PI * 86

export function Pomodoro() {
  const f = useFocus()
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

  return (
    <div className="focus-page">
      <div className="focus-ring-wrap">
        <svg className="focus-ring" viewBox="0 0 200 200" aria-hidden="true">
          <circle className="ring-bg" cx="100" cy="100" r="86" />
          <circle
            className={'ring-fill' + (f.phase === 'break' ? ' rest' : '')}
            cx="100"
            cy="100"
            r="86"
            strokeDasharray={圓周}
            strokeDashoffset={圓周 * (1 - 走完)}
          />
        </svg>
        <div className="focus-mid">
          <span className="focus-time mono">
            {f.phase === 'idle' ? 格式(f.focusMin * 60_000) : 格式(剩)}
          </span>
          <span className="focus-phase">
            {f.phase === 'focus' ? '專注中' : f.phase === 'break' ? '休息一下' : '準備好了嗎'}
          </span>
        </div>
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

          <button
            className="pill"
            onClick={() => {
              sfx.tap()
              // 趁這一下的點擊把鈴聲解鎖，並開始播聽不見的音訊保住頁面，
              // 時間到的時候已經沒有手勢可以做這些了
              開始守著()
              focus.開始專注()
            }}
          >
            開始專注
          </button>
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
                : '挑一個長度，我陪你坐著'}
        </p>
      </div>

      <p className="hint mono">
        今天完成 {輪數} 輪
        <br />
        計時靠時鐘算，關掉 App 也不會亂
      </p>
    </div>
  )
}
