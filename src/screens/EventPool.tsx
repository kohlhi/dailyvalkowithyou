import { useState } from 'react'
import type { RandomEvent } from '../types'
import { actions, useStore } from '../store'
import { EXP_OPTIONS } from '../level'
import { displayName } from '../stage'
import { CloseIcon, PlusIcon, TrashIcon } from '../Icons'

const EMPTY = { title: '', exp: 300, rare: false, identityId: null as string | null }

/** 隨機事件池：每天開啟 App 時，會從符合目前身份的事件中抽一件 */
export function EventPool() {
  const s = useStore()
  const [draft, setDraft] = useState<typeof EMPTY & { id?: string }>(EMPTY)
  const [open, setOpen] = useState(false)

  const nameOf = (id: string | null) =>
    id === null ? '所有身份' : (() => {
      const found = s.identities.find((i) => i.id === id)
      return found ? displayName(found) : '?'
    })()

  const edit = (e: RandomEvent) => {
    setDraft({ id: e.id, title: e.title, exp: e.exp, rare: e.rare, identityId: e.identityId })
    setOpen(true)
  }

  const submit = () => {
    const title = draft.title.trim()
    if (!title) return
    actions.saveEvent({ ...draft, title, exp: Math.max(0, Math.floor(draft.exp) || 0) })
    setDraft(EMPTY)
    setOpen(false)
  }

  return (
    <div className="screen settings">
      <p className="help">
        每天開啟 App 時，有機會從這個池子抽出一件事。接下後會變成當天限定的每日任務，沒完成隔天就消失。
        稀有事件出現機率較低，但 exp 加倍。
      </p>

      <section className="block">
        <h2 className="block-title">
          事件池 <span className="mono small">{s.events.length}</span>
          <button
            className="icon-btn small"
            aria-label="新增事件"
            onClick={() => {
              setDraft(EMPTY)
              setOpen(true)
            }}
          >
            <PlusIcon size={18} />
          </button>
        </h2>

        {s.events.length === 0 && <p className="help">池子是空的，不會再出現隨機事件。</p>}

        <ul className="manage-list">
          {s.events.map((e) => (
            <li key={e.id} className={e.rare ? 'rare-row' : ''}>
              <button className="manage-main" onClick={() => edit(e)}>
                <span className="manage-title">
                  {e.rare && <span className="rare-tag mono">稀有</span>}
                  {e.title}
                </span>
                <span className="mono small">
                  +{e.rare ? e.exp * 2 : e.exp} exp · {nameOf(e.identityId)}
                </span>
              </button>
              <button
                className="icon-btn small"
                aria-label="刪除事件"
                onClick={() => {
                  if (confirm(`刪除事件「${e.title}」？`)) actions.deleteEvent(e.id)
                }}
              >
                <TrashIcon size={18} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {open && (
        <div className="backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <h2 className="block-title">
              {draft.id ? '編輯事件' : '新增事件'}
              <button className="icon-btn small" aria-label="關閉" onClick={() => setOpen(false)}>
                <CloseIcon size={16} />
              </button>
            </h2>

            <input
              className="text-input"
              placeholder="事件內容，例如：出門散步 15 分鐘"
              value={draft.title}
              maxLength={40}
              autoFocus
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />

            <div className="seg">
              {EXP_OPTIONS.map((o) => (
                <button
                  key={o.exp}
                  className={'seg-btn' + (draft.exp === o.exp ? ' on' : '')}
                  onClick={() => setDraft({ ...draft, exp: o.exp })}
                >
                  {o.label}
                  <small className="mono">{o.exp}</small>
                </button>
              ))}
            </div>

            <div className="seg">
              <button
                className={'seg-btn' + (draft.identityId === null ? ' on' : '')}
                onClick={() => setDraft({ ...draft, identityId: null })}
              >
                所有身份
              </button>
              {s.identities.map((i) => (
                <button
                  key={i.id}
                  className={'seg-btn' + (draft.identityId === i.id ? ' on' : '')}
                  onClick={() => setDraft({ ...draft, identityId: i.id })}
                >
                  {displayName(i)}
                </button>
              ))}
            </div>

            <button
              className={'toggle' + (draft.rare ? ' on' : '')}
              onClick={() => setDraft({ ...draft, rare: !draft.rare })}
              aria-pressed={draft.rare}
            >
              <span className="toggle-label">
                <span className="toggle-text">
                  稀有事件
                  <small className="mono">機率較低，exp 加倍</small>
                </span>
              </span>
              <span className="knob" />
            </button>

            <button className="pill wide" onClick={submit} disabled={!draft.title.trim()}>
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
