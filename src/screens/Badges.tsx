import { ACHIEVEMENTS } from '../achievements'
import { useStore } from '../store'
import { Badge } from '../components/Badge'

/** 徽章櫃：自動頒發的成就一覽，鎖住的顯示進度 */
export function Badges() {
  const s = useStore()
  const got = new Map(s.unlocked.map((u) => [u.id, u]))
  const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))]

  return (
    <div className="screen settings">
      <div className="badge-summary">
        <span className="mono big">
          {got.size} / {ACHIEVEMENTS.length}
        </span>
        <span className="small">已解鎖的徽章</span>
      </div>

      {groups.map((g) => (
        <section className="block" key={g}>
          <h2 className="block-title">
            {g}{' '}
            <span className="mono small">
              {ACHIEVEMENTS.filter((a) => a.group === g && got.has(a.id)).length} /{' '}
              {ACHIEVEMENTS.filter((a) => a.group === g).length}
            </span>
          </h2>
          <ul className="badge-list">
            {ACHIEVEMENTS.filter((a) => a.group === g).map((a) => {
              const u = got.get(a.id)
              const p = a.progress(s)
              const pct = Math.min(100, Math.round((p.now / p.goal) * 100))
              return (
                <li key={a.id} className={u ? 'got' : ''}>
                  <Badge icon={a.icon} tier={a.tier} locked={!u} size={62} />
                  <div className="badge-info">
                    <span className="badge-title">{u ? a.name : '???'}</span>
                    <span className="badge-line small">{a.desc}</span>
                    {u ? (
                      <span className="mono small">
                        {new Date(u.at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                        {u.note ? ` · ${u.note}` : ''}
                      </span>
                    ) : (
                      <span className="badge-progress">
                        <span className="badge-bar">
                          <span className="badge-bar-fill" style={{ width: `${Math.max(3, pct)}%` }} />
                        </span>
                        <span className="mono small">
                          {Math.min(p.now, p.goal)} / {p.goal}
                        </span>
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
