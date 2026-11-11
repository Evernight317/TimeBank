import { useMemo, useState } from 'react'
import type { Task } from '../types'
import { useApp } from '../lib/store'
import { addDays, fmtDateCN, fmtMinutes, startOfWeek, toISODate, todayISO, weekdayLabel } from '../lib/date'
import { Button, Card, Empty, Modal, SectionHead, Tag } from '../components/ui'
import { QuickAdd, TaskModal, TaskRow } from '../components/forms'
import { Icon } from '../components/icons'

export function SchedulePage() {
  const { state } = useApp()
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const [selected, setSelected] = useState(todayISO())
  const [taskOpen, setTaskOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toISODate(addDays(anchor, i))),
    [anchor],
  )

  const dayTasks = state.tasks
    .filter((t) => t.date === selected)
    .sort((a, b) => a.start.localeCompare(b.start))

  const dayMinutes = dayTasks.reduce((s, t) => s + t.plannedMinutes, 0)
  const doneCount = dayTasks.filter((t) => t.status === 'done').length

  const backlog = state.tasks
    .filter((t) => t.status === 'delayed' || t.status === 'missed')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  const moveWeek = (dir: number) => {
    const next = addDays(anchor, dir * 7)
    setAnchor(next)
    setSelected(toISODate(next))
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">智能日程</span>
          <h1 className="page-title">安排你的时间</h1>
          <p className="page-sub">计划总是完不成，往往不是意志力问题，而是时间估计与任务密度的问题。</p>
        </div>
        <div className="topbar-actions">
          <Button onClick={() => setQuickOpen(true)}>
            <Icon name="spark" size={15} />
            自然语言安排
          </Button>
          <Button variant="primary" onClick={() => setTaskOpen(true)}>
            <Icon name="plus" size={15} />
            新建安排
          </Button>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="icon-btn" onClick={() => moveWeek(-1)} aria-label="上一周">
              ←
            </button>
            <strong style={{ fontSize: 13.5 }}>
              {fmtDateCN(weekDates[0])} — {fmtDateCN(weekDates[6])}
            </strong>
            <button className="icon-btn" onClick={() => moveWeek(1)} aria-label="下一周">
              →
            </button>
          </div>
          <Button
            size="sm"
            variant="quiet"
            onClick={() => {
              setAnchor(startOfWeek(new Date()))
              setSelected(todayISO())
            }}
          >
            回到本周
          </Button>
        </div>
        <div className="week-strip">
          {weekDates.map((d) => {
            const list = state.tasks.filter((t) => t.date === d)
            const done = list.filter((t) => t.status === 'done').length
            return (
              <button
                key={d}
                className={`day-cell ${d === selected ? 'on' : ''} ${d === todayISO() ? 'today' : ''}`}
                onClick={() => setSelected(d)}
              >
                <span className="w">{weekdayLabel(d).replace('周', '')}</span>
                <span className="d num">{Number(d.slice(8))}</span>
                <span className="c">
                  {list.length ? `${done}/${list.length}` : '·'}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="split">
        <Card>
          <SectionHead
            title={`${fmtDateCN(selected)} · ${weekdayLabel(selected)}`}
            hint={`${dayTasks.length} 项安排 · 预计 ${fmtMinutes(dayMinutes)} · 已完成 ${doneCount}`}
            action={
              <Button size="sm" onClick={() => setTaskOpen(true)}>
                <Icon name="plus" size={14} />
                添加
              </Button>
            }
          />
          {dayTasks.length === 0 ? (
            <Empty
              title="这一天还没有安排"
              hint="把想做的事放进日历，是让时间变得可见的第一步。"
              action={
                <Button variant="primary" size="sm" onClick={() => setTaskOpen(true)}>
                  新建安排
                </Button>
              }
            />
          ) : (
            <div>
              {dayTasks.map((t) => (
                <TaskRow key={t.id} task={t} onLog={() => undefined} />
              ))}
            </div>
          )}
          {dayMinutes > 16 * 60 && (
            <div className="notice warn" style={{ marginTop: 14 }}>
              <Icon name="spark" size={15} />
              <span>
                这一天已安排 {fmtMinutes(dayMinutes)}，超过 16 小时。留白不足时，任何意外都会引发连锁延期。
              </span>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card>
            <SectionHead title="一句话排一天" hint="AI 解析日期、时长与类别" />
            <QuickAdd />
          </Card>

          <Card>
            <SectionHead title="待处理" hint="延期与未完成的安排" />
            {backlog.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                没有积压，很好。
              </p>
            ) : (
              backlog.map((t: Task) => (
                <div key={t.id} className="row between" style={{ padding: '8px 0', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="task-title">{t.title}</div>
                    <div className="task-meta">
                      {fmtDateCN(t.date)} · {t.start}
                    </div>
                  </div>
                  <Tag tone={t.status === 'missed' ? 'bad' : 'warn'}>
                    {t.status === 'missed' ? '未完成' : '延期'}
                  </Tag>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} preset={{ date: selected }} />
      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="用一句话安排时间" wide>
        <QuickAdd onDone={() => setQuickOpen(false)} />
      </Modal>
    </div>
  )
}
