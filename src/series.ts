/**
 * 小狼系列：把 內容.ts「三、小狼系列」同步到使用者的存檔。
 *
 * 分工：稱號、圖、場景、技能名稱由作者在 內容.ts 決定，每次載入都重新套上；
 * 使用者存檔只保留自己的進度（經驗值、技能等級、看過哪些進化、自己放的獎勵圖）。
 * 所以作者改了 內容.ts，所有人下次打開就會看到，也不用為了換圖升資料版本。
 */
import { 小狼系列, type 圖層內容, type 場景內容, type 系列內容 } from './內容'
import type { Identity, Stage } from './types'
import { DEFAULT_STAGE_LEVELS, inheritedScene, stageIndex } from './stage'
import { builtinId } from './images'
import { uid } from './level'

export function seriesOf(identity: Identity): 系列內容 | undefined {
  return identity.role ? 小狼系列.find((x) => x.角色 === identity.role) : undefined
}

/**
 * 看得到的身份：自建的身份、開放中的系列、或是還沒開放但已經練過等級的（進度不能憑空消失）。
 * 系列從 內容.ts 整個刪掉的，也照樣留著。
 */
export function isVisible(identity: Identity): boolean {
  if (!identity.role) return true
  const x = seriesOf(identity)
  return !x || x.開放 || identity.exp > 0
}

export function visibleIdentities(identities: Identity[]): Identity[] {
  const list = identities.filter(isVisible)
  return list.length > 0 ? list : identities.slice(0, 1)
}

/** 各階段的進化等級：沒寫就用預設，而且一定比前一階高 */
function stageLevels(x: 系列內容): number[] {
  const levels: number[] = []
  x.階段.forEach((st, i) => {
    if (i === 0) {
      levels.push(1)
      return
    }
    const prev = levels[i - 1]
    levels.push(Math.max(prev + 1, st.等級 ?? DEFAULT_STAGE_LEVELS[i] ?? prev + 20))
  })
  return levels
}

/**
 * 把系列內容套到身份上。階段 id 固定成「角色:第幾階」，
 * 看過的進化照「第幾階」對應過來，所以舊存檔的隨機 id 也能正確接上。
 */
function applySeries(identity: Identity, x: 系列內容): Identity {
  const role = x.角色
  const levels = stageLevels(x)
  const reached = new Set(
    identity.stages.flatMap((st, i) => (identity.evolvedIds.includes(st.id) ? [i] : [])),
  )
  const stages: Stage[] = x.階段.map((st, i) => ({
    id: `${role}:${i}`,
    name: st.稱號,
    fromLevel: levels[i],
    images: (st.圖 ?? []).map(builtinId),
    rewards: identity.stages[i]?.rewards ?? [],
    notes: identity.stages[i]?.notes ?? [],
    scene: typeof st.場景 === 'string' ? st.場景 : (st.場景?.房間 ?? st.場景?.圖層?.at(-1)?.圖 ?? ''),
  }))
  reached.add(0)
  const known = new Set(identity.skills.map((k) => k.name))
  const skills = [
    ...identity.skills,
    ...x.技能.filter((n) => !known.has(n)).map((name) => ({ id: uid(), name, exp: 0 })),
  ]
  return {
    ...identity,
    role,
    skills,
    stages,
    evolvedIds: stages.filter((_, i) => reached.has(i)).map((st) => st.id),
  }
}

export function newSeriesIdentity(x: 系列內容): Identity {
  const blank: Identity = { id: uid(), role: x.角色, exp: 0, skills: [], stages: [], evolvedIds: [] }
  return applySeries(blank, x)
}

/**
 * 載入時跑一次：
 *   1. 舊存檔沒有 role 的，用第一階段稱號認出是哪個系列
 *   2. 系列身份重新套上 內容.ts 的稱號、圖、場景
 *   3. 開放中但存檔裡還沒有的系列，補一隻 lv.1 的新小狼
 */
export function syncSeries(identities: Identity[]): Identity[] {
  const used = new Set<string>()
  const out = identities.map((i) => {
    let role = i.role
    if (!role) {
      const first = i.stages[0]?.name
      role = 小狼系列.find((x) => x.階段[0]?.稱號 === first && !used.has(x.角色))?.角色 ?? null
    }
    // 同一個系列只能對到一個身份，多的當成自建身份
    if (role && used.has(role)) role = null
    if (role) used.add(role)
    const x = role ? 小狼系列.find((s) => s.角色 === role) : undefined
    const withRole = { ...i, role }
    return x ? applySeries(withRole, x) : withRole
  })
  for (const x of 小狼系列) {
    if (x.開放 && !used.has(x.角色)) out.push(newSeriesIdentity(x))
  }
  return out
}

export interface 背景 {
  圖層: 圖層內容[]
  小狼深度: number
}

/** 把各種寫法整理成圖層清單：一張圖、舊的房間／窗外、或圖層清單 */
function toLayers(sc: string | 場景內容): 背景 | null {
  if (typeof sc === 'string') return sc ? { 圖層: [{ 圖: sc }], 小狼深度: 0 } : null
  const 小狼深度 = sc.小狼深度 ?? -0.25
  if (sc.圖層 && sc.圖層.length > 0) return { 圖層: sc.圖層, 小狼深度 }
  const 圖層: 圖層內容[] = []
  if (sc.窗外) 圖層.push({ 圖: sc.窗外, 深度: 1, 放大: 1.04, 雨: sc.雨 })
  if (sc.房間) 圖層.push({ 圖: sc.房間, 深度: 0.35 })
  return 圖層.length > 0 ? { 圖層, 小狼深度 } : null
}

/**
 * 首頁背景的各圖層。系列身份讀 內容.ts（沒寫就往前一階找），
 * 自建身份只有存檔裡的一張圖、不做視差。
 */
export function sceneLayers(identity: Identity): 背景 | null {
  const x = seriesOf(identity)
  if (x) {
    for (let i = Math.min(stageIndex(identity), x.階段.length - 1); i >= 0; i--) {
      const sc = x.階段[i]?.場景
      if (sc) return toLayers(sc)
    }
  }
  return toLayers(inheritedScene(identity))
}

/** 新使用者一開始擁有的小狼：所有開放中的系列 */
export function starterIdentities(): Identity[] {
  const open = 小狼系列.filter((x) => x.開放)
  const list = open.length > 0 ? open : 小狼系列.slice(0, 1)
  return list.map(newSeriesIdentity)
}
