import type { CategoryId, Task, TimeLog } from '../types'
import { CATEGORY_ORDER } from '../data/categories'
import { addDays, parseClock, startOfWeek, toISODate } from './date'

export interface CategoryTotal {
  category: CategoryId
  minutes: number
}

export function logsOn(logs: TimeLog[], date: string): TimeLog[] {
  return logs.filter((l) => l.date === date)
}

export function minutesOn(logs: TimeLog[], date: string): number {
  return logs.reduce((s, l) => (l.date === date ? s + l.minutes : s), 0)
}

export function categoryMinutes(logs: TimeLog[], date?: string): Record<CategoryId, number> {
  const out = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<CategoryId, number>
  for (const l of logs) {
    if (date && l.date !== date) continue
    out[l.category] += l.minutes
  }
  return out
}

export function categoryTotal(logs: TimeLog[], date?: string): CategoryTotal[] {
  const map = categoryMinutes(logs, date)
  return CATEGORY_ORDER.map((category) => ({ category, minutes: map[category] }))
    .filter((c) => c.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
}

export function rangeDates(from: string, to: string): string[] {
  const out: string[] = []
  let cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (cur <= end) {
    out.push(toISODate(cur))
    cur = addDays(cur, 1)
  }
  return out
}

export function lastNDates(n: number, end = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(toISODate(addDays(end, -i)))
  return out
}

export function logsBetween(logs: TimeLog[], from: string, to: string): TimeLog[] {
  return logs.filter((l) => l.date >= from && l.date <= to)
}

export function tasksBetween(tasks: Task[], from: string, to: string): Task[] {
  return tasks.filter((t) => t.date >= from && t.date <= to)
}

export function dailySeries(logs: TimeLog[], dates: string[], category?: CategoryId) {
  return dates.map((date) => ({
    date,
    minutes: logs.reduce(
      (s, l) => (l.date === date && (!category || l.category === category) ? s + l.minutes : s),
      0,
    ),
  }))
}

export interface CategoryAccuracy {
  category: CategoryId
  count: number
  planned: number
  actual: number
  /** 实际 / 计划 */
  ratio: number
  delta: number
}

/** 按品类统计「计划 vs 实际」，只统计已完成且有记录的品类 */
export function categoryAccuracy(
  tasks: Task[],
  logs: TimeLog[],
  from: string,
  to: string,
): CategoryAccuracy[] {
  const logByTask = new Map<string, TimeLog>()
  for (const l of logs) if (l.taskId) logByTask.set(l.taskId, l)

  const acc = new Map<CategoryId, CategoryAccuracy>()
  for (const t of tasksBetween(tasks, from, to)) {
    if (t.status !== 'done') continue
    const log = logByTask.get(t.id)
    if (!log) continue
    const item =
      acc.get(t.category) ??
      { category: t.category, count: 0, planned: 0, actual: 0, ratio: 1, delta: 0 }
    item.count += 1
    item.planned += t.plannedMinutes
    item.actual += log.minutes
    acc.set(t.category, item)
  }
  const out = [...acc.values()]
  for (const item of out) {
    item.ratio = item.planned > 0 ? item.actual / item.planned : 1
    item.delta = item.actual - item.planned
  }
  return out.sort((a, b) => b.delta - a.delta)
}

export interface CompletionStats {
  total: number
  done: number
  delayed: number
  missed: number
  planned: number
  completionRate: number
  delayRate: number
}

export function completionStats(tasks: Task[], from: string, to: string): CompletionStats {
  const list = tasksBetween(tasks, from, to)
  const done = list.filter((t) => t.status === 'done').length
  const delayed = list.filter((t) => t.status === 'delayed').length
  const missed = list.filter((t) => t.status === 'missed').length
  const planned = list.filter((t) => t.status === 'planned').length
  const total = list.length || 1
  return {
    total: list.length,
    done,
    delayed,
    missed,
    planned,
    completionRate: done / total,
    delayRate: (delayed + missed) / total,
  }
}

export type DayPart = 'morning' | 'afternoon' | 'evening'

export function dayPartOf(start: string): DayPart {
  const h = parseClock(start) / 60
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  return 'evening'
}

export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: '上午 05:00–12:00',
  afternoon: '下午 12:00–18:00',
  evening: '晚上 18:00–24:00',
}

