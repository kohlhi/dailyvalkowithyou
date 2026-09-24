// 用 Web Audio 合成的短音效，不需要音檔
let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 環境音也要用同一個 AudioContext，瀏覽器對數量有限制 */
export function audioContext(): AudioContext {
  return ac()
}

function note(freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.16) {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(c.destination)
  o.start(at)
  o.stop(at + dur + 0.05)
}

function safe(fn: (t: number) => void) {
  if (!sfx.enabled) return
  try {
    fn(ac().currentTime)
  } catch {
    /* 沒有音訊也沒關係 */
  }
}

export const sfx = {
  enabled: true,
  /** 一般點擊 */
  tap() {
    safe((t) => note(900, t, 0.05, 'square', 0.035))
  },
  /** 步驟 / 計數 +1 */
  step() {
    safe((t) => {
      note(660, t, 0.08, 'triangle', 0.12)
      note(880, t + 0.07, 0.12, 'triangle', 0.12)
    })
  },
  /** 任務完成 */
  complete() {
    safe((t) => {
      note(523, t, 0.12, 'triangle')
      note(659, t + 0.09, 0.12, 'triangle')
      note(784, t + 0.18, 0.28, 'triangle', 0.2)
    })
  },
  /** 升級 */
  levelUp() {
    safe((t) => {
      const seq = [523, 659, 784, 1047]
      seq.forEach((f, i) => note(f, t + i * 0.1, 0.16, 'square', 0.09))
      note(1319, t + 0.42, 0.6, 'triangle', 0.22)
      note(1047, t + 0.42, 0.6, 'sine', 0.12)
    })
  },
}
