/**
 * 番茄鐘時間到的鈴聲，以及專注期間的「保持清醒」音軌。
 *
 * 為什麼不直接用 sound.ts 的合成音效：那是純 Web Audio，鎖屏時會被暫停，
 * 跟環境音當初失敗的原因一樣。鈴聲一定要走 `<audio>` 才有機會在背景響。
 *
 * iOS 另外兩個限制：
 *   1. play() 必須由使用者的點擊觸發。時間到的那一刻早就沒有手勢了，
 *      所以要趁使用者按「開始專注」的當下先把 `<audio>` 解鎖。
 *   2. 沒在播媒體的頁面會被丟掉重載，一重載模組狀態就歸零，
 *      解鎖過的元素也沒了，鈴聲就再也叫不動。
 *      所以專注期間一直播一段聽不見的音訊，讓系統把頁面當成正在播媒體。
 */

const 取樣率 = 22050
const 鈴聲秒 = 4.2
const 靜音秒 = 8

/** 一小段無聲的 WAV，只拿來在點擊當下解鎖 <audio> */
const 無聲 =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

function 打包WAV(d: Float32Array): Blob {
  const n = d.length
  const ab = new ArrayBuffer(44 + n * 2)
  const v = new DataView(ab)
  const 字 = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  字(0, 'RIFF')
  v.setUint32(4, 36 + n * 2, true)
  字(8, 'WAVE')
  字(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, 取樣率, true)
  v.setUint32(28, 取樣率 * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  字(36, 'data')
  v.setUint32(40, n * 2, true)
  let o = 44
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, d[i]))
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    o += 2
  }
  return new Blob([ab], { type: 'audio/wav' })
}

function 一聲(d: Float32Array, 起點秒: number, 頻率: number, 長: number, 強: number) {
  const 起 = Math.floor(起點秒 * 取樣率)
  const n = Math.floor(長 * 取樣率)
  for (let i = 0; i < n && 起 + i < d.length; i++) {
    const t = i / 取樣率
    const 衰減 = Math.exp(-t * 3.2)
    // 基音加一個泛音，聽起來比較像鐘而不是嗶
    const s =
      Math.sin(2 * Math.PI * 頻率 * t) * 0.75 + Math.sin(2 * Math.PI * 頻率 * 2.01 * t) * 0.25
    d[起 + i] += s * 衰減 * 強
  }
}

function 做鈴聲(): Blob {
  const d = new Float32Array(Math.floor(鈴聲秒 * 取樣率))
  // 上行的三個音，重複兩次，手機放在口袋裡也比較容易注意到
  const 組 = [523.25, 659.25, 783.99]
  for (const 起 of [0, 1.9]) {
    組.forEach((f, i) => 一聲(d, 起 + i * 0.22, f, 1.6, 0.38))
    一聲(d, 起 + 0.66, 1046.5, 1.9, 0.3)
  }
  return 打包WAV(d)
}

/**
 * 幾乎無聲、但不是數位零的音訊。
 * 用純零的話有些系統會判定「沒在播東西」而照樣把頁面凍結，
 * 給一點點振幅（人耳完全聽不到）比較保險。
 */
function 做靜音(): Blob {
  const n = Math.floor(靜音秒 * 取樣率)
  const d = new Float32Array(n)
  for (let i = 0; i < n; i++) d[i] = Math.sin((2 * Math.PI * 60 * i) / 取樣率) * 0.0002
  return 打包WAV(d)
}

let 鈴: HTMLAudioElement | null = null
let 鈴url: string | null = null
let 保持: HTMLAudioElement | null = null
let 保持url: string | null = null

/**
 * 一定要在使用者點擊時呼叫（按下「開始專注」的那一下）。
 * 做兩件事：把鈴聲的 `<audio>` 解鎖備用，並開始播聽不見的音訊保住頁面。
 */
export function 開始守著() {
  try {
    if (!鈴url) 鈴url = URL.createObjectURL(做鈴聲())
    if (!保持url) 保持url = URL.createObjectURL(做靜音())

    if (!鈴) {
      鈴 = new Audio()
      鈴.preload = 'auto'
      鈴.setAttribute('playsinline', '')
    }
    // 解鎖：這一步必須發生在手勢裡。先播無聲，再換成鈴聲待命。
    鈴.src = 無聲
    void 鈴.play().catch(() => {})
    window.setTimeout(() => {
      try {
        鈴?.pause()
        if (鈴 && 鈴url) {
          鈴.src = 鈴url
          鈴.load()
        }
      } catch {
        /* 忽略 */
      }
    }, 60)

    if (!保持) {
      保持 = new Audio()
      保持.loop = true
      保持.preload = 'auto'
      保持.setAttribute('playsinline', '')
      保持.volume = 1 // 音訊本身就幾乎無聲，不用再壓
    }
    保持.src = 保持url
    void 保持.play().catch((e) => console.error('保持清醒的音軌播不起來', e))
  } catch (e) {
    console.error('鈴聲準備失敗', e)
  }
}

/** 時間到了，響 */
export function 響() {
  try {
    if (!鈴 || !鈴url) return
    if (鈴.src !== 鈴url) 鈴.src = 鈴url
    鈴.currentTime = 0
    void 鈴.play().catch((e) => console.error('鈴聲響不出來', e))
  } catch (e) {
    console.error('鈴聲響不出來', e)
  }
}

/** 整個番茄鐘結束（放棄或收工），把保持清醒的音軌停掉省電 */
export function 收工() {
  try {
    保持?.pause()
  } catch {
    /* 忽略 */
  }
}

/** 鈴聲準備好了沒，給測試看的 */
export function 守著中(): boolean {
  return !!鈴 && !!鈴url && !!保持 && !保持.paused
}
