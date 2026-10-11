import type { Category, Task } from '../types'
import { actions, useStore } from '../store'
import { CATEGORY_LABEL } from '../level'
import { displayName } from '../stage'
import { PencilIcon, PlusIcon, TrashIcon } from '../Icons'

const CATS: Category[] = ['daily', 'weekly', 'achievement']

/** 左上角：任務總覽，單純的任務主控台（新增、編輯、刪除）。統計與徽章在笑臉的「使用者資訊」 */
export function Overview({ onEdit, onAdd }: { onEdit: (t: Task) => void; onAdd: (c: Category) => void }) {
  const s = useStore()

  const nameOf = (id: string | null) =>
    id === null
      ? '所有身份'
      : (() => {
          const found = s.identities.find((i) => i.id === id)
          return found ? displayName(found) : '?'
        })()
  const skillOf = (id: string | null) =>
    id === null ? null : (s.identities.flatMap((i) => i.skills).find((k) => k.id === id)?.name ?? null)

  return (
    <div className="screen overview">
      {CATS.map((c) => {
        const list = s.tasks.filter((t) => t.category === c && !t.eventDay)
        return (
          <section className="block" key={c}>
            <h2 className="block-title">
              {CATEGORY_LABEL[c]} <span className="mono small">{list.length}</span>
              <button className="icon-btn small" aria-label="新增" onClick={() => onAdd(c)}>
                <PlusIcon size={18} />
              </button>
            </h2>
            {list.length === 0 && <p className="help">尚無任務</p>}
            <ul className="manage-list">
              {list.map((t) => {
                const skill = skillOf(t.skillId)
                return (
                  <li key={t.id}>
                    <div className="manage-main">
                      <span className="manage-title">{t.title}</span>
                      <span className="mono small">
                        +{t.exp} EXP · {nameOf(t.identityId)}
                        {skill ? ` · ${skill}` : ''}
                        {t.steps.length > 0 ? ` · ${t.steps.length} 步驟` : t.target > 1 ? ` · ${t.target} 次` : ''}
                      </span>
                    </div>
                    <button className="icon-btn small" aria-label="編輯" onClick={() => onEdit(t)}>
                      <PencilIcon size={18} />
                    </button>
                    <button
                      className="icon-btn small"
                      aria-label="刪除"
                      onClick={() => {
                        if (confirm(`刪除「${t.title}」？`)) actions.deleteTask(t.id)
                      }}
                    >
                      <TrashIcon size={18} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

    </div>
  )
}
