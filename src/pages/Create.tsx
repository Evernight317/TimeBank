import { useMemo, useState, type CSSProperties } from 'react'
import type { CategoryId } from '../types'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { parseNaturalLanguage } from '../lib/nlp'
import { fmtDateCN, fmtMinutes, parseClock, relativeDayLabel, todayISO, weekdayLabel } from '../lib/date'
import { SubHeader } from '../components/nav'
import { Button, Field, Segmented } from '../components/ui'
import { Icon } from '../components/icons'

type Mode = 'nlp' | 'manual'

interface Draft {
  key: string
  title: string
  category: CategoryId
  date: string
  start: string
  minutes: number
  confidence: number
}

const EXAMPLES = [
  '明天下午学习数学两个小时，晚上七点和朋友吃饭',
  '周五上午9点开会一小时',
  '今晚8点刷短视频10分钟',
]

export function CreatePage() {
  const { addTasks } = useApp()
  const [mode, setMode] = useState<Mode>('nlp')
  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<Draft[] | null>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<CategoryId>('study')
  const [date, setDate] = useState(todayISO())
  const [start, setStart] = useState('09:00')
  const [minutes, setMinutes] = useState(60)

  const parsedCount = drafts?.length ?? 0

  const parse = () => {
    const result = parseNaturalLanguage(text)
    setDrafts(
      result.map((p, i) => ({
        key: `${i}-${p.start}`,
        title: p.title,
        category: p.category,
        date: p.date,
        start: p.start,
        minutes: p.plannedMinutes,
        confidence: p.confidence,
      })),
    )
  }

  const confirm = () => {
    if (!drafts?.length) return
    addTasks(
      drafts.map((d) => ({
        title: d.title,
        category: d.category,
        date: d.date,
        start: d.start,
        plannedMinutes: d.minutes,
        source: 'nlp',
      })),
    )
    setDrafts(null)
    setText('')
    window.location.hash = '#/today'
  }

  const submitManual = () => {
    if (!title.trim()) return
    addTasks([
      {
        title: title.trim(),
        category,
        date,
        start,
        plannedMinutes: minutes,
        source: 'manual',
      },
    ])
    setTitle('')
    window.location.hash = '#/today'
  }

  const endTime = (d: Draft) => {
    const total = parseClock(d.start) + d.minutes
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const confidenceLabel = useMemo(() => {
    if (!drafts?.length) return ''
    const avg = drafts.reduce((s, d) => s + d.confidence, 0) / drafts.length
    return avg > 0.8 ? '解析完成' : avg > 0.6 ? '请确认细节' : '建议手动调整'
  }, [drafts])

  return (
    <div className="screen">
      <SubHeader title="创建日程" onBack={() => (window.location.hash = '#/today')} />

      <div style={{ marginBottom: 16 }}>
        <Segmented<Mode>
          value={mode}
          onChange={(m) => {
            setMode(m)
            setDrafts(null)
          }}
          options={[
            { value: 'nlp', label: '自然语言' },
            { value: 'manual', label: '手动创建' },
          ]}
        />
      </div>

      {mode === 'nlp' ? (
        <>
          <div className="create-input">
            <div className="label">你想安排什么？</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="例如：明天下午学习数学两个小时，晚上七点和朋友吃饭。"
            />
            <div className="create-foot">
              <span className="hint">可识别日期、时间、分类或提醒</span>
              <button
                className="mic-btn"
                aria-label="语音输入"
                onClick={() => {
                  if (!text) setText(EXAMPLES[0])
                }}
              >
                <Icon name="mic" size={16} />
              </button>
            </div>
          </div>

          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                className="pill pill-idle"
                style={{ cursor: 'pointer' }}
                onClick={() => setText(ex)}
              >
                {ex.slice(0, 12)}…
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            block
            style={{ marginTop: 14 }}
            onClick={parse}
            disabled={!text.trim()}
          >
            <Icon name="spark" size={15} />
            解析这句话
          </Button>

          {drafts && (
            <div style={{ marginTop: 20 }}>
              <div className="block-head">
                <h2>已为你识别 {drafts.length} 个安排</h2>
                <span className={`pill ${confidenceLabel === '解析完成' ? 'pill-done' : 'pill-warn'}`}>
                  {confidenceLabel}
                </span>
              </div>
              {drafts.length === 0 && (
                <p className="faint" style={{ fontSize: 12 }}>
                  没有识别出安排，换一种说法试试。
                </p>
              )}
              {drafts.map((d) => {
                const cat = CATEGORY_MAP[d.category]
                return (
                  <div
                    key={d.key}
                    className="parsed-item"
                    style={{ '--accent': cat.color } as CSSProperties}
                  >
                    <div className="parsed-title">
                      <span>{d.title}</span>
                      <button
                        className="icon-btn"
                        aria-label="移除"
                        onClick={() =>
                          setDrafts((list) => (list ?? []).filter((x) => x.key !== d.key))
                        }
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </div>
                    <div className="parsed-meta">
                      <span>
                        {relativeDayLabel(d.date)} · {fmtDateCN(d.date)} {weekdayLabel(d.date)}
                      </span>
                      <span>
                        {d.start} – {endTime(d)}
                      </span>
                      <span>{fmtMinutes(d.minutes)}</span>
                      <span style={{ color: cat.color }}>{cat.label}</span>
                    </div>
                  </div>
                )
              })}

              <div className="create-cta">
                <Button variant="primary" onClick={confirm} disabled={!parsedCount}>
                  确认添加 {parsedCount} 个日程
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="form-grid">
            <div className="span-2">
              <Field label="要做什么">
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
          </div>
          <Button
            variant="primary"
            block
            style={{ marginTop: 16 }}
            onClick={submitManual}
            disabled={!title.trim()}
          >
            添加日程
          </Button>
          <p className="footnote" style={{ marginTop: 12 }}>
            手动创建适合确定性的安排；不确定怎么说时，试试「自然语言」。
          </p>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
