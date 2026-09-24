import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category, Task } from './types'
import { actions, getState, greetDue, pendingEvent, tick, useStore } from './store'
import type { TapResult } from './store'
import { CATEGORY_LABEL, levelInfo, streakFrom } from './level'
import { displayName } from './stage'
import { APP } from './appConfig'
import { sfx } from './sound'
import { BackIcon, CalendarIcon, GridIcon, SmileyIcon, Sparkle, StarIcon, TrophyIcon } from './Icons'
import { HomePages } from './screens/HomePages'
import { TaskList } from './screens/TaskList'
import { TaskForm } from './screens/TaskForm'
import { Settings } from './screens/Settings'
import { Overview } from './screens/Overview'
import { IdentityEditor } from './screens/IdentityEditor'
import { EventPool } from './screens/EventPool'
import { EventSheet } from './components/EventSheet'
import { RewardOverlay } from './components/RewardOverlay'
import { Greeting } from './components/Greeting'
import { Tutorial } from './components/Tutorial'
import { EvolveOverlay } from './components/EvolveOverlay'
import { BadgeOverlay } from './components/BadgeOverlay'
import { Badges } from './screens/Badges'

type Screen =
  | { name: 'home' }
  | { name: 'tasks'; category: Category }
  | { name: 'form'; category: Category; task?: Task; back: Screen }
  | { name: 'settings' }
  | { name: 'identity'; id: string }
  | { name: 'events' }
  | { name: 'badges' }
  | { name: 'overview' }

/**
 * 同時可能想彈出來的東西：教學、打招呼、今日事件、獎勵圖、升級。
 * 一次只顯示佇列最前面那個，關掉才換下一個，避免互相蓋住。
 */
type Overlay =
  | { kind: 'tutorial' }
  | { kind: 'greet' }
  | { kind: 'event' }
  | { kind: 'reward' }
  | { kind: 'levelup'; level: number }
  | { kind: 'evolve' }
  | { kind: 'badge'; id: string; note?: string }

const TABS: { category: Category; Icon: typeof StarIcon; label: string }[] = [
  { category: 'daily', Icon: StarIcon, label: '每日任務' },
  { category: 'weekly', Icon: CalendarIcon, label: '週任務' },
  { category: 'achievement', Icon: TrophyIcon, label: '成就' },
]

function screenKey(sc: Screen): string {
  switch (sc.name) {
    case 'tasks':
      return 'tasks:' + sc.category
    case 'form':
      return 'form:' + (sc.task?.id ?? 'new')
    case 'identity':
      return 'identity:' + sc.id
    default:
      return sc.name
  }
}

