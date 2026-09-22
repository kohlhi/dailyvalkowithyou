export type Category = 'daily' | 'weekly' | 'achievement'

/** 身份技能：任務可對應技能，完成後技能也累積 exp */
export interface Skill {
  id: string
  name: string
  exp: number
}

/**
 * 身份的一個進化階段。等級到達 fromLevel 就切換到這個階段，
 * 小人圖庫、獎勵圖庫、寄語與名字都會跟著換。
 */
export interface Stage {
  id: string
  /** 這個階段的稱號，例如 Paladin → Sir. Paladin */
  name: string
  /** 到達這個等級才解鎖，第一個階段固定是 1 */
  fromLevel: number
  images: string[]
  rewards: string[]
  notes: string[]
}

/** 身份（繪師、健身…），各自累積 exp 與等級 */
export interface Identity {
  id: string
  exp: number
  skills: Skill[]
  /** 依 fromLevel 由小到大排序，至少有一個從 lv.1 開始 */
  stages: Stage[]
  /** 已經播放過進化動畫的階段 id */
  evolvedIds: string[]
}

export interface Task {
  id: string
  title: string
  category: Category
  exp: number
  /** null = 所有身份都會顯示 */
  identityId: string | null
  /** 對應技能（屬於 identityId 那個身份） */
  skillId: string | null
  /** 需要完成的次數，達到後才算完成（有步驟時忽略） */
  target: number
  progress: number
  /** 自訂步驟：全部打勾才算完成 */
  steps: string[]
  stepsDone: boolean[]
  /** 進度所屬的期間 (daily: YYYY-MM-DD, weekly: W+週一日期, achievement: '') */
  periodKey: string
  doneAt: number | null
  createdAt: number
  /** 來自隨機事件的限時任務：只在這一天有效，隔天自動消失 */
  eventDay: string | null
}

export interface Log {
  id: string
  taskId: string
  title: string
  exp: number
  identityId: string
  skillId: string | null
  at: number
}

/** 隨機事件池的一筆 */
export interface RandomEvent {
  id: string
  title: string
  exp: number
  /** 稀有事件：exp 加倍，出現機率較低 */
  rare: boolean
  /** null = 任何身份都可能遇到 */
  identityId: string | null
}

/** 某個身份在某一天的事件狀態 */
export interface DailyEvent {
  dayKey: string
  /** null = 今天沒抽到事件 */
  eventId: string | null
  status: 'offered' | 'accepted' | 'declined'
}

/** 使用者偏好：回饋與功能開關 */
export interface Prefs {
  sound: boolean
  /** 星星爆開、卡片彈跳等特效 */
  animation: boolean
  /** 點任務後由小人詢問確認 */
  confirm: boolean
  /** 每日隨機事件 */
  events: boolean
  /** 重新開啟時小人出來打招呼 */
  greet: boolean
  /** 完成當日每日任務的獎勵圖 */
  reward: boolean
}

/** 長期統計：獨立累計，不依賴會被截斷的完成紀錄 */
export interface Stats {
  /** 每個任務完成過幾次 */
  taskCounts: Record<string, number>
  /** 每天完成幾個任務 (key = YYYY-MM-DD) */
  dayCounts: Record<string, number>
  /** 清空當日全部每日任務的日子 */
  goalDays: string[]
  total: number
  byCategory: Record<Category, number>
  eventsAccepted: number
  eventsDone: number
  rareDone: number
  /** 早上 5–7 點完成 */
  earlyDone: number
  /** 凌晨 0–4 點完成 */
  nightDone: number
}

/** 已解鎖的成就徽章 */
export interface Unlocked {
  id: string
  at: number
  /** 觸發時的補充說明，例如是哪個任務達成的 */
  note?: string
}

export interface State {
  version: 6
  name: string
  identities: Identity[]
  currentIdentityId: string
  tasks: Task[]
  logs: Log[]
  prefs: Prefs
  events: RandomEvent[]
  /** key = identityId，每個身份每天各抽一次 */
  dailyEvents: Record<string, DailyEvent>
  /** 已播放過獎勵圖的日期 (key = identityId) */
  rewardedDays: Record<string, string>
  /** 第一次使用的圖卡教學是否看過 */
  tutorialSeen: boolean
  /** 上次小人打招呼的時間，用來做冷卻 */
  lastGreet: number
  stats: Stats
  unlocked: Unlocked[]
}
