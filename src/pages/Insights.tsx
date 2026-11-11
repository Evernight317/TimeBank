import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { buildInsights, todayHighlight } from '../lib/insights'
import { fmtDateCN, fmtMinutes, addDays, toISODate, todayISO } from '../lib/date'
import { BrandHeader, PageHead } from '../components/nav'
import { Button, Segmented } from '../components/ui'
import { Icon } from '../components/icons'
import { categoryMinutes, logsBetween, minutesOn, tasksBetween } from '../lib/analytics'

type Tab = 'week' | 'daily'

const STYLE_BY_INDEX = ['dark', 'warm', 'cool', 'plain', 'plain']

export function InsightsPage() {
  const { state } = useApp()
  const [tab, setTab] = useState<Tab>('week')

  const today = todayISO()
  const from = toISODate(addDays(new Date(), -6))
  const insights = useMemo(() => buildInsights(state, { days: 7 }), [state])

  const todayLogs = logsBetween(state.logs, today, today)
  const todayTotal = minutesOn(state.logs, today)
  const split = categoryMinutes(todayLogs)
  const todayTasks = tasksBetween(state.tasks, today, today)
  const done = todayTasks.filter((t) => t.status === 'done').length

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

      <PageHead title="不止记录，更懂你" sub="AI 时间洞察 · 最近 7 天" />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'week', label: '本周洞察' },
          { value: 'daily', label: '每日回顾' },
        ]}
      />

      {tab === 'week' ? (
        <>
          <p className="footnote" style={{ textAlign: 'left', margin: '12px 2px 12px' }}>
            {fmtDateCN(from)} — {fmtDateCN(today)} · 根据你的时间记录生成
          </p>

          {insights.length === 0 ? (
            <div className="card">
              <p className="muted" style={{ fontSize: 12 }}>
                数据还不足以形成洞察，先连续记录几天。
              </p>
            </div>
          ) : (
            insights.map((ins, i) => {
              const style = STYLE_BY_INDEX[i] ?? 'plain'
              return (
                <article key={ins.id} className={`insight-card ${style}`}>
                  <div className="no">
                    <b>{String(i + 1).padStart(2, '0')}</b> / {ins.tag}
                  </div>
                  {ins.metric && <div className="figure" style={style === 'dark' ? { color: '#f4f7fa' } : undefined}>{ins.metric}</div>}
                  <h3>{ins.title}</h3>
                  <p>{ins.body}</p>
                </article>
              )
            })
          )}

          <p className="insight-foot">
            AI 提供观察和建议，如何调整由你决定。
            <br />
            所有结论都来自你自己的记录，而不是通用建议。
          </p>
        </>
      ) : (
        <>
          <div className="insight-card dark" style={{ marginTop: 12 }}>
            <div className="no">
              <b>今日</b> / 回顾
            </div>
            <div className="figure" style={{ color: '#f4f7fa' }}>
              {fmtMinutes(todayTotal)}
              <em style={{ color: 'rgba(244,247,250,.6)' }}>已记录</em>
            </div>
            <h3>今天的时间，正在变成数据</h3>
            <p>{todayHighlight(state)}</p>
          </div>

          <div className="metric-grid">
            <div className="metric-cell">
              <div className="k">完成安排</div>
              <div className="v">
                {done}
                <small>/ {todayTasks.length}</small>
              </div>
              <div className="d">已完成 / 已安排</div>
            </div>
            <div className="metric-cell">
              <div className="k">有效投入</div>
              <div className="v">
                {fmtMinutes((split.study ?? 0) + (split.work ?? 0))}
              </div>
              <div className="d">学习 + 工作</div>
            </div>
            <div className="metric-cell">
              <div className="k">娱乐</div>
              <div className="v">{fmtMinutes(split.entertainment ?? 0)}</div>
              <div className="d">含短视频等</div>
            </div>
            <div className="metric-cell">
              <div className="k">未记录</div>
              <div className="v">{fmtMinutes(Math.max(0, 1440 - todayTotal))}</div>
              <div className="d">空白也是一种信息</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Button block onClick={() => (window.location.hash = '#/replay')}>
              <Icon name="replay" size={15} />
              回放今天的时间轴
            </Button>
          </div>

          <p className="insight-foot">每日回顾会在每天结束后自动更新。</p>
        </>
      )}
    </div>
  )
}
