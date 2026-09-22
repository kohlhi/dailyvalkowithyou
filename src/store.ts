import { useSyncExternalStore } from 'react'
import type { Category, DailyEvent, Identity, Log, Prefs, RandomEvent, Skill, Stage, State, Stats, Task } from './types'
import { dayKey, levelFromExp, periodKeyFor, seeded, uid } from './level'
import { DEFAULT_STAGE_LEVELS, allImageIds, makeStage, sortStages, stageIndex } from './stage'
import { emptyStats, newlyUnlocked } from './achievements'
import { APP } from './appConfig'
import { blobToDataUrl, builtinId, dataUrlToBlob, listImages, putImage } from './images'

const KEY = 'daily-quest-v1'
/** 目前的資料格式版本，只在這裡改一次 */
const VERSION = 7

/** 每天遇到事件的機率 */
const EVENT_CHANCE = 0.7
/** 抽中事件時，其中是稀有事件的機率 */
const RARE_CHANCE = 0.18
/** 一個身份最多幾個階段 */
export const MAX_STAGES = 6

const DEFAULT_PREFS: Prefs = {
  sound: true,
  animation: true,
  confirm: true,
  events: true,
  reward: true,
  greet: true,
}

/** 距離上次打招呼超過這個時間才會再出現，避免切換 App 就跳一次 */
const GREET_COOLDOWN = 4 * 60 * 60 * 1000

function starterTasks(now: number): Task[] {
  const mk = (title: string, category: Category, exp: number, target = 1, steps: string[] = []): Task => ({
    id: uid(),
    title,
    category,
    exp,
    identityId: null,
    skillId: null,
    target,
    progress: 0,
    steps,
    stepsDone: steps.map(() => false),
    periodKey: periodKeyFor(category),
    doneAt: null,
    createdAt: now,
    eventDay: null,
  })
  return [
    mk('喝 2500ml 的水', 'daily', 100),
    mk('畫圖 1HR', 'daily', 300),
    mk('看書 1HR', 'daily', 300),
    mk('運動 3 次', 'weekly', 800, 3),
    mk('整理房間', 'weekly', 300, 1, ['桌面', '地板', '倒垃圾']),
    mk('完成第一個自訂任務', 'achievement', 500),
  ]
}

function starterEvents(): RandomEvent[] {
  const mk = (title: string, exp: number, rare = false): RandomEvent => ({
    id: uid(),
    title,
    exp,
    rare,
    identityId: null,
  })
  return [
    mk('額外畫一張速寫', 300),
    mk('出門散步 15 分鐘', 300),
    mk('讀 10 頁書', 300),
    mk('整理一個抽屜', 100),
    mk('寫下三件感謝的事', 100),
    mk('做 20 下伏地挺身', 300),
    mk('跟一位久沒聯絡的朋友說話', 300),
    mk('完成一件拖延超過一週的事', 2000, true),
    mk('學一個全新的東西 30 分鐘', 800, true),
  ]
}

/** 已經達到的階段直接標記為看過，之後才不會補播進化動畫 */
function markReached(identity: Identity): Identity {
  const idx = stageIndex(identity)
  return { ...identity, evolvedIds: identity.stages.slice(0, idx + 1).map((s) => s.id) }
}

/** 預設身份的內容，四階的稱號照企劃表 */
const PRESET_IDENTITIES: { stages: string[]; skills: string[]; scene: string; art: string; notes: string[] }[] = [
  {
    stages: ['假裝在讀書的狼', '筆記成山的狼', '高麗菜那桌的狼', '學霸 HOT NERD 的狼'],
    skills: ['專注', '記憶'],
    scene: '/scenes/study-night.webp',
    art: '/heroes/valko-study-1.webp',
    notes: ['今天也要努力讀書！！', '看不懂沒關係，看完再說'],
  },
  {
    stages: ['抖著拿啞鈴的狼', '汗如雨下的狼', '好像有點太大隻的狼', '健身巨學的狼'],
    skills: ['體力', '意志'],
    scene: '',
    art: '/heroes/valko-cheer.webp',
    notes: ['先做一下就好，真的', '今天不練，明天更難練'],
  },
  {
    stages: ['勉強起床的狼', '記得吃飯的狼', '自律沒被吃掉的狼', '自律狂人的狼'],
    skills: ['生活', '心情'],
    scene: '',
    art: '/heroes/valko-cheer.webp',
    notes: ['先把自己餵飽', '今天有起床就已經贏了'],
  },
]

