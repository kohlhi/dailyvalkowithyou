import type { State, Stats, Unlocked } from './types'
import { levelFromExp, streakFrom } from './level'
import { stageIndex } from './stage'

export type BadgeIcon = 'sword' | 'flame' | 'check' | 'potion' | 'star' | 'sparkle' | 'key' | 'dice' | 'smiley' | 'grid'

/** 徽章等第：1 銅 2 銀 3 金，只影響外框樣式 */
export type Tier = 1 | 2 | 3

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

const count = (n: number, goal: number, note?: string) => ({ now: n, goal, note })

export const ACHIEVEMENTS: Achievement[] = [
  // ---- 累計完成 ----
  { id: 'done-1', name: '第一步', desc: '完成第一個任務', icon: 'sword', tier: 1, group: '累計',
    progress: (s) => count(s.stats.total, 1) },
  { id: 'done-10', name: '漸入佳境', desc: '累計完成 10 個任務', icon: 'sword', tier: 1, group: '累計',
    progress: (s) => count(s.stats.total, 10) },
  { id: 'done-50', name: '熟能生巧', desc: '累計完成 50 個任務', icon: 'sword', tier: 2, group: '累計',
    progress: (s) => count(s.stats.total, 50) },
  { id: 'done-100', name: '百戰之身', desc: '累計完成 100 個任務', icon: 'sword', tier: 2, group: '累計',
    progress: (s) => count(s.stats.total, 100) },
  { id: 'done-500', name: '身經百戰', desc: '累計完成 500 個任務', icon: 'sword', tier: 3, group: '累計',
    progress: (s) => count(s.stats.total, 500) },
  { id: 'done-1000', name: '千錘百鍊', desc: '累計完成 1000 個任務', icon: 'sword', tier: 3, group: '累計',
    progress: (s) => count(s.stats.total, 1000) },

  // ---- 連續天數 ----
  { id: 'streak-3', name: '站穩腳步', desc: '連續 3 天有完成任務', icon: 'flame', tier: 1, group: '連續',
    progress: (s) => count(streakFrom(Object.keys(s.stats.dayCounts)), 3) },
  { id: 'streak-7', name: '一週不斷', desc: '連續 7 天有完成任務', icon: 'flame', tier: 2, group: '連續',
    progress: (s) => count(streakFrom(Object.keys(s.stats.dayCounts)), 7) },
  { id: 'streak-30', name: '一個月不斷', desc: '連續 30 天有完成任務', icon: 'flame', tier: 3, group: '連續',
    progress: (s) => count(streakFrom(Object.keys(s.stats.dayCounts)), 30) },
  { id: 'streak-100', name: '百日不斷', desc: '連續 100 天有完成任務', icon: 'flame', tier: 3, group: '連續',
    progress: (s) => count(streakFrom(Object.keys(s.stats.dayCounts)), 100) },

  // ---- 清空每日目標 ----
  { id: 'goal-1', name: '清空的一天', desc: '完成當天全部每日任務', icon: 'check', tier: 1, group: '每日目標',
    progress: (s) => count(s.stats.goalDays.length, 1) },
  { id: 'goal-3', name: '三連清', desc: '連續 3 天清空每日任務', icon: 'check', tier: 2, group: '每日目標',
    progress: (s) => count(streakFrom(s.stats.goalDays), 3) },
  { id: 'goal-7', name: '七連清', desc: '連續 7 天清空每日任務', icon: 'check', tier: 3, group: '每日目標',
    progress: (s) => count(streakFrom(s.stats.goalDays), 7) },
  { id: 'goal-30', name: '三十連清', desc: '連續 30 天清空每日任務', icon: 'check', tier: 3, group: '每日目標',
    progress: (s) => count(streakFrom(s.stats.goalDays), 30) },

  // ---- 同一個任務重複 ----
  { id: 'repeat-20', name: '習慣成形', desc: '同一個任務完成 20 次', icon: 'potion', tier: 1, group: '習慣',
    progress: (s) => ({ ...topTask(s), goal: 20 }) },
  { id: 'repeat-50', name: '刻進骨子', desc: '同一個任務完成 50 次', icon: 'potion', tier: 2, group: '習慣',
    progress: (s) => ({ ...topTask(s), goal: 50 }) },
  { id: 'repeat-100', name: '第二天性', desc: '同一個任務完成 100 次', icon: 'potion', tier: 3, group: '習慣',
    progress: (s) => ({ ...topTask(s), goal: 100 }) },

  // ---- 等級 ----
  { id: 'lv-10', name: '初出茅廬', desc: '任一身份達到 lv.10', icon: 'star', tier: 1, group: '等級',
    progress: (s) => count(maxLevel(s), 10) },
  { id: 'lv-20', name: '小有名氣', desc: '任一身份達到 lv.20', icon: 'star', tier: 2, group: '等級',
    progress: (s) => count(maxLevel(s), 20) },
  { id: 'lv-30', name: '獨當一面', desc: '任一身份達到 lv.30', icon: 'star', tier: 2, group: '等級',
    progress: (s) => count(maxLevel(s), 30) },
  { id: 'lv-45', name: '一方之霸', desc: '任一身份達到 lv.45', icon: 'star', tier: 3, group: '等級',
    progress: (s) => count(maxLevel(s), 45) },

  // ---- 進化 ----
  { id: 'evolve-1', name: '蛻變', desc: '第一次進化到新階段', icon: 'sparkle', tier: 2, group: '進化',
    progress: (s) => count(Math.max(0, ...s.identities.map((i) => stageIndex(i))), 1) },
  { id: 'evolve-all', name: '完全體', desc: '解鎖某個身份的全部階段', icon: 'sparkle', tier: 3, group: '進化',
    progress: (s) => count(fullyEvolved(s) ? 1 : 0, 1) },

  // ---- 技能 ----
  { id: 'skill-10', name: '專精', desc: '任一技能達到 lv.10', icon: 'key', tier: 2, group: '技能',
    progress: (s) => count(maxSkill(s), 10) },
  { id: 'skill-20', name: '大師', desc: '任一技能達到 lv.20', icon: 'key', tier: 3, group: '技能',
    progress: (s) => count(maxSkill(s), 20) },

  // ---- 隨機事件 ----
  { id: 'event-10', name: '不拒絕冒險', desc: '接下 10 個隨機事件', icon: 'dice', tier: 1, group: '事件',
    progress: (s) => count(s.stats.eventsAccepted, 10) },
  { id: 'event-25', name: '事件獵人', desc: '完成 25 個隨機事件', icon: 'dice', tier: 2, group: '事件',
    progress: (s) => count(s.stats.eventsDone, 25) },
  { id: 'rare-5', name: '稀有收藏家', desc: '完成 5 個稀有事件', icon: 'dice', tier: 3, group: '事件',
    progress: (s) => count(s.stats.rareDone, 5) },

  // ---- 身份 ----
  { id: 'id-2', name: '雙重身份', desc: '建立第二個身份', icon: 'smiley', tier: 1, group: '身份',
    progress: (s) => count(s.identities.length, 2) },
  { id: 'id-3', name: '三頭六臂', desc: '同時擁有三個身份', icon: 'smiley', tier: 2, group: '身份',
    progress: (s) => count(s.identities.length, 3) },

  // ---- 時段與單日 ----
  { id: 'night-owl', name: '夜貓子', desc: '凌晨 0–4 點完成任務 10 次', icon: 'potion', tier: 1, group: '習性',
    progress: (s) => count(s.stats.nightDone, 10) },
  { id: 'early-bird', name: '早起的鳥', desc: '早上 5–7 點完成任務 10 次', icon: 'potion', tier: 1, group: '習性',
    progress: (s) => count(s.stats.earlyDone, 10) },
  { id: 'busy-day', name: '忙碌的一天', desc: '單日完成 10 個任務', icon: 'grid', tier: 2, group: '習性',
    progress: (s) => count(bestDay(s), 10) },
]

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
