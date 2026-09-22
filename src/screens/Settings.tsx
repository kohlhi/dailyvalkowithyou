import { useRef, useState } from 'react'
import type { Prefs } from '../types'
import { actions, useStore } from '../store'
import { levelInfo } from '../level'
import { allImageIds, displayName } from '../stage'
import { sfx } from '../sound'
import { BookIcon, DiceIcon, GiftIcon, MuteIcon, PencilIcon, PlusIcon, SoundIcon, SparkleIcon, SmileyIcon } from '../Icons'

const FEEDBACK: { key: keyof Prefs; label: string; hint: string; Icon: typeof SoundIcon }[] = [
  { key: 'confirm', label: '完成前先確認', hint: '點任務後由小人詢問一次', Icon: SmileyIcon },
  { key: 'greet', label: '開啟時打招呼', hint: '隔一段時間再開啟才會出現', Icon: SmileyIcon },
  { key: 'sound', label: '音效', hint: '完成任務與升級的聲音', Icon: SoundIcon },
  { key: 'animation', label: '特效動畫', hint: '星星爆開與卡片彈跳', Icon: SparkleIcon },
  { key: 'events', label: '每日隨機事件', hint: '開啟 App 時可能遇到額外任務', Icon: DiceIcon },
  { key: 'reward', label: '每日達成獎勵圖', hint: '當日每日任務全完成時播放', Icon: GiftIcon },
]

export function Settings({
  onToast,
  onEditIdentity,
  onEvents,
  onTutorial,
}: {
  onToast: (m: string) => void
  onEditIdentity: (id: string) => void
  onEvents: () => void
  onTutorial: () => void
}) {
  const s = useStore()
  const importRef = useRef<HTMLInputElement>(null)
  const [newIdentity, setNewIdentity] = useState('')
  const [busy, setBusy] = useState(false)

  const addIdentity = () => {
    const n = newIdentity.trim()
    if (!n) return
    const id = actions.addIdentity(n)
    setNewIdentity('')
    onEditIdentity(id)
  }

  const toggle = (key: keyof Prefs) => {
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
      a.download = `daily-quest-${new Date().toISOString().slice(0, 10)}.json`
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
    <div className="screen settings">
      <section className="block">
        <h2 className="block-title">使用者名</h2>
        <input
          className="text-input"
          value={s.name}
          maxLength={24}
          placeholder="BROKEN SWORDS"
          onChange={(e) => actions.setName(e.target.value)}
        />
      </section>

      <section className="block">
        <h2 className="block-title">
          回饋與功能 <span className="mono small">都可單獨關掉</span>
        </h2>
        <div className="stack">
          {FEEDBACK.map(({ key, label, hint, Icon }) => {
            const on = s.prefs[key]
            return (
              <button
                key={key}
                className={'toggle' + (on ? ' on' : '')}
                onClick={() => toggle(key)}
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
          <button className="ghost" onClick={onEvents}>
            <DiceIcon size={18} /> 編輯事件池（{s.events.length}）
          </button>
          <button className="ghost" onClick={onTutorial}>
            <BookIcon size={18} /> 重看使用教學
          </button>
        </div>
      </section>

      <section className="block">
        <h2 className="block-title">
          身份 <span className="mono small">各自的圖庫、寄語、技能與等級</span>
        </h2>
        <ul className="line-list">
          {s.identities.map((i) => (
            <li key={i.id} className={i.id === s.currentIdentityId ? 'current' : ''}>
              <span className="grow">{displayName(i)}</span>
              <span className="mono small">
                lv.{levelInfo(i.exp).level} · {i.stages.length} 階 · {allImageIds(i).length} 圖 · {i.skills.length} 技能
              </span>
              <button className="icon-btn small" aria-label="編輯身份" onClick={() => onEditIdentity(i.id)}>
                <PencilIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="add-row">
          <input
            className="text-input inline"
            placeholder="新身份，例如：繪師、健身"
            value={newIdentity}
            maxLength={20}
            onChange={(e) => setNewIdentity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addIdentity()
            }}
          />
          <button className="icon-btn" aria-label="新增身份" disabled={!newIdentity.trim()} onClick={addIdentity}>
            <PlusIcon />
          </button>
        </div>
      </section>

      <section className="block">
        <h2 className="block-title">資料</h2>
        <div className="stack">
          <button className="ghost" disabled={busy} onClick={exportData}>
            匯出備份 (含圖片)
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
      </section>

      <section className="block">
        <h2 className="block-title">安裝到 iPhone</h2>
        <p className="help">
          用 Safari 開啟這個網址 → 點下方「分享」→「加入主畫面」。之後就能像 App 一樣全螢幕使用，離線也能開。
          資料存在手機本機，換手機前記得先匯出備份。
        </p>
      </section>
    </div>
  )
}
