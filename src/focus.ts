/**
 * 番茄鐘。
 *
 * 刻意不放進 store.ts：它不給 EXP、不算 RPG 資料、也不進備份 JSON。
 * 自己存一個 localStorage key，就完全不用動 store 的 VERSION 與升級路徑，
 * 使用者的任務資料一點都碰不到。
 *
 * **倒數不是用計時器累加，而是記「結束時間戳」。**
 * iOS 的 PWA 被切到背景常常整個重新載入，用累加的會算錯，
 * 用時間戳的話不管睡多久，醒來看一次時鐘就知道還剩多少。
 */
import { useSyncExternalStore } from 'react'
import { dayKey } from './level'

const KEY = 'valko-focus-v1'

export type 階段 = 'idle' | 'focus' | 'break'

export interface Focus {
  phase: 階段
  /** 這一段什麼時候結束（毫秒時間戳），idle 時沒有意義 */
  endsAt: number
  /** 專注與休息的長度，分鐘 */
  focusMin: number
  breakMin: number
  /** 完成幾輪專注 */
  round: number
  /** round 是哪一天的，跨日自動歸零 */
  day: string
}

export const 專注長度選項 = [15, 25, 40, 50]
export const 休息長度選項 = [5, 10, 15]

/** 結束後超過這麼久才回到 App，就不自動接下一段（使用者早就離開了） */
const 太久沒回來 = 60 * 1000

function 預設(): Focus {
  return { phase: 'idle', endsAt: 0, focusMin: 25, breakMin: 5, round: 0, day: dayKey() }
}

function load(): Focus {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const r = JSON.parse(raw) as Partial<Focus>
      const phase: 階段 = r.phase === 'focus' || r.phase === 'break' ? r.phase : 'idle'
      return {
        phase,
        endsAt: Number(r.endsAt ?? 0),
        focusMin: Number(r.focusMin ?? 25),
        breakMin: Number(r.breakMin ?? 5),
        round: Number(r.round ?? 0),
        day: String(r.day ?? dayKey()),
      }
    }
  } catch (e) {
    console.error('focus load failed', e)
  }
  return 預設()
}

let state: Focus = load()
const listeners = new Set<() => void>()

function commit(next: Focus) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (e) {
    console.error('focus save failed', e)
  }
  listeners.forEach((l) => l())
}

/** 還剩幾毫秒。閒置時是 0。 */
export function 剩餘(f: Focus): number {
  if (f.phase === 'idle') return 0
  return Math.max(0, f.endsAt - Date.now())
}

/** 這一段的時間到了沒 */
export function 時間到(f: Focus): boolean {
  return f.phase !== 'idle' && Date.now() >= f.endsAt
}

/** 今天完成幾輪（跨日自動歸零） */
export function 今日輪數(f: Focus): number {
  return f.day === dayKey() ? f.round : 0
}

/** 顯示用的 mm:ss */
export function 格式(ms: number): string {
  const 總秒 = Math.ceil(ms / 1000)
  const 分 = Math.floor(總秒 / 60)
  const 秒 = 總秒 % 60
  return `${String(分).padStart(2, '0')}:${String(秒).padStart(2, '0')}`
}

export const focus = {
  get value(): Focus {
    return state
  },

  開始專注() {
    commit({ ...state, phase: 'focus', endsAt: Date.now() + state.focusMin * 60_000 })
  },

  開始休息() {
    commit({ ...state, phase: 'break', endsAt: Date.now() + state.breakMin * 60_000 })
  },

  /** 放棄這一段，不記輪數 */
  停止() {
    commit({ ...state, phase: 'idle', endsAt: 0 })
  },

  設定長度(focusMin: number, breakMin: number) {
    commit({ ...state, focusMin, breakMin })
  },

  /**
   * 時間到了就結算。回傳這次有沒有真的結束一段專注，讓畫面決定要不要出聲。
   *
   * 如果是 App 被丟到背景很久才回來，就不自動接休息 —— 使用者早就走了，
   * 這時候默默開始倒數五分鐘沒有意義。
   */
  結算(): 'focus-done' | 'break-done' | null {
    const f = state
    if (f.phase === 'idle' || Date.now() < f.endsAt) return null
    const 遲到 = Date.now() - f.endsAt > 太久沒回來

    if (f.phase === 'focus') {
      const 今天 = dayKey()
      const round = f.day === 今天 ? f.round + 1 : 1
      commit(
        遲到
          ? { ...f, phase: 'idle', endsAt: 0, round, day: 今天 }
          : { ...f, phase: 'break', endsAt: Date.now() + f.breakMin * 60_000, round, day: 今天 },
      )
      return 'focus-done'
    }

    commit({ ...f, phase: 'idle', endsAt: 0 })
    return 'break-done'
  },
}

export function useFocus(): Focus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => state,
  )
}
