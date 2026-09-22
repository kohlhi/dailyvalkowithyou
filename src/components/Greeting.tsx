import type { Identity, Task } from '../types'
import { pick } from '../level'
import { displayName, inherited } from '../stage'
import { FlameIcon } from '../Icons'
import { Hero } from './Hero'

function timeHello(h: number): string {
  if (h < 5) return '還沒睡嗎'
  if (h < 11) return '早安'
  if (h < 14) return '午安'
  if (h < 18) return '下午好'
  return '晚安'
}

/** 重新開啟 App 時，小人出來打個招呼並報今天的狀況 */
export function Greeting({
  identity,
  tasks,
  streak,
  onClose,
}: {
  identity: Identity
  tasks: Task[]
  streak: number
  onClose: () => void
}) {
  const hello = timeHello(new Date().getHours())
  const daily = tasks.filter((t) => t.category === 'daily')
  const left = daily.filter((t) => !t.doneAt).length
  const note = pick(inherited(identity, 'notes'))

  let status: string
  if (daily.length === 0) status = '今天還沒有每日任務，先去加一個吧'
  else if (left === 0) status = '今天的每日任務已經全部完成了'
  else if (left === daily.length) status = `今天有 ${left} 個任務在等你`
  else status = `今天還剩 ${left} 個任務`

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal confirm" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-top">
          <Hero identity={identity} className="confirm-hero" />
          <div className="confirm-say">
            <p className="confirm-ask">
              {hello}，{displayName(identity)}
            </p>
            <p className="confirm-note mono">{status}</p>
          </div>
        </div>

        {streak > 0 && (
          <div className="greet-streak mono">
            <FlameIcon size={16} /> 連續 {streak} 天沒有斷過
          </div>
        )}
        {note && <p className="greet-note">{note}</p>}

        <button className="pill wide" onClick={onClose}>
          出發
        </button>
      </div>
    </div>
  )
}
