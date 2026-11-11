import type { CategoryId } from '../types'
import { CATEGORY_KEYWORDS } from '../data/categories'
import { addDays, pad2, toISODate } from './date'

export interface ParsedTask {
  title: string
  category: CategoryId
  date: string
  start: string
  plannedMinutes: number
  confidence: number
  raw: string
}

const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

/** 解析「七」「十一」「二十三」「两」这类中文数字 */
export function cnToNumber(input: string): number | null {
  const s = input.trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Number(s)
  if (/^\d+\s*\.\s*\d+$/.test(s)) return Number(s.replace(/\s/g, ''))
  if (s === '半') return 0.5

  const tenIndex = s.indexOf('十')
  if (tenIndex === -1) {
    let num = 0
    for (const ch of s) {
      const d = CN_DIGITS[ch]
      if (d === undefined) return null
      num = num * 10 + d
    }
    return num
  }
  const tensPart = s.slice(0, tenIndex)
  const onesPart = s.slice(tenIndex + 1)
  const tens = tensPart === '' ? 1 : CN_DIGITS[tensPart] ?? 0
  const ones = onesPart === '' ? 0 : CN_DIGITS[onesPart] ?? 0
  return tens * 10 + ones
}

const WEEKDAY_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
  天: 0,
}

interface DateHit {
  date: string
  matched: string
}

function parseDate(text: string, now: Date): DateHit | null {
  const iso = (d: Date) => toISODate(d)

  const rel = text.match(/大后天|后天|明天|今天|今晚|明晚/)
  if (rel) {
    const map: Record<string, number> = {
      今天: 0,
      今晚: 0,
      明天: 1,
      明晚: 1,
      后天: 2,
      大后天: 3,
    }
    return { date: iso(addDays(now, map[rel[0]])), matched: rel[0] }
  }

  const week = text.match(/(下)?(?:周|星期|礼拜)([一二三四五六日天])/)
  if (week) {
    const target = WEEKDAY_MAP[week[2]]
    const today = now.getDay()
    let delta = target - today
    if (week[1]) delta += 7
    else if (delta <= 0) delta += 7
    return { date: iso(addDays(now, delta)), matched: week[0] }
  }

  const md = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/)
  if (md) {
    const year = now.getFullYear()
    let d = new Date(year, Number(md[1]) - 1, Number(md[2]))
    if (d.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
      d = new Date(year + 1, Number(md[1]) - 1, Number(md[2]))
    }
    return { date: iso(d), matched: md[0] }
  }
  return null
}

interface TimeHit {
  start: string
  matched: string
  explicit: boolean
}

function parseTime(text: string): TimeHit | null {
  // 19:30 / 19：30
  const colon = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (colon) {
    const h = Math.min(23, Number(colon[1]))
    const m = Math.min(59, Number(colon[2]))
    return { start: `${pad2(h)}:${pad2(m)}`, matched: colon[0], explicit: true }
  }

  const m = text.match(
    /(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|夜里|睡前)?\s*(\d{1,2}|[零〇一二两三四五六七八九十]{1,3})\s*[点時时](半|\d{1,2}\s*分?)?/,
  )
  if (!m) return null
  const period = m[1] ?? ''
  const num = cnToNumber(m[2])
  if (num === null) return null
  let hour = Math.floor(num)
  let minute = 0
  const tail = m[3]
  if (tail === '半') minute = 30
  else if (tail) {
    const mm = Number(tail.replace(/[^\d]/g, ''))
    if (!Number.isNaN(mm)) minute = Math.min(59, mm)
  }
  if (period === '下午' || period === '傍晚' || period === '晚上' || period === '夜里') {
    if (hour < 12) hour += 12
  } else if (period === '中午') {
    if (hour < 11) hour += 12
  } else if (period === '凌晨' && hour === 12) {
    hour = 0
  }
  if (hour > 23) hour = 23
  return {
    start: `${pad2(hour)}:${pad2(minute)}`,
    matched: m[0],
    explicit: Boolean(period) || m[2].length > 0,
  }
}

const PERIOD_DEFAULT: Array<{ re: RegExp; start: string }> = [
  { re: /凌晨/, start: '00:30' },
  { re: /早上|早晨/, start: '07:30' },
  { re: /上午/, start: '09:00' },
  { re: /中午/, start: '12:00' },
  { re: /下午/, start: '14:00' },
  { re: /傍晚/, start: '17:30' },
  { re: /晚上|夜里|今晚|明晚|睡前/, start: '19:00' },
]

interface DurationHit {
  minutes: number
  matched: string
}

