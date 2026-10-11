import { useRef, useState } from 'react'
import type { Prefs } from '../types'
import { actions, useStore } from '../store'
import { sfx } from '../sound'
import { needsPermission, toggleTilt, useTiltEnabled } from '../tilt'
import {
  BookIcon,
  ChevronIcon,
  DiceIcon,
  GiftIcon,
  ImageIcon,
  MuteIcon,
  SmileyIcon,
  SoundIcon,
  SparkleIcon,
} from '../Icons'

const FEEDBACK: { key: keyof Prefs; label: string; hint: string; Icon: typeof SoundIcon }[] = [
  { key: 'confirm', label: '完成任務時確認', hint: '點任務後由角色詢問一次', Icon: SmileyIcon },
  { key: 'greet', label: '開啟時打招呼', hint: '隔一段時間再開啟才會出現', Icon: SmileyIcon },
  { key: 'sound', label: '音效', hint: '完成任務與升級的聲音', Icon: SoundIcon },
  { key: 'animation', label: '特效動畫', hint: '星星爆開與卡片彈跳', Icon: SparkleIcon },
  { key: 'events', label: '每日隨機事件', hint: '開啟 App 時可能遇到額外任務', Icon: DiceIcon },
  { key: 'reward', label: '每日達成獎勵圖', hint: '當日每日任務全完成時播放', Icon: GiftIcon },
]

type Section = 'feedback' | 'data' | 'install'

/** 右上角齒輪：設定。回饋與功能、教學、資料、安裝說明；名字與身份在笑臉的「使用者資訊」 */
export function Settings({
  onToast,
  onEvents,
  onTutorial,
}: {
  onToast: (m: string) => void
  onEvents: () => void
  onTutorial: () => void
}) {
  const s = useStore()
  const tilt = useTiltEnabled()
  const importRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<Section | null>(null)
  const [busy, setBusy] = useState(false)

  const toggleSection = (k: Section) => {
    sfx.tap()
    setOpen((o) => (o === k ? null : k))
  }



  const togglePref = (key: keyof Prefs) => {
    const next = !s.prefs[key]
    actions.setPref(key, next)
    if (key === 'sound') {
      sfx.enabled = next
      if (next) sfx.complete()
    } else if (next && s.prefs.sound) {
      sfx.tap()
    }
  }

  const exportData = async () => {
    setBusy(true)
    try {
      const blob = new Blob([await actions.exportJson()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `valko-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setBusy(false)
    }
  }

  const importData = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    const ok = await actions.importJson(await file.text())
    setBusy(false)
    onToast(ok ? '已匯入 ✦' : '檔案格式不對')
  }

  return (
    <div className="screen settings pref">

      <button
        className={'pref-row' + (open === 'feedback' ? ' open' : '')}
        onClick={() => toggleSection('feedback')}
      >
        <span className="pref-label">回饋與功能</span>
        <ChevronIcon size={20} className="pref-arrow" />
      </button>
      {open === 'feedback' && (
        <div className="pref-body">
          {FEEDBACK.map(({ key, label, hint, Icon }) => {
            const on = s.prefs[key]
            return (
              <button
                key={key}
                className={'toggle' + (on ? ' on' : '')}
                onClick={() => togglePref(key)}
                aria-pressed={on}
              >
                <span className="toggle-label">
                  {key === 'sound' && !on ? <MuteIcon size={20} /> : <Icon size={20} />}
                  <span className="toggle-text">
                    {label}
                    <small className="mono">{hint}</small>
                  </span>
                </span>
                <span className="knob" />
              </button>
            )
          })}
          <button
            className={'toggle' + (tilt ? ' on' : '')}
            onClick={async () => {
              const ok = await toggleTilt(!tilt)
              if (!ok) onToast('沒有拿到權限，可以到 iPhone 的設定裡重新允許')
              else if (s.prefs.sound) sfx.tap()
            }}
            aria-pressed={tilt}
          >
            <span className="toggle-label">
              <ImageIcon size={20} />
              <span className="toggle-text">
                背景視差
                <small className="mono">{needsPermission() ? '手機傾斜時背景跟著動，需要允許動作權限' : '手機傾斜或滑鼠移動時背景跟著動'}</small>
              </span>
            </span>
            <span className="knob" />
          </button>
          <button className="ghost" onClick={onEvents}>
            <DiceIcon size={18} /> 編輯每日事件池（{s.events.length}）
          </button>
        </div>
      )}


      <button className="pref-row" onClick={onTutorial}>
        <span className="pref-label">重看使用教學</span>
        <BookIcon size={20} className="pref-arrow" />
      </button>

      <button className={'pref-row' + (open === 'data' ? ' open' : '')} onClick={() => toggleSection('data')}>
        <span className="pref-label">資料</span>
        <ChevronIcon size={20} className="pref-arrow" />
      </button>
      {open === 'data' && (
        <div className="pref-body">
          <button className="ghost" disabled={busy} onClick={exportData}>
            匯出備份（含圖片）
          </button>
          <button className="ghost" disabled={busy} onClick={() => importRef.current?.click()}>
            匯入備份
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void importData(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button
            className="ghost danger"
            onClick={() => {
              if (confirm('確定要清除所有資料並重來嗎？')) {
                actions.resetAll()
                onToast('已重置')
              }
            }}
          >
            全部重置
          </button>
        </div>
      )}

      <button
        className={'pref-row' + (open === 'install' ? ' open' : '')}
        onClick={() => toggleSection('install')}
      >
        <span className="pref-label">安裝到手機</span>
        <ChevronIcon size={20} className="pref-arrow" />
      </button>
      {open === 'install' && (
        <div className="pref-body">
          <p className="help">
            <b>iPhone</b>：用 Safari 開這個網址，點下方的分享按鈕，選「加入主畫面」。
          </p>
          <p className="help">
            <b>Android</b>：用 Chrome 開這個網址，點右上角選單，選「安裝應用程式」或「加到主畫面」。
          </p>
          <p className="help">
            裝好之後就能像 App 一樣全螢幕使用，離線也能開，番茄鐘的橫幅通知也要裝好才會有。
            資料存在手機本機，換手機前記得先匯出備份。
          </p>
        </div>
      )}
    </div>
  )
}
