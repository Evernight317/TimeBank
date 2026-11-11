import { useMemo, useState } from 'react'
import type { Task } from '../types'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import {
  categoryTotal,
  logsBetween,
  minutesOn,
  tasksBetween,
  weekRange,
  weekUsedByCategory,
} from '../lib/analytics'
import { buildInsights, todayHighlight } from '../lib/insights'
import { fmtDateCN, fmtMinutes, todayISO, weekdayLabel } from '../lib/date'
import { Button, Card, Empty, Modal, SectionHead, Stat, Tag } from '../components/ui'
import { Donut, Sparkline } from '../components/charts'
import { DayTimeline } from '../components/timeline'
import { LogModal, QuickAdd, TaskModal, TaskRow } from '../components/forms'
import { Icon } from '../components/icons'

function greeting(hour: number): string {
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 23) return '晚上好'
  return '夜深了'
}

export function TodayPage() {
  const { state } = useApp()
  const [taskOpen, setTaskOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [logTask, setLogTask] = useState<Task | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)

  const now = new Date()
  const date = todayISO()
  const todayLogs = state.logs.filter((l) => l.date === date)
  const todayTasks = state.tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.start.localeCompare(b.start))

  const total = minutesOn(state.logs, date)
  const slices = categoryTotal(state.logs, date).map((c) => ({
    id: c.category,
    label: CATEGORY_MAP[c.category].label,
    value: c.minutes,
    color: CATEGORY_MAP[c.category].color,
  }))
  const effective = todayLogs
    .filter((l) => l.category === 'study' || l.category === 'work')
    .reduce((s, l) => s + l.minutes, 0)

  const week = weekRange(now)
  const weekUsed = weekUsedByCategory(state.logs, now)
  const weekLogs = logsBetween(state.logs, week.from, week.to)
  const weekSeries = useMemo(() => {
    const arr: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`
      arr.push(weekLogs.filter((l) => l.date === iso && l.category !== 'sleep').reduce((s, l) => s + l.minutes, 0))
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekLogs])

  const insights = buildInsights(state, { days: 14 })
  const topInsight = insights[0]
  const todayDone = todayTasks.filter((t) => t.status === 'done').length
  const todayPlanned = tasksBetween(state.tasks, date, date).length

  const upcoming = state.tasks
    .filter((t) => t.status === 'planned' && t.date > date)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .slice(0, 4)

  const sleepToday = todayLogs.find((l) => l.category === 'sleep')

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">
            {fmtDateCN(date, true)} · {weekdayLabel(date)}
          </span>
          <h1 className="page-title">
            {greeting(now.getHours())}，今天还剩 {fmtMinutes(Math.max(0, 1440 - total))}
          </h1>
          <p className="page-sub">24 小时是今天的本金。先看清它，再决定怎么花。</p>
        </div>
        <div className="topbar-actions">
          <Button onClick={() => setQuickOpen(true)}>
            <Icon name="spark" size={15} />
            自然语言安排
          </Button>
          <Button onClick={() => setTaskOpen(true)}>
            <Icon name="plus" size={15} />
            新建安排
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setLogTask(null)
              setLogOpen(true)
            }}
          >
            <Icon name="play" size={14} />
            记录时间
          </Button>
        </div>
      </div>

      <section className="hero" style={{ marginBottom: 16 }}>
        <div>
          <span className="eyebrow">今日时间资产</span>
          <p className="lede" style={{ marginTop: 8 }}>
            {todayHighlight(state)}
          </p>
          <div className="hero-meta">
            <Stat label="已记录" value={fmtMinutes(total)} hint={`目标 24h 的 ${Math.round((total / 1440) * 100)}%`} />
            <Stat label="有效投入" value={fmtMinutes(effective)} hint="学习 + 工作" tone="good" />
            <Stat
              label="今日完成"
              value={`${todayDone}/${todayPlanned}`}
              hint="已完成 / 已安排"
            />
            <Stat
              label="睡眠"
              value={sleepToday ? fmtMinutes(sleepToday.minutes) : '—'}
              hint={sleepToday ? `${sleepToday.start} 入睡` : '尚未记录'}
            />
          </div>
        </div>
        <div className="hero-side">
          <Donut
            slices={slices}
            total={1440}
            size={196}
            thickness={20}
            centerTop="TODAY"
            centerMain={fmtMinutes(total)}
            centerSub={`剩余 ${fmtMinutes(Math.max(0, 1440 - total))}`}
          />
        </div>
      </section>

      <div className="split">
        <div className="stack">
          <Card>
            <SectionHead
              title="今日时间轴"
              hint="虚线为计划，实色为实际记录"
              action={
                <Button size="sm" variant="quiet" onClick={() => setLogOpen(true)}>
                  补一条记录
                </Button>
              }
            />
            {todayTasks.length + todayLogs.length === 0 ? (
              <Empty
                title="今天还是一张白纸"
                hint="先安排一件事，或用自然语言一句话生成日程。"
                action={
                  <Button variant="primary" size="sm" onClick={() => setTaskOpen(true)}>
                    新建安排
                  </Button>
                }
              />
            ) : (
              <DayTimeline date={date} tasks={state.tasks} logs={state.logs} />
            )}
          </Card>

          <Card>
            <SectionHead
              title="今日安排"
              hint={`${todayTasks.filter((t) => t.status === 'planned').length} 项待开始`}
            />
            {todayTasks.length === 0 ? (
              <Empty title="暂无安排" hint="留白也是一种选择，但别让时间悄悄流走。" />
            ) : (
              <div>
                {todayTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onLog={(task) => {
                      setLogTask(task)
                      setLogOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          {upcoming.length > 0 && (
            <Card>
              <SectionHead title="接下来" hint="未来几天的安排" />
              {upcoming.map((t) => (
                <TaskRow key={t.id} task={t} onLog={() => undefined} showDate compact />
              ))}
            </Card>
          )}
        </div>

        <div className="stack">
          <Card>
            <SectionHead title="今日洞察" hint="基于最近 14 天数据" />
            {topInsight ? (
              <div className={`insight insight-flat tone-${topInsight.tone}`}>
                <Tag tone={topInsight.tone === 'neutral' ? 'accent' : topInsight.tone}>
                  {topInsight.tag}
                </Tag>
                <div className="metric">{topInsight.metric}</div>
                <h3>{topInsight.title}</h3>
                <p>{topInsight.body}</p>
              </div>
            ) : (
              <p className="muted">数据还不够，多记录几天就能发现规律。</p>
            )}
          </Card>

          <Card>
            <SectionHead
              title="本周节奏"
              hint={`${fmtMinutes(weekLogs.filter((l) => l.category !== 'sleep').reduce((s, l) => s + l.minutes, 0))} 非睡眠时间`}
            />
            <Sparkline data={weekSeries} height={62} />
            <div className="row between" style={{ marginTop: 8 }}>
              <span className="faint" style={{ fontSize: 11.5 }}>
                7 天前
              </span>
              <span className="faint" style={{ fontSize: 11.5 }}>
                今天
              </span>
            </div>
            <div style={{ marginTop: 14 }}>
              {(['study', 'work', 'entertainment'] as const).map((c) => {
                const budget = state.budgets.find((b) => b.category === c)
                const pct = budget && budget.weeklyMinutes ? weekUsed[c] / budget.weeklyMinutes : 0
                return (
                  <div key={c} style={{ marginBottom: 10 }}>
                    <div className="row between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                      <span className="row" style={{ gap: 6 }}>
                        <span className="dot" style={{ background: CATEGORY_MAP[c].color }} />
                        {CATEGORY_MAP[c].label}
                      </span>
                      <span className="num muted">
                        {fmtMinutes(weekUsed[c])} / {budget ? fmtMinutes(budget.weeklyMinutes) : '—'}
                      </span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <span
                        style={{
                          width: `${Math.min(100, pct * 100)}%`,
                          background: pct > 1 ? 'var(--bad)' : CATEGORY_MAP[c].color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <SectionHead title="快捷记录" hint="一句话完成录入" />
            <QuickAdd />
          </Card>
        </div>
      </div>

      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} />
      <LogModal open={logOpen} onClose={() => setLogOpen(false)} task={logTask} date={todayISO()} />
      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="用一句话安排时间" wide>
        <QuickAdd onDone={() => setQuickOpen(false)} />
      </Modal>
    </div>
  )
}
