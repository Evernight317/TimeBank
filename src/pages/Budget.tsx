import { useMemo, useState } from 'react'
import type { CategoryId } from '../types'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { weekRange, weekUsedByCategory } from '../lib/analytics'
import { fmtDateCN, fmtMinutes } from '../lib/date'
import { BrandHeader, PageHead } from '../components/nav'
import { Button } from '../components/ui'
import { Icon } from '../components/icons'

const RECOMMENDED: Record<CategoryId, number> = {
  sleep: 56 * 60,
  study: 20 * 60,
  work: 25 * 60,
  exercise: 5 * 60,
  social: 6 * 60,
  entertainment: 8 * 60,
  commute: 5 * 60,
  chores: 4 * 60,
  other: 8 * 60,
}

const FLEX_CATEGORIES: CategoryId[] = [
  'study',
  'work',
  'exercise',
  'social',
  'entertainment',
  'commute',
  'chores',
  'other',
]

export function BudgetPage() {
  const { state, setBudget } = useApp()
  const [editing, setEditing] = useState(false)
  const used = useMemo(() => weekUsedByCategory(state.logs), [state.logs])
  const week = weekRange()

  const rows = FLEX_CATEGORIES.map((id) => {
    const budget = state.budgets.find((b) => b.category === id)?.weeklyMinutes ?? 0
    const spent = used[id]
    return {
      ...CATEGORY_MAP[id],
      id,
      budget,
      spent,
      left: budget - spent,
    }
  })

  const available = rows.reduce((s, r) => s + r.budget, 0)
  const spent = rows.reduce((s, r) => s + r.spent, 0)
  const left = Math.max(0, available - spent)
  const over = rows.filter((r) => r.spent > r.budget)

  return (
    <div className="screen">
      <BrandHeader
        right={
          <button
            className="round-btn solid"
            onClick={() => (window.location.hash = '#/create')}
            aria-label="创建日程"
          >
            <Icon name="plus" size={17} />
          </button>
        }
      />

      <PageHead
        title="给重要的事留点时间"
        sub={`时间预算 · ${fmtDateCN(week.from)} – ${fmtDateCN(week.to)}`}
      />

      <section className="hero">
        <div className="hero-row">
          <div>
            <div className="hero-label">本周可支配时间</div>
            <div className="hero-big">
              {Math.round(available / 60)}
              <em>小时</em>
            </div>
          </div>
          <div className="hero-side">
            24h
            <strong>每日本金</strong>
          </div>
        </div>
        <div className="hero-bar">
          <span style={{ width: `${Math.min(100, (spent / Math.max(1, available)) * 100)}%` }} />
        </div>
        <div className="hero-foot">
          <span>
            已使用 <b>{fmtMinutes(spent)}</b>
          </span>
          <span>
            剩余 <b>{fmtMinutes(left)}</b>
          </span>
        </div>
        <button className="hero-btn" onClick={() => setEditing((v) => !v)}>
          <span>{editing ? '完成调整' : '调整预算'}</span>
          <span className="mic">
            <Icon name={editing ? 'check' : 'settings'} size={14} />
          </span>
        </button>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>我的时间分配</h2>
          <span className="meta">使用 / 预算</span>
        </div>
        <div className="card">
          <div className="budget-list">
            {rows.map((r) => {
              const ratio = r.budget ? Math.min(1, r.spent / r.budget) : 0
              const isOver = r.budget > 0 && r.spent > r.budget
              return (
                <div className="budget-row" key={r.id}>
                  <div className="top" style={{ gridColumn: '1 / -1' }}>
                    <span className="budget-name">
                      <span className="dot" style={{ background: r.color }} />
                      {r.label}
                    </span>
                    {editing ? (
                      <span className="budget-step">
                        <button
                          className="step-btn"
                          aria-label={`减少${r.label}预算`}
                          onClick={() => setBudget(r.id, Math.max(0, r.budget - 30))}
                        >
                          −
                        </button>
                        <span className="budget-num">
                          <b>{fmtMinutes(r.budget)}</b>
                        </span>
                        <button
                          className="step-btn"
                          aria-label={`增加${r.label}预算`}
                          onClick={() => setBudget(r.id, r.budget + 30)}
                        >
                          +
                        </button>
                      </span>
                    ) : (
                      <span className="budget-num">
                        <b>{fmtMinutes(r.spent)}</b> / {fmtMinutes(r.budget)}
                      </span>
                    )}
                  </div>
                  <div className="bar" style={{ gridColumn: '1 / -1', marginTop: 7 }}>
                    <div className="progress" style={{ height: 6 }}>
                      <span
                        style={{
                          width: `${ratio * 100}%`,
                          background: isOver ? 'var(--red)' : r.color,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="row between"
                    style={{ gridColumn: '1 / -1', marginTop: 6 }}
                  >
                    <span className="faint" style={{ fontSize: 10.5 }}>
                      {isOver ? `超出 ${fmtMinutes(r.spent - r.budget)}` : `剩余 ${fmtMinutes(Math.max(0, r.left))}`}
                    </span>
                    <span className="faint" style={{ fontSize: 10.5 }}>
                      {Math.round((r.spent / Math.max(1, r.budget)) * 100)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="tip" style={{ marginTop: 14 }}>
        <span className="tip-icon">
          <Icon name="spark" size={15} />
        </span>
        <div>
          <strong>预算是参考，不是另一种压力</strong>
          <p>
            {over.length
              ? `本周「${over.map((o) => o.label).join('、')}」超出预算。连续多周如此，也许只是需要重新分配。`
              : '连不好超预算时，也许只是需要重新分配，而不是更用力地自律。'}
          </p>
        </div>
      </div>

      <p className="footnote">
        {editing
          ? '点击 − / + 以 30 分钟为单位调整，调整会立即保存。'
          : `已用时间来自「时间记录」，口径为 ${week.from} 至 ${week.to}。`}
      </p>

      <div style={{ marginTop: 12 }}>
        <Button
          block
          onClick={() => CATEGORIES.forEach((c) => setBudget(c.id, RECOMMENDED[c.id]))}
        >
          恢复推荐预算
        </Button>
      </div>
    </div>
  )
}
