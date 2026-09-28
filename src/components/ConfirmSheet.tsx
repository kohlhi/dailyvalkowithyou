import { useState } from 'react'
import type { Identity, Task } from '../types'
import { say } from '../台詞'
import { Hero } from './Hero'

/** 等待確認的動作 */
export type Pending = { kind: 'task'; task: Task } | { kind: 'step'; task: Task; index: number }

interface Lines {
  ask: string
  note: string | null
  yes: string
}

/** 按鈕與小字維持固定寫法；問句交給小狼說（台詞在 內容.ts），沒有台詞時用原本的句子 */
export function askText(p: Pending, identity: Identity): Lines {
  const t = p.task
  if (p.kind === 'step') {
    const step = t.steps[p.index] ?? ''
    const left = t.stepsDone.filter((_, i) => i !== p.index && !t.stepsDone[i]).length
    if (left === 0) {
      return {
        ask: say(identity, '最後一步', { 任務: t.title, 步驟: step }) ?? `最後一個步驟了，「${t.title}」就此完成？`,
        note: `完成後拿到 ${t.exp} exp，而且不能取消`,
        yes: '完成！',
      }
    }
    return {
      ask: say(identity, '步驟', { 任務: t.title, 步驟: step }) ?? `步驟「${step}」完成了嗎？`,
      note: '打勾之後就不能取消了',
      yes: '打勾',
    }
  }

  if (t.target > 1) {
    const next = t.progress + 1
    if (next < t.target) {
      return {
        ask: say(identity, '記一次', { 任務: t.title, 次數: next, 還差: t.target - next }) ?? `「${t.title}」要記上一次嗎？`,
        note: `記完會變成 ${next}/${t.target}`,
        yes: '記一次',
      }
    }
    return {
      ask: say(identity, '最後一次', { 任務: t.title, 次數: next, 還差: 0 }) ?? `這是最後一次，「${t.title}」就完成了！`,
      note: `完成後拿到 ${t.exp} exp，而且不能取消`,
      yes: '完成！',
    }
  }
  return {
    ask: say(identity, '確認', { 任務: t.title, exp: t.exp }) ?? `「${t.title}」確定完成了嗎？`,
    note: `完成後拿到 ${t.exp} exp，而且不能取消`,
    yes: '完成了！',
  }
}

export function ConfirmSheet({
  pending,
  identity,
  onYes,
  onNo,
}: {
  pending: Pending
  identity: Identity
  onYes: () => void
  onNo: () => void
}) {
  // 問句只抽一次，重新渲染不會換句
  const [{ ask, note, yes }] = useState(() => askText(pending, identity))
  return (
    <div className="backdrop" onClick={onNo}>
      <div className="modal confirm" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-top">
          <Hero identity={identity} className="confirm-hero" />
          <div className="confirm-say">
            <p className="confirm-ask">{ask}</p>
            {note && <p className="confirm-note mono">{note}</p>}
          </div>
        </div>
        <div className="confirm-actions">
          <button className="ghost" onClick={onNo}>
            還沒
          </button>
          <button className="pill wide confirm-yes" onClick={onYes} autoFocus>
            {yes}
          </button>
        </div>
      </div>
    </div>
  )
}