function makeIdentity(preset: (typeof PRESET_IDENTITIES)[number]): Identity {
  const stages = DEFAULT_STAGE_LEVELS.map((lv, i) => makeStage(preset.stages[i] ?? `第 ${i + 1} 階`, lv))
  stages[0].notes = preset.notes
  stages[0].scene = preset.scene
  if (preset.art) stages[0].images = [builtinId(preset.art)]
  return {
    id: uid(),
    exp: 0,
    skills: preset.skills.map((name) => ({ id: uid(), name, exp: 0 })),
    stages,
    evolvedIds: [stages[0].id],
  }
}

function defaultState(): State {
  const identities = PRESET_IDENTITIES.map(makeIdentity)
  return {
    version: VERSION,
    name: APP.defaultUserName,
    identities,
    currentIdentityId: identities[0].id,
    tasks: starterTasks(Date.now()),
    logs: [],
    prefs: { ...DEFAULT_PREFS },
    events: starterEvents(),
    dailyEvents: {},
    rewardedDays: {},
    tutorialSeen: false,
    lastGreet: 0,
    stats: emptyStats(),
    unlocked: [],
  }
}

/** 舊資料沒有統計，先用完成紀錄盡量回推 */
function statsFromLogs(logs: Log[], tasks: Task[]): Stats {
  const st = emptyStats()
  for (const l of logs) {
    st.total++
    st.taskCounts[l.taskId] = (st.taskCounts[l.taskId] ?? 0) + 1
    const d = new Date(l.at)
    const k = dayKey(d)
    st.dayCounts[k] = (st.dayCounts[k] ?? 0) + 1
    const cat = tasks.find((t) => t.id === l.taskId)?.category ?? 'daily'
    st.byCategory[cat]++
    const h = d.getHours()
    if (h < 5) st.nightDone++
    else if (h < 8) st.earlyDone++
  }
  return st
}

/** v4 以前身份的圖庫與名字是平的，搬進第一個階段，再補上預設的進化階段 */
function upgradeIdentity(raw: Partial<Identity> & Record<string, unknown>): Identity {
  const id = String(raw.id ?? uid())
  const exp = Number(raw.exp ?? 0)
  const skills: Skill[] = Array.isArray(raw.skills)
    ? (raw.skills as Partial<Skill>[]).map((k) => ({
        id: String(k.id ?? uid()),
        name: String(k.name ?? ''),
        exp: Number(k.exp ?? 0),
      }))
    : []

  let stages: Stage[]
  if (Array.isArray(raw.stages) && raw.stages.length > 0) {
    stages = (raw.stages as Partial<Stage>[]).map((s, i) => ({
      id: String(s.id ?? uid()),
      name: String(s.name ?? `階段 ${i + 1}`),
      fromLevel: Math.max(1, Number(s.fromLevel ?? DEFAULT_STAGE_LEVELS[i] ?? 1)),
      images: Array.isArray(s.images) ? s.images : [],
      rewards: Array.isArray(s.rewards) ? s.rewards : [],
      notes: Array.isArray(s.notes) ? s.notes : [],
      scene: typeof s.scene === 'string' ? s.scene : '',
    }))
  } else {
    const name = String(raw.name ?? '冒險者')
    stages = DEFAULT_STAGE_LEVELS.map((lv) => makeStage(name, lv))
    stages[0].images = Array.isArray(raw.images) ? (raw.images as string[]) : []
    stages[0].rewards = Array.isArray(raw.rewards) ? (raw.rewards as string[]) : []
    stages[0].notes = Array.isArray(raw.notes) ? (raw.notes as string[]) : []
  }
  stages = sortStages(stages)

  const identity: Identity = {
    id,
    exp,
    skills,
    stages,
    evolvedIds: Array.isArray(raw.evolvedIds) ? (raw.evolvedIds as string[]) : [],
  }
  return identity.evolvedIds.length > 0 ? identity : markReached(identity)
}

