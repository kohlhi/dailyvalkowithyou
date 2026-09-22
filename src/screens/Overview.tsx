import type { Category, Task } from '../types'
import { actions, useStore } from '../store'
import { CATEGORY_LABEL, dayKey, streakFrom, weekKey } from '../level'
import { displayName } from '../stage'
import { ACHIEVEMENTS } from '../achievements'
import { Badge } from '../components/Badge'
import { FlameIcon, PencilIcon, PlusIcon, TrashIcon } from '../Icons'

const CATS: Category[] = ['daily', 'weekly', 'achievement']

export function Overview({
  onEdit,
  onAdd,
  onBadges,
}: {
  onEdit: (t: Task) => void
  onAdd: (c: Category) => void
  onBadges: () => void
}) {
  const s = useStore()
  const today = dayKey()
  const week = weekKey()
  const days = Object.entries(s.stats.dayCounts)
  const todayCount = s.stats.dayCounts[today] ?? 0
  const weekCount = days.reduce((a, [k, n]) => a + (weekKey(new Date(k + 'T12:00:00')) === week ? n : 0), 0)
  const totalExp = s.identities.reduce((a, i) => a + i.exp, 0)
  const streak = streakFrom(days.map(([k]) => k))
  const recent = [...s.unlocked].sort((a, b) => b.at - a.at).slice(0, 4)
  const nameOf = (id: string | null) =>
    id === null ? '所有身份' : (() => {
      const found = s.identities.find((i) => i.id === id)
      return found ? displayName(found) : '?'
    })()
  const skillOf = (id: string | null) =>
    id === null ? null : (s.identities.flatMap((i) => i.skills).find((k) => k.id === id)?.name ?? null)

  return (
    <div className="screen overview">
      <div className="stats">
        <div className="stat">
          <span className="mono big">{todayCount}</span>
          <span className="small">今日完成</span>
        </div>
        <div className="stat">
          <span className="mono big">{weekCount}</span>
          <span className="small">本週完成</span>
        </div>
        <div className="stat">
          <span className="mono big">
            <FlameIcon size={20} /> {streak}
          </span>
          <span className="small">連續天數</span>
        </div>
        <div className="stat">
          <span className="mono big">{totalExp}</span>
          <span className="small">總 exp</span>
        </div>
      </div>

      <button className="badge-shelf" onClick={onBadges}>
        <div className="badge-shelf-row">
          {recent.length > 0 ? (
            recent.map((u) => {
              const a = ACHIEVEMENTS.find((x) => x.id === u.id)
              return a ? <Badge key={u.id} icon={a.icon} tier={a.tier} size={46} /> : null
            })
          ) : (
            <Badge icon="sword" tier={1} locked size={46} />
          )}
        </div>
        <div className="badge-shelf-text">
          <span className="badge-shelf-title">徽章櫃</span>
          <span className="mono small">
            {s.unlocked.length} / {ACHIEVEMENTS.length} 已解鎖 →
          </span>
        </div>
      </button>

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
                        +{t.exp} exp · {nameOf(t.identityId)}
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

      {s.logs.length > 0 && (
        <section className="block">
          <h2 className="block-title">最近完成</h2>
          <ul className="log-list mono small">
            {[...s.logs]
              .reverse()
              .slice(0, 12)
              .map((l) => (
                <li key={l.id}>
                  <span>{new Date(l.at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</span>
                  <span className="log-title">{l.title}</span>
                  <span>+{l.exp}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}
