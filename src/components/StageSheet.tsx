import { useEffect, useRef, useState } from 'react'
import type { Identity } from '../types'
import { levelFromExp, levelInfo, levelStart } from '../level'
import { stageIndex } from '../stage'
import { CloseIcon } from '../Icons'
import { StageHero } from './StageHero'

/** 點首頁的稱號與等級後彈出：左右滑動看所有進化階段，未解鎖的只有剪影 */
export function StageSheet({ identity, onClose }: { identity: Identity; onClose: () => void }) {
  const here = stageIndex(identity)
  const level = levelFromExp(identity.exp)
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(here)

  // 開啟時先停在目前所在的階段
  useEffect(() => {
    const el = trackRef.current
    if (el) el.scrollLeft = here * el.clientWidth
  }, [here])

  const goto = (n: number) => {
    const el = trackRef.current
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal stage-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="block-title">
          進化之路 <span className="mono small">lv.{level} · 共 {identity.stages.length} 階</span>
          <button className="icon-btn small" aria-label="關閉" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </h2>

        <div
          className="stage-track"
          ref={trackRef}
          onScroll={(e) => {
            const el = e.currentTarget
            const n = Math.round(el.scrollLeft / el.clientWidth)
            if (n !== page) setPage(n)
          }}
        >
          {identity.stages.map((st, i) => {
            const locked = i > here
            const need = Math.max(0, levelStart(st.fromLevel) - identity.exp)
            return (
              <div className="stage-pane" key={st.id}>
                <div className="sheet-hero">
                  <StageHero stage={st} locked={locked} />
                </div>
                <h3 className={'stage-name' + (locked ? ' locked' : '')}>{locked ? '?????' : st.name}</h3>
                <div className="stage-tag mono">
                  {locked ? `lv.${st.fromLevel} 解鎖` : i === here ? '目前階段' : `lv.${st.fromLevel} 已解鎖`}
                </div>
                {locked ? (
                  <div className="stage-need mono">還差 {need.toLocaleString()} EXP</div>
                ) : (
                  identity.skills.length > 0 && (
                    <div className="sheet-skills">
                      {identity.skills.map((k) => (
                        <span key={k.id} className="chip">
                          {k.name}
                          <b>lv.{levelInfo(k.exp).level}</b>
                        </span>
                      ))}
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>

        {identity.stages.length > 1 && (
          <div className="stage-dots">
            {identity.stages.map((st, i) => (
              <button
                key={st.id}
                className={'stage-dot' + (i === page ? ' on' : '') + (i > here ? ' locked' : '')}
                aria-label={`第 ${i + 1} 階`}
                onClick={() => goto(i)}
              />
            ))}
          </div>
        )}

        <p className="help sheet-help">左右滑動看看之後會變成什麼樣子。未解鎖的階段只看得到剪影。</p>
      </div>
    </div>
  )
}