function parseDuration(text: string): DurationHit | null {
  const num = '([零〇一二两三四五六七八九十]{1,3}|\\d{1,2})'

  // 先匹配「一个半小时 / 两个半小时」，否则会被「半小时」抢先命中
  const hourHalf = text.match(new RegExp(`${num}\\s*个?\\s*半\\s*(?:小时|钟头|h|H)`))
  if (hourHalf) {
    const n = cnToNumber(hourHalf[1])
    if (n !== null) return { minutes: Math.round(n * 60 + 30), matched: hourHalf[0] }
  }

  const halfHour = text.match(/半\s*个?\s*(?:小时|钟头)/)
  if (halfHour) return { minutes: 30, matched: halfHour[0] }

  const hours = text.match(new RegExp(`${num}\\s*个?\\s*(?:小时|钟头|h|H)`))
  if (hours) {
    const n = cnToNumber(hours[1])
    if (n !== null) return { minutes: Math.round(n * 60), matched: hours[0] }
  }

  const minutes = text.match(/(\d{1,3})\s*(?:分钟|分|min)/)
  if (minutes) {
    return { minutes: Number(minutes[1]), matched: minutes[0] }
  }
  return null
}

function inferCategory(title: string): CategoryId {
  for (const { id, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => title.includes(w))) return id
  }
  return 'other'
}

function cleanupTitle(text: string): string {
  return text
    .replace(/^[，,、;；:：\s]+/, '')
    .replace(/[，,、;；:：\s]+$/, '')
    .replace(/^(我要|我打算|计划|安排|帮我|请|然后|再|就|顺便|顺便去|之后)/, '')
    .replace(/(去|进行|做)$/, '')
    .trim()
}

const NOISE = /(之前|以后|左右|大概|大约|总共|一共)/g

export function parseNaturalLanguage(input: string, now = new Date()): ParsedTask[] {
  const normalized = input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ':')
    .trim()
  if (!normalized) return []

  const segments = normalized
    .split(/[，,。；;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const out: ParsedTask[] = []
  let carriedDate: string | null = null
  let carriedDateMatched = ''

  for (const raw of segments) {
    let rest = raw
    let confidence = 0.5

    // 先记下整句的时段线索：日期词（今晚 / 明晚）被移除后，
    // 「8 点」这种没有时段前缀的小时需要靠它来补 12 小时
    const periodHint: 'morning' | 'noon' | 'afternoon' | 'evening' | null = /今晚|明晚|晚上|夜里|睡前/.test(
      raw,
    )
      ? 'evening'
      : /下午|傍晚/.test(raw)
        ? 'afternoon'
        : /中午/.test(raw)
          ? 'noon'
          : /凌晨|早上|早晨|上午/.test(raw)
            ? 'morning'
            : null

    const dateHit = parseDate(rest, now)
    if (dateHit) {
      carriedDate = dateHit.date
      carriedDateMatched = dateHit.matched
      rest = rest.replace(dateHit.matched, ' ')
      confidence += 0.18
    }

    const duration = parseDuration(rest)
    if (duration) {
      rest = rest.replace(duration.matched, ' ')
      confidence += 0.12
    }

    const timeHit = parseTime(rest)
    let start = ''
    if (timeHit) {
      start = timeHit.start
      const hour = Number(start.slice(0, 2))
      if (hour < 12) {
        if (periodHint === 'evening' || periodHint === 'afternoon') {
          start = `${pad2(hour + 12)}:${start.slice(3)}`
        } else if (periodHint === 'noon' && hour < 11) {
          start = `${pad2(hour + 12)}:${start.slice(3)}`
        }
      }
      rest = rest.replace(timeHit.matched, ' ')
      confidence += 0.14
    } else {
      for (const p of PERIOD_DEFAULT) {
        if (p.re.test(rest)) {
          start = p.start
          rest = rest.replace(p.re, ' ')
          confidence += 0.05
          break
        }
      }
    }

    rest = rest.replace(NOISE, ' ')
    const title = cleanupTitle(rest) || cleanupTitle(raw.replace(/(晚上|下午|上午|明天|今天)/g, ''))

    let minutes = duration?.minutes ?? 0
    if (!minutes) {
      // 没有时长时给一个可编辑的默认值
      minutes = 60
      confidence -= 0.08
    }
    if (!start) {
      start = '09:00'
      confidence -= 0.12
    }

    const date = carriedDate ?? toISODate(now)
    const category = inferCategory(`${title} ${raw}`)
    if (category !== 'other') confidence += 0.05

    out.push({
      title: title || '未命名安排',
      category,
      date,
      start,
      plannedMinutes: minutes,
      confidence: Math.max(0.2, Math.min(0.98, confidence)),
      raw,
    })
  }

  if (carriedDateMatched && out.length > 1) {
    // 同一句里出现的日期默认作用于整句，已通过 carriedDate 体现
  }
  return out
}
