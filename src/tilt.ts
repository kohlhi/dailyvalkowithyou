/**
 * 背景視差：滑鼠移動或手機傾斜時，各圖層依深度移動。
 *
 * 開關跟番茄鐘一樣自己存一個 localStorage key，不進 store、不進備份 JSON。
 * iPhone 讀陀螺儀要使用者點一下再按「允許」（DeviceOrientationEvent.requestPermission），
 * 所以 iPhone 的陀螺儀預設關閉，打開開關那一下才去要權限；其他裝置不用權限，預設開啟。
 * 滑鼠視差不需要權限，只要沒有被明確關掉就會動。
 */
import { useSyncExternalStore, type RefObject, useEffect } from 'react'

const KEY = 'valko-tilt-v1'
/** 深度 1.0 的圖層最多移動幾 px */
const MAX_SHIFT = 12
/** 手機傾斜幾度算滿格 */
const TILT_RANGE = 22

type PermissionFn = () => Promise<'granted' | 'denied'>

function permissionFn(): PermissionFn | null {
  const D = typeof DeviceOrientationEvent === 'undefined' ? null : (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn })
  return typeof D?.requestPermission === 'function' ? D.requestPermission.bind(D) : null
}

/** iPhone / iPad 才需要先要權限；Mac 的 Safari 雖然也有這個函式，但沒有觸控、也沒有陀螺儀 */
export const needsPermission = () => permissionFn() !== null && navigator.maxTouchPoints > 0

function readStored(): boolean | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? null : v === '1'
  } catch {
    return null
  }
}

/** 使用者明確的選擇；null 是還沒選過 */
let stored: boolean | null = readStored()
/** 設定頁開關與陀螺儀：沒選過時，要權限的裝置預設關 */
const tiltOn = () => stored ?? !needsPermission()
/** 滑鼠：沒有被明確關掉就動 */
const mouseOn = () => stored !== false
const listeners = new Set<() => void>()

function setEnabled(on: boolean) {
  stored = on
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // 存不了就只在這次開啟有效
  }
  listeners.forEach((l) => l())
}

/** 設定頁的開關。打開時若需要權限會跳出詢問，被拒絕就維持關閉並回傳 false */
export async function toggleTilt(on: boolean): Promise<boolean> {
  if (on) {
    const ask = needsPermission() ? permissionFn() : null
    if (ask) {
      try {
        if ((await ask()) !== 'granted') {
          setEnabled(false)
          return false
        }
      } catch {
        setEnabled(false)
        return false
      }
    }
  }
  setEnabled(on)
  return true
}

export function useTiltEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => tiltOn(),
  )
}

function useMouseEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => mouseOn(),
  )
}

/**
 * iPhone 重新開啟 App 後，權限有時要再要一次。已經允許過的話這一步不會跳視窗，
 * 但一定要在使用者點擊時呼叫，所以掛在第一次點擊上。
 */
let regranted = false
function regrantOnTap() {
  if (regranted || stored !== true || !needsPermission()) return
  const ask = permissionFn()
  if (!ask) return
  regranted = true
  ask().catch(() => {
    regranted = false
  })
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v))

/**
 * 把傾斜量寫進 el 的 CSS 變數 --px / --py（-1 ~ 1），圖層用 calc() 各自乘上自己的深度。
 * 不經過 React 重新渲染，每格只改兩個變數，很省。
 * 看不到（滑到別頁、App 在背景）、關掉動畫、系統要求減少動態時就停下來歸零。
 */
export function useParallax(ref: RefObject<HTMLElement | null>, active: boolean) {
  const tilt = useTiltEnabled()
  const mouse = useMouseEnabled()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let raf = 0
    let onScreen = true
    // 陀螺儀以第一次讀到的角度當作「正」，之後慢慢跟著使用者換的姿勢回正
    let base: { b: number; g: number } | null = null

    const write = () => {
      el.style.setProperty('--px', cx.toFixed(4))
      el.style.setProperty('--py', cy.toFixed(4))
    }

    const frame = () => {
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08
      write()
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(frame) : 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const live = () => active && !reduce.matches && onScreen && document.visibilityState === 'visible'

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !mouse || !live()) return
      tx = clamp((e.clientX / window.innerWidth) * 2 - 1)
      ty = clamp((e.clientY / window.innerHeight) * 2 - 1)
      kick()
    }
    const onLeave = () => {
      tx = 0
      ty = 0
      kick()
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (!tilt || !live() || e.beta === null || e.gamma === null) return
      if (!base) base = { b: e.beta, g: e.gamma }
      base.b += (e.beta - base.b) * 0.004
      base.g += (e.gamma - base.g) * 0.004
      tx = clamp((e.gamma - base.g) / TILT_RANGE)
      ty = clamp((e.beta - base.b) / TILT_RANGE)
      kick()
    }

    const sync = () => {
      if (live()) return
      tx = ty = cx = cy = 0
      base = null
      cancelAnimationFrame(raf)
      raf = 0
      write()
    }

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      sync()
    })
    io.observe(el)
    window.addEventListener('pointermove', onPointer)
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('deviceorientation', onOrient)
    window.addEventListener('pointerdown', regrantOnTap, { once: true })
    document.addEventListener('visibilitychange', sync)
    reduce.addEventListener('change', sync)
    sync()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('deviceorientation', onOrient)
      window.removeEventListener('pointerdown', regrantOnTap)
      document.removeEventListener('visibilitychange', sync)
      reduce.removeEventListener('change', sync)
      el.style.removeProperty('--px')
      el.style.removeProperty('--py')
    }
  }, [ref, active, tilt, mouse])
}

/** 某個深度的圖層要用的 CSS translate 值 */
export function depthShift(depth: number): string {
  const k = (-depth * MAX_SHIFT).toFixed(2)
  return `calc(var(--px, 0) * ${k}px) calc(var(--py, 0) * ${k}px)`
}
