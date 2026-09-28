/**
 * 小狼說話的判斷算法。台詞本身都在 內容.ts 的「五、角色台詞」，這裡只負責：
 *   1. 認出目前身份是哪一隻狼
 *   2. 開場時判斷現在是什麼情境
 *   3. 依「這一階 → 往前的階段 → 整隻狼 → 共用」找台詞並抽一句
 *   4. 記住最近說過的，避免一直重複
 *
 * 最近說過的台詞跟番茄鐘一樣自己存一個 localStorage key，
 * 不進 store、不動 VERSION、不進備份 JSON。清掉也只是可能又聽到一樣的話。
 */
import { 角色台詞, type 台詞條件, type 台詞組, type 情境台詞, type 清單進度台詞 } from './內容'
import type { Category, Identity, State } from './types'

type 清單名 = '每日' | '每週' | '成就'
import { dayKey, levelFromExp, streakFrom } from './level'
import { displayName, stageIndex } from './stage'

const KEY = 'valko-lines-v1'
/** 階段台詞每一句被抽到的機會是一般台詞的幾倍 */
const STAGE_WEIGHT = 2

type 清單類別 = Exclude<keyof 台詞組, '開場' | '清單底部'>
type 變數 = Record<string, string | number>

// ── 認出是哪一隻狼 ──

/** 身份對應的小狼系列代號；使用者自建的身份是 null */
export function roleOf(identity: Identity): string | null {
  return identity.role
}

function tablesFor(identity: Identity) {
  const role = roleOf(identity)
  return {
    role: role ?? '其他',
    wolf: (role && 角色台詞[role]) || {},
    common: 角色台詞.共用 ?? {},
  }
}

const filled = <T>(v: T[] | undefined): v is T[] => Array.isArray(v) && v.length > 0

/** 這一階有寫就用這一階，沒寫就往前找最近一個有寫的階段 */
function stageLayer<T>(identity: Identity, get: (g: 台詞組) => T[] | undefined): T[] | undefined {
  const stages = tablesFor(identity).wolf.階段 ?? []
  for (let i = stageIndex(identity); i >= 0; i--) {
    const v = stages[i] ? get(stages[i]) : undefined
    if (filled(v)) return v
  }
  return undefined
}

// ── 避免重複 ──

function loadRecent(): Record<string, string[]> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function remember(key: string, line: string, poolSize: number) {
  const keep = Math.ceil(poolSize / 2)
  if (keep < 1) return
  try {
    const all = loadRecent()
    all[key] = [line, ...(all[key] ?? []).filter((l) => l !== line)].slice(0, keep)
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // 私密瀏覽或空間不足，就讓它可能重複
  }
}

function drawFrom(key: string, pool: string[]): string | null {
  if (pool.length === 0) return null
  const recent = new Set(loadRecent()[key] ?? [])
  const fresh = pool.filter((l) => !recent.has(l))
  const from = fresh.length > 0 ? fresh : pool
  const line = from[Math.floor(Math.random() * from.length)]
  remember(key, line, pool.length)
  return line
}

/**
 * 階段台詞與一般台詞混在一起抽，階段的每一句加權 STAGE_WEIGHT 倍。
 * 用句數算機率，某一階只寫一句時才不會一直聽到同一句。
 */
function draw(key: string, stage: string[] | undefined, general: string[] | undefined): string | null {
  const s = stage ?? []
  const g = general ?? []
  const chance = (s.length * STAGE_WEIGHT) / (s.length * STAGE_WEIGHT + g.length)
  if (s.length > 0 && Math.random() < chance) return drawFrom(key + ':階段', s)
  return drawFrom(key, g)
}