export default function App() {
  const s = useStore()
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null)
  const [queue, setQueue] = useState<Overlay[]>([])
  const [switching, setSwitching] = useState(false)

  sfx.enabled = s.prefs.sound

  const top = queue[0] ?? null
  const push = useCallback((o: Overlay) => setQueue((q) => [...q, o]), [])
  const close = useCallback(() => setQueue((q) => q.slice(1)), [])

  /** 啟動或從背景回來時，把該出現的東西排進佇列 */
  const openLaunchOverlays = useCallback(() => {
    setQueue((q) => {
      const st = getState()
      const has = (k: Overlay['kind']) => q.some((o) => o.kind === k)
      const add: Overlay[] = []
      if (!st.tutorialSeen && !has('tutorial')) add.push({ kind: 'tutorial' })
      if (greetDue() && !has('greet')) add.push({ kind: 'greet' })
      if (pendingEvent(st) && !has('event')) add.push({ kind: 'event' })
      return add.length ? [...q, ...add] : q
    })
  }, [])

  // 跨日 / 跨週自動重置，並在回到前景時檢查一次
  useEffect(() => {
    tick()
    openLaunchOverlays()
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        tick()
        openLaunchOverlays()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    const id = setInterval(tick, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
      clearInterval(id)
    }
  }, [openLaunchOverlays])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1400)
    return () => clearTimeout(id)
  }, [toast])

  // 任何來源新增的徽章都會被這裡撿走排隊，第一次掛載時只記錄基準
  const seenUnlocks = useRef<number | null>(null)
  useEffect(() => {
    if (seenUnlocks.current === null) {
      seenUnlocks.current = s.unlocked.length
      return
    }
    if (s.unlocked.length > seenUnlocks.current) {
      const fresh = s.unlocked.slice(seenUnlocks.current)
      seenUnlocks.current = s.unlocked.length
      setQueue((q) => [...q, ...fresh.map((u) => ({ kind: 'badge', id: u.id, note: u.note }) as Overlay)])
    }
  }, [s.unlocked])

  // 升級畫面輪到自己時才開始倒數
  useEffect(() => {
    if (top?.kind !== 'levelup') return
    const id = setTimeout(close, 2000)
    return () => clearTimeout(id)
  }, [top, close])

  const showToast = (msg: string) => setToast({ msg, key: Date.now() })

  const onResult = (r: TapResult) => {
    const add: Overlay[] = []
    if (r.dailyGoal) add.push({ kind: 'reward' })
    if (r.leveledUp) add.push({ kind: 'levelup', level: r.level })
    if (r.evolved) add.push({ kind: 'evolve' })
    if (add.length > 0) {
      sfx.levelUp()
      setQueue((q) => [...q, ...add])
      return
    }
    if (r.completed) {
      sfx.complete()
      showToast(`+${r.exp} exp`)
    } else if (r.advanced) {
      sfx.step()
    }
  }

  const go = (next: Screen) => {
    sfx.tap()
    setScreen(next)
  }

  const me = s.identities.find((i) => i.id === s.currentIdentityId) ?? s.identities[0]
  const isRoot = screen.name === 'home' || screen.name === 'tasks'
  const event = pendingEvent(s)
  const goBack = () => {
    if (screen.name === 'form') go(screen.back)
    else if (screen.name === 'identity' || screen.name === 'events') go({ name: 'settings' })
    else if (screen.name === 'badges') go({ name: 'overview' })
    else go({ name: 'home' })
  }

  let title = s.name
  let sub = APP.tagline
  if (screen.name === 'tasks') sub = CATEGORY_LABEL[screen.category]
  if (screen.name === 'form') {
    title = screen.task ? '編輯任務' : '自訂任務'
    sub = CATEGORY_LABEL[screen.category]
  }
  if (screen.name === 'settings') {
    title = '使用者偏好'
    sub = s.name
  }
  if (screen.name === 'identity') {
    title = '身份編輯'
    const found = s.identities.find((i) => i.id === screen.id)
    sub = found ? displayName(found) : ''
  }
  if (screen.name === 'events') {
    title = '事件池'
    sub = '每日隨機事件'
  }
  if (screen.name === 'badges') {
    title = '徽章櫃'
    sub = `${s.unlocked.length} 個已解鎖`
  }
  if (screen.name === 'overview') {
    title = '任務總覽'
    sub = displayName(me)
  }

  return (
    <div className="app">
      <header className="header">
        {isRoot ? (
          <button className="icon-btn" aria-label="任務總覽" onClick={() => go({ name: 'overview' })}>
            <GridIcon />
          </button>
        ) : (
          <button className="icon-btn" aria-label="返回" onClick={goBack}>
            <BackIcon />
          </button>
        )}
        <div className="header-title">
          <div className="name">{title}</div>
          <div className="sub mono">{sub}</div>
        </div>
        <button
          className="icon-btn smiley"
          aria-label="使用者偏好"
          aria-pressed={screen.name === 'settings'}
          onClick={() => go(screen.name === 'settings' ? { name: 'home' } : { name: 'settings' })}
        >
          <SmileyIcon size={36} />
        </button>
      </header>

      <main className="main">
        <div className="screen-anim" key={screenKey(screen)}>
          {screen.name === 'home' && (
            <HomePages
              key={s.currentIdentityId}
              onSwitch={() => setSwitching(true)}
              onEvent={() => push({ kind: 'event' })}
            />
          )}
          {screen.name === 'tasks' && (
            <TaskList
              category={screen.category}
              onResult={onResult}
              onAdd={() => go({ name: 'form', category: screen.category, back: screen })}
              onEdit={(t) => go({ name: 'form', category: t.category, task: t, back: screen })}
            />
          )}
          {screen.name === 'form' && (
            <TaskForm key={screen.task?.id ?? 'new'} task={screen.task} category={screen.category} onDone={goBack} />
          )}
          {screen.name === 'settings' && (
            <Settings
              onToast={showToast}
              onEditIdentity={(id) => go({ name: 'identity', id })}
              onEvents={() => go({ name: 'events' })}
              onTutorial={() => push({ kind: 'tutorial' })}
            />
          )}
          {screen.name === 'identity' && (
            <IdentityEditor id={screen.id} onToast={showToast} onDeleted={() => go({ name: 'settings' })} />
          )}
          {screen.name === 'events' && <EventPool />}
          {screen.name === 'badges' && <Badges />}
          {screen.name === 'overview' && (
            <Overview
              onEdit={(t) => go({ name: 'form', category: t.category, task: t, back: screen })}
              onAdd={(c) => go({ name: 'form', category: c, back: screen })}
              onBadges={() => go({ name: 'badges' })}
            />
          )}
        </div>
      </main>

      {isRoot && (
        <nav className="tabbar">
          {TABS.map(({ category, Icon, label }) => {
            const active = screen.name === 'tasks' && screen.category === category
            return (
              <button
                key={category}
                className={'tab' + (active ? ' active' : '')}
                aria-label={label}
                aria-pressed={active}
                onClick={() => go(active ? { name: 'home' } : { name: 'tasks', category })}
              >
                <Icon size={30} />
              </button>
            )
          })}
        </nav>
      )}

      {switching && (
        <div className="backdrop" onClick={() => setSwitching(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="block-title">身份轉換</h2>
            <ul className="identity-pick">
              {s.identities.map((i) => (
                <li key={i.id}>
                  <button
                    className={'pick' + (i.id === s.currentIdentityId ? ' on' : '')}
                    onClick={() => {
                      actions.setIdentity(i.id)
                      sfx.step()
                      setSwitching(false)
                      openLaunchOverlays()
                    }}
                  >
                    <span>{displayName(i)}</span>
                    <span className="mono small">
                      lv.{levelInfo(i.exp).level}
                      {i.skills.length > 0 ? ` · ${i.skills.map((k) => k.name).join(' / ')}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="ghost"
              onClick={() => {
                setSwitching(false)
                go({ name: 'settings' })
              }}
            >
              管理身份 →
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div key={toast.key} className="toast">
          <span>{toast.msg}</span>
        </div>
      )}

      {top?.kind === 'tutorial' && (
        <Tutorial
          onDone={() => {
            actions.seeTutorial(true)
            close()
          }}
        />
      )}

      {top?.kind === 'greet' && (
        <Greeting
          identity={me}
          tasks={s.tasks.filter((t) => t.identityId === null || t.identityId === me.id)}
          streak={streakFrom(Object.keys(s.stats.dayCounts))}
          onClose={() => {
            actions.markGreeted()
            close()
          }}
        />
      )}

      {top?.kind === 'event' &&
        (event ? (
          <EventSheet
            event={event}
            identity={me}
            onAccept={() => {
              actions.acceptEvent()
              sfx.complete()
              showToast('接下任務 ✦')
              close()
            }}
            onDecline={() => {
              actions.declineEvent()
              close()
            }}
            onClose={close}
          />
        ) : null)}

      {top?.kind === 'reward' && <RewardOverlay identity={me} onClose={close} />}

      {top?.kind === 'evolve' && <EvolveOverlay identity={me} onClose={close} />}

      {top?.kind === 'badge' && <BadgeOverlay id={top.id} note={top.note} onClose={close} />}

      {top?.kind === 'levelup' && (
        <div className="levelup" onClick={close}>
          <Sparkle size={44} className="lu-sp a" />
          <Sparkle size={26} className="lu-sp b" />
          <Sparkle size={36} className="lu-sp c" />
          <Sparkle size={20} className="lu-sp d" />
          <div className="lu-text">LEVEL UP</div>
          <div className="lu-level mono">lv. {top.level}</div>
          <div className="lu-name">{displayName(me)}</div>
        </div>
      )}
    </div>
  )
}
