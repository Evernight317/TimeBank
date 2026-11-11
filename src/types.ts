export type CategoryId =
  | 'sleep'
  | 'study'
  | 'work'
  | 'social'
  | 'exercise'
  | 'entertainment'
  | 'commute'
  | 'chores'
  | 'other'

export type TaskStatus = 'planned' | 'done' | 'delayed' | 'missed'

export interface Category {
  id: CategoryId
  label: string
  color: string
  soft: string
  glyph: string
  kind: 'rest' | 'growth' | 'life' | 'leak'
}

export interface Task {
  id: string
  title: string
  category: CategoryId
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  start: string
  plannedMinutes: number
  status: TaskStatus
  priority: 'high' | 'normal' | 'low'
  source: 'manual' | 'nlp' | 'seed'
  note?: string
  createdAt: number
}

export interface TimeLog {
  id: string
  taskId?: string
  title: string
  category: CategoryId
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  start: string
  minutes: number
  note?: string
  createdAt: number
}

export interface Budget {
  category: CategoryId
  /** 每周预算，单位分钟 */
  weeklyMinutes: number
}

export interface AppState {
  tasks: Task[]
  logs: TimeLog[]
  budgets: Budget[]
  /** 用户自定义的“时间画像”起始日，用于展示统计口径 */
  startedAt: string
}

export interface Insight {
  id: string
  type: 'bias' | 'rhythm' | 'delay' | 'blackhole' | 'summary'
  tag: string
  title: string
  body: string
  metric?: string
  tone: 'neutral' | 'good' | 'warn' | 'bad'
}
