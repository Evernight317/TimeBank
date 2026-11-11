import { useMemo, useState } from 'react'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { fmtDateCN, fmtMinutes, fmtSigned, parseClock, relativeDayLabel, todayISO, weekdayLabel } from '../lib/date'
import { Button, Card, Empty, SectionHead, Stat } from '../components/ui'
import { CompareRow } from '../components/charts'
import { LogModal, LogRow } from '../components/forms'
import { Icon } from '../components/icons'

export function RecordsPage() {
  const { state } = useApp()
  const [date, setDate] = useState(todayISO())
  const [open, setOpen] = useState(false)

  const dayLogs = state.logs
    .filter((l) => l.date === date)
    .sort((a, b) => parseClock(a.start) - parseClock(b.start))
  const dayTasks = state.tasks.filter((t) => t.date === date)

  const total = dayLogs.reduce((s, l) => s + l.minutes, 0)
  const effective = dayLogs
    .filter((l) => l.category === 'study' || l.category === 'work')
    .reduce((s, l) => s + l.minutes, 0)

  const comparisons = useMemo(() => {
    return dayTasks
      .filter((t) => t.category !== 'sleep')
      .map((t) => {
        const log = state.logs.find((l) => l.taskId === t.id)
        return log ? { task: t, log } : null
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => parseClock(a.log.start) - parseClock(b.log.start))
  }, [dayTasks, state.logs])

  const maxCompare = Math.max(
    60,
    ...comparisons.flatMap((c) => [c.task.plannedMinutes, c.log.minutes]),
  )
  const totalDelta = comparisons.reduce((s, c) => s + (c.log.minutes - c.task.plannedMinutes), 0)

  const recentDates = useMemo(() => {
    const set = new Set(state.logs.map((l) => l.date))
    return [...set].sort((a, b) => b.localeCompare(a)).slice(0, 10)
  }, [state.logs])

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">时间记录</span>
          <h1 className="page-title">记录，才看得见</h1>
          <p className="page-sub">计划是意图，记录才是事实。两者之间的差距，就是可以优化的地方。</p>
        </div>
        <div className="topbar-actions">
          <input
            className="input"
            type="date"
            style={{ width: 160 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={15} />
            记录时间
          </Button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card>
          <Stat label="记录总时长" value={fmtMinutes(total)} hint={`${dayLogs.length} 条记录`} />
        </Card>
        <Card>
          <Stat label="有效投入" value={fmtMinutes(effective)} hint="学习 + 工作" tone="good" />
        </Card>
        <Card>
          <Stat
            label="达成安排"
            value={`${comparisons.length}/${dayTasks.length}`}
            hint="已记录 / 已安排"
          />
        </Card>
        <Card>
          <Stat
            label="相对计划的偏差"
            value={fmtSigned(totalDelta)}
            hint="正数代表超时"
            tone={totalDelta > 0 ? 'warn' : 'good'}
          />
        </Card>
      </div>

      <div className="split">
        <div className="stack">
          <Card>
            <SectionHead
              title={`计划 vs 实际 · ${relativeDayLabel(date)}`}
              hint="灰色为计划，彩色为实际"
            />
            {comparisons.length === 0 ? (
              <Empty
                title="这一天还没有可对比的记录"
                hint="当你完成一项安排并记录实际用时，这里会显示偏差。"
              />
            ) : (
              <div>
                {comparisons.map(({ task, log }) => (
                  <CompareRow
                    key={task.id}
                    label={task.title}
                    glyph={CATEGORY_MAP[task.category].glyph}
                    color={CATEGORY_MAP[task.category].color}
                    planned={task.plannedMinutes}
                    actual={log.minutes}
                    max={maxCompare}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHead
              title={`${fmtDateCN(date)} · ${weekdayLabel(date)} 的记录`}
              action={
                <Button size="sm" variant="quiet" onClick={() => setOpen(true)}>
                  补录
                </Button>
              }
            />
            {dayLogs.length === 0 ? (
              <Empty title="暂无记录" hint="哪怕只记一笔 20 分钟，也比凭感觉更接近事实。" />
            ) : (
              dayLogs.map((l) => <LogRow key={l.id} log={l} />)
            )}
          </Card>
        </div>

        <div className="stack">
          <Card>
            <SectionHead title="最近有记录的日子" hint="点击切换查看" />
            <div className="stack" style={{ gap: 2 }}>
              {recentDates.map((d) => {
                const minutes = state.logs
                  .filter((l) => l.date === d)
                  .reduce((s, l) => s + l.minutes, 0)
                const active = d === date
                return (
                  <button
                    key={d}
                    className="row between"
                    onClick={() => setDate(d)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: 9,
                      border: '1px solid transparent',
                      background: active ? 'var(--accent-tint)' : 'transparent',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>
                      {fmtDateCN(d)} <span className="faint">· {weekdayLabel(d)}</span>
                    </span>
                    <span className="num muted" style={{ fontSize: 12.5 }}>
                      {fmtMinutes(minutes)}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <SectionHead title="类别分布" hint="当天已记录时间" />
            <div className="stack" style={{ gap: 8 }}>
              {dayLogs.length === 0 && <p className="muted">暂无数据</p>}
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
                            width: `${total ? (m / total) * 100 : 0}%`,
                            background: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
            <div className="notice" style={{ marginTop: 16 }}>
              <Icon name="spark" size={15} />
              <span>记录不需要精确到分钟，但需要持续。连续性比精度更重要。</span>
            </div>
          </Card>
        </div>
      </div>

      <LogModal open={open} onClose={() => setOpen(false)} date={date} />
    </div>
  )
}
