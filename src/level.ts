import type { Category } from './types'

export const EXP_OPTIONS = [
  { label: '簡單', exp: 100 },
  { label: '普通', exp: 300 },
  { label: '困難', exp: 800 },
  { label: '史詩', exp: 2000 },
]

export const CATEGORY_LABEL: Record<Category, string> = {
  daily: '每日任務',
  weekly: '週任務',
  achievement: '成就',
}

/**
 * 第 level 級的起始 exp。曲線先快後慢：第一天就能升一級，
 * 第一週幾乎每天升一級，之後逐漸拉長但不會卡住。
 * 以每天約 1000 exp 估算，lv.10 約十天、lv.25 約三十九天、lv.45 約九十天。
 */
export function levelStart(level: number): number {
  return level <= 1 ? 0 : Math.round(450 * Math.pow(level - 1, 1.4))
}

export function levelFromExp(exp: number): number {
  let l = 1
  while (exp >= levelStart(l + 1)) l++
  return l
}

export function levelInfo(exp: number) {
  const level = levelFromExp(exp)
  const start = levelStart(level)
  const next = levelStart(level + 1)
  return { level, start, next, ratio: Math.min(1, (exp - start) / (next - start)) }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 以週一為一週的開始 */
export function weekKey(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - offset)
  return 'W' + dayKey(x)
}

export function periodKeyFor(category: Category, d = new Date()): string {
  if (category === 'daily') return dayKey(d)
  if (category === 'weekly') return weekKey(d)
  return ''
}

/**
 * 連續天數：從今天往回數，連續出現在清單裡的日子有幾天。
 * 今天還沒有紀錄不算中斷，會從昨天開始數。
 */
export function streakFrom(dayKeys: Iterable<string>, now = new Date()): number {
  const days = new Set(dayKeys)
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(dayKey(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/**
 * 由字串算出固定的 0~1 亂數（FNV-1a + 位元混合）。
 * 同一天同一個身份永遠得到同樣的結果，所以關掉 App 再開不會重抽事件。
 */
export function seeded(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