/** 舊版資料升級 + 補齊欄位 */
function normalize(raw: unknown): State | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const v = Number(r.version)
  if (!(v >= 1 && v <= VERSION)) return null
  if (!Array.isArray(r.identities) || !Array.isArray(r.tasks) || r.identities.length === 0) return null

  const identities = (r.identities as Record<string, unknown>[]).map(upgradeIdentity)
  const tasks: Task[] = (r.tasks as Partial<Task>[]).map((t) => {
    const steps = Array.isArray(t.steps) ? t.steps : []
    return {
      id: String(t.id ?? uid()),
      title: String(t.title ?? ''),
      category: (t.category ?? 'daily') as Category,
      exp: Number(t.exp ?? 0),
      identityId: t.identityId ?? null,
      skillId: t.skillId ?? null,
      target: Math.max(1, Number(t.target ?? 1)),
      progress: Number(t.progress ?? 0),
      steps,
      stepsDone: steps.map((_, i) => Boolean(t.stepsDone?.[i])),
      periodKey: String(t.periodKey ?? ''),
      doneAt: t.doneAt ?? null,
      createdAt: Number(t.createdAt ?? Date.now()),
      eventDay: t.eventDay ?? null,
    }
  })
  const oldPrefs = r.prefs as Partial<Prefs> | undefined
  const prefs: Prefs = {
    sound: oldPrefs?.sound ?? r.sound !== false,
    animation: oldPrefs?.animation ?? true,
    confirm: oldPrefs?.confirm ?? true,
    events: oldPrefs?.events ?? true,
    reward: oldPrefs?.reward ?? true,
    greet: oldPrefs?.greet ?? true,
  }
  const events: RandomEvent[] = Array.isArray(r.events)
    ? (r.events as Partial<RandomEvent>[]).map((e) => ({
        id: String(e.id ?? uid()),
        title: String(e.title ?? ''),
        exp: Number(e.exp ?? 300),
        rare: Boolean(e.rare),
        identityId: e.identityId ?? null,
      }))
    : starterEvents()
  const ids = new Set(identities.map((i) => i.id))
  const base: State = {
    version: VERSION,
    name: String(r.name ?? APP.defaultUserName),
    identities,
    currentIdentityId: ids.has(String(r.currentIdentityId)) ? String(r.currentIdentityId) : identities[0].id,
    tasks,
    logs: Array.isArray(r.logs) ? (r.logs as Log[]) : [],
    prefs,
    events,
    dailyEvents: (r.dailyEvents as Record<string, DailyEvent>) ?? {},
    rewardedDays: (r.rewardedDays as Record<string, string>) ?? {},
    tutorialSeen: Boolean(r.tutorialSeen),
    lastGreet: Number(r.lastGreet ?? 0),
    stats: (r.stats as Stats) ?? statsFromLogs(Array.isArray(r.logs) ? (r.logs as Log[]) : [], tasks),
    unlocked: Array.isArray(r.unlocked) ? (r.unlocked as State['unlocked']) : [],
  }
  // 升級舊資料時，已經達成的徽章直接補上，不再跳動畫
  if (!Array.isArray(r.unlocked)) {
    return { ...base, unlocked: newlyUnlocked(base) }
  }
  return base
}

/** 日 / 週任務跨期後重置進度；過期的事件任務直接移除 */
export function refreshPeriods(s: State): State {
  const today = dayKey()
  let changed = false
  const kept = s.tasks.filter((t) => {
    if (t.eventDay && t.eventDay !== today) {
      changed = true
      return false
    }
    return true
  })
  const tasks = kept.map((t) => {
    if (t.category === 'achievement') return t
    const key = periodKeyFor(t.category)
    if (t.periodKey === key) return t
    changed = true
    return { ...t, periodKey: key, progress: 0, stepsDone: t.steps.map(() => false), doneAt: null }
  })
  return changed ? { ...s, tasks } : s
}

/** 依日期與身份抽今天的事件，同一天重開 App 不會重抽 */
function rollEvent(s: State): State {
  if (!s.prefs.events) return s
  const me = s.currentIdentityId
  const today = dayKey()
  if (s.dailyEvents[me]?.dayKey === today) return s

  const set = (e: DailyEvent): State => ({ ...s, dailyEvents: { ...s.dailyEvents, [me]: e } })
  const pool = s.events.filter((e) => e.identityId === null || e.identityId === me)
  if (pool.length === 0) return set({ dayKey: today, eventId: null, status: 'declined' })
  if (seeded(`${today}|${me}|roll`) > EVENT_CHANCE) {
    return set({ dayKey: today, eventId: null, status: 'declined' })
  }
  const wantRare = seeded(`${today}|${me}|rare`) < RARE_CHANCE
  const tier = pool.filter((e) => e.rare === wantRare)
  const list = tier.length > 0 ? tier : pool
  const idx = Math.floor(seeded(`${today}|${me}|pick`) * list.length) % list.length
  return set({ dayKey: today, eventId: list[idx].id, status: 'offered' })
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = normalize(JSON.parse(raw))
      if (s) return rollEvent(refreshPeriods(s))
    }
  } catch (e) {
    console.error('load failed', e)
  }
  return rollEvent(defaultState())
}

