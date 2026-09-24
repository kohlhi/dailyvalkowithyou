/**
 * 時間到時彈出系統橫幅。
 *
 * 這跟「推播」不一樣，不需要後端也不需要 VAPID 金鑰：
 * 推播是伺服器主動叫醒手機，那才要後端；
 * 這裡是**網頁自己還活著的時候自己叫出橫幅**。
 * 專注期間有那段聽不見的音軌把頁面保住，所以叫得動。
 *
 * iOS 的三個條件：
 *   1. iOS 16.4 以上
 *   2. **必須先加到主畫面**，在 Safari 分頁裡開是不會有的
 *   3. 要由使用者的點擊去要求授權，而且只能問一次
 *
 * 還有一個容易踩的雷：iOS 的 PWA **不支援 `new Notification()`**，
 * 一定要走 ServiceWorkerRegistration.showNotification()。
 */

export type 通知狀態 = '不支援' | '可以問' | '已允許' | '被拒絕'

export function 通知狀態(): 通知狀態 {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return '不支援'
  if (Notification.permission === 'granted') return '已允許'
  if (Notification.permission === 'denied') return '被拒絕'
  return '可以問'
}

/** 一定要由使用者的點擊觸發 */
export async function 要求許可(): Promise<通知狀態> {
  if (通知狀態() === '不支援') return '不支援'
  try {
    const r = await Notification.requestPermission()
    return r === 'granted' ? '已允許' : r === 'denied' ? '被拒絕' : '可以問'
  } catch (e) {
    console.error('要不到通知許可', e)
    return '被拒絕'
  }
}

/** 彈一則橫幅。沒有許可就安靜地不做事。 */
export async function 通知(標題: string, 內文: string) {
  if (通知狀態() !== '已允許') return
  const 選項 = {
    body: 內文,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: 'valko-focus',
    renotify: true,
  } as NotificationOptions

  try {
    // iOS 的 PWA 只認這個，new Notification() 會直接丟錯。
    // 等 registration 要設逾時，開發模式沒有 Service Worker 會永遠等下去。
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((r) => setTimeout(() => r(null), 1500)),
    ])
    if (reg) {
      await reg.showNotification(標題, 選項)
      return
    }
  } catch (e) {
    console.error('用 Service Worker 彈橫幅失敗', e)
  }

  // 沒有 Service Worker（開發模式、或舊瀏覽器）時的退路。iOS 會丟錯，接住就好。
  try {
    new Notification(標題, 選項)
  } catch (e) {
    console.error('橫幅彈不出來', e)
  }
}
