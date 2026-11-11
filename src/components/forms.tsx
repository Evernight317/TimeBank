import { useEffect, useMemo, useState } from 'react'
import type { CategoryId, Task, TimeLog } from '../types'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories'
import { useApp, type NewTaskInput } from '../lib/store'
import { categoryAccuracy } from '../lib/analytics'
import { addDays, fmtMinutes, relativeDayLabel, toISODate, todayISO } from '../lib/date'
import { parseNaturalLanguage, type ParsedTask } from '../lib/nlp'
import { Button, Field, Modal, Tag } from './ui'
import { Icon } from './icons'

const STATUS_LABEL: Record<Task['status'], string> = {
  planned: '待开始',
  done: '已完成',
  delayed: '已延期',
  missed: '未完成',
}

export function TaskRow({
  task,
  onLog,
  compact = false,
  showDate = false,
}: {
  task: Task
  onLog: (task: Task) => void
  compact?: boolean
  showDate?: boolean
}) {
  const { setTaskStatus, removeTask } = useApp()
  const cat = CATEGORY_MAP[task.category]

  return (
    <div className="task-row">
      <span className="task-time num">{task.start}</span>
      <div className="task-main">
        <div className="task-title" title={task.title}>
          {task.title}
        </div>
        <div className="task-meta">
          <span className="dot" style={{ background: cat.color }} />
          <span>{cat.label}</span>
          <span>·</span>
          <span className="num">{fmtMinutes(task.plannedMinutes)}</span>
          {showDate && (
            <>
              <span>·</span>
              <span>{relativeDayLabel(task.date)}</span>
            </>
          )}
          {task.note && (
            <>
              <span>·</span>
              <span>{task.note}</span>
            </>
          )}
          {compact && task.status !== 'planned' && (
            <span className={`status-pill ${task.status}`}>{STATUS_LABEL[task.status]}</span>
          )}
        </div>
      </div>
      {!compact && <span className={`status-pill ${task.status}`}>{STATUS_LABEL[task.status]}</span>}
      <div className="task-actions">
        {task.status !== 'done' && (
          <>
            <button
              className="icon-btn"
              title="记录实际用时"
              onClick={() => onLog(task)}
              aria-label={`记录 ${task.title} 的实际用时`}
            >
              <Icon name="play" size={15} />
            </button>
            <button
              className="icon-btn"
              title="标记完成"
              onClick={() => setTaskStatus(task.id, 'done')}
              aria-label="标记完成"
            >
              <Icon name="check" size={15} />
            </button>
          </>
        )}
        <button
          className="icon-btn"
          title="删除"
          onClick={() => removeTask(task.id)}
          aria-label={`删除 ${task.title}`}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  )
}

