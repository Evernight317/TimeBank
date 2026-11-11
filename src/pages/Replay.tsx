import { useMemo, useState } from 'react'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { fmtDateCN, fmtMinutes, fmtSigned, fromISODate, relativeDayLabel, toISODate, todayISO, weekdayLabel, addDays } from '../lib/date'
import { SubHeader, PageHead } from '../components/nav'
import { Button, Empty } from '../components/ui'
import { DayTimeline } from '../components/timeline'
import { Icon } from '../components/icons'

export function ReplayPage() {
  const { state } = useApp()
  const yesterday = toISODate(addDays(new Date(), -1))
  const [date, setDate] = useState(yesterday)

  const dayTasks = useMemo(
    () => state.tasks.filter((t) => t.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [state.tasks, date],
  )
  const dayLogs = useMemo(
    () => state.logs.filter((l) => l.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [state.logs, date],
  )

  const planned = dayTasks.reduce((s, t) => s + t.plannedMinutes, 0)
  const actual = dayLogs.reduce((s, l) => s + l.minutes, 0)
  const delta = actual - planned
  const done = dayTasks.filter((t) => t.status === 'done').length

  const deviations = dayTasks
    .map((t) => {
      const log = state.logs.find((l) => l.taskId === t.id)
      return log ? { task: t, log, diff: log.minutes - t.plannedMinutes } : null
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const unlogged = dayTasks.filter((t) => !state.logs.some((l) => l.taskId === t.id))
  const shift = (n: number) => setDate(toISODate(addDays(fromISODate(date), n)))

  return (
    <div className="screen">
      <SubHeader title="时间回放" onBack={() => (window.location.hash = '#/today')} />

      <PageHead
        title={`${relativeDayLabel(date)}的时间去了哪里`}
        sub={`${fmtDateCN(date, true)} · ${weekdayLabel(date)}`}
      />

      <div className="row" style={{ gap: 6 }}>
        <Button size="sm" onClick={() => shift(-1)} aria-label="前一天">
          ←
        </Button>
        <input
          className="input"
          type="date"
          style={{ flex: 1, padding: '8px 10px', fontSize: 12 }}
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
        <Button size="sm" onClick={() => shift(1)} disabled={date >= todayISO()} aria-label="后一天">
          →
        </Button>
      </div>

      <div className="metric-grid">
        <div className="metric-cell">
          <div className="k">计划投入</div>
          <div className="v">{fmtMinutes(planned)}</div>
          <div className="d">{dayTasks.length} 项安排</div>
        </div>
        <div className="metric-cell">
          <div className="k">实际记录</div>
          <div className="v">{fmtMinutes(actual)}</div>
          <div className="d">{dayLogs.length} 条记录</div>
        </div>
        <div className="metric-cell">
          <div className="k">计划与实际之差</div>
          <div className="v" style={{ color: delta > 0 ? 'var(--amber)' : 'var(--green)' }}>
            {fmtSigned(delta)}
          </div>
          <div className="d">{delta > 0 ? '实际比计划更久' : '实际比计划更短'}</div>
        </div>
        <div className="metric-cell">
          <div className="k">完成率</div>
          <div className="v">{dayTasks.length ? `${Math.round((done / dayTasks.length) * 100)}%` : '—'}</div>
          <div className="d">{done} / {dayTasks.length}</div>
        </div>
      </div>

      <section className="block">
        <div className="block-head">
          <h2>一天的时间轴</h2>
          <span className="meta">上排计划 · 下排实际</span>
        </div>
        <div className="card">
          {dayTasks.length + dayLogs.length === 0 ? (
            <Empty title="这一天还没有痕迹" hint="换一个日期，或先去记录几笔时间。" />
          ) : (
            <DayTimeline date={date} tasks={state.tasks} logs={state.logs} height={30} />
          )}
        </div>
      </section>

      {deviations.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h2>偏差明细</h2>
            <span className="meta">按影响排序</span>
          </div>
          <div className="card">
            {deviations.map(({ task, log, diff }) => {
              const cat = CATEGORY_MAP[task.category]
              return (
                <div
                  key={task.id}
                  className="row between"
                  style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="sched-title" style={{ fontSize: 12.5 }}>
                      <i style={{ background: cat.color }} />
                      <span>{task.title}</span>
                    </div>
                    <div className="task-meta">
                      {task.start} · 计划 {fmtMinutes(task.plannedMinutes)} · 实际 {fmtMinutes(log.minutes)}
                    </div>
                  </div>
                  <span className={`pill ${Math.abs(diff) < 10 ? 'pill-done' : diff > 0 ? 'pill-warn' : 'pill-idle'}`}>
                    {fmtSigned(diff)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="tip" style={{ marginTop: 14 }}>
        <span className="tip-icon">
          <Icon name="spark" size={15} />
        </span>
        <div>
          <strong>这一天说明了什么</strong>
          <p>
            {deviations[0] && Math.abs(deviations[0].diff) >= 10
              ? `偏差最大的是「${deviations[0].task.title}」：计划 ${fmtMinutes(
                  deviations[0].task.plannedMinutes,
                )}，实际 ${fmtMinutes(deviations[0].log.minutes)}。`
              : '这一天的计划与实际比较接近，说明你的估算正在变准。'}
            {dayTasks.length
              ? `当天 ${dayTasks.length} 项安排完成了 ${done} 项。`
              : ''}
            {unlogged.length ? `还有 ${unlogged.length} 项没有对应记录。` : ''}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Button block onClick={() => (window.location.hash = '#/records')}>
          <Icon name="records" size={15} />
          查看时间记录
        </Button>
      </div>

      <p className="footnote">回放的意义不是评判这一天，而是让下一次的估计更接近现实。</p>
    </div>
  )
}
