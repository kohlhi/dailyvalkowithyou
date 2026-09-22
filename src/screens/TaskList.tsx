import { useState } from 'react'
import type { Category, Task } from '../types'
import { actions, useStore } from '../store'
import type { TapResult } from '../store'
import type { Pending } from '../components/ConfirmSheet'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { 清單角色圖 } from '../內容'
import { CheckIcon, DiceIcon, PencilIcon, PlusIcon, Sparkle, StepIcon, TrashIcon } from '../Icons'

/** 清單底部小人說的話，依進度改變 */
function footLine(category: Category, done: number, total: number): string {
  if (total === 0) return '這裡還空空的，先新增一個任務吧'
  const left = total - done
  if (category === 'achievement') {
    if (left === 0) return '所有成就都解開了，該想新的目標了'
    return done === 0 ? `有 ${total} 個成就等著被解開` : `已經解開 ${done} 個了，繼續`
  }
  const span = category === 'daily' ? '今天' : '這週'
  if (left === 0) return `${span}全部清空了，去休息吧 ✦`
  if (done === 0) return `${span}還沒開始，挑一個下手`
  if (left === 1) return '只剩最後一個了'
  return `${span}還剩 ${left} 個`
}

const HINT: Record<Category, string> = {
  daily: '每天 00:00 重置',
  weekly: '每週一 00:00 重置',
  achievement: '成就永久保留 · 自動徽章在任務總覽',
}

export function TaskList({
  category,
  onAdd,
  onEdit,
  onResult,
}: {
  category: Category
  onAdd: () => void
  onEdit: (t: Task) => void
  onResult: (r: TapResult) => void
}) {
  const s = useStore()
  const me = s.identities.find((i) => i.id === s.currentIdentityId)
  const tasks = s.tasks.filter(
    (t) => t.category === category && (t.identityId === null || t.identityId === s.currentIdentityId),
  )
  const done = tasks.filter((t) => t.doneAt).length
  const [burst, setBurst] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  const run = (p: Pending) => {
    const r = p.kind === 'task' ? actions.tapTask(p.task.id) : actions.tapStep(p.task.id, p.index)
    if (r.completed) {
      setBurst(p.task.id)
      setTimeout(() => setBurst((b) => (b === p.task.id ? null : b)), 800)
    }
    onResult(r)
  }

  /** 開啟確認彈窗，或在關閉確認時直接執行 */
  const request = (p: Pending) => {
    if (s.prefs.confirm) setPending(p)
    else run(p)
  }

  const skillName = (id: string | null) => me?.skills.find((k) => k.id === id)?.name ?? null

  return (
    <div className="screen tasks">
      <div className="list">
        {tasks.length === 0 && <p className="empty">還沒有任務，新增一個吧 ✦</p>}
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            skill={skillName(t.skillId)}
            burst={burst === t.id}
            animate={s.prefs.animation}
            onTap={() => request({ kind: 'task', task: t })}
            onStep={(i) => request({ kind: 'step', task: t, index: i })}
            onEdit={() => onEdit(t)}
          />
        ))}
        <button className="task-card add" onClick={onAdd}>
          <PlusIcon size={26} />
          <span>新增任務</span>
        </button>
      </div>
      {me && (
        <div className="list-foot">
          <img className="foot-hero" src={清單角色圖} alt="" />
          <p className="foot-say">{footLine(category, done, tasks.length)}</p>
        </div>
      )}

      <p className="hint mono">
        {done}/{tasks.length} 完成 · {HINT[category]}
        <br />
        完成後無法取消，請謹慎點按
      </p>

      {pending && me && (
        <ConfirmSheet
          pending={pending}
          identity={me}
          onNo={() => setPending(null)}
          onYes={() => {
            setPending(null)
            run(pending)
          }}
        />
      )}
    </div>
  )
}

function TaskCard({
  task,
  skill,
  burst,
  animate,
  onTap,
  onStep,
  onEdit,
}: {
  task: Task
  skill: string | null
  burst: boolean
  animate: boolean
  onTap: () => void
  onStep: (i: number) => void
  onEdit: () => void
}) {
  const done = !!task.doneAt
  const hasSteps = task.steps.length > 0
  const counting = !hasSteps && task.target > 1
  const stepsDone = task.stepsDone.filter(Boolean).length
  const tappable = !done && !hasSteps
  const isEvent = !!task.eventDay

  const cls =
    'task-card' +
    (done ? ' done' : '') +
    (burst && animate ? ' burst' : '') +
    (hasSteps ? ' has-steps' : '') +
    (tappable ? ' tappable' : '') +
    (isEvent ? ' event-task' : '')

  return (
    <div
      className={cls}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      onClick={tappable ? onTap : undefined}
      onKeyDown={
        tappable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTap()
              }
            }
          : undefined
      }
    >
      <div className="task-head">
        <div className="task-main">
          <span className="task-title">
            {isEvent && <DiceIcon size={18} className="event-mark" />}
            {task.title}
          </span>
          <span className="task-meta mono">
            +{task.exp} exp
            {isEvent ? ' · 今日事件' : ''}
            {skill ? ` · ${skill}` : ''}
            {counting ? ` · ${task.progress}/${task.target}` : ''}
            {hasSteps ? ` · 步驟 ${stepsDone}/${task.steps.length}` : ''}
          </span>
        </div>
        {done ? (
          <CheckIcon size={40} className="check" />
        ) : (
          <span className="task-tools">
            {counting && task.progress > 0 && <span className="count mono">{task.progress}</span>}
            {!isEvent && (
              <>
                <button
                  className="task-tool"
                  aria-label="編輯"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                >
                  <PencilIcon size={17} />
                </button>
                <button
                  className="task-tool"
                  aria-label="刪除"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`刪除「${task.title}」？`)) actions.deleteTask(task.id)
                  }}
                >
                  <TrashIcon size={17} />
                </button>
              </>
            )}
          </span>
        )}
      </div>

      {hasSteps && (
        <ol className="steps">
          {task.steps.map((st, i) => {
            const on = Boolean(task.stepsDone[i])
            return (
              <li key={i}>
                <button
                  className={'step' + (on ? ' on' : '')}
                  disabled={done || on}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStep(i)
                  }}
                >
                  <StepIcon size={24} done={on} />
                  <span>{st}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {burst && animate && (
        <span className="sparks" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Sparkle key={i} size={16} className={'spark s' + i} />
          ))}
        </span>
      )}
    </div>
  )
}