export function TaskModal({
  open,
  onClose,
  task,
  preset,
}: {
  open: boolean
  onClose: () => void
  task?: Task
  preset?: Partial<NewTaskInput>
}) {
  const { state, addTask, updateTask } = useApp()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<CategoryId>('study')
  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState('09:00')
  const [minutes, setMinutes] = useState(60)
  const [priority, setPriority] = useState<Task['priority']>('normal')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? preset?.title ?? '')
    setCategory(task?.category ?? preset?.category ?? 'study')
    setDate(task?.date ?? preset?.date ?? todayISO())
    setStart(task?.start ?? preset?.start ?? '09:00')
    setMinutes(task?.plannedMinutes ?? preset?.plannedMinutes ?? 60)
    setPriority(task?.priority ?? preset?.priority ?? 'normal')
  }, [open, task, preset])

  const history = useMemo(() => {
    const from = toISODate(addDays(new Date(), -29))
    const to = todayISO()
    const acc = categoryAccuracy(state.tasks, state.logs, from, to).find(
      (a) => a.category === category,
    )
    if (!acc || acc.count < 2) return null
    return { avg: Math.round(acc.actual / acc.count), ratio: acc.ratio, count: acc.count }
  }, [state.tasks, state.logs, category])

  const submit = () => {
    if (!title.trim()) return
    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        category,
        date,
        start,
        plannedMinutes: minutes,
        priority,
      })
    } else {
      addTask({
        title: title.trim(),
        category,
        date,
        start,
        plannedMinutes: minutes,
        priority,
        source: preset?.source ?? 'manual',
      })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? '编辑安排' : '新建安排'}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>
            {task ? '保存' : '加入日程'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="span-2">
          <Field label="要做什么">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：复习线性代数"
              autoFocus
            />
          </Field>
        </div>
        <Field label="类别">
          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="日期">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="开始时间">
          <input
            className="input"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="预计时长" hint="分钟">
          <input
            className="input"
            type="number"
            min={5}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(5, Number(e.target.value) || 5))}
          />
        </Field>
        <Field label="优先级">
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
          >
            <option value="high">高</option>
            <option value="normal">普通</option>
            <option value="low">低</option>
          </select>
        </Field>
      </div>

      {history && (
        <div className="notice" style={{ marginTop: 16 }}>
          <Icon name="spark" size={15} />
          <span>
            根据最近 30 天 {history.count} 次同类记录，你完成一次「
            {CATEGORY_MAP[category].label}」平均需要 <b>{fmtMinutes(history.avg)}</b>
            （是计划的 {(history.ratio * 100).toFixed(0)}%）。
          </span>
        </div>
      )}
    </Modal>
  )
}

