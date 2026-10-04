import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNotes, 記事本, 字數上限, 歪斜, 貼上時間 } from '../notes'
import type { 便條 } from '../notes'
import { sfx } from '../sound'
import { 清單角色圖 } from '../內容'
import { PlusIcon, TrashIcon } from '../Icons'

/** 首頁最左邊的記事本：一張張便條紙，隨手記、隨手撕 */
export function Notes() {
  const notes = useNotes()
  // 剛新增的那張要自動聚焦，讓使用者直接打字
  const [focusId, setFocusId] = useState<string | null>(null)

  const 新增 = () => {
    sfx.tap()
    setFocusId(記事本.新增())
  }

  return (
    <div className="notes-page">
      <div className="notes-head">
        <span className="notes-count mono">{notes.length > 0 ? `${notes.length} 張便條` : '記事本'}</span>
        <button className="notes-add" onClick={新增}>
          <PlusIcon size={18} />
          <span>貼一張</span>
        </button>
      </div>

      {notes.length > 0 ? (
        <div className="notes-grid">
          {notes.map((n) => (
            <Note key={n.id} note={n} autoFocus={n.id === focusId} onFocused={() => setFocusId(null)} />
          ))}
        </div>
      ) : (
        <button className="notes-empty" onClick={新增}>
          <PlusIcon size={28} />
          <span>點這裡貼第一張便條</span>
        </button>
      )}

      <div className="focus-foot">
        <img className="focus-hero" src={清單角色圖} alt="" />
        <p className="foot-say">
          {notes.length === 0 ? '想到什麼就先記下來，我幫你看著' : '記下來就不會忘了，做完就撕掉吧'}
        </p>
      </div>
    </div>
  )
}

function Note({ note, autoFocus, onFocused }: { note: 便條; autoFocus: boolean; onFocused: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // 刪除要按兩下：第一下變成「撕掉？」，免得手滑
  const [confirm, setConfirm] = useState(false)

  // 高度跟著內容長，不出現捲軸
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [note.text])

  useEffect(() => {
    if (!autoFocus) return
    ref.current?.focus()
    onFocused()
  }, [autoFocus, onFocused])

  useEffect(() => {
    if (!confirm) return
    const id = setTimeout(() => setConfirm(false), 2500)
    return () => clearTimeout(id)
  }, [confirm])

  return (
    <div className="note" style={{ rotate: `${歪斜(note.id)}deg` }}>
      <span className="note-tape" aria-hidden="true" />
      <textarea
        ref={ref}
        className="note-text"
        value={note.text}
        maxLength={字數上限}
        rows={2}
        placeholder="寫點什麼…"
        onChange={(e) => 記事本.改(note.id, e.target.value)}
        onBlur={() => 記事本.清空白(note.id)}
        aria-label="便條內容"
      />
      <div className="note-foot">
        <span className="note-time mono">{貼上時間(note.updatedAt)}</span>
        <button
          className={'note-del' + (confirm ? ' armed' : '')}
          // 按下去的瞬間 textarea 會失焦，空白便條會先被清掉，所以用 pointerdown 擋住失焦
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!confirm) {
              setConfirm(true)
              return
            }
            sfx.tap()
            記事本.刪(note.id)
          }}
          aria-label={confirm ? '確定撕掉這張便條' : '撕掉這張便條'}
        >
          {confirm ? '撕掉？' : <TrashIcon size={15} />}
        </button>
      </div>
    </div>
  )
}
