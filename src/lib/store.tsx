import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, Budget, CategoryId, Task, TimeLog } from '../types'
import { buildSeedState } from '../data/seed'

const STORAGE_KEY = 'time-bank:v1'

function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${rand}`
}

function emptyState(): AppState {
  const seed = buildSeedState()
  return { tasks: [], logs: [], budgets: seed.budgets, startedAt: seed.startedAt }
}

function isValidState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<AppState>
  return Array.isArray(v.tasks) && Array.isArray(v.logs) && Array.isArray(v.budgets)
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isValidState(parsed) && parsed.tasks.length + parsed.logs.length > 0) return parsed
    }
  } catch {
    // 解析失败时回退到演示数据
  }
  return buildSeedState()
}

export interface NewTaskInput {
  title: string
  category: CategoryId
  date: string
  start: string
  plannedMinutes: number
  priority?: Task['priority']
  source?: Task['source']
  note?: string
}

interface AppContextValue {
  state: AppState
  addTask: (input: NewTaskInput) => Task
  addTasks: (inputs: NewTaskInput[]) => Task[]
  updateTask: (id: string, patch: Partial<Task>) => void
  setTaskStatus: (id: string, status: Task['status']) => void
  removeTask: (id: string) => void
  addLog: (input: {
    taskId?: string
    title: string
    category: CategoryId
    date: string
    start: string
    minutes: number
    note?: string
  }) => TimeLog
  removeLog: (id: string) => void
  setBudget: (category: CategoryId, weeklyMinutes: number) => void
  resetDemo: () => void
  clearAll: () => void
  exportJSON: () => string
  importJSON: (raw: string) => { ok: boolean; message: string }
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 隐私模式或配额不足时静默失败，不影响使用
    }
  }, [state])

  const addTasks = useCallback((inputs: NewTaskInput[]): Task[] => {
    const created = inputs.map<Task>((input) => ({
      id: uid('task'),
      title: input.title,
      category: input.category,
      date: input.date,
      start: input.start,
      plannedMinutes: input.plannedMinutes,
      status: 'planned',
      priority: input.priority ?? 'normal',
      source: input.source ?? 'manual',
      note: input.note,
      createdAt: Date.now(),
    }))
    setState((s) => ({ ...s, tasks: [...s.tasks, ...created] }))
    return created
  }, [])

  const addTask = useCallback(
    (input: NewTaskInput): Task => addTasks([input])[0],
    [addTasks],
  )

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }, [])

  const setTaskStatus = useCallback((id: string, status: Task['status']) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }))
  }, [])

  const removeTask = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
      logs: s.logs.map((l) => (l.taskId === id ? { ...l, taskId: undefined } : l)),
    }))
  }, [])

  const addLog = useCallback<AppContextValue['addLog']>((input) => {
    const log: TimeLog = {
      id: uid('log'),
      taskId: input.taskId,
      title: input.title,
      category: input.category,
      date: input.date,
      start: input.start,
      minutes: Math.max(1, Math.round(input.minutes)),
      note: input.note,
      createdAt: Date.now(),
    }
    setState((s) => ({
      ...s,
      logs: [...s.logs, log],
      tasks: input.taskId
        ? s.tasks.map((t) => (t.id === input.taskId ? { ...t, status: 'done' } : t))
        : s.tasks,
    }))
    return log
  }, [])

  const removeLog = useCallback((id: string) => {
    setState((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) }))
  }, [])

  const setBudget = useCallback((category: CategoryId, weeklyMinutes: number) => {
    setState((s) => {
      const exists = s.budgets.some((b) => b.category === category)
      const budgets: Budget[] = exists
        ? s.budgets.map((b) =>
            b.category === category ? { ...b, weeklyMinutes: Math.max(0, weeklyMinutes) } : b,
          )
        : [...s.budgets, { category, weeklyMinutes: Math.max(0, weeklyMinutes) }]
      return { ...s, budgets }
    })
  }, [])

  const resetDemo = useCallback(() => setState(buildSeedState()), [])

  const clearAll = useCallback(() => setState(emptyState()), [])

  const exportJSON = useCallback(() => JSON.stringify(state, null, 2), [state])

  const importJSON = useCallback((raw: string) => {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isValidState(parsed)) return { ok: false, message: '文件结构不正确' }
      setState(parsed)
      return { ok: true, message: '导入成功' }
    } catch {
      return { ok: false, message: 'JSON 解析失败' }
    }
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      addTask,
      addTasks,
      updateTask,
      setTaskStatus,
      removeTask,
      addLog,
      removeLog,
      setBudget,
      resetDemo,
      clearAll,
      exportJSON,
      importJSON,
    }),
    [
      state,
      addTask,
      addTasks,
      updateTask,
      setTaskStatus,
      removeTask,
      addLog,
      removeLog,
      setBudget,
      resetDemo,
      clearAll,
      exportJSON,
      importJSON,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}
