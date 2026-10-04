/**
 * 記事本（便條紙）。
 *
 * 跟番茄鐘一樣刻意不放進 store.ts：它不給 EXP、不算 RPG 資料，
 * 自己存一個 localStorage key，不用動 VERSION 與升級路徑，任務資料一點都碰不到。
 */
import { useSyncExternalStore } from 'react'
import { uid } from './level'

const KEY = 'valko-notes-v1'
/** 一張便條最多幾個字，太長就不像便條了 */
export const 字數上限 = 300

export interface 便條 {
  id: string
  text: string
  createdAt: number
  updatedAt: number
}

function load(): 便條[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    // 沒寫字就離開的空白便條（例如還沒失焦 App 就被關掉），下次打開時順便清掉
    return raw
      .filter((n) => n && typeof n.id === 'string' && String(n.text ?? '').trim() !== '')
      .map((n) => ({
        id: n.id,
        text: String(n.text ?? ''),
        createdAt: Number(n.createdAt ?? Date.now()),
        updatedAt: Number(n.updatedAt ?? n.createdAt ?? Date.now()),
      }))
  } catch (e) {
    console.error('notes load failed', e)
    return []
  }
}

let notes: 便條[] = load()
const listeners = new Set<() => void>()

function commit(next: 便條[]) {
  notes = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (e) {
    console.error('notes save failed', e)
  }
  listeners.forEach((l) => l())
}

export function useNotes(): 便條[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => notes,
  )
}

export const 記事本 = {
  /** 新增一張空白便條放在最前面，回傳 id 讓畫面直接聚焦 */
  新增(): string {
    const now = Date.now()
    const n: 便條 = { id: uid(), text: '', createdAt: now, updatedAt: now }
    commit([n, ...notes])
    return n.id
  },
  改(id: string, text: string) {
    commit(notes.map((n) => (n.id === id ? { ...n, text: text.slice(0, 字數上限), updatedAt: Date.now() } : n)))
  },
  刪(id: string) {
    commit(notes.filter((n) => n.id !== id))
  },
  /** 寫完什麼都沒留下的便條，收起來時直接丟掉 */
  清空白(id: string) {
    const n = notes.find((x) => x.id === id)
    if (n && n.text.trim() === '') 記事本.刪(id)
  },
}

/** 每張便條固定歪一點點，看起來像隨手貼上去的；用 id 算，重開也不會變 */
export function 歪斜(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 7) - 3) * 0.6
}

/** 便條角落的小日期：今天顯示時間，其他顯示月/日 */
export function 貼上時間(t: number): string {
  const d = new Date(t)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
