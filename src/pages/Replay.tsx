import { useMemo, useState } from 'react'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { addDays, fmtDateCN, fmtMinutes, fmtSigned, fromISODate, relativeDayLabel, toISODate, todayISO, weekdayLabel } from '../lib/date'
import { Button, Card, Empty, SectionHead, Stat, Tag } from '../components/ui'
import { DayTimeline } from '../components/timeline'
import { Icon } from '../components/icons'

export function ReplayPage() {
  const { state } = useApp()
  const [date, setDate] = useState(todayISO())

  const dayTasks = useMemo(
    () => state.tasks.filter((t) => t.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [state.tasks, date],
  )
  const dayLogs = useMemo(
    () => state.logs.filter((l) => l.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [state.logs, date],
  )

  const plannedMinutes = dayTasks.reduce((s, t) => s + t.plannedMinutes, 0)
  const actualMinutes = dayLogs.reduce((s, l) => s + l.minutes, 0)
  const delta = actualMinutes - plannedMinutes

  const deviations = dayTasks
    .map((t) => {
      const log = state.logs.find((l) => l.taskId === t.id)
      return log ? { task: t, log, diff: log.minutes - t.plannedMinutes } : null
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const shift = (n: number) => setDate(toISODate(addDays(fromISODate(date), n)))

  const narrative = (() => {
    if (!dayTasks.length && !dayLogs.length) return null
    const biggest = deviations[0]
    const parts: string[] = []
    if (biggest && Math.abs(biggest.diff) >= 10) {
      parts.push(
        `偏差最大的是「${biggest.task.title}」：计划 ${fmtMinutes(
          biggest.task.plannedMinutes,
        )}，实际 ${fmtMinutes(biggest.log.minutes)}（${fmtSigned(biggest.diff)}）。`,
      )
    }
    if (dayTasks.length) {
      const done = dayTasks.filter((t) => t.status === 'done').length
      parts.push(`当天 ${dayTasks.length} 项安排中完成了 ${done} 项。`)
    }
    const unlogged = dayTasks.filter((t) => !state.logs.some((l) => l.taskId === t.id))
    if (unlogged.length) {
      parts.push(`还有 ${unlogged.length} 项没有对应记录，它们的时间去向仍然是未知的。`)
    }
    return parts.join('')
  })()

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">时间回放</span>
          <h1 className="page-title">{relativeDayLabel(date)}的时间去了哪里</h1>
          <p className="page-sub">把一天摊开来看：计划了什么，实际做了什么，偏差发生在哪一段。</p>
        </div>
        <div className="topbar-actions">
          <Button size="sm" onClick={() => shift(-1)}>
            ←
          </Button>
          <input
            className="input"
            type="date"
            style={{ width: 158 }}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <Button size="sm" onClick={() => shift(1)} disabled={date >= todayISO()}>
            →
          </Button>
          <Button size="sm" variant="quiet" onClick={() => setDate(todayISO())}>
            今天
          </Button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card>
          <Stat label="计划投入" value={fmtMinutes(plannedMinutes)} hint={`${dayTasks.length} 项安排`} />
        </Card>
        <Card>
          <Stat label="实际记录" value={fmtMinutes(actualMinutes)} hint={`${dayLogs.length} 条记录`} />
        </Card>
        <Card>
          <Stat
            label="计划与实际之差"
            value={fmtSigned(delta)}
            hint={delta > 0 ? '实际比计划更久' : delta < 0 ? '实际比计划更短' : '完全吻合'}
            tone={delta > 0 ? 'warn' : delta < 0 ? 'good' : 'default'}
          />
        </Card>
        <Card>
          <Stat
            label="完成率"
            value={
              dayTasks.length
                ? `${Math.round((dayTasks.filter((t) => t.status === 'done').length / dayTasks.length) * 100)}%`
                : '—'
            }
            hint={dayTasks.length ? '已完成 / 已安排' : '无安排'}
          />
        </Card>
      </div>

      <div className="split">
        <div className="stack">
          <Card>
            <SectionHead
              title={`${fmtDateCN(date, true)} · ${weekdayLabel(date)}`}
              hint="上排为计划，下排为实际"
              action={<Tag tone="accent">24h</Tag>}
            />
            {dayTasks.length + dayLogs.length === 0 ? (
              <Empty
                title="这一天还没有痕迹"
                hint="换一个日期，或先去记录几笔时间。"
              />
            ) : (
              <DayTimeline date={date} tasks={state.tasks} logs={state.logs} height={38} />
            )}
          </Card>

          <Card>
            <SectionHead title="偏差明细" hint="实际用时 − 计划用时，按影响排序" />
            {deviations.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                没有可对比的记录。完成计划时顺手记录实际用时，这里才有内容。
              </p>
            ) : (
              deviations.map(({ task, log, diff }) => {
                const cat = CATEGORY_MAP[task.category]
                return (
                  <div key={task.id} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="task-title">
                        <span className="dot" style={{ background: cat.color, display: 'inline-block', marginRight: 7 }} />
                        {task.title}
                      </div>
                      <div className="task-meta">
                        {task.start} 开始 · 计划 {fmtMinutes(task.plannedMinutes)} · 实际{' '}
                        {fmtMinutes(log.minutes)}
                      </div>
                    </div>
                    <Tag tone={Math.abs(diff) < 10 ? 'good' : diff > 0 ? 'warn' : 'accent'}>
                      {fmtSigned(diff)}
                    </Tag>
                  </div>
                )
              })
            )}
          </Card>
        </div>

        <div className="stack">
          <Card>
            <SectionHead title="这一天说明了什么" />
            {narrative ? (
              <p style={{ fontSize: 13.5, lineHeight: 1.85, color: 'var(--ink-2)' }}>{narrative}</p>
            ) : (
              <p className="muted" style={{ fontSize: 13 }}>
                选一个你有记录的日期，这里会自动生成一句总结。
              </p>
            )}
            <div className="notice" style={{ marginTop: 16 }}>
              <Icon name="spark" size={15} />
              <span>回放的意义不是评判这一天，而是让下一次的估计更接近现实。</span>
            </div>
          </Card>

          <Card>
            <SectionHead title="当天的实际构成" hint="按类别汇总" />
            {dayLogs.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                暂无记录
              </p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {Object.entries(
                  dayLogs.reduce<Record<string, number>>((acc, l) => {
                    acc[l.category] = (acc[l.category] ?? 0) + l.minutes
                    return acc
                  }, {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([c, m]) => {
                    const cat = CATEGORY_MAP[c as keyof typeof CATEGORY_MAP]
                    return (
                      <div key={c}>
                        <div className="row between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                          <span className="row" style={{ gap: 6 }}>
                            <span className="dot" style={{ background: cat.color }} />
                            {cat.label}
                          </span>
                          <span className="num muted">{fmtMinutes(m)}</span>
                        </div>
                        <div className="progress" style={{ height: 5 }}>
                          <span
                            style={{
                              width: `${(m / actualMinutes) * 100}%`,
                              background: cat.color,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