/** 代入 {變數}，對不到的原樣留著 */
function fill(line: string, vars: 變數): string {
  return line.replace(/\{([^{}]+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

// ── 一般類別：點小狼、確認、完成後… ──

/** 依「這一階 → 往前的階段 → 整隻狼 → 共用」找到台詞並抽一句 */
function speak(identity: Identity, key: string, get: (g: 台詞組) => string[] | undefined, vars: 變數) {
  const { role, wolf, common } = tablesFor(identity)
  const own = get(wolf)
  const general = filled(own) ? own : get(common)
  const line = draw(`${role}:${key}`, stageLayer(identity, get), general)
  return line === null ? null : fill(line, { 稱號: displayName(identity), 等級: levelFromExp(identity.exp), ...vars })
}

export function say(identity: Identity, kind: 清單類別, vars: 變數 = {}): string | null {
  return speak(identity, kind, (g) => g[kind], vars)
}

const LIST_NAME: Record<Category, 清單名> = { daily: '每日', weekly: '每週', achievement: '成就' }

/** 任務清單底部那句話，依進度分成空的／沒開始／進行中／剩一個／全部完成 */
export function footLine(identity: Identity, category: Category, done: number, total: number): string | null {
  const left = total - done
  const vars = { 完成: done, 剩下: left, 總數: total }
  if (total === 0) return speak(identity, '清單底部:空的', (g) => g.清單底部?.空的, vars)
  const state: keyof 清單進度台詞 = left === 0 ? '全部完成' : done === 0 ? '沒開始' : left === 1 ? '剩一個' : '進行中'
  const list = LIST_NAME[category]
  return speak(identity, `清單底部:${list}:${state}`, (g) => g.清單底部?.[list]?.[state], vars)
}

/** 點首頁小狼。使用者自建的身份沒有台詞表，改說他自己寫的寄語 */
export function tapLine(identity: Identity, ownNotes: string[]): string | null {
  if (roleOf(identity) === null && ownNotes.length > 0) {
    return ownNotes[Math.floor(Math.random() * ownNotes.length)]
  }
  return say(identity, '點小狼') ?? (ownNotes[0] ?? null)
}

/** 剛進化到目前這一階時說的話，只看這一階，不往前找 */
export function evolveLine(identity: Identity): string | null {
  const { role, wolf, common } = tablesFor(identity)
  const idx = stageIndex(identity)
  const own = wolf.階段?.[idx]?.進化
  const pool = own && own.length > 0 ? own : wolf.進化 && wolf.進化.length > 0 ? wolf.進化 : common.進化
  const line = drawFrom(`${role}:進化:${idx}`, pool ?? [])
  return line === null ? null : fill(line, { 稱號: displayName(identity) })
}

// ── 開場 ──

interface 現況 {
  hour: number
  weekday: number
  fresh: boolean
  idleDays: number
  yesterday: boolean
  streak: number
  dailyTotal: number
  dailyLeft: number
  weeklyLeft: number
  level: number
}

function daysBetween(a: Date, b: Date): number {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((y - x) / 86_400_000)
}

function snapshot(state: State, identity: Identity, now: Date): 現況 {
  const mine = state.tasks.filter((t) => t.identityId === null || t.identityId === identity.id)
  const daily = mine.filter((t) => t.category === 'daily')
  const weekly = mine.filter((t) => t.category === 'weekly')

  // 最新的紀錄一定還在（logs 只截掉舊的），所以「最後一次」可以從 logs 找
  let last = 0
  const yKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  let yesterday = false
  for (const l of state.logs) {
    if (l.identityId !== identity.id) continue
    if (l.at > last) last = l.at
    if (!yesterday && dayKey(new Date(l.at)) === yKey) yesterday = true
  }
  const fresh = identity.exp === 0
  // 有經驗值卻找不到紀錄，代表紀錄早就被截掉，當作很久沒動
  const idleDays = fresh ? 0 : last > 0 ? daysBetween(new Date(last), now) : Infinity

  return {
    hour: now.getHours(),
    weekday: now.getDay(),
    fresh,
    idleDays,
    yesterday,
    streak: streakFrom(Object.keys(state.stats.dayCounts), now),
    dailyTotal: daily.length,
    dailyLeft: daily.filter((t) => !t.doneAt).length,
    weeklyLeft: weekly.filter((t) => !t.doneAt).length,
    level: levelFromExp(identity.exp),
  }
}

function inHours([from, to]: [number, number], h: number): boolean {
  return from <= to ? h >= from && h < to : h >= from || h < to
}

function matches(c: 台詞條件, n: 現況): boolean {
  if (c.從沒完成 !== undefined && c.從沒完成 !== n.fresh) return false
  if (c.時段 && !inHours(c.時段, n.hour)) return false
  if (c.星期 && !c.星期.includes(n.weekday)) return false
  if (c.沒動 !== undefined && !(n.idleDays >= c.沒動)) return false
  if (c.昨天有完成 !== undefined && c.昨天有完成 !== n.yesterday) return false
  if (c.連續 && !c.連續.includes(n.streak)) return false
  if (c.每日剩至少 !== undefined && n.dailyLeft < c.每日剩至少) return false
  if (c.週任務剩至少 !== undefined && n.weeklyLeft < c.週任務剩至少) return false
  if (c.今日完成 !== undefined && c.今日完成 !== (n.dailyTotal > 0 && n.dailyLeft === 0)) return false
  if (c.等級 && (n.level < c.等級[0] || n.level > c.等級[1])) return false
  return true
}

function hello(h: number): string {
  if (h < 5) return '還沒睡嗎'
  if (h < 11) return '早安'
  if (h < 14) return '午安'
  if (h < 18) return '下午好'
  return '晚安'
}

/** 打開 App 時小狼的第一句話 */
export function openingLine(state: State, identity: Identity, now = new Date()): string | null {
  const { role, wolf, common } = tablesFor(identity)
  const base: 情境台詞[] = wolf.開場 && wolf.開場.length > 0 ? wolf.開場 : (common.開場 ?? [])
  const stage = stageLayer(identity, (g) => g.開場) ?? []

  // 名字跟基本情境一樣的，是替那個情境加台詞；不一樣的是這一階才有的新情境，優先檢查
  const names = new Set(base.map((e) => e.情境))
  const extra = new Map(stage.filter((e) => names.has(e.情境)).map((e) => [e.情境, e.台詞]))
  const order: { entry: 情境台詞; stageLines?: string[] }[] = [
    ...stage.filter((e) => !names.has(e.情境)).map((entry) => ({ entry })),
    ...base.map((entry) => ({ entry, stageLines: extra.get(entry.情境) })),
  ]

  const n = snapshot(state, identity, now)
  const hit = order.find(({ entry }) => matches(entry.條件 ?? {}, n))
  if (!hit) return null

  const isStageOnly = hit.stageLines === undefined && !names.has(hit.entry.情境)
  const line = isStageOnly
    ? drawFrom(`${role}:開場:${hit.entry.情境}:階段`, hit.entry.台詞)
    : draw(`${role}:開場:${hit.entry.情境}`, hit.stageLines, hit.entry.台詞)
  if (line === null) return null

  return fill(line, {
    招呼: hello(n.hour),
    稱號: displayName(identity),
    剩下: n.dailyLeft,
    連續: n.streak,
    天數: Number.isFinite(n.idleDays) ? n.idleDays : '好幾',
    等級: n.level,
  })
}
