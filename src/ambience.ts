/**
 * 陪伴用的環境音。
 *
 * 聲音還是程式自己算的（0 KB、離線可用、沒有授權問題），
 * 但**播放方式刻意用 `<audio>` 元素，不是直接接到 Web Audio 的 destination**。
 *
 * 原因：iOS 會把 `<audio>` 當成「媒體播放」，才有機會在鎖屏後繼續發聲、
 * 並且在鎖定畫面顯示控制項。純 Web Audio 在螢幕鎖上時幾乎一定會被暫停。
 *
 * 所以流程是：
 *   OfflineAudioContext 離線算一段無縫循環 → 編成 WAV → 丟給 <audio loop> 播
 *
 * iOS 還有一個限制：play() 必須由使用者的點擊直接觸發。
 * 算音訊是非同步的，會斷掉這個「手勢鏈」，所以點下去的當下先用一段無聲音訊
 * 把 <audio> 解鎖，算完再換成真的內容。
 */

export type 音色 = 'rain' | 'waves' | 'wind' | 'fire'

export const 音色清單: { id: 音色; 名稱: string; 說明: string }[] = [
  { id: 'rain', 名稱: '下雨', 說明: '窗外一直下，適合讀書' },
  { id: 'waves', 名稱: '海浪', 說明: '一波一波，慢慢的' },
  { id: 'wind', 名稱: '風聲', 說明: '空曠安靜，最不干擾' },
  { id: 'fire', 名稱: '爐火', 說明: '偶爾有木頭爆開的聲音' },
]

const 音量KEY = 'valko-ambience-volume'

/** 每個音色的循環長度。挑成剛好是它擺動週期的整數倍，接回開頭才不會突然變調。 */
const 循環秒: Record<音色, number> = { rain: 22, waves: 17, wind: 20, fire: 24 }

/** 接縫的交叉淡化長度 */
const 淡接秒 = 0.6

/**
 * 22.05kHz 就夠了：環境音最高只濾到 6.5kHz，聽不出跟 44.1kHz 的差別，
 * 但算出來的音訊少一半記憶體（四段全放過大約 3.5MB 而不是 7MB）。
 */
const 取樣率 = 22050

/** 一小段無聲的 WAV，只拿來在點擊當下解鎖 <audio> */
const 無聲 =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

// ── 噪音素材 ───────────────────────────────────────────────

function 白噪音(c: BaseAudioContext, 秒: number): AudioBuffer {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * 秒), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

function 棕噪音(c: BaseAudioContext, 秒: number): AudioBuffer {
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

function 循環源(c: BaseAudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const s = c.createBufferSource()
  s.buffer = buf
  s.loop = true
  return s
}

/** 慢慢擺動的低頻振盪器，讓聲音有呼吸感。頻率用「整個循環裡擺幾次」指定，才會無縫。 */
function 慢擺(c: BaseAudioContext, 擺幾次: number, 迴圈秒: number, 幅度: number, 目標: AudioParam) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = 擺幾次 / 迴圈秒
  g.gain.value = 幅度
  o.connect(g).connect(目標)
  o.start()
}

// ── 離線把一個音色算出來 ───────────────────────────────────

function 建場(kind: 音色, c: BaseAudioContext, out: AudioNode, 迴圈秒: number, 總秒: number) {
  const 素材秒 = 總秒 + 1

  if (kind === 'rain') {
    const 雨 = 循環源(c, 白噪音(c, 素材秒))
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 480
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 6500
    const g = c.createGain()
    g.gain.value = 0.34
    雨.connect(hp).connect(lp).connect(g).connect(out)
    慢擺(c, 2, 迴圈秒, 0.07, g.gain)
    雨.start()

    const 厚 = 循環源(c, 棕噪音(c, 素材秒))
    const lp2 = c.createBiquadFilter()
    lp2.type = 'lowpass'
    lp2.frequency.value = 420
    const g2 = c.createGain()
    g2.gain.value = 0.2
    厚.connect(lp2).connect(g2).connect(out)
    厚.start()
    return
  }

  if (kind === 'waves') {
    const 浪 = 循環源(c, 棕噪音(c, 素材秒))
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 650
    const g = c.createGain()
    g.gain.value = 0.42
    浪.connect(lp).connect(g).connect(out)
    // 一個循環裡起伏兩次，大約八秒半一波
    慢擺(c, 2, 迴圈秒, 0.3, g.gain)
    慢擺(c, 2, 迴圈秒, 280, lp.frequency)
    浪.start()
    return
  }

  if (kind === 'wind') {
    const 風 = 循環源(c, 棕噪音(c, 素材秒))
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 420
    bp.Q.value = 1.1
    const g = c.createGain()
    g.gain.value = 0.5
    風.connect(bp).connect(g).connect(out)
    慢擺(c, 2, 迴圈秒, 0.2, g.gain)
    慢擺(c, 1, 迴圈秒, 200, bp.frequency)
    風.start()
    return
  }

  // fire：低沉的爐火 + 隨機爆裂聲
  const 爐 = 循環源(c, 棕噪音(c, 素材秒))
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 780
  const g = c.createGain()
  g.gain.value = 0.32
  爐.connect(lp).connect(g).connect(out)
  慢擺(c, 4, 迴圈秒, 0.08, g.gain)
  爐.start()

  // 爆裂聲離線排好，不能用 setTimeout
  const 爆裂素材 = 白噪音(c, 0.2)
  let t = 0.2
  while (t < 總秒) {
    const s = c.createBufferSource()
    s.buffer = 爆裂素材
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
    t += 0.09 + Math.random() * 0.7
  }
}

