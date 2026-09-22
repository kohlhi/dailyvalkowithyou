import { HERO_PACK } from '../heroPack'
import { builtinId } from '../images'
import { CheckIcon, CloseIcon } from '../Icons'

/** 內建圖包選單：點一下加入圖庫，再點一下移除 */
export function PackPicker({
  title,
  chosen,
  full,
  onToggle,
  onClose,
}: {
  title: string
  chosen: string[]
  /** 圖庫已達上限，只能移除不能再加 */
  full: boolean
  onToggle: (id: string, on: boolean) => void
  onClose: () => void
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal pack-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="block-title">
          {title} <span className="mono small">{HERO_PACK.length} 張</span>
          <button className="icon-btn small" aria-label="關閉" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </h2>

        {HERO_PACK.length === 0 ? (
          <p className="help">public/heroes/ 裡還沒有圖片。把圖片放進那個資料夾就會出現在這裡。</p>
        ) : (
          <div className="pack-grid">
            {HERO_PACK.map((path) => {
              const id = builtinId(path)
              const on = chosen.includes(id)
              return (
                <button
                  key={path}
                  className={'pack-item' + (on ? ' on' : '')}
                  disabled={!on && full}
                  aria-pressed={on}
                  onClick={() => onToggle(id, on)}
                >
                  <img src={path} alt="" />
                  {on && (
                    <span className="pack-check">
                      <CheckIcon size={18} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <p className="help sheet-help">
          {full ? '圖庫已滿，要換的話先取消勾選再選別的。' : '選中的會加進這一階的圖庫，可以和自己上傳的混用。'}
        </p>
        <button className="pill wide" onClick={onClose}>
          完成
        </button>
      </div>
    </div>
  )
}
