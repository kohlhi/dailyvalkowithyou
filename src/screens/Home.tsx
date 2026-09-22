import { useState } from 'react'
import { pendingEvent, useStore } from '../store'
import { levelInfo, pick } from '../level'
import { displayName, inherited, inheritedScene, nextStage } from '../stage'
import { useImageUrl } from '../images'
import { sfx } from '../sound'
import { DefaultHero, DiceIcon, Sparkle } from '../Icons'
import { StageSheet } from '../components/StageSheet'

export function Home({ onSwitch, onEvent }: { onSwitch: () => void; onEvent: () => void }) {
  const s = useStore()
  const me = s.identities.find((i) => i.id === s.currentIdentityId) ?? s.identities[0]
  const info = levelInfo(me.exp)
  const event = pendingEvent(s)
  const upcoming = nextStage(me)
  const scene = inheritedScene(me)

  // 每次進首頁 / 切換身份都隨機抽一張角色圖與一句台詞，點角色可再抽
  const notes = inherited(me, 'notes')
  const images = inherited(me, 'images')
  const [imgId, setImgId] = useState<string | null>(() => pick(images) ?? null)
  const [note, setNote] = useState<string | null>(() => pick(notes) ?? null)
  const [spin, setSpin] = useState(0)
  // 寄語預設不顯示，要點角色才會說話
  const [sayOpen, setSayOpen] = useState(false)
  const [stagesOpen, setStagesOpen] = useState(false)
  const url = useImageUrl(imgId)

  const reroll = () => {
    setImgId(pick(images) ?? null)
    setNote(pick(notes) ?? null)
    setSayOpen(true)
    setSpin((n) => n + 1)
    sfx.tap()
  }

  return (
    <div className="screen home">
      <div className={'stage-view' + (scene ? '' : ' no-scene')}>
        {scene && (
          <div className="scene">
            <img src={scene} alt="" />
          </div>
        )}

        <button className="valko" onClick={reroll} aria-label="點一下和牠說話">
          <span key={spin} className="valko-img pop-in">
            {url ? <img src={url} alt="" /> : <DefaultHero />}
          </span>
        </button>

        {note && sayOpen && (
          <button
            key={note + spin}
            className="bubble say pop-in"
            onClick={() => setSayOpen(false)}
            aria-label="收起對話"
          >
            {note}
          </button>
        )}

        <button
          className="identity-info"
          onClick={() => {
            sfx.tap()
            setStagesOpen(true)
          }}
        >
          <span className="class-name">{displayName(me)}</span>
          <span className="level mono">
            lv.{info.level} <span className="level-exp">({me.exp} EXP)</span>
          </span>
          <span className="info-hint mono">
            {upcoming ? `進化之路 · 下一階 lv.${upcoming.fromLevel}` : '進化之路'} ›
          </span>
        </button>
      </div>

      <div className="bar" role="progressbar" aria-valuenow={me.exp} aria-valuemin={info.start} aria-valuemax={info.next}>
        <div className="bar-fill" style={{ width: `${Math.max(2, Math.round(info.ratio * 100))}%` }} />
      </div>
      <div className="bar-labels mono">
        <span>{info.start} EXP</span>
        <span>{info.next} EXP</span>
      </div>

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