export function completionByDayPart(tasks: Task[], from: string, to: string) {
  const buckets: Record<DayPart, { done: number; total: number }> = {
    morning: { done: 0, total: 0 },
    afternoon: { done: 0, total: 0 },
    evening: { done: 0, total: 0 },
  }
  for (const t of tasksBetween(tasks, from, to)) {
    const part = dayPartOf(t.start)
    buckets[part].total += 1
    if (t.status === 'done') buckets[part].done += 1
  }
  return (Object.keys(buckets) as DayPart[]).map((part) => ({
    part,
    ...buckets[part],
    rate: buckets[part].total ? buckets[part].done / buckets[part].total : 0,
  }))
}

export function weekdayDelays(tasks: Task[], from: string, to: string) {
  const out = Array.from({ length: 7 }, () => ({ delayed: 0, total: 0 }))
  for (const t of tasksBetween(tasks, from, to)) {
    const dow = new Date(t.date + 'T00:00:00').getDay()
    out[dow].total += 1
    if (t.status === 'delayed' || t.status === 'missed') out[dow].delayed += 1
  }
  return out.map((v, i) => ({ dow: i, ...v, rate: v.total ? v.delayed / v.total : 0 }))
}

/** 估算准确度：平均绝对偏差百分比越低越好 */
export function estimateAccuracy(tasks: Task[], logs: TimeLog[], from: string, to: string) {
  const logByTask = new Map<string, TimeLog>()
  for (const l of logs) if (l.taskId) logByTask.set(l.taskId, l)
  const devs: number[] = []
  for (const t of tasksBetween(tasks, from, to)) {
    if (t.status !== 'done') continue
    const log = logByTask.get(t.id)
    if (!log || t.plannedMinutes <= 0) continue
    devs.push(Math.abs(log.minutes - t.plannedMinutes) / t.plannedMinutes)
  }
  if (!devs.length) return 0
  const mean = devs.reduce((a, b) => a + b, 0) / devs.length
  return Math.max(0, 1 - mean)
}

export function median(nums: number[]): number {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 有效时间：学习 + 工作 */
export const isEffective = (c: CategoryId) => c === 'study' || c === 'work'

/** 24 小时各小时的有效分钟数（用于个人画像的热力分布） */
export function hourlyEffective(logs: TimeLog[], from: string, to: string) {
  const bins = Array.from({ length: 24 }, () => 0)
  for (const l of logsBetween(logs, from, to)) {
    if (!isEffective(l.category)) continue
    // 把一段时间的分钟数按小时切开，避免整段都算到开始的那一小时
    let cursor = parseClock(l.start)
    let remaining = l.minutes
    let guard = 0
    while (remaining > 0 && guard < 48) {
      const hour = Math.floor(cursor / 60) % 24
      const hourEnd = (Math.floor(cursor / 60) + 1) * 60
      const chunk = Math.min(remaining, hourEnd - cursor)
      bins[hour] += chunk
      remaining -= chunk
      cursor += chunk
      guard += 1
    }
  }
  return bins
}

/** 找出连续 3 小时有效时间最多的窗口 */
export function peakWindow(hourly: number[]): { start: number; end: number; score: number } {
  let best = { start: 9, end: 12, score: -1 }
  for (let h = 0; h < 22; h++) {
    const score = hourly[h] + hourly[h + 1] + hourly[h + 2]
    if (score > best.score) best = { start: h, end: h + 3, score }
  }
  return best
}

export function bestFocusMinutes(tasks: Task[], logs: TimeLog[], from: string, to: string) {
  const logByTask = new Map<string, TimeLog>()
  for (const l of logs) if (l.taskId) logByTask.set(l.taskId, l)
  const durations: number[] = []
  for (const t of tasksBetween(tasks, from, to)) {
    if (t.status !== 'done' || !isEffective(t.category)) continue
    const log = logByTask.get(t.id)
    if (log && log.minutes >= 20) durations.push(log.minutes)
  }
  const med = median(durations)
  return med ? Math.round(med / 5) * 5 : 45
}

export function weekRange(now = new Date()) {
  const start = startOfWeek(now)
  const end = addDays(start, 6)
  return { from: toISODate(start), to: toISODate(end) }
}

export function weekUsedByCategory(logs: TimeLog[], now = new Date()) {
  const { from, to } = weekRange(now)
  return categoryMinutes(logsBetween(logs, from, to))
}

export function sumMinutes(logs: TimeLog[]): number {
  return logs.reduce((s, l) => s + l.minutes, 0)
}