export function LogModal({
  open,
  onClose,
  task,
  date,
}: {
  open: boolean
  onClose: () => void
  task?: Task | null
  date?: string
}) {
  const { state, addLog } = useApp()
  const [taskId, setTaskId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<CategoryId>('study')
  const [logDate, setLogDate] = useState(todayISO())
  const [start, setStart] = useState('09:00')
  const [minutes, setMinutes] = useState(60)

  const openTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.status === 'planned' && t.date >= toISODate(addDays(new Date(), -3)))
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    [state.tasks],
  )

  useEffect(() => {
    if (!open) return
    setTaskId(task?.id ?? '')
    setTitle(task?.title ?? '')
    setCategory(task?.category ?? 'study')
    setLogDate(task?.date ?? date ?? todayISO())
    setStart(task?.start ?? '09:00')
    setMinutes(task?.plannedMinutes ?? 60)
  }, [open, task, date])

  const onPick = (id: string) => {
    setTaskId(id)
    const t = state.tasks.find((x) => x.id === id)
    if (t) {
      setTitle(t.title)
      setCategory(t.category)
      setStart(t.start)
      setMinutes(t.plannedMinutes)
      setLogDate(t.date)
    }
  }

  const submit = () => {
    if (!title.trim()) return
    addLog({
      taskId: taskId || undefined,
      title: title.trim(),
      category,
      date: logDate,
      start,
      minutes,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="记录实际时间"
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>
            保存记录
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="span-2">
          <Field label="关联安排" hint="可选">
            <select className="select" value={taskId} onChange={(e) => onPick(e.target.value)}>
              <option value="">不关联，直接记录</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.date} {t.start} · {t.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="span-2">
          <Field label="实际做了什么">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：复习线性代数"
            />
          </Field>
        </div>
        <Field label="类别">
          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="日期">
          <input
            className="input"
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
          />
        </Field>
        <Field label="开始时间">
          <input
            className="input"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="实际用时" hint="分钟">
          <input
            className="input"
            type="number"
            min={1}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
      </div>
    </Modal>
  )
}

export function QuickAdd({ onDone }: { onDone?: () => void }) {
  const { addTasks } = useApp()
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedTask[] | null>(null)

  const run = () => {
    if (!text.trim()) return
    setParsed(parseNaturalLanguage(text))
  }

  const confirm = () => {
    if (!parsed?.length) return
    addTasks(
      parsed.map((p) => ({
        title: p.title,
        category: p.category,
        date: p.date,
        start: p.start,
        plannedMinutes: p.plannedMinutes,
        source: 'nlp',
      })),
    )
    setParsed(null)
    setText('')
    onDone?.()
  }

  return (
    <div>
      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="用一句话安排一天，例如：明天下午学习数学两个小时，晚上七点和朋友吃饭"
      />
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="faint" style={{ fontSize: 12 }}>
          支持「明天 / 周五 / 下午三点 / 两个小时」
        </span>
        <Button variant="primary" size="sm" onClick={run} disabled={!text.trim()}>
          <Icon name="spark" size={14} />
          解析
        </Button>
      </div>

      {parsed && (
        <div style={{ marginTop: 16 }}>
          {parsed.length === 0 ? (
            <p className="muted">没有识别出可用的安排，试试更具体的描述。</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {parsed.map((p, i) => (
                <div
                  key={i}
                  className="card tint"
                  style={{ padding: 12, display: 'grid', gap: 8 }}
                >
                  <div className="row between">
                    <div className="row" style={{ gap: 8, minWidth: 0 }}>
                      <span className="dot" style={{ background: CATEGORY_MAP[p.category].color }} />
                      <input
                        className="input"
                        style={{ padding: '4px 8px', background: 'transparent', border: 'none' }}
                        value={p.title}
                        onChange={(e) => {
                          const next = [...parsed]
                          next[i] = { ...p, title: e.target.value }
                          setParsed(next)
                        }}
                      />
                    </div>
                    <Tag tone={p.confidence > 0.75 ? 'good' : p.confidence > 0.55 ? 'warn' : 'bad'}>
                      置信度 {Math.round(p.confidence * 100)}%
                    </Tag>
                  </div>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <input
                      className="input"
                      style={{ width: 140 }}
                      type="date"
                      value={p.date}
                      onChange={(e) => {
                        const next = [...parsed]
                        next[i] = { ...p, date: e.target.value }
                        setParsed(next)
                      }}
                    />
                    <input
                      className="input"
                      style={{ width: 110 }}
                      type="time"
                      value={p.start}
                      onChange={(e) => {
                        const next = [...parsed]
                        next[i] = { ...p, start: e.target.value }
                        setParsed(next)
                      }}
                    />
                    <input
                      className="input num"
                      style={{ width: 100 }}
                      type="number"
                      min={5}
                      step={5}
                      value={p.plannedMinutes}
                      onChange={(e) => {
                        const next = [...parsed]
                        next[i] = { ...p, plannedMinutes: Number(e.target.value) || 5 }
                        setParsed(next)
                      }}
                    />
                    <select
                      className="select"
                      style={{ width: 110 }}
                      value={p.category}
                      onChange={(e) => {
                        const next = [...parsed]
                        next[i] = { ...p, category: e.target.value as CategoryId }
                        setParsed(next)
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <span className="faint" style={{ fontSize: 12 }}>
                      分钟
                    </span>
                  </div>
                </div>
              ))}
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <Button onClick={() => setParsed(null)}>重新输入</Button>
                <Button variant="primary" onClick={confirm}>
                  确认加入 {parsed.length} 项
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LogRow({ log }: { log: TimeLog }) {
  const { removeLog } = useApp()
  const cat = CATEGORY_MAP[log.category]
  return (
    <div className="task-row">
      <span className="task-time num">{log.start}</span>
      <div className="task-main">
        <div className="task-title">{log.title}</div>
        <div className="task-meta">
          <span className="dot" style={{ background: cat.color }} />
          <span>{cat.label}</span>
          <span>·</span>
          <span className="num">{fmtMinutes(log.minutes)}</span>
          {log.taskId && <span>· 已关联计划</span>}
        </div>
      </div>
      <div className="task-actions" style={{ opacity: 1 }}>
        <button className="icon-btn" title="删除记录" onClick={() => removeLog(log.id)}>
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  )
}
