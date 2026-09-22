import { useMemo } from 'react'
import type { Stage } from '../types'
import { pick } from '../level'
import { useImageUrl } from '../images'
import { DefaultHero } from '../Icons'

/**
 * 首頁滑動用的單一階段小人。
 * 還沒解鎖的階段放在虛線框裡並壓成純黑剪影，沒放圖就顯示問號。
 * 背景透明的 png / gif 剪影效果最好，不透明的圖會整塊變黑。
 */
export function StageHero({ stage, locked, seed = 0 }: { stage: Stage; locked: boolean; seed?: number }) {
  const id = useMemo(() => pick(stage.images) ?? null, [stage.images, seed])
  const url = useImageUrl(id)

  if (!locked) {
    return <div className="hero-img">{url ? <img src={url} alt="" className="avatar" /> : <DefaultHero />}</div>
  }
  return (
    <div className="hero-img stage-locked">
      {url ? (
        <img src={url} alt="" className="avatar silhouette" />
      ) : (
        <span className="stage-qmark">?</span>
      )}
    </div>
  )
}
