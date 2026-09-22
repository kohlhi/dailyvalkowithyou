import type { Identity, Task } from '../types'
import { Hero } from './Hero'

/** 等待確認的動作 */
export type Pending = { kind: 'task'; task: Task } | { kind: 'step'; task: Task; index: number }

interface Lines {
  ask: string
  note: string | null
  yes: string
}

export function askText(p: Pending): Lines {
  if (p.kind === 'step') {
    const step = p.task.steps[p.index] ?? ''
    const left = p.task.stepsDone.filter((_, i) => i !== p.index && !p.task.stepsDone[i]).length
    if (left === 0) {
      return {
        ask: `最後一個步驟了，「${p.task.title}」就此完成？`,
        note: `完成後拿到 ${p.task.exp} exp，而且不能取消`,
        yes: '完成！',
      }
    }
    return { ask: `步驟「${step}」完成了嗎？`, note: '打勾之後就不能取消了', yes: '打勾' }
  }

  const t = p.task
  if (t.target > 1) {
    const next = t.progress + 1
    if (next < t.target) {
      return { ask: `「${t.title}」要記上一次嗎？`, note: `記完會變成 ${next}/${t.target}`, yes: '記一次' }
    }
    return {
      ask: `這是最後一次，「${t.title}」就完成了！`,
      note: `完成後拿到 ${t.exp} exp，而且不能取消`,
      yes: '完成！',
    }
  }
  return {
    ask: `「${t.title}」確定完成了嗎？`,
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
  const { ask, note, yes } = askText(pending)
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
