import type { Task, TimeLog } from '../types'
import { CATEGORY_MAP } from '../data/categories'
import { parseClock } from '../lib/date'

export function DayTimeline({
  date,
  tasks,
  logs,
  height = 34,
}: {
  date: string
  tasks: Task[]
  logs: TimeLog[]
  height?: number
}) {
  const dayTasks = tasks.filter((t) => t.date === date)
  const dayLogs = logs.filter((l) => l.date === date)

  const block = (
    key: string,
    startMin: number,
    minutes: number,
    color: string,
    label: string,
    dashed: boolean,
  ) => {
    const left = (startMin / 1440) * 100
    const width = Math.max((minutes / 1440) * 100, 0.42)
    return (
      <div
        key={key}
        className={`timeline-block ${dashed ? 'planned' : ''}`}
        style={{
          left: `${left}%`,
          width: `${width}%`,
          background: dashed ? undefined : color,
          color: dashed ? color : '#fff',
          borderColor: color,
        }}
        title={`${label} · ${startMin % 60 === 0 ? '' : ''}${minutes} 分钟`}
      >
        {width > 5.5 ? label : ''}
      </div>
    )
  }

  return (
    <div className="timeline">
      <div className="timeline-hours">
        {Array.from({ length: 9 }, (_, i) => i * 3).map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>

      <div className="timeline-lane" style={{ height: 24 }} title="计划">
        {dayTasks.map((t) =>
          block(
            `p-${t.id}`,
            parseClock(t.start),
            t.plannedMinutes,
            CATEGORY_MAP[t.category].color,
            t.title,
            true,
          ),
        )}
      </div>

      <div className="timeline-lane actual" style={{ height }}>
        {dayLogs.map((l) =>
          block(
            `l-${l.id}`,
            parseClock(l.start),
            l.minutes,
            CATEGORY_MAP[l.category].color,
            l.title,
            false,
          ),
        )}
      </div>

      <div className="timeline-legend">
        <span>
          <i style={{ background: 'transparent', border: '1px dashed var(--faint)' }} />
          计划
        </span>
        <span>
          <i style={{ background: 'var(--accent)' }} />
          实际
        </span>
      </div>
    </div>
  )
}