let state: State = load()

// 舊格式升級後立刻寫回，否則每次開啟都會重新產生一組階段 id
try {
  const stored = localStorage.getItem(KEY)
  if (!stored || Number(JSON.parse(stored).version) !== VERSION) {
    localStorage.setItem(KEY, JSON.stringify(state))
  }
} catch (e) {
  console.error('persist upgrade failed', e)
}

const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (e) {
    console.error('save failed', e)
  }
  listeners.forEach((l) => l())
}

function update(fn: (s: State) => State) {
  commit(fn(state))
}

export function useStore(): State {
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

export function getState(): State {
  return state
}

/** 是否該讓小人出來打招呼 */
export function greetDue(): boolean {
  return state.prefs.greet && Date.now() - state.lastGreet > GREET_COOLDOWN
}

/** 檢查是否跨日 / 跨週，需要就重置並抽新事件 */
export function tick() {
  const next = rollEvent(refreshPeriods(state))
  if (next !== state) commit(next)
}

export interface TaskInput {
  id?: string
  title: string
  category: Category
  exp: number
  identityId: string | null
  skillId: string | null
  target: number
  steps: string[]
}

export interface TapResult {
  completed: boolean
  leveledUp: boolean
  level: number
  exp: number
  /** 步驟 / 計數有前進但尚未完成 */
  advanced: boolean
  /** 這一下讓今天的每日任務全部完成 */
  dailyGoal: boolean
  /** 這一下跨進了新的進化階段 */
  evolved: boolean
}

const NOOP: TapResult = {
  completed: false,
  leveledUp: false,
  level: 1,
  exp: 0,
  advanced: false,
  dailyGoal: false,
  evolved: false,
}

/** 今天該身份的每日任務是否全部完成（至少要有一個任務） */
function dailyAllDone(s: State, identityId: string): boolean {
  const list = s.tasks.filter(
    (t) => t.category === 'daily' && (t.identityId === null || t.identityId === identityId),
  )
  return list.length > 0 && list.every((t) => t.doneAt)
}

/** 完成任務：發 exp、累計統計、寫紀錄，並檢查進化與新徽章 */
function completeTask(s: State, t: Task, me: Identity, patch: Partial<Task>): { s: State; r: TapResult } {
  const before = levelFromExp(me.exp)
  const exp = me.exp + t.exp
  const after = levelFromExp(exp)

  // 進化：升級後所在的階段還沒播過動畫就算進化
  const reached = me.stages[stageIndex(me, after)]
  const evolved = Boolean(reached) && !me.evolvedIds.includes(reached.id)

  const now = Date.now()
  const today = dayKey()
  const hour = new Date(now).getHours()

  const log: Log = {
    id: uid(),
    taskId: t.id,
    title: t.title,
    exp: t.exp,
    identityId: me.id,
    skillId: t.skillId,
    at: now,
  }
  const identities = s.identities.map((i) =>
    i.id === me.id
      ? {
          ...i,
          exp,
          skills: i.skills.map((k) => (k.id === t.skillId ? { ...k, exp: k.exp + t.exp } : k)),
          evolvedIds: evolved ? [...i.evolvedIds, reached.id] : i.evolvedIds,
        }
      : i,
  )

  // 統計是獨立累計的，不受完成紀錄上限影響
  const stats: Stats = {
    ...s.stats,
    total: s.stats.total + 1,
    taskCounts: { ...s.stats.taskCounts, [t.id]: (s.stats.taskCounts[t.id] ?? 0) + 1 },
    dayCounts: { ...s.stats.dayCounts, [today]: (s.stats.dayCounts[today] ?? 0) + 1 },
    byCategory: { ...s.stats.byCategory, [t.category]: s.stats.byCategory[t.category] + 1 },
    earlyDone: s.stats.earlyDone + (hour >= 5 && hour < 8 ? 1 : 0),
    nightDone: s.stats.nightDone + (hour < 5 ? 1 : 0),
  }
  if (t.eventDay) {
    stats.eventsDone += 1
    const d = s.dailyEvents[me.id]
    const ev = d?.eventId ? s.events.find((e) => e.id === d.eventId) : null
    if (ev?.rare) stats.rareDone += 1
  }

  let next: State = {
    ...s,
    logs: [...s.logs, log].slice(-2000),
    tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, ...patch, doneAt: now } : x)),
    identities,
    stats,
  }

  // 每日目標：當天每日任務全數完成，一天只算一次
  const goalNow = t.category === 'daily' && !next.stats.goalDays.includes(today) && dailyAllDone(next, me.id)
  if (goalNow) {
    next = { ...next, stats: { ...next.stats, goalDays: [...next.stats.goalDays, today] } }
  }
  const dailyGoal = goalNow && next.prefs.reward && next.rewardedDays[me.id] !== today
  if (dailyGoal) next = { ...next, rewardedDays: { ...next.rewardedDays, [me.id]: today } }

  const fresh = newlyUnlocked(next)
  if (fresh.length > 0) next = { ...next, unlocked: [...next.unlocked, ...fresh] }

  return {
    s: next,
    r: {
      completed: true,
      leveledUp: after > before,
      level: after,
      exp: t.exp,
      advanced: true,
      dailyGoal,
      evolved,
    },
  }
}

