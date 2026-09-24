/**
 * 陪伴用的環境音，全部用 Web Audio 即時合成。
 *
 * 為什麼不放音檔：中文授權的 lofi 音樂不好找，檔案動輒好幾 MB，
 * 而且 PWA 要離線可用就得整包預先下載。合成的話 0 KB、長度無限、沒網路照放。
 *
 * iOS 限制：AudioContext 一定要由「使用者的點擊」啟動，所以播放一定是點按鈕觸發的。
 * 另外手機鎖屏後聲音通常會停，這是網頁 App 的限制，不是這裡寫錯。
 */
import { audioContext } from './sound'

export type 音色 = 'rain' | 'waves' | 'wind' | 'fire'

export const 音色清單: { id: 音色; 名稱: string; 說明: string }[] = [
  { id: 'rain', 名稱: '下雨', 說明: '窗外一直下，適合讀書' },
  { id: 'waves', 名稱: '海浪', 說明: '一波一波，慢慢的' },
  { id: 'wind', 名稱: '風聲', 說明: '空曠安靜，最不干擾' },
  { id: 'fire', 名稱: '爐火', 說明: '偶爾有木頭爆開的聲音' },
]

const 音量KEY = 'valko-ambience-volume'

// ── 噪音素材 ───────────────────────────────────────────────

/** 白噪音：沙沙的，高頻多 */
function 白噪音(c: AudioContext, 秒 = 4): AudioBuffer {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * 秒), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

/** 棕噪音：低沉的，像遠處的隆隆聲 */
function 棕噪音(c: AudioContext, 秒 = 4): AudioBuffer {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * 秒), c.sampleRate)
  const d = b.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    last = (last + 0.02 * w) / 1.02
    d[i] = last * 3.2
  }
  return b
}

function 循環(c: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const s = c.createBufferSource()
  s.buffer = buf
  s.loop = true
  return s
}

/** 一個慢慢擺動的低頻振盪器，用來讓聲音有呼吸感 */
function 慢擺(c: AudioContext, 週期秒: number, 幅度: number, 目標: AudioParam) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = 1 / 週期秒
  g.gain.value = 幅度
  o.connect(g).connect(目標)
  o.start()
  return o
}

// ── 播放中的狀態 ───────────────────────────────────────────

let 主控: GainNode | null = null
let 來源: AudioScheduledSourceNode[] = []
let 排程: number[] = []
let 目前: 音色 | null = null
let 音量 = 讀音量()

function 讀音量(): number {
  try {
    const raw = localStorage.getItem(音量KEY)
    // 注意：不能直接 Number(raw)，沒存過時 raw 是 null 而 Number(null) 是 0，
    // 那樣每個新使用者一進來就會是全靜音。
    if (raw !== null) {
      const v = Number(raw)
      if (Number.isFinite(v) && v >= 0 && v <= 1) return v
    }
  } catch {
    /* 沒有也沒關係 */
  }
  return 0.55
}

function 建場(kind: 音色, c: AudioContext, out: GainNode) {
  const 加來源 = (n: AudioScheduledSourceNode) => {
    n.start()
    來源.push(n)
  }

  if (kind === 'rain') {
    // 主體：帶通過的白噪音，像持續的雨幕
    const 雨 = 循環(c, 白噪音(c))
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 480
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 6500
    const g = c.createGain()
    g.gain.value = 0.34
    雨.connect(hp).connect(lp).connect(g).connect(out)
    慢擺(c, 11, 0.07, g.gain)
    加來源(雨)

    // 底層：低頻的厚度，讓雨聽起來不只是沙沙聲
    const 厚 = 循環(c, 棕噪音(c))
    const lp2 = c.createBiquadFilter()
    lp2.type = 'lowpass'
    lp2.frequency.value = 420
    const g2 = c.createGain()
    g2.gain.value = 0.2
    厚.connect(lp2).connect(g2).connect(out)
    加來源(厚)
    return
  }

  if (kind === 'waves') {
    const 浪 = 循環(c, 棕噪音(c))
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 650
    const g = c.createGain()
    g.gain.value = 0.42
    浪.connect(lp).connect(g).connect(out)
    // 一波大約八秒，音量與亮度一起起伏才像海浪
    慢擺(c, 8.5, 0.3, g.gain)
    慢擺(c, 8.5, 280, lp.frequency)
    加來源(浪)
    return
  }

  if (kind === 'wind') {
    const 風 = 循環(c, 棕噪音(c))
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 420
    bp.Q.value = 1.1
    const g = c.createGain()
    g.gain.value = 0.5
    風.connect(bp).connect(g).connect(out)
    慢擺(c, 13, 0.2, g.gain)
    慢擺(c, 17, 200, bp.frequency)
    加來源(風)
    return
  }

  // fire：低沉的爐火 + 隨機爆裂聲
  const 爐 = 循環(c, 棕噪音(c))
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 780
  const g = c.createGain()
  g.gain.value = 0.32
  爐.connect(lp).connect(g).connect(out)
  慢擺(c, 6, 0.08, g.gain)
  加來源(爐)

  const 爆裂 = () => {
    if (!主控) return
    const t = c.currentTime
    const s = c.createBufferSource()
    s.buffer = 白噪音(c, 0.05)
    const f = c.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 1200 + Math.random() * 1800
    const cg = c.createGain()
    const 強 = 0.05 + Math.random() * 0.13
    cg.gain.setValueAtTime(強, t)
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.1)
    s.connect(f).connect(cg).connect(out)
    s.start(t)
    s.stop(t + 0.2)
    排程.push(window.setTimeout(爆裂, 90 + Math.random() * 700))
  }
  排程.push(window.setTimeout(爆裂, 250))
}

// ── 對外 ───────────────────────────────────────────────────

export const ambience = {
  get 播放中(): 音色 | null {
    return 目前
  },

  get 音量(): number {
    return 音量
  },

  播放(kind: 音色) {
    this.停止()
    try {
      const c = audioContext()
      const out = c.createGain()
      // 淡入，避免一開始「啵」一聲
      out.gain.setValueAtTime(0.0001, c.currentTime)
      out.gain.linearRampToValueAtTime(音量, c.currentTime + 1.2)
      out.connect(c.destination)
      主控 = out
      目前 = kind
      建場(kind, c, out)
    } catch (e) {
      console.error('環境音播不出來', e)
      this.停止()
    }
  },

  停止() {
    排程.forEach((t) => window.clearTimeout(t))
    排程 = []
    const out = 主控
    const 舊來源 = 來源
    主控 = null
    來源 = []
    目前 = null
    if (!out) return
    try {
      const c = audioContext()
      // 淡出再真的關掉，直接切會有爆音
      out.gain.cancelScheduledValues(c.currentTime)
      out.gain.setValueAtTime(out.gain.value, c.currentTime)
      out.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.5)
      window.setTimeout(() => {
        舊來源.forEach((s) => {
          try {
            s.stop()
          } catch {
            /* 已經停了 */
          }
        })
        out.disconnect()
      }, 600)
    } catch {
      /* 關不掉就算了 */
    }
  },

  設音量(v: number) {
    音量 = Math.min(1, Math.max(0, v))
    try {
      localStorage.setItem(音量KEY, String(音量))
    } catch {
      /* 存不了也沒關係 */
    }
    if (主控) {
      try {
        const c = audioContext()
        主控.gain.cancelScheduledValues(c.currentTime)
        主控.gain.setTargetAtTime(音量, c.currentTime, 0.05)
      } catch {
        /* 忽略 */
      }
    }
  },
}
