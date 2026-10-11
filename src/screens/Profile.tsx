import { useState } from 'react'
import { actions, useStore } from '../store'
import { dayKey, levelInfo, streakFrom, weekKey } from '../level'
import { allImageIds, displayName } from '../stage'
import { sfx } from '../sound'
import { visibleIdentities } from '../series'
import { ACHIEVEMENTS } from '../achievements'
import { Badge } from '../components/Badge'
import { ChevronIcon, FlameIcon, PencilIcon, PlusIcon } from '../Icons'

/** 一個身份最多幾種，企劃表定的 */
const MAX_IDENTITIES = 5

/**
 * 右上角笑臉：使用者資訊。
 * 名字、目前的身份與等級、連續天數、今日／本週完成、徽章櫃、最近完成，都是「關於這個人」的東西，
 * 所以從任務總覽搬過來，任務總覽只管任務本身。
 */
export function Profile({
  onEditIdentity,
  onBadges,
}: {
  onEditIdentity: (id: string) => void
  onBadges: () => void
}) {
  const s = useStore()
  const [identityOpen, setIdentityOpen] = useState(false)
  const [newIdentity, setNewIdentity] = useState('')

  const me = s.identities.find((i) => i.id === s.currentIdentityId) ?? s.identities[0]
  const info = levelInfo(me.exp)

  const today = dayKey()
  const week = weekKey()
  const days = Object.entries(s.stats.dayCounts)
  const todayCount = s.stats.dayCounts[today] ?? 0
  const weekCount = days.reduce((a, [k, n]) => a + (weekKey(new Date(k + 'T12:00:00')) === week ? n : 0), 0)
  const streak = streakFrom(days.map(([k]) => k))
  const recent = [...s.unlocked].sort((a, b) => b.at - a.at).slice(0, 4)

  const addIdentity = () => {
    const n = newIdentity.trim()
    if (!n || s.identities.length >= MAX_IDENTITIES) return
    const id = actions.addIdentity(n)
    setNewIdentity('')
    onEditIdentity(id)
  }

  return (
    <div className="screen settings pref profile">
      <div className="pref-row static">
        <span className="pref-label">使用者名</span>
      </div>
      <input
        className="pref-input"
        value={s.name}
        maxLength={24}
        placeholder="輸入一個名字"
        onChange={(e) => actions.setName(e.target.value)}
      />

      {/* 目前的身份：稱號、等級、經驗條 */}
      <div className="profile-me">
        <div className="profile-me-top">
          <span className="profile-me-name">{displayName(me)}</span>
          <span className="mono profile-me-lv">lv.{info.level}</span>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={me.exp} aria-valuemin={info.start} aria-valuemax={info.next}>
          <div className="bar-fill" style={{ width: `${Math.max(2, Math.round(info.ratio * 100))}%` }} />
        </div>
        <div className="bar-labels mono">
          <span>{me.exp} EXP</span>
          <span>{info.next} EXP</span>
        </div>
      </div>

      <div className="streak-card">
        <FlameIcon size={26} />
        <span className="streak-num mono">{String(streak).padStart(2, '0')}</span>
        <span className="streak-label">連續天數</span>
      </div>

      <div className="stat-row">
        <div className="stat-box">
          <span className="mono stat-num">{todayCount}</span>
          <span className="stat-label">今日完成</span>
        </div>
        <div className="stat-box">
          <span className="mono stat-num">{weekCount}</span>
          <span className="stat-label">本週完成</span>
        </div>
      </div>

      <button className="badge-shelf" onClick={onBadges}>
        <div className="badge-shelf-row">
          {recent.length > 0 ? (
            recent.map((u) => {
              const a = ACHIEVEMENTS.find((x) => x.id === u.id)
              return a ? <Badge key={u.id} icon={a.icon} tier={a.tier} size={40} /> : null
            })
          ) : (
            <Badge icon="sword" tier={1} locked size={40} />
          )}
        </div>
        <div className="badge-shelf-text">
          <span className="badge-shelf-title">徽章櫃</span>
          <span className="mono small">
            {s.unlocked.length} / {ACHIEVEMENTS.length} 已解鎖 →
          </span>
        </div>
      </button>

      <button
        className={'pref-row' + (identityOpen ? ' open' : '')}
        onClick={() => {
          sfx.tap()
          setIdentityOpen((o) => !o)
        }}
      >
        <span className="pref-label">身份</span>
        <ChevronIcon size={20} className="pref-arrow" />
      </button>
      {identityOpen && (
        <div className="pref-body">
          <ul className="line-list">
            {visibleIdentities(s.identities).map((i) => (
              <li key={i.id} className={i.id === s.currentIdentityId ? 'current' : ''}>
                <span className="grow">{displayName(i)}</span>
                <span className="mono small">
                  lv.{levelInfo(i.exp).level} · {i.stages.length} 階 · {allImageIds(i).length} 圖
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
              placeholder={`自訂身份，最多 ${MAX_IDENTITIES} 種`}
              value={newIdentity}
              maxLength={20}
              onChange={(e) => setNewIdentity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addIdentity()
              }}
            />
            <button
              className="icon-btn"
              aria-label="新增身份"
              disabled={!newIdentity.trim() || s.identities.length >= MAX_IDENTITIES}
              onClick={addIdentity}
            >
              <PlusIcon />
            </button>
          </div>
          {s.identities.length >= MAX_IDENTITIES && (
            <p className="help">已經有 {MAX_IDENTITIES} 種身份了，要新增請先刪掉一個。</p>
          )}
        </div>
      )}

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
