import { useMemo } from 'react'
import { CATEGORY_MAP } from '../data/categories'
import { useApp } from '../lib/store'
import { buildPersona } from '../lib/insights'
import {
  completionStats,
  hourlyEffective,
  rangeDates,
} from '../lib/analytics'
import { addDays, diffDays, fmtMinutes, toISODate, todayISO } from '../lib/date'
import { BrandHeader, PageHead } from '../components/nav'
import { Icon } from '../components/icons'

export function MePage() {
  const { state } = useApp()
  const today = todayISO()
  const from = toISODate(addDays(new Date(), -29))

  const persona = useMemo(() => buildPersona(state, { days: 30 }), [state])
  const comp = useMemo(
    () => completionStats(state.tasks, from, today),
    [state.tasks, from, today],
  )
  const hourly = useMemo(() => hourlyEffective(state.logs, from, today), [state.logs, from, today])
  const dates = useMemo(() => rangeDates(from, today), [from, today])
  const dailyAvg = hourly.map((v) => v / dates.length)
  const peakMax = Math.max(...dailyAvg, 1)

  const companion = Math.max(1, diffDays(today, state.startedAt) + 1)
  const type =
    persona.peak.start < 11 ? '晨间专注型' : persona.peak.start >= 18 ? '夜间专注型' : '午后专注型'
  const typeDesc =
    type === '晨间专注型'
      ? '你更擅长把重要的事放在上午，下午留给协作与杂事。'
      : type === '夜间专注型'
        ? '夜深人静时你的效率最高，但要注意第二天的睡眠债。'
        : '午后的长段时间是你最稳定的专注窗口。'

  const focusLow = Math.max(15, Math.round((persona.focusMinutes - 10) / 5) * 5)
  const focusHigh = Math.round((persona.focusMinutes + 10) / 5) * 5

  const records = state.logs.length
  const overrun = persona.mostOverrun

  const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`

  return (
    <div className="screen">
      <BrandHeader
        right={
          <button
            className="avatar"
            onClick={() => (window.location.hash = '#/settings')}
            aria-label="设置"
          >
            TB
          </button>
        }
      />

      <PageHead title="慢慢认识自己的节奏" sub="个人时间画像 · 基于最近 30 天" />

      <div className="persona-hero">
        <div className="badge-row">
          <span className="pill pill-done">
            <Icon name="spark" size={11} />
            已陪伴你 {companion} 天
          </span>
          <span className="pill pill-idle">{records} 条记录</span>
        </div>
        <h2 style={{ marginTop: 12, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
          你是「{type}」
        </h2>
        <p style={{ marginTop: 5, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7 }}>
          {typeDesc}
        </p>
      </div>

      <section className="block">
        <div className="block-head">
          <h2>你的高效时段</h2>
          <span className="meta">按时段统计有效投入完成情况</span>
        </div>
        <div className="card">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 650,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatHour(persona.peak.start)} — {formatHour(persona.peak.end)}
            </div>
            <span className="pill pill-done">高效窗口</span>
          </div>
          <div className="hour-bars" style={{ marginTop: 16 }}>
            {hourly.map((_v, h) => {
              const active = h >= persona.peak.start && h < persona.peak.end
              return (
                <div className="hour-col" key={h} title={`${h}:00 · ${Math.round(dailyAvg[h])} 分钟`}>
                  <div className="hour-track">
                    <span
                      className={active ? 'on' : ''}
                      style={{ height: `${Math.max(2, (dailyAvg[h] / peakMax) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div
            className="row between"
            style={{ marginTop: 8, fontSize: 9.5, color: 'var(--faint)' }}
          >
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </section>

      <div className="metric-grid">
        <div className="metric-cell">
          <div className="k">最佳连续专注</div>
          <div className="v">
            {focusLow}–{focusHigh}
            <small>分钟</small>
          </div>
          <div className="d">完成后你实际能保持的时长</div>
        </div>
        <div className="metric-cell">
          <div className="k">时间估算准确度</div>
          <div className="v">
            {Math.round(persona.accuracy * 100)}
            <small>%</small>
          </div>
          <div className="d">计划与实际的接近程度</div>
        </div>
        <div className="metric-cell">
          <div className="k">平均任务延期率</div>
          <div className="v">
            {Math.round(comp.delayRate * 100)}
            <small>%</small>
          </div>
          <div className="d">
            {comp.delayed} 次延期 · {comp.missed} 次未完成
          </div>
        </div>
        <div className="metric-cell">
          <div className="k">最容易超时的任务</div>
          <div className="v" style={{ fontSize: 18 }}>
            {overrun ? CATEGORY_MAP[overrun.category].label : '尚未显现'}
          </div>
          <div className="d">
            {overrun ? `实际是计划的 ${Math.round(overrun.ratio * 100)}%` : '继续记录以识别'}
          </div>
        </div>
      </div>

      <section className="block">
        <div className="block-head">
          <h2>这 30 天</h2>
          <span className="meta">统计快照</span>
        </div>
        <div className="card">
          <div className="row between" style={{ fontSize: 12 }}>
            <span className="muted">日均有效投入</span>
            <b>{fmtMinutes(persona.effectivePerDay)}</b>
          </div>
          <div className="row between" style={{ fontSize: 12, marginTop: 10 }}>
            <span className="muted">最常出现的时间黑洞</span>
            <b>{persona.topLeak ? CATEGORY_MAP[persona.topLeak.category].label : '—'}</b>
          </div>
          <div className="row between" style={{ fontSize: 12, marginTop: 10 }}>
            <span className="muted">累计多消耗</span>
            <b>{persona.topLeak ? fmtMinutes(persona.topLeak.delta) : '—'}</b>
          </div>
          <div className="row between" style={{ fontSize: 12, marginTop: 10 }}>
            <span className="muted">完成率</span>
            <b>{Math.round(comp.completionRate * 100)}%</b>
          </div>
        </div>
      </section>

      <div className="closing-card">
        <h3>更了解自己，而不是给自己打分</h3>
        <p>
          这里不会说你好或不好。只有你的数据，和它告诉你的节奏 —— 以及下一次，你可以怎样选择。
        </p>
      </div>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="btn btn-ghost btn-block"
          style={{ justifyContent: 'space-between' }}
          onClick={() => (window.location.hash = '#/records')}
        >
          <span className="row" style={{ gap: 8 }}>
            <Icon name="records" size={15} />
            时间记录
          </span>
          <Icon name="arrow" size={14} />
        </button>
        <button
          className="btn btn-ghost btn-block"
          style={{ justifyContent: 'space-between' }}
          onClick={() => (window.location.hash = '#/settings')}
        >
          <span className="row" style={{ gap: 8 }}>
            <Icon name="settings" size={15} />
            设置与数据
          </span>
          <Icon name="arrow" size={14} />
        </button>
      </div>

      <p className="footnote">
        画像只是最近 30 天的统计快照。生活节奏变化时，它也应该随之变化。
      </p>
    </div>
  )
}
