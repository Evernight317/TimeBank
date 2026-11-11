import type { AppState, CategoryId, Insight } from '../types'
import { CATEGORY_MAP } from '../data/categories'
import {
  bestFocusMinutes,
  categoryAccuracy,
  completionByDayPart,
  completionStats,
  dayPartOf,
  DAY_PART_LABEL,
  estimateAccuracy,
  hourlyEffective,
  isEffective,
  logsBetween,
  median,
  peakWindow,
  rangeDates,
  tasksBetween,
  weekdayDelays,
} from './analytics'
import { addDays, fmtMinutes, pad2, toISODate } from './date'

export interface InsightOptions {
  days?: number
  now?: Date
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function buildInsights(state: AppState, options: InsightOptions = {}): Insight[] {
  const now = options.now ?? new Date()
  const days = options.days ?? 14
  const from = toISODate(addDays(now, -(days - 1)))
  const to = toISODate(now)
  const { tasks, logs } = state
  const out: Insight[] = []

  const acc = categoryAccuracy(tasks, logs, from, to)
  const completion = completionStats(tasks, from, to)

  // 1. 时间偏差：最被低估的品类（只针对学习/工作这类「估算型」任务，
  //    娱乐、通勤等消耗型品类由「时间黑洞」单独解释）
  const bias = acc
    .filter(
      (a) =>
        a.count >= 3 &&
        a.ratio > 1.12 &&
        (a.category === 'study' || a.category === 'work'),
    )
    .sort((a, b) => b.ratio - a.ratio)[0]
  if (bias) {
    const cat = CATEGORY_MAP[bias.category]
    const over = Math.round((bias.ratio - 1) * 100)
    out.push({
      id: 'bias',
      type: 'bias',
      tag: '时间偏差',
      title: `你低估了「${cat.label}」的耗时`,
      body: `最近 ${days} 天里，你 ${bias.count} 次安排${cat.label}任务，平均实际耗时比预估多 ${over}%。这不是拖延，而是估算模型需要校准。`,
      metric: `+${over}%`,
      tone: over > 40 ? 'bad' : 'warn',
    })
  }

  // 2. 效率规律：上午 vs 晚上
  const parts = completionByDayPart(tasks, from, to)
  const morning = parts.find((p) => p.part === 'morning')
  const evening = parts.find((p) => p.part === 'evening')
  if (morning && evening && morning.total >= 3 && evening.total >= 3) {
    const gap = morning.rate - evening.rate
    if (Math.abs(gap) >= 0.08) {
      const better = gap > 0 ? morning : evening
      const worse = gap > 0 ? evening : morning
      out.push({
        id: 'rhythm',
        type: 'rhythm',
        tag: '效率规律',
        title: `${DAY_PART_LABEL[better.part].slice(0, 2)}的完成率明显更高`,
        body: `你安排在白天的任务完成率 ${pct(better.rate)}，而${DAY_PART_LABEL[worse.part].slice(0, 2)}只有 ${pct(worse.rate)}。把重要任务放在${DAY_PART_LABEL[better.part].slice(0, 2)}，比要求自己「更自律」更有效。`,
        metric: `+${Math.round(Math.abs(gap) * 100)}pt`,
        tone: gap > 0 ? 'good' : 'warn',
      })
    }
  }

  // 3. 延期规律
  const delayed = tasksBetween(tasks, from, to).filter(
    (t) => t.status === 'delayed' || t.status === 'missed',
  )
  if (delayed.length >= 4) {
    const weekdays = weekdayDelays(tasks, from, to)
    const worst = [...weekdays].sort((a, b) => b.rate - a.rate)[0]
    const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    out.push({
      id: 'delay',
      type: 'delay',
      tag: '延期规律',
      title: `最近 ${days} 天有 ${delayed.length} 次延期`,
      body: `延期中占比最高的是${names[worst.dow]}（${pct(worst.rate)}）。如果某个固定日总是完不成，问题可能不在意志力，而在任务密度。`,
      metric: `${delayed.length} 次`,
      tone: 'warn',
    })
  }

  // 4. 时间黑洞
  const leaks = acc
    .filter((a) => a.ratio >= 1.6 && a.delta >= 30)
    .sort((a, b) => b.delta - a.delta)[0]
  if (leaks) {
    const cat = CATEGORY_MAP[leaks.category]
    const avgPlanned = Math.round(leaks.planned / leaks.count)
    const avgActual = Math.round(leaks.actual / leaks.count)
    out.push({
      id: 'blackhole',
      type: 'blackhole',
      tag: '时间黑洞',
      title: `${cat.label}可能是你的时间黑洞`,
      body: `过去 ${days} 天，你计划用于${cat.label}的时间平均 ${avgPlanned} 分钟，实际平均 ${avgActual} 分钟，累计偏差 ${fmtMinutes(leaks.delta)}。`,
      metric: `+${fmtMinutes(leaks.delta)}`,
      tone: 'bad',
    })
  }

  // 5. 周期总结
  const effective = logsBetween(logs, from, to)
    .filter((l) => isEffective(l.category))
    .reduce((s, l) => s + l.minutes, 0)
  if (effective > 0) {
    const perDay = effective / days
    out.push({
      id: 'summary',
      type: 'summary',
      tag: '周期总结',
      title: `近 ${days} 天，你每天平均有效投入 ${fmtMinutes(perDay)}`,
      body: `有效时间指学习与工作的实际投入。你的完成率为 ${pct(completion.completionRate)}，估算准确度 ${pct(
        estimateAccuracy(tasks, logs, from, to),
      )}。`,
      metric: `${fmtMinutes(effective)}`,
      tone: 'neutral',
    })
  }

  return out
}

export interface Persona {
  peak: { start: number; end: number }
  focusMinutes: number
  delayRate: number
  accuracy: number
  topLeak?: { category: CategoryId; delta: number }
  mostOverrun?: { category: CategoryId; ratio: number }
  effectivePerDay: number
  sampleDays: number
}

export function buildPersona(state: AppState, options: InsightOptions = {}): Persona {
  const now = options.now ?? new Date()
  const days = options.days ?? 30
  const from = toISODate(addDays(now, -(days - 1)))
  const to = toISODate(now)
  const dates = rangeDates(from, to)
  const { tasks, logs } = state

  const hourly = hourlyEffective(logs, from, to)
  const peak = peakWindow(hourly.map((v) => v / dates.length))

  const acc = categoryAccuracy(tasks, logs, from, to)
  const eligible = acc.filter((a) => a.count >= 2)
  const leak = eligible.filter((a) => a.delta > 0).sort((a, b) => b.delta - a.delta)[0]
  // 「最容易超时」只看学习/工作这类可估算任务，娱乐属于黑洞而非估算问题
  const overrun = [...acc]
    .filter((a) => a.count >= 2 && (a.category === 'study' || a.category === 'work'))
    .sort((a, b) => b.ratio - a.ratio)[0]

  const effective = logsBetween(logs, from, to)
    .filter((l) => isEffective(l.category))
    .reduce((s, l) => s + l.minutes, 0)

  const comp = completionStats(tasks, from, to)
  return {
    peak: { start: peak.start, end: peak.end },
    focusMinutes: bestFocusMinutes(tasks, logs, from, to),
    delayRate: comp.delayRate,
    accuracy: estimateAccuracy(tasks, logs, from, to),
    topLeak: leak ? { category: leak.category, delta: leak.delta } : undefined,
    mostOverrun: overrun ? { category: overrun.category, ratio: overrun.ratio } : undefined,
    effectivePerDay: effective / dates.length,
    sampleDays: dates.length,
  }
}

/** 供「今日」页使用的一句话洞察 */
export function todayHighlight(state: AppState, now = new Date()): string {
  const date = toISODate(now)
  const list = state.logs.filter((l) => l.date === date)
  if (!list.length) return '今天还没有记录 —— 先从一次打卡开始，让时间有迹可循。'
  const byCat = new Map<CategoryId, number>()
  for (const l of list) byCat.set(l.category, (byCat.get(l.category) ?? 0) + l.minutes)
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
  const cat = CATEGORY_MAP[top[0]]
  const total = list.reduce((s, l) => s + l.minutes, 0)
  return `今天已记录 ${fmtMinutes(total)}，其中「${cat.label}」占 ${pct(top[1] / total)}，是当前最集中的时间流向。`
}

export function formatHour(h: number): string {
  return `${pad2(((h % 24) + 24) % 24)}:00`
}

export function medianRatio(state: AppState, category: CategoryId, days = 30): number | null {
  const now = new Date()
  const from = toISODate(addDays(now, -(days - 1)))
  const to = toISODate(now)
  const acc = categoryAccuracy(state.tasks, state.logs, from, to).find(
    (a) => a.category === category,
  )
  if (!acc) return null
  return acc.ratio
}

export { median, dayPartOf }
