import type { State, Stats, Unlocked } from './types'
import { levelFromExp, streakFrom } from './level'
import { stageIndex } from './stage'
import { 徽章 } from './內容'
import type { 條件, 等第, 圖示 } from './內容'

/** 徽章的圖與等第都定義在「內容.ts」，這裡轉出去給徽章元件用 */
export type BadgeIcon = 圖示
/** 徽章等第：1 銅 2 銀 3 金，只影響外框樣式 */
export type Tier = 等第

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: BadgeIcon
  tier: Tier
  group: string
  /** 回傳目前進度與目標，用來顯示「12 / 50」 */
  progress: (s: State) => { now: number; goal: number; note?: string }
}

export const emptyStats = (): Stats => ({
  taskCounts: {},
  dayCounts: {},
  goalDays: [],
  total: 0,
  byCategory: { daily: 0, weekly: 0, achievement: 0 },
  eventsAccepted: 0,
  eventsDone: 0,
  rareDone: 0,
  earlyDone: 0,
  nightDone: 0,
})

const maxLevel = (s: State) => Math.max(1, ...s.identities.map((i) => levelFromExp(i.exp)))
const maxSkill = (s: State) => Math.max(1, ...s.identities.flatMap((i) => i.skills.map((k) => levelFromExp(k.exp))))

/** 重複最多次的那個任務 */
function topTask(s: State): { now: number; note?: string } {
  let best = 0
  let note: string | undefined
  for (const [taskId, n] of Object.entries(s.stats.taskCounts)) {
    if (n > best) {
      best = n
      note = s.tasks.find((t) => t.id === taskId)?.title
    }
  }
  return { now: best, note }
}

const bestDay = (s: State) => Math.max(0, ...Object.values(s.stats.dayCounts))

/** 某個身份解鎖了全部階段 */
const fullyEvolved = (s: State) =>
  s.identities.some((i) => i.stages.length > 1 && stageIndex(i) === i.stages.length - 1)

/**
 * 每個達成條件怎麼換算成數字。
 * 要新增條件，先在「內容.ts」的 `條件` 型別加一個名字，再回來這裡補上算法。
 */
const 量表: Record<條件, (s: State) => { now: number; note?: string }> = {
  累計完成: (s) => ({ now: s.stats.total }),
  連續天數: (s) => ({ now: streakFrom(Object.keys(s.stats.dayCounts)) }),
  清空天數: (s) => ({ now: s.stats.goalDays.length }),
  連續清空: (s) => ({ now: streakFrom(s.stats.goalDays) }),
  同一任務次數: topTask,
  身份等級: (s) => ({ now: maxLevel(s) }),
  技能等級: (s) => ({ now: maxSkill(s) }),
  進化階段: (s) => ({ now: Math.max(0, ...s.identities.map((i) => stageIndex(i))) }),
  完全進化: (s) => ({ now: fullyEvolved(s) ? 1 : 0 }),
  接下事件: (s) => ({ now: s.stats.eventsAccepted }),
  完成事件: (s) => ({ now: s.stats.eventsDone }),
  稀有事件: (s) => ({ now: s.stats.rareDone }),
  身份數量: (s) => ({ now: s.identities.length }),
  凌晨完成: (s) => ({ now: s.stats.nightDone }),
  早晨完成: (s) => ({ now: s.stats.earlyDone }),
  單日完成: (s) => ({ now: bestDay(s) }),
}

/** 由「內容.ts」的徽章資料組出來，這裡不再寫死任何文字 */
export const ACHIEVEMENTS: Achievement[] = 徽章.map((b) => ({
  id: b.id,
  name: b.名稱,
  desc: b.說明,
  icon: b.圖示,
  tier: b.等第,
  group: b.分類,
  progress: (s: State) => ({ ...量表[b.條件](s), goal: b.目標 }),
}))

export const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

/** 找出這次新達成、但還沒記錄過的成就 */
export function newlyUnlocked(s: State): Unlocked[] {
  const had = new Set(s.unlocked.map((u) => u.id))
  const at = Date.now()
  return ACHIEVEMENTS.filter((a) => !had.has(a.id))
    .map((a) => ({ a, p: a.progress(s) }))
    .filter(({ p }) => p.now >= p.goal)
    .map(({ a, p }) => ({ id: a.id, at, ...(p.note ? { note: p.note } : {}) }))
}
