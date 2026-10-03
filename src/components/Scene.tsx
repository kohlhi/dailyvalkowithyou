import { useEffect, useRef } from 'react'
import type { 場景內容 } from '../內容'

/**
 * 首頁背景：窗外 → 雨 → 房間，由下往上疊。
 * 房間圖的窗戶是透明的，所以窗框、檯燈會自然擋在雨前面；
 * 雨再用窗外那張圖當遮罩，房間外圍透明的地方也不會飄雨。
 */
export function Scene({ layers, animate }: { layers: 場景內容; animate: boolean }) {
  return (
    <div className="scene">
      {layers.窗外 && <img className="scene-layer" src={layers.窗外} alt="" />}
      {layers.窗外 && layers.雨 && <Rain mask={layers.窗外} animate={animate} />}
      <img className="scene-room" src={layers.房間} alt="" />
    </div>
  )
}

interface Drop {
  x: number
  y: number
  len: number
  speed: number
  alpha: number
  width: number
}

/** 每平方 px 幾滴雨（CSS px），實際只有窗戶那塊看得到 */
const DENSITY = 0.0011
/** 雨被風吹斜的程度：每往下 1px 往左偏多少 */
const SLANT = 0.14

function makeDrop(w: number, h: number, anywhere: boolean): Drop {
  // 近的雨滴長、快、亮，遠的短、慢、淡，看起來才有深度
  const near = Math.random()
  return {
    x: Math.random() * (w + h * SLANT),
    y: anywhere ? Math.random() * h : -Math.random() * h * 0.3,
    len: 10 + near * 18,
    speed: 420 + near * 520,
    alpha: 0.18 + near * 0.32,
    width: 0.8 + near * 0.9,
  }
}

/**
 * 用 canvas 畫往下落的雨絲。
 * 看不到的時候（切到別頁、App 在背景、關掉動畫）就停下來，不浪費電；
 * 關掉動畫或系統要求減少動態時，畫一格靜止的雨，畫面還是下雨天。
 */
function Rain({ mask, animate }: { mask: string; animate: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let drops: Drop[] = []
    let w = 0
    let h = 0
    let raf = 0
    let last = 0
    let onScreen = true

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(w * h * DENSITY)
      drops = Array.from({ length: count }, () => makeDrop(w, h, true))
      draw()
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'
      for (const d of drops) {
        ctx.strokeStyle = `rgba(205, 228, 240, ${d.alpha})`
        ctx.lineWidth = d.width
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * SLANT, d.y + d.len)
        ctx.stroke()
      }
    }

    const step = (t: number) => {
      // 切回前景時 dt 可能很大，限制一下免得雨一次跳太遠
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0)
      last = t
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        d.y += d.speed * dt
        d.x -= d.speed * dt * SLANT
        if (d.y > h || d.x < -d.len) drops[i] = makeDrop(w, h, false)
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    const running = () => animate && !reduce.matches && onScreen && document.visibilityState === 'visible'

    const sync = () => {
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
      if (running()) raf = requestAnimationFrame(step)
      else draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    // 首頁左右滑到番茄鐘、陪伴頁時，雨就看不到了
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      sync()
    })
    io.observe(canvas)
    document.addEventListener('visibilitychange', sync)
    reduce.addEventListener('change', sync)
    resize()
    sync()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      reduce.removeEventListener('change', sync)
    }
  }, [animate])

  const maskStyle = {
    WebkitMaskImage: `url(${mask})`,
    maskImage: `url(${mask})`,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  }
  return <canvas ref={ref} className="scene-rain" style={maskStyle} aria-hidden="true" />
}
