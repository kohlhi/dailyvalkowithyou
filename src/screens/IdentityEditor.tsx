import { useRef, useState } from 'react'
import type { Stage } from '../types'
import { MAX_STAGES, actions, useStore } from '../store'
import { levelInfo } from '../level'
import { allImageIds, stageIndex } from '../stage'
import { deleteImage, putImage, useImageUrl } from '../images'
import { PackPicker } from '../components/PackPicker'
import { GiftIcon, GridIcon, ImageIcon, PlusIcon, TrashIcon } from '../Icons'

const MAX_IMAGE = 5 * 1024 * 1024
const MAX_IMAGES = 12

type Kind = 'images' | 'rewards'

export function IdentityEditor({
  id,
  onToast,
  onDeleted,
}: {
  id: string
  onToast: (m: string) => void
  onDeleted: () => void
}) {
  const s = useStore()
  const me = s.identities.find((i) => i.id === id)
  const [pick, setPick] = useState(0)
  const [note, setNote] = useState('')
  const [skill, setSkill] = useState('')
  if (!me) return null

  const here = stageIndex(me)
  const index = Math.min(pick, me.stages.length - 1)
  const stage = me.stages[index]
  const level = levelInfo(me.exp).level

  const addNote = () => {
    const n = note.trim()
    if (!n) return
    actions.addNote(id, stage.id, n)
    setNote('')
  }
  const addSkill = () => {
    const n = skill.trim()
    if (!n) return
    actions.addSkill(id, n)
    setSkill('')
  }
  const removeIdentity = async () => {
    if (!confirm(`刪除身份「${me.stages[0].name}」？其專屬任務會改為所有身份共用，所有階段的圖庫也會刪除。`)) return
    const imgs = allImageIds(me)
    actions.deleteIdentity(id)
    onDeleted()
    for (const i of imgs) await deleteImage(i)
  }
  const removeStage = async () => {
    if (!confirm(`刪除「${stage.name}」這個階段？它的圖庫也會一起刪除。`)) return
    const imgs = [...stage.images, ...stage.rewards]
    actions.deleteStage(id, stage.id)
    setPick(Math.max(0, index - 1))
    for (const i of imgs) await deleteImage(i)
  }

  const minLevel = index === 0 ? 1 : (me.stages[index - 1]?.fromLevel ?? 1) + 1
  const maxLevel = me.stages[index + 1] ? me.stages[index + 1].fromLevel - 1 : 999

  return (
    <div className="screen settings">
      <section className="block">
        <h2 className="block-title">
          進化階段 <span className="mono small">lv.{level} · 共 {me.stages.length} 階</span>
          {me.stages.length < MAX_STAGES && (
            <button className="icon-btn small" aria-label="新增階段" onClick={() => actions.addStage(id)}>
              <PlusIcon size={18} />
            </button>
          )}
        </h2>
        <div className="stage-pick">
          {me.stages.map((st, i) => (
            <button
              key={st.id}
              className={'stage-tab' + (i === index ? ' on' : '') + (i > here ? ' locked' : '')}
              onClick={() => setPick(i)}
            >
              <span className="stage-tab-name">{st.name}</span>
              <small className="mono">lv.{st.fromLevel}</small>
            </button>
          ))}
        </div>
        <p className="help">
          {index > here
            ? `練到 lv.${stage.fromLevel} 就會進化成這一階，小人、獎勵圖與寄語都會換成下面設定的內容。`
            : index === here
              ? '這是目前所在的階段。'
              : '已經走過的階段。'}
        </p>
      </section>

      <section className="block">
        <h2 className="block-title">這一階的稱號</h2>
        <input
          className="text-input"
          value={stage.name}
          maxLength={20}
          placeholder="例如：Paladin、Sir. Paladin"
          onChange={(e) => actions.renameStage(id, stage.id, e.target.value)}
        />
        <div className="add-row">
          <span className="row-label">解鎖等級</span>
          <input
            className="text-input inline level-input mono"
            type="number"
            inputMode="numeric"
            min={minLevel}
            max={maxLevel}
            disabled={index === 0}
            value={stage.fromLevel}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) actions.setStageLevel(id, stage.id, Math.min(maxLevel, Math.max(minLevel, n)))
            }}
          />
        </div>
        {index === 0 && <p className="help">第一階段固定從 lv.1 開始。</p>}
      </section>

      <Gallery
        kind="images"
        identityId={id}
        stage={stage}
        title="小人圖庫"
        hint="jpeg / png / gif · 首頁隨機顯示"
        empty="這一階沒放圖時，會沿用前一階的小人。未解鎖時首頁會顯示剪影，背景透明的 png / gif 效果最好。"
        Icon={ImageIcon}
        onToast={onToast}
      />

      <Gallery
        kind="rewards"
        identityId={id}
        stage={stage}
        title="獎勵圖庫"
        hint="完成當日全部每日任務時播放"
        empty="這一階沒放圖時，會沿用前一階的獎勵圖。"
        Icon={GiftIcon}
        onToast={onToast}
      />

      <section className="block">
        <h2 className="block-title">
          目標備忘錄與寄語 <span className="mono small">首頁隨機顯示一句</span>
        </h2>
        <ul className="line-list">
          {stage.notes.map((n, i) => (
            <li key={i}>
              <span className="grow">{n}</span>
              <button className="icon-btn small" aria-label="移除" onClick={() => actions.removeNote(id, stage.id, i)}>
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="add-row">
          <input
            className="text-input inline"
            placeholder="例如：今年完成 100 張圖"
            value={note}
            maxLength={60}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addNote()
            }}
          />
          <button className="icon-btn" aria-label="新增" disabled={!note.trim()} onClick={addNote}>
            <PlusIcon />
          </button>
        </div>
        {stage.notes.length === 0 && <p className="help">這一階沒寫寄語時，會沿用前一階的。</p>}
      </section>

      {index > 0 && (
        <section className="block">
          <button className="ghost danger" onClick={removeStage}>
            <TrashIcon size={18} /> 刪除這個階段
          </button>
        </section>
      )}

      <section className="block">
        <h2 className="block-title">
          技能 <span className="mono small">所有階段共用</span>
        </h2>
        <ul className="line-list">
          {me.skills.map((k) => (
            <li key={k.id}>
              <input
                className="text-input inline"
                value={k.name}
                maxLength={16}
                onChange={(e) => actions.renameSkill(id, k.id, e.target.value)}
              />
              <span className="mono small">
                lv.{levelInfo(k.exp).level} · {k.exp}
              </span>
              <button
                className="icon-btn small"
                aria-label="移除技能"
                onClick={() => {
                  if (confirm(`移除技能「${k.name}」？`)) actions.removeSkill(id, k.id)
                }}
              >
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="add-row">
          <input
            className="text-input inline"
            placeholder="例如：素描、耐力"
            value={skill}
            maxLength={16}
            onChange={(e) => setSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addSkill()
            }}
          />
          <button className="icon-btn" aria-label="新增技能" disabled={!skill.trim()} onClick={addSkill}>
            <PlusIcon />
          </button>
        </div>
      </section>

      {s.identities.length > 1 && (
        <section className="block">
          <button className="ghost danger" onClick={removeIdentity}>
            <TrashIcon size={18} /> 刪除這個身份
          </button>
        </section>
      )}
    </div>
  )
}

function Gallery({
  kind,
  identityId,
  stage,
  title,
  hint,
  empty,
  Icon,
  onToast,
}: {
  kind: Kind
  identityId: string
  stage: Stage
  title: string
  hint: string
  empty: string
  Icon: typeof ImageIcon
  onToast: (m: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [packOpen, setPackOpen] = useState(false)
  const ids = stage[kind]

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    let added = 0
    for (const f of Array.from(files)) {
      if (ids.length + added >= MAX_IMAGES) {
        onToast(`最多 ${MAX_IMAGES} 張`)
        break
      }
      if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) {
        onToast('只支援 jpeg / png / gif')
        continue
      }
      if (f.size > MAX_IMAGE) {
        onToast('圖片請小於 5MB')
        continue
      }
      try {
        const imgId = await putImage(f)
        if (kind === 'images') actions.addImage(identityId, stage.id, imgId)
        else actions.addReward(identityId, stage.id, imgId)
        added++
      } catch {
        onToast('儲存圖片失敗')
      }
    }
    if (added) onToast(`已加入 ${added} 張 ✦`)
  }

  const removeImg = async (imgId: string) => {
    if (kind === 'images') actions.removeImage(identityId, stage.id, imgId)
    else actions.removeReward(identityId, stage.id, imgId)
    await deleteImage(imgId)
  }

  return (
    <section className="block">
      <h2 className="block-title">
        {title} <span className="mono small">{hint}</span>
      </h2>
      <div className="gallery">
        {ids.map((imgId) => (
          <Thumb key={imgId} id={imgId} onRemove={() => removeImg(imgId)} />
        ))}
        {ids.length < MAX_IMAGES && (
          <button className="thumb add" onClick={() => fileRef.current?.click()}>
            <Icon size={26} />
            <span>上傳圖片</span>
          </button>
        )}
        <button className="thumb add" onClick={() => setPackOpen(true)}>
          <GridIcon size={24} />
          <span>內建圖</span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        hidden
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {ids.length === 0 && <p className="help">{empty}</p>}

      {packOpen && (
        <PackPicker
          title={kind === 'images' ? '內建小人圖' : '內建獎勵圖'}
          chosen={ids}
          full={ids.length >= MAX_IMAGES}
          onToggle={(imgId, on) => {
            if (on) {
              if (kind === 'images') actions.removeImage(identityId, stage.id, imgId)
              else actions.removeReward(identityId, stage.id, imgId)
            } else if (kind === 'images') {
              actions.addImage(identityId, stage.id, imgId)
            } else {
              actions.addReward(identityId, stage.id, imgId)
            }
          }}
          onClose={() => setPackOpen(false)}
        />
      )}
    </section>
  )
}

function Thumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useImageUrl(id)
  return (
    <div className="thumb">
      {url ? <img src={url} alt="" /> : <span className="mono small">…</span>}
      <button className="x" aria-label="移除圖片" onClick={onRemove}>
        ×
      </button>
    </div>
  )
}
