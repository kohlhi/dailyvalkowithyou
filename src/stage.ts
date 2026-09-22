import type { Identity, Stage } from './types'
import { levelFromExp, uid } from './level'

/** 新身份預設的進化門檻：起始階段加三次進化 */
export const DEFAULT_STAGE_LEVELS = [1, 10, 25, 45]

export function makeStage(name: string, fromLevel: number): Stage {
  return { id: uid(), name, fromLevel, images: [], rewards: [], notes: [] }
}

/** 依等級算出目前在第幾個階段 */
export function stageIndex(identity: Identity, level = levelFromExp(identity.exp)): number {
  let idx = 0
  for (let i = 0; i < identity.stages.length; i++) {
    if (level >= identity.stages[i].fromLevel) idx = i
  }
  return idx
}

export function currentStage(identity: Identity): Stage {
  return identity.stages[stageIndex(identity)] ?? identity.stages[0]
}

/** 目前階段的稱號，用在所有顯示身份名字的地方 */
export function displayName(identity: Identity): string {
  return currentStage(identity)?.name ?? '冒險者'
}

/** 下一個還沒解鎖的階段 */
export function nextStage(identity: Identity): Stage | null {
  return identity.stages[stageIndex(identity) + 1] ?? null
}

/**
 * 取目前階段的圖庫或寄語。這個階段還沒放東西時，
 * 往前找最近一個有內容的階段，免得一進化小人就不見了。
 */
export function inherited(identity: Identity, key: 'images' | 'rewards' | 'notes'): string[] {
  for (let i = stageIndex(identity); i >= 0; i--) {
    const list = identity.stages[i]?.[key]
    if (list && list.length > 0) return list
  }
  return []
}

/** 整理階段：依等級排序，並確保第一個從 lv.1 開始 */
export function sortStages(stages: Stage[]): Stage[] {
  const out = [...stages].sort((a, b) => a.fromLevel - b.fromLevel)
  if (out.length > 0) out[0] = { ...out[0], fromLevel: 1 }
  return out
}

/** 這個身份用到的所有圖片 id */
export function allImageIds(identity: Identity): string[] {
  return identity.stages.flatMap((s) => [...s.images, ...s.rewards])
}
