import { useState } from 'react'
import type { Category, Task } from '../types'
import { actions, useStore } from '../store'
import { CATEGORY_LABEL, EXP_OPTIONS } from '../level'
import { displayName } from '../stage'
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon } from '../Icons'

const CATS: Category[] = ['daily', 'weekly', 'achievement']
const MAX_STEPS = 12

export function TaskForm({ task, category, onDone }: { task?: Task; category: Category; onDone: () => void }) {
  const s = useStore()
  const [title, setTitle] = useState(task?.title ?? '')
  const [cat, setCat] = useState<Category>(task?.category ?? category)
  const [exp, setExp] = useState(task?.exp ?? 300)
  const [identityId, setIdentityId] = useState<string | null>(task?.identityId ?? s.currentIdentityId)
  const [skillId, setSkillId] = useState<string | null>(task?.skillId ?? null)
  const [target, setTarget] = useState(task?.target ?? 1)
  const [steps, setSteps] = useState<string[]>(task?.steps ?? [])
  const custom = !EXP_OPTIONS.some((o) => o.exp === exp)
  const identity = s.identities.find((i) => i.id === identityId) ?? null

  const chooseIdentity = (id: string | null) => {
    setIdentityId(id)
    setSkillId(null)
  }

  const submit = () => {
    const t = title.trim()
    if (!t) return
    actions.saveTask({
      id: task?.id,
      title: t,
      category: cat,
      exp: Math.max(0, Math.floor(exp) || 0),
      identityId,
      skillId: identity?.skills.some((k) => k.id === skillId) ? skillId : null,
      target: Math.max(1, target),
      steps,
    })
    onDone()
  }

  const remove = () => {
    if (task && confirm(`刪除「${task.title}」？`)) {
      actions.deleteTask(task.id)
      onDone()
    }
  }

  return (
    <div className="screen form">
      <div className="sheet">
        <input
          className="title-input"
          placeholder="任務名輸入"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={!task}
          maxLength={40}
        />

        <div className="row">
          <div className="row-label">選擇分類</div>
          <div className="seg">
            {CATS.map((c) => (
              <button key={c} className={'seg-btn' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <div className="row-label">
            選擇 EXP <span className="mono small">(方便升等)</span>
          </div>
          <div className="seg">
            {EXP_OPTIONS.map((o) => (
              <button key={o.exp} className={'seg-btn' + (exp === o.exp ? ' on' : '')} onClick={() => setExp(o.exp)}>
                {o.label}
                <small className="mono">{o.exp}</small>
              </button>
            ))}
          </div>
          <label className="custom-exp mono">
            自訂
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="exp"
              value={custom ? exp : ''}
              onChange={(e) => setExp(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="row">
          <div className="row-label">選擇對應身份</div>
          <div className="seg">
            <button className={'seg-btn' + (identityId === null ? ' on' : '')} onClick={() => chooseIdentity(null)}>
              所有身份
            </button>
            {s.identities.map((i) => (
              <button
                key={i.id}
                className={'seg-btn' + (identityId === i.id ? ' on' : '')}
                onClick={() => chooseIdentity(i.id)}
              >
                {displayName(i)}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <div className="row-label">
            選擇對應技能 <span className="mono small">(完成時技能也加 exp)</span>
          </div>
          {!identity ? (
            <p className="help">先在上方選擇一個身份，才能對應該身份的技能。</p>
          ) : identity.skills.length === 0 ? (
            <p className="help">「{displayName(identity)}」還沒有技能，可到 使用者偏好 → 身份 → 編輯 新增。</p>
          ) : (
            <div className="seg">
              <button className={'seg-btn' + (skillId === null ? ' on' : '')} onClick={() => setSkillId(null)}>
                無
              </button>
              {identity.skills.map((k) => (
                <button
                  key={k.id}
                  className={'seg-btn' + (skillId === k.id ? ' on' : '')}
                  onClick={() => setSkillId(k.id)}
                >
                  {k.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="row">
          <div className="row-label">
            自訂步驟 <span className="mono small">(全部打勾才算完成)</span>
          </div>
          {steps.length > 0 && (
            <ol className="step-edit">
              {steps.map((st, i) => (
                <li key={i}>
                  <span className="mono small">{i + 1}.</span>
                  <input
                    className="text-input inline"
                    value={st}
                    maxLength={40}
                    placeholder={`步驟 ${i + 1}`}
                    autoFocus={st === ''}
                    onChange={(e) => setSteps(steps.map((x, n) => (n === i ? e.target.value : x)))}
                  />
                  <button
                    className="icon-btn small"
                    aria-label="移除步驟"
                    onClick={() => setSteps(steps.filter((_, n) => n !== i))}
                  >
                    <CloseIcon size={16} />
                  </button>
                </li>
              ))}
            </ol>
          )}
          {steps.length < MAX_STEPS && (
            <button className="ghost" onClick={() => setSteps([...steps, ''])}>
              <PlusIcon size={16} /> 新增步驟
            </button>
          )}
        </div>

        <div className="row">
          <div className="row-label">
            計數 <span className="mono small">(做幾次才算完成)</span>
          </div>
          {steps.length > 0 ? (
            <p className="help">有步驟的任務以步驟為準，完成全部步驟即完成。</p>
          ) : (
            <div className="stepper">
              <button className="icon-btn" aria-label="減少" onClick={() => setTarget((n) => Math.max(1, n - 1))}>
                <MinusIcon />
              </button>
              <span className="mono big">{target}</span>
              <button className="icon-btn" aria-label="增加" onClick={() => setTarget((n) => Math.min(99, n + 1))}>
                <PlusIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      <button className="pill wide" onClick={submit} disabled={!title.trim()}>
        確認
      </button>
      {task && (
        <button className="ghost danger" onClick={remove}>
          <TrashIcon size={18} /> 刪除任務
        </button>
      )}
    </div>
  )
}
