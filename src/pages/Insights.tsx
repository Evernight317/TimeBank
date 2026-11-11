import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { buildInsights, buildPersona, formatHour } from '../lib/insights'
import { fmtMinutes } from '../lib/date'
import { Card, Empty, SectionHead, Segmented, Tag } from '../components/ui'
import { Icon } from '../components/icons'

type Span = '7' | '14' | '30'

const TYPE_LABEL: Record<string, string> = {
  bias: '估算校准',
  rhythm: '节律',
  delay: '执行力',
  blackhole: '时间黑洞',
  summary: '周期总结',
}

export function InsightsPage() {
  const { state } = useApp()
  const [span, setSpan] = useState<Span>('14')
  const days = Number(span)

  const insights = useMemo(() => buildInsights(state, { days }), [state, days])
  const persona = useMemo(() => buildPersona(state, { days: 30 }), [state])

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <span className="eyebrow">AI 时间洞察</span>
          <h1 className="page-title">看见你自己看不见的规律</h1>
          <p className="page-sub">
            不是告诉你「应该怎样生活」，而是从你的真实记录里，指出那些你凭感觉发现不了的事实。
          </p>
        </div>
        <div className="topbar-actions">
          <Segmented<Span>
            value={span}
            onChange={setSpan}
            options={[
              { value: '7', label: '近 7 天' },
              { value: '14', label: '近 14 天' },
              { value: '30', label: '近 30 天' },
            ]}
          />
        </div>
      </div>

      <Card
        className="insight-hero"
        style={{
          marginBottom: 16,
          background:
            'radial-gradient(500px 220px at 100% 0%, rgba(14,107,79,.10), transparent 70%), linear-gradient(150deg,#fbfcfa,#f2f6f4)',
          borderColor: '#d9e6df',
        }}
      >
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              background: 'var(--accent)',
              color: '#f7f6f2',
              display: 'grid',
              placeItems: 'center',
              flex: 'none',
            }}
          >
            <Icon name="spark" size={20} />
          </div>
          <div>
            <strong style={{ fontSize: 15 }}>基于 {days} 天真实记录的分析</strong>
            <p className="muted" style={{ fontSize: 13, marginTop: 4, maxWidth: 720 }}>
              你的高效窗口是 {formatHour(persona.peak.start)}—{formatHour(persona.peak.end)}，单次最佳专注约{' '}
              {persona.focusMinutes} 分钟。下面每一条洞察，都来自你自己的数据，而不是通用建议。
            </p>
          </div>
        </div>
      </Card>

      {insights.length === 0 ? (
        <Card>
          <Empty
            title="数据还不足以形成洞察"
            hint="连续记录 3–5 天后，这里会自动出现关于你的时间偏差、节律与黑洞的分析。"
          />
        </Card>
      ) : (
        <div className="grid grid-2">
          {insights.map((ins) => (
            <article key={ins.id} className={`insight tone-${ins.tone}`}>
              <div className="row between">
                <Tag tone={ins.tone === 'neutral' ? 'accent' : ins.tone}>{ins.tag}</Tag>
                <span className="faint" style={{ fontSize: 11 }}>
                  {TYPE_LABEL[ins.type] ?? '分析'}
                </span>
              </div>
              {ins.metric && <div className="metric">{ins.metric}</div>}
              <h3>{ins.title}</h3>
              <p>{ins.body}</p>
            </article>
          ))}
        </div>
      )}

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <Card>
          <SectionHead title="数据基础" hint="洞察的可信度取决于样本" />
          <div className="row" style={{ gap: 26 }}>
            <div>
              <div className="stat-value">{state.logs.length}</div>
              <div className="stat-label">条时间记录</div>
            </div>
            <div>
              <div className="stat-value">{state.tasks.length}</div>
              <div className="stat-label">项安排</div>
            </div>
            <div>
              <div className="stat-value">{fmtMinutes(
                state.logs.reduce((s, l) => s + l.minutes, 0),
              )}</div>
              <div className="stat-label">累计记录</div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHead title="洞察怎么来的" hint="可解释，而非黑箱" />
          <ul className="muted" style={{ paddingLeft: 18, fontSize: 12.5, lineHeight: 1.9, margin: 0 }}>
            <li>对比每项安排的计划时长与实际记录，计算偏差率</li>
            <li>按上午 / 下午 / 晚上切分完成率，寻找节律差异</li>
            <li>统计延期发生的星期分布，识别结构性原因</li>
            <li>累计各类别的正偏差，定位时间黑洞</li>
          </ul>
        </Card>

        <Card>
          <SectionHead title="下一步" hint="从洞察到行动" />
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.85 }}>
            选一条你最有共鸣的洞察，回到「预算」调整下周的分配，或在下一次安排时把预计时长改得更接近历史均值。
          </p>
          <div className="notice" style={{ marginTop: 12 }}>
            <Icon name="spark" size={15} />
            <span>系统会随着使用越来越懂你。</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
