/** 日期与时长工具：全部使用本地时区，避免 UTC 偏移导致「今天」错位 */

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function diffDays(a: string, b: string): number {
  const ms = fromISODate(a).getTime() - fromISODate(b).getTime()
  return Math.round(ms / 86400000)
}

/** 周一为一周起点 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function fmtMinutes(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  if (r === 0) return `${h}h`
  return `${h}h${pad2(r)}m`
}

export function fmtDurationLong(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r} 分钟`
  if (r === 0) return `${h} 小时`
  return `${h} 小时 ${r} 分`
}

export function fmtSigned(min: number): string {
  const sign = min > 0 ? '+' : min < 0 ? '−' : ''
  return `${sign}${fmtMinutes(Math.abs(min))}`
}

export function fmtClock(minutesFromMidnight: number): string {
  const m = ((Math.round(minutesFromMidnight) % 1440) + 1440) % 1440
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`
}

export function parseClock(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + (m || 0)
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayLabel(date: string): string {
  return WEEKDAYS[fromISODate(date).getDay()]
}

export function fmtDateCN(date: string, withYear = false): string {
  const d = fromISODate(date)
  const base = `${d.getMonth() + 1} 月 ${d.getDate()} 日`
  return withYear ? `${d.getFullYear()} 年 ${base}` : base
}

export function relativeDayLabel(date: string): string {
  const delta = diffDays(date, todayISO())
  if (delta === 0) return '今天'
  if (delta === -1) return '昨天'
  if (delta === -2) return '前天'
  if (delta === 1) return '明天'
  return `${Math.abs(delta)} 天${delta < 0 ? '前' : '后'}`
}

export function monthMatrix(year: number, month: number): string[][] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1
  const cells: string[][] = []
  let row: string[] = []
  for (let i = 0; i < startDay; i++) row.push('')
  const days = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= days; d++) {
    row.push(toISODate(new Date(year, month, d)))
    if (row.length === 7) {
      cells.push(row)
      row = []
    }
  }
  if (row.length) {
    while (row.length < 7) row.push('')
    cells.push(row)
  }
  return cells
}
