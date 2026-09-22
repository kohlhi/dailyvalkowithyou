import { useState } from 'react'
import { pendingEvent, useStore } from '../store'
import { levelInfo, pick, streakFrom } from '../level'
import { displayName, inherited, nextStage } from '../stage'
import { useImageUrl } from '../images'
import { sfx } from '../sound'
import { DefaultHero, DiceIcon, FlameIcon, Sparkle } from '../Icons'
import { StageSheet } from '../components/StageSheet'

export function Home({ onSwitch, onEvent }: { onSwitch: () => void; onEvent: () => void }) {
  const s = useStore()
  const me = s.identities.find((i) => i.id === s.currentIdentityId) ?? s.identities[0]
  const info = levelInfo(me.exp)
  const streak = streakFrom(Object.keys(s.stats.dayCounts))
  const event = pendingEvent(s)
  const upcoming = nextStage(me)

  // 每次進首頁 / 切換身份都隨機抽一張小人與一句寄語，點小人可再抽
  const notes = inherited(me, 'notes')
  const images = inherited(me, 'images')
  const [imgId, setImgId] = useState<string | null>(() => pick(images) ?? null)
  const [note, setNote] = useState<string | null>(() => pick(notes) ?? null)
  const [spin, setSpin] = useState(0)
  const [stagesOpen, setStagesOpen] = useState(false)
  const url = useImageUrl(imgId)

  const reroll = () => {
    setImgId(pick(images) ?? null)
    setNote(pick(notes) ?? null)
    setSpin((n) => n + 1)
    sfx.tap()
  }

  return (
    <div className="screen home">
      {note && (
        <div className="bubble-wrap">
          <button key={note + spin} className="bubble pop-in" onClick={reroll}>
            {note}
          </button>
        </div>
      )}

      <button className="hero" onClick={reroll} aria-label="換一張小人">
        <Sparkle size={30} className="sp sp1" />
        <Sparkle size={16} className="sp sp2" />
        <Sparkle size={34} className="sp sp3" />
        <Sparkle size={14} className="sp sp4" />
        <div key={spin} className="hero-img pop-in">
          {url ? <img src={url} alt="" className="avatar" /> : <DefaultHero />}
        </div>
      </button>

      <button
        className="identity-info"
        onClick={() => {
          sfx.tap()
          setStagesOpen(true)
        }}
      >
        <span className="class-name">{displayName(me)}</span>
        <span className="level">
          lv. {info.level} <span className="mono small">({me.exp} exp)</span>
        </span>
        <span className="info-hint mono">
          {upcoming ? `進化之路 · 下一階 lv.${upcoming.fromLevel}` : '進化之路'} ›
        </span>
      </button>

      {streak > 0 && (
        <div className="streak mono">
          <FlameIcon size={16} /> 連續 {streak} 天
        </div>
      )}

      <div className="bar" role="progressbar" aria-valuenow={me.exp} aria-valuemin={info.start} aria-valuemax={info.next}>
        <div className="bar-fill" style={{ width: `${Math.max(2, Math.round(info.ratio * 100))}%` }} />
      </div>
      <div className="bar-labels mono">
        <span>{info.start} exp</span>
        <span>{info.next} exp</span>
      </div>

      {me.skills.length > 0 && (
        <div className="skills">
          {me.skills.map((k) => (
            <span key={k.id} className="chip">
              {k.name}
              <b>lv.{levelInfo(k.exp).level}</b>
            </span>
          ))}
        </div>
      )}

      {event && (
        <button className="event-chip" onClick={onEvent}>
          <DiceIcon size={18} />
          今天有一件事等你決定
        </button>
      )}

      <button className="pill" onClick={onSwitch}>
        <Sparkle size={16} />
        <span>身份轉換</span>
        <Sparkle size={16} />
      </button>

      {stagesOpen && <StageSheet identity={me} onClose={() => setStagesOpen(false)} />}
    </div>
  )
}