const identityPatch =
  (id: string, fn: (i: Identity) => Identity) =>
  (s: State): State => ({
    ...s,
    identities: s.identities.map((i) => (i.id === id ? fn(i) : i)),
  })

const stagePatch = (identityId: string, stageId: string, fn: (st: Stage) => Stage) =>
  identityPatch(identityId, (i) => ({
    ...i,
    stages: i.stages.map((st) => (st.id === stageId ? fn(st) : st)),
  }))

export const actions = {
  setName(name: string) {
    update((s) => ({ ...s, name }))
  },
  seeTutorial(seen: boolean) {
    update((s) => ({ ...s, tutorialSeen: seen }))
  },
  markGreeted() {
    update((s) => ({ ...s, lastGreet: Date.now() }))
  },
  setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    update((s) => {
      const next = { ...s, prefs: { ...s.prefs, [key]: value } }
      return key === 'events' && value ? rollEvent(next) : next
    })
  },

  // ---- 身份 ----
  addIdentity(name: string): string {
    const stages = DEFAULT_STAGE_LEVELS.map((lv) => makeStage(name, lv))
    const id = uid()
    update((s) => {
      const next: State = {
        ...s,
        identities: [...s.identities, { id, exp: 0, skills: [], stages, evolvedIds: [stages[0].id] }],
      }
      const fresh = newlyUnlocked(next)
      return fresh.length > 0 ? { ...next, unlocked: [...next.unlocked, ...fresh] } : next
    })
    return id
  },
  deleteIdentity(id: string) {
    if (state.identities.length <= 1) return
    update((s) => {
      const identities = s.identities.filter((i) => i.id !== id)
      const tasks = s.tasks.map((t) => (t.identityId === id ? { ...t, identityId: null, skillId: null } : t))
      const currentIdentityId = s.currentIdentityId === id ? identities[0].id : s.currentIdentityId
      return { ...s, identities, tasks, currentIdentityId }
    })
  },
  setIdentity(id: string) {
    update((s) => rollEvent({ ...s, currentIdentityId: id }))
  },

  // ---- 階段 ----
  addStage(identityId: string) {
    update(
      identityPatch(identityId, (i) => {
        if (i.stages.length >= MAX_STAGES) return i
        const last = i.stages[i.stages.length - 1]
        const suggested = DEFAULT_STAGE_LEVELS[i.stages.length] ?? last.fromLevel + 20
        const lv = Math.max(last.fromLevel + 1, suggested)
        return { ...i, stages: sortStages([...i.stages, makeStage(last.name, lv)]) }
      }),
    )
  },
  renameStage(identityId: string, stageId: string, name: string) {
    update(stagePatch(identityId, stageId, (st) => ({ ...st, name })))
  },
  setStageLevel(identityId: string, stageId: string, fromLevel: number) {
    update((s) =>
      identityPatch(identityId, (i) => ({
        ...i,
        stages: sortStages(i.stages.map((st) => (st.id === stageId ? { ...st, fromLevel } : st))),
      }))(s),
    )
  },
  deleteStage(identityId: string, stageId: string) {
    update(
      identityPatch(identityId, (i) => {
        if (i.stages.length <= 1 || i.stages[0].id === stageId) return i
        return {
          ...i,
          stages: sortStages(i.stages.filter((st) => st.id !== stageId)),
          evolvedIds: i.evolvedIds.filter((x) => x !== stageId),
        }
      }),
    )
  },
  addImage(identityId: string, stageId: string, imageId: string) {
    update(stagePatch(identityId, stageId, (st) => ({ ...st, images: [...st.images, imageId] })))
  },
  removeImage(identityId: string, stageId: string, imageId: string) {
    update(stagePatch(identityId, stageId, (st) => ({ ...st, images: st.images.filter((x) => x !== imageId) })))
  },
  addReward(identityId: string, stageId: string, imageId: string) {
    update(stagePatch(identityId, stageId, (st) => ({ ...st, rewards: [...st.rewards, imageId] })))
  },
  removeReward(identityId: string, stageId: string, imageId: string) {
    update(stagePatch(identityId, stageId, (st) => ({ ...st, rewards: st.rewards.filter((x) => x !== imageId) })))
  },
  addNote(identityId: string, stageId: string, note: string) {
    update(stagePatch(identityId, stageId, (st) => ({ ...st, notes: [...st.notes, note] })))
  },
  removeNote(identityId: string, stageId: string, index: number) {
    update(stagePatch(identityId, stageId, (st) => ({ ...st, notes: st.notes.filter((_, n) => n !== index) })))
  },

  // ---- 技能 ----
  addSkill(identityId: string, name: string) {
    update(identityPatch(identityId, (i) => ({ ...i, skills: [...i.skills, { id: uid(), name, exp: 0 }] })))
  },
  renameSkill(identityId: string, skillId: string, name: string) {
    update(
      identityPatch(identityId, (i) => ({
        ...i,
        skills: i.skills.map((k) => (k.id === skillId ? { ...k, name } : k)),
      })),
    )
  },
  removeSkill(identityId: string, skillId: string) {
    update((s) => ({
      ...identityPatch(identityId, (i) => ({ ...i, skills: i.skills.filter((k) => k.id !== skillId) }))(s),
      tasks: s.tasks.map((t) => (t.skillId === skillId ? { ...t, skillId: null } : t)),
    }))
  },

  // ---- 任務 ----
  saveTask(input: TaskInput) {
    const steps = input.steps.map((x) => x.trim()).filter(Boolean)
    update((s) => {
      if (input.id) {
        return {
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== input.id) return t
            const categoryChanged = t.category !== input.category
            const stepsChanged = JSON.stringify(t.steps) !== JSON.stringify(steps)
            const doneAt = categoryChanged ? null : t.doneAt
            let stepsDone = t.stepsDone
            if (categoryChanged) stepsDone = steps.map(() => false)
            else if (stepsChanged) stepsDone = steps.map(() => Boolean(doneAt))
            return {
              ...t,
              title: input.title,
              category: input.category,
              exp: input.exp,
              identityId: input.identityId,
              skillId: input.skillId,
              target: input.target,
              steps,
              stepsDone,
              periodKey: categoryChanged ? periodKeyFor(input.category) : t.periodKey,
              progress: categoryChanged ? 0 : Math.min(t.progress, input.target),
              doneAt,
            }
          }),
        }
      }
      const t: Task = {
        id: uid(),
        title: input.title,
        category: input.category,
        exp: input.exp,
        identityId: input.identityId,
        skillId: input.skillId,
        target: input.target,
        progress: 0,
        steps,
        stepsDone: steps.map(() => false),
        periodKey: periodKeyFor(input.category),
        doneAt: null,
        createdAt: Date.now(),
        eventDay: null,
      }
      return { ...s, tasks: [...s.tasks, t] }
    })
  },
  deleteTask(id: string) {
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
  },
  /** 點一下任務：計數 +1；達到次數就完成。已完成不能取消；有步驟的任務要點步驟。 */
  tapTask(id: string): TapResult {
    let result = NOOP
    update((s) => {
      const t = s.tasks.find((x) => x.id === id)
      const me = s.identities.find((i) => i.id === s.currentIdentityId)
      if (!t || !me || t.doneAt || t.steps.length > 0) return s
      const progress = t.progress + 1
      if (progress < t.target) {
        result = { ...NOOP, advanced: true }
        return { ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, progress } : x)) }
      }
      const done = completeTask(s, t, me, { progress })
      result = done.r
      return done.s
    })
    return result
  },
  /** 打勾一個步驟；全部打勾就完成任務 */
  tapStep(id: string, index: number): TapResult {
    let result = NOOP
    update((s) => {
      const t = s.tasks.find((x) => x.id === id)
      const me = s.identities.find((i) => i.id === s.currentIdentityId)
      if (!t || !me || t.doneAt || t.stepsDone[index]) return s
      const stepsDone = t.steps.map((_, i) => i === index || Boolean(t.stepsDone[i]))
      if (!stepsDone.every(Boolean)) {
        result = { ...NOOP, advanced: true }
        return { ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, stepsDone } : x)) }
      }
      const done = completeTask(s, t, me, { stepsDone, progress: t.target })
      result = done.r
      return done.s
    })
    return result
  },

  // ---- 隨機事件 ----
  saveEvent(e: { id?: string; title: string; exp: number; rare: boolean; identityId: string | null }) {
    update((s) => {
      if (e.id) {
        return { ...s, events: s.events.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id } : x)) }
      }
      return { ...s, events: [...s.events, { ...e, id: uid() }] }
    })
  },
  deleteEvent(id: string) {
    update((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }))
  },
  /** 接取今天的事件：產生一個當天限定的任務 */
  acceptEvent() {
    update((s) => {
      const me = s.currentIdentityId
      const d = s.dailyEvents[me]
      if (!d || d.status !== 'offered' || !d.eventId) return s
      const e = s.events.find((x) => x.id === d.eventId)
      if (!e) return s
      const today = dayKey()
      const t: Task = {
        id: uid(),
        title: e.title,
        category: 'daily',
        exp: e.rare ? e.exp * 2 : e.exp,
        identityId: me,
        skillId: null,
        target: 1,
        progress: 0,
        steps: [],
        stepsDone: [],
        periodKey: today,
        doneAt: null,
        createdAt: Date.now(),
        eventDay: today,
      }
      const next: State = {
        ...s,
        tasks: [...s.tasks, t],
        dailyEvents: { ...s.dailyEvents, [me]: { ...d, status: 'accepted' } },
        stats: { ...s.stats, eventsAccepted: s.stats.eventsAccepted + 1 },
      }
      const fresh = newlyUnlocked(next)
      return fresh.length > 0 ? { ...next, unlocked: [...next.unlocked, ...fresh] } : next
    })
  },
  declineEvent() {
    update((s) => {
      const me = s.currentIdentityId
      const d = s.dailyEvents[me]
      if (!d || d.status !== 'offered') return s
      return { ...s, dailyEvents: { ...s.dailyEvents, [me]: { ...d, status: 'declined' } } }
    })
  },

  // ---- 資料 ----
  resetAll() {
    commit(rollEvent(defaultState()))
  },
  async exportJson(): Promise<string> {
    const images = await listImages()
    const used = new Set(state.identities.flatMap(allImageIds))
    const packed = await Promise.all(
      images.filter((x) => used.has(x.id)).map(async (x) => ({ id: x.id, data: await blobToDataUrl(x.blob) })),
    )
    return JSON.stringify({ ...state, images: packed }, null, 2)
  },
  async importJson(raw: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(raw) as { images?: { id: string; data: string }[] }
      const s = normalize(parsed)
      if (!s) return false
      for (const img of parsed.images ?? []) {
        await putImage(await dataUrlToBlob(img.data), img.id)
      }
      commit(rollEvent(refreshPeriods(s)))
      return true
    } catch (e) {
      console.error('import failed', e)
      return false
    }
  },
}

/** 今天這個身份待決定的事件（還沒接也還沒拒絕） */
export function pendingEvent(s: State): RandomEvent | null {
  const d = s.dailyEvents[s.currentIdentityId]
  if (!d || d.status !== 'offered' || !d.eventId) return null
  return s.events.find((e) => e.id === d.eventId) ?? null
}
