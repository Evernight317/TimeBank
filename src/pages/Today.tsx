import { useMemo, useState } from 'react'
import type { Task } from '../types'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { fmtMinutes, parseClock, todayISO, weekdayLabel, fmtDateCN } from '../lib/date'
import { BrandHeader, PageHead } from '../components/nav'
import { Button, Empty } from '../components/ui'
import { Icon } from '../components/icons'
import { LogModal } from '../components/forms'

function statusOf(task: Task, nowClock: number) {
  if (task.status === 'done') return { label: '已完成', cls: 'pill-done' }
  if (task.status === 'delayed') return { label: '已延期', cls: 'pill-warn' }
  if (task.status === 'missed') return { label: '未完成', cls: 'pill-bad' }
  if (parseClock(task.start) < nowClock) return { label: '待记录', cls: 'pill-warn' }
  return { label: '待开始', cls: 'pill-idle' }
}

export function TodayPage() {
  const { state } = useApp()
  const [logOpen, setLogOpen] = useState(false)
  const [logTask, setLogTask] = useState<Task | null>(null)

  const now = new Date()
  const nowClock = now.getHours() * 60 + now.getMinutes()
  const date = todayISO()

  const todayTasks = useMemo(
    () => state.tasks.filter((t) => t.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [state.tasks, date],
  )
  const todayLogs = useMemo(() => state.logs.filter((l) => l.date === date), [state.logs, date])
  const minutes = useMemo(
    () => (cat: string) =>
      todayLogs.filter((l) => l.category === cat).reduce((s, l) => s + l.minutes, 0),
    [todayLogs],
  )

  const total = todayLogs.reduce((s, l) => s + l.minutes, 0)
  const fixed = minutes('sleep') + minutes('work') + minutes('commute') + minutes('chores')
  const free = Math.max(0, 1440 - fixed)
  const usedFree = minutes('study') + minutes('social') + minutes('exercise') + minutes('entertainment') + minutes('other')
  const balance = Math.max(0, free - usedFree)
  const doneCount = todayTasks.filter((t) => t.status === 'done').length
  const nextTask = todayTasks.find((t) => t.status === 'planned' && parseClock(t.start) >= nowClock)

  const logByTask = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of todayLogs) if (l.taskId) map.set(l.taskId, l.minutes)
    return map
  }, [todayLogs])

  const balanceH = Math.floor(balance / 60)
  const balanceM = balance % 60

  return (
    <div className="screen">
      <BrandHeader
        right={
          <>
            <button className="round-btn" onClick={() => (window.location.hash = '#/insights')} aria-label="查看洞察">
              <Icon name="bell" size={17} />
            </button>
            <button className="round-btn solid" onClick={() => (window.location.hash = '#/create')} aria-label="创建日程">
              <Icon name="plus" size={17} />
            </button>
          </>
        }
      />

      <PageHead
        title="今天，把时间看清楚"
        sub={
          <>
            {fmtDateCN(date)} {weekdayLabel(date)} · 每天，都有新的 24 小时
          </>
        }
      />

      <section className="hero">
        <div className="hero-row">
          <div>
            <div className="hero-label">今日可支配余额</div>
            <div className="hero-big">
              {balanceH > 0 ? (
                <>
                  {balanceH}
                  <em>小时</em>
                  {balanceM}
                  <em>分钟</em>
                </>
              ) : (
                <>
                  {balanceM}
                  <em>分钟</em>
                </>
              )}
            </div>
          </div>
          <div className="hero-side">
            24h
            <strong>每日本金</strong>
          </div>
        </div>
        <div className="hero-bar">
          <span style={{ width: `${Math.min(100, (usedFree / Math.max(1, free)) * 100)}%` }} />
        </div>
        <div className="hero-foot">
          <span>
            已记录 <b>{fmtMinutes(total)}</b>
          </span>
          <span>
            待填入 <b>{fmtMinutes(Math.max(0, 1440 - total))}</b>
          </span>
        </div>
        <button className="hero-btn" onClick={() => (window.location.hash = '#/create')}>
          <span>告诉我，你想把时间留给什么？</span>
          <span className="mic">
            <Icon name="mic" size={15} />
          </span>
        </button>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>今日日程</h2>
          <span className="meta">
            {todayTasks.length} 个安排 · {doneCount} 个已完成
          </span>
        </div>
        <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
          {todayTasks.length === 0 ? (
            <Empty title="今天还是空白" hint="用一句话安排，或留白给自己。" />
          ) : (
            <div className="sched">
              {todayTasks.slice(0, 6).map((t) => {
                const cat = CATEGORY_MAP[t.category]
                const st = statusOf(t, nowClock)
                const actual = logByTask.get(t.id)
                return (
                  <button
                    key={t.id}
                    className="sched-row"
                    style={{ textAlign: 'left', width: '100%' }}
                    onClick={() => {
                      setLogTask(t)
                      setLogOpen(true)
                    }}
                  >
                    <span className="sched-time">{t.start}</span>
                    <span className="sched-body">
                      <span className="sched-title">
                        <i style={{ background: cat.color }} />
                        <span>{t.title}</span>
                      </span>
                      <span className="sched-meta">
                        <span>计划 {fmtMinutes(t.plannedMinutes)}</span>
                        {actual !== undefined && (
                          <>
                            <span className="dot" />
                            <span>实际 {fmtMinutes(actual)}</span>
                          </>
                        )}
                        <span className="dot" />
                        <span>{cat.label}</span>
                      </span>
                    </span>
                    <span className={`pill ${st.cls}`}>{st.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {todayTasks.length > 6 && (
          <button
            className="btn btn-quiet btn-block"
            style={{ marginTop: 6 }}
            onClick={() => (window.location.hash = '#/records')}
          >
            查看全部 {todayTasks.length} 个安排
            <Icon name="arrow" size={14} />
          </button>
        )}
      </section>

      {nextTask && (
        <div className="tip" style={{ marginTop: 14 }}>
          <span className="tip-icon">
            <Icon name="spark" size={15} />
          </span>
          <div>
            <strong>给计划留一点呼吸的空间</strong>
            <p>
              下一项「{nextTask.title}」在 {nextTask.start} 开始。之前留 15 分钟缓冲就很好。
            </p>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Button className="btn-ghost" block onClick={() => (window.location.hash = '#/records')}>
          <Icon name="records" size={15} />
          时间记录
        </Button>
        <Button className="btn-ghost" block onClick={() => (window.location.hash = '#/replay')}>
          <Icon name="replay" size={15} />
          时间回放
        </Button>
      </div>

      <p className="footnote">
        可支配余额 = 24 小时 − 睡眠、工作、通勤等固定项 − 已投入的自由安排
      </p>

      <LogModal open={logOpen} onClose={() => setLogOpen(false)} task={logTask} date={date} />
    </div>
  )
}
