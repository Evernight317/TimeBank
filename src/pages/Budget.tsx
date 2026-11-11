import { useMemo } from 'react'
import type { CategoryId } from '../types'
import { CATEGORIES } from '../data/categories'
import { useApp } from '../lib/store'
import { weekRange, weekUsedByCategory } from '../lib/analytics'
import { fmtDateCN, fmtMinutes } from '../lib/date'
import { Button, Card, SectionHead, Stat, Tag } from '../components/ui'
import { Donut } from '../components/charts'
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

export function BudgetPage() {
  const { state, setBudget } = useApp()
  const used = useMemo(() => weekUsedByCategory(state.logs), [state.logs])
  const week = weekRange()

  const rows = CATEGORIES.map((c) => {
    const budget = state.budgets.find((b) => b.category === c.id)?.weeklyMinutes ?? 0
    const spent = used[c.id]
    return { ...c, budget, spent, ratio: budget ? spent / budget : 0, left: budget - spent }
  })

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const over = rows.filter((r) => r.budget > 0 && r.spent > r.budget)
  const available = 7 * 24 * 60 - (rows.find((r) => r.id === 'sleep')?.budget ?? 0)

  const slices = rows
    .filter((r) => r.spent > 0)
    .map((r) => ({ id: r.id, label: r.label, value: r.spent, color: r.color }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">时间预算</span>
          <h1 className="page-title">像管理钱一样管理时间</h1>
          <p className="page-sub">
            {fmtDateCN(week.from)} — {fmtDateCN(week.to)} · 本周可用 {fmtMinutes(available)}（已扣除睡眠预算）
          </p>
        </div>
        <div className="topbar-actions">
          <Button
            onClick={() => CATEGORIES.forEach((c) => setBudget(c.id, RECOMMENDED[c.id]))}
          >
            恢复推荐预算
          </Button>
        </div>
      </div>

      <div className="split" style={{ marginBottom: 16 }}>
        <Card>
          <SectionHead title="本周使用情况" hint="实际记录 vs 周预算" action={<Tag tone={over.length ? 'warn' : 'good'}>{over.length ? `${over.length} 项透支` : '预算内'}</Tag>} />
          <div className="row wrap" style={{ gap: 28, alignItems: 'center' }}>
            <Donut
              slices={slices}
              total={totalSpent}
              size={188}
              thickness={19}
              centerTop="本周已记录"
              centerMain={fmtMinutes(totalSpent)}
              centerSub={`预算 ${fmtMinutes(totalBudget)}`}
            />
            <div className="row" style={{ gap: 26, flexWrap: 'wrap' }}>
              <Stat label="预算总额" value={fmtMinutes(totalBudget)} hint="含睡眠 56h" />
              <Stat
                label="剩余额度"
                value={fmtMinutes(Math.max(0, totalBudget - totalSpent))}
                tone={totalSpent > totalBudget ? 'bad' : 'good'}
                hint={totalSpent > totalBudget ? `已超出 ${fmtMinutes(totalSpent - totalBudget)}` : '仍在预算内'}
              />
              <Stat
                label="执行进度"
                value={`${totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0}%`}
                hint="按周计算"
              />
            </div>
          </div>
        </Card>

        <Card tint>
          <SectionHead title="透支分析" hint="借鉴银行逻辑" />
          {over.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.8 }}>
              本周所有类别都在预算内。预算不是限制，而是你对自己时间的一次预先承诺。
            </p>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {over.map((r) => (
                <div key={r.id}>
                  <div className="row between">
                    <span style={{ fontSize: 13 }}>{r.label}时间透支</span>
                    <strong style={{ color: 'var(--bad)', fontFamily: 'var(--serif)', fontSize: 20 }}>
                      {fmtMinutes(r.spent - r.budget)}
                    </strong>
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    预算 {fmtMinutes(r.budget)}，实际 {fmtMinutes(r.spent)}。如果连续多周如此，可能说明预算低于真实需求，而不是你不够自律。
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="notice" style={{ marginTop: 14 }}>
            <Icon name="spark" size={15} />
            <span>预算可以随时调整 —— 它不是用来惩罚你的。</span>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHead
          title="分类预算"
          hint="点击 − / + 以 30 分钟为单位调整"
          action={<Tag tone="neutral">每周</Tag>}
        />
        {rows.map((r) => {
          const pct = r.budget ? Math.min(1, r.ratio) : 0
          const isOver = r.budget > 0 && r.spent > r.budget
          return (
            <div key={r.id} className={`budget-row ${isOver ? 'budget-over' : ''}`}>
              <span className="dot" style={{ background: r.color }} />
              <span className="budget-name">{r.label}</span>
              <div>
                <div className="progress" style={{ height: 7 }}>
                  <span
                    style={{
                      width: `${pct * 100}%`,
                      background: isOver ? 'var(--bad)' : r.color,
                    }}
                  />
                </div>
                <div className="row between" style={{ marginTop: 5 }}>
                  <span className="faint" style={{ fontSize: 11.5 }}>
                    {isOver ? `超出 ${fmtMinutes(r.spent - r.budget)}` : `剩余 ${fmtMinutes(Math.max(0, r.left))}`}
                  </span>
                  <span className="faint" style={{ fontSize: 11.5 }}>
                    {Math.round(r.ratio * 100)}%
                  </span>
                </div>
              </div>
              <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                <button
                  className="icon-btn"
                  onClick={() => setBudget(r.id, Math.max(0, r.budget - 30))}
                  aria-label={`减少${r.label}预算`}
                >
                  −
                </button>
                <span className="budget-num" style={{ width: 74, textAlign: 'center' }}>
                  <b>{fmtMinutes(r.budget)}</b>
                </span>
                <button
                  className="icon-btn"
                  onClick={() => setBudget(r.id, r.budget + 30)}
                  aria-label={`增加${r.label}预算`}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </Card>

      <p className="faint" style={{ fontSize: 11.5, marginTop: 16 }}>
        已用时间来自「时间记录」，口径为本周一 00:00 至周日 24:00。
      </p>
    </div>
  )
}