/** 把尾巴交叉淡進開頭，接回去才不會「喀」一聲 */
function 接縫淡化(src: AudioBuffer, 迴圈秒: number): Float32Array {
  const sr = src.sampleRate
  const 長 = Math.floor(迴圈秒 * sr)
  const 淡 = Math.floor(淡接秒 * sr)
  const d = src.getChannelData(0)
  const out = new Float32Array(長)
  out.set(d.subarray(0, 長))
  for (let i = 0; i < 淡; i++) {
    const t = i / 淡
    out[i] = d[i] * t + d[長 + i] * (1 - t)
  }
  return out
}

function 轉WAV(d: Float32Array, sr: number): Blob {
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
  v.setUint32(24, sr, true)
  v.setUint32(28, sr * 2, true)
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

const 已算好 = new Map<音色, string>()

async function 取音訊網址(kind: 音色): Promise<string> {
  const 有 = 已算好.get(kind)
  if (有) return 有

  const 迴圈 = 循環秒[kind]
  const 總秒 = 迴圈 + 淡接秒
  const Ctor =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext
  const oc = new Ctor(1, Math.ceil(總秒 * 取樣率), 取樣率)
  建場(kind, oc, oc.destination, 迴圈, 總秒)
  const rendered = await oc.startRendering()
  const url = URL.createObjectURL(轉WAV(接縫淡化(rendered, 迴圈), 取樣率))
  已算好.set(kind, url)
  return url
}

// ── 播放 ───────────────────────────────────────────────────

let el: HTMLAudioElement | null = null
let 目前: 音色 | null = null
let 音量 = 讀音量()
/** 每次播放給一個編號，非同步算完才知道使用者有沒有又改主意 */
let 這次 = 0

function 讀音量(): number {
  try {
    const raw = localStorage.getItem(音量KEY)
    // 不能直接 Number(raw)：沒存過時 raw 是 null，而 Number(null) 是 0，
    // 那樣新使用者一進來就會是全靜音。
    if (raw !== null) {
      const v = Number(raw)
      if (Number.isFinite(v) && v >= 0 && v <= 1) return v
    }
  } catch {
    /* 沒有也沒關係 */
  }
  return 0.55
}

function 音訊元素(): HTMLAudioElement {
  if (!el) {
    el = new Audio()
    el.loop = true
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
    el.volume = 音量
  }
  return el
}

function 設定鎖屏資訊(kind: 音色) {
  const ms = navigator.mediaSession
  if (!ms) return
  const 名 = 音色清單.find((s) => s.id === kind)?.名稱 ?? '環境音'
  try {
    ms.metadata = new MediaMetadata({
      title: 名,
      artist: 'DAILY VALKO',
      album: '陪你一起',
    })
    ms.playbackState = 'playing'
    ms.setActionHandler('pause', () => ambience.停止())
    ms.setActionHandler('stop', () => ambience.停止())
    ms.setActionHandler('play', () => {
      void 音訊元素().play()
      ms.playbackState = 'playing'
    })
  } catch {
    /* 舊瀏覽器沒有就算了 */
  }
}

export const ambience = {
  get 播放中(): 音色 | null {
    return 目前
  },

  get 音量(): number {
    return 音量
  },

  /** 一定要在使用者點擊時呼叫，iOS 才准播 */
  播放(kind: 音色) {
    const a = 音訊元素()
    const 我的編號 = ++這次
    目前 = kind

    // 先用無聲音訊在「點擊的當下」解鎖元素，
    // 不然等下面算完音訊，手勢已經結束，iOS 會拒絕播放
    try {
      a.src = 無聲
      a.volume = 音量
      void a.play().catch(() => {})
    } catch {
      /* 忽略 */
    }

    void 取音訊網址(kind)
      .then((url) => {
        if (我的編號 !== 這次) return // 使用者已經改選別的或按停止了
        a.src = url
        a.volume = 音量
        設定鎖屏資訊(kind)
        return a.play()
      })
      .catch((e) => {
        console.error('環境音播不出來', e)
        if (我的編號 === 這次) 目前 = null
      })
  },

  停止() {
    這次++
    目前 = null
    if (!el) return
    try {
      el.pause()
      el.removeAttribute('src')
      el.load()
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'none'
    } catch {
      /* 忽略 */
    }
  },

  設音量(v: number) {
    音量 = Math.min(1, Math.max(0, v))
    try {
      localStorage.setItem(音量KEY, String(音量))
    } catch {
      /* 存不了也沒關係 */
    }
    if (el) el.volume = 音量
  },
}
