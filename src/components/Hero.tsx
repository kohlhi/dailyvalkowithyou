import { useMemo } from 'react'
import type { Identity } from '../types'
import { pick } from '../level'
import { inherited } from '../stage'
import { useImageUrl } from '../images'
import { DefaultHero } from '../Icons'

/** 顯示目前階段圖庫裡的一張小人，沒有圖片時用預設騎士。seed 改變就換一張。 */
export function Hero({ identity, seed = 0, className }: { identity: Identity; seed?: number; className?: string }) {
  const images = inherited(identity, 'images')
  const id = useMemo(() => pick(images) ?? null, [images, seed])
  const url = useImageUrl(id)
  return (
    <div className={'hero-img' + (className ? ' ' + className : '')}>
      {url ? <img src={url} alt="" className="avatar" /> : <DefaultHero />}
    </div>
  )
}
