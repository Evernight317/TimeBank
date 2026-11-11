import type { AppState, Budget, CategoryId, Task, TimeLog } from '../types'
import { addDays, pad2, toISODate } from '../lib/date'

/** 固定种子的伪随机数，保证每次打开演示数据一致 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Spec {
  title: string
  category: CategoryId
  start: string
  planned: number
  /** 实际 / 计划 的倍率区间 */
  ratio: [number, number]
  priority: Task['priority']
  statusWeights: Array<[Task['status'], number]>
}

function pickStatus(
  weights: Array<[Task['status'], number]>,
  r: number,
): Task['status'] {
  const total = weights.reduce((s, [, w]) => s + w, 0)
  let acc = 0
  for (const [status, w] of weights) {
    acc += w / total
    if (r <= acc) return status
  }
  return weights[weights.length - 1][0]
}

export function buildSeedState(now = new Date()): AppState {
  const rng = mulberry32(20261111)
  const tasks: Task[] = []
  const logs: TimeLog[] = []
  let seq = 0

  const today = toISODate(now)
  const nowClock = now.getHours() * 60 + now.getMinutes()

  const push = (date: string, spec: Spec) => {
    const id = `seed-${date}-${seq++}`
    const status =
      spec.statusWeights.length > 0
        ? pickStatus(spec.statusWeights, rng())
        : 'planned'
    const task: Task = {
      id,
      title: spec.title,
      category: spec.category,
      date,
      start: spec.start,
      plannedMinutes: spec.planned,
      status,
      priority: spec.priority,
      source: 'seed',
      createdAt: Date.parse(`${date}T00:00:00`),
    }
    tasks.push(task)

    if (status !== 'done') return

    const [lo, hi] = spec.ratio
    const actual = Math.round(spec.planned * (lo + rng() * (hi - lo)))
    const startMin =
      Number(spec.start.slice(0, 2)) * 60 + Number(spec.start.slice(3, 5))
    // 当天尚未发生的时段不生成记录
    if (date === today && startMin > nowClock) {
      task.status = 'planned'
      return
    }
    logs.push({
      id: `log-${date}-${seq++}`,
      taskId: id,
      title: spec.title,
      category: spec.category,
      date,
      start: spec.start,
      minutes: actual,
      createdAt: Date.parse(`${date}T00:00:00`),
    })
  }

  for (let offset = 29; offset >= 0; offset--) {
    const d = addDays(now, -offset)
    const date = toISODate(d)
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6

    // —— 睡眠：每天 6.8 ~ 8.7 小时
    const sleepStart = Math.floor(rng() * 55)
    push(date, {
      title: '夜间睡眠',
      category: 'sleep',
      start: `00:${pad2(sleepStart)}`,
      planned: 450,
      ratio: [0.9, 1.14],
      priority: 'high',
      statusWeights: [['done', 1]],
    })

    // —— 上午学习：完成率高
    if (rng() > 0.12) {
      push(date, {
        title: rng() > 0.5 ? '数学复习' : '英语阅读',
        category: 'study',
        start: `09:${pad2(5 + Math.floor(rng() * 15))}`,
        planned: 90,
        ratio: [1.0, 1.26],
        priority: 'high',
        statusWeights: [
          ['done', 92],
          ['delayed', 8],
        ],
      })
    }

    // —— 午间
    push(date, {
      title: '午饭与午休',
      category: 'other',
      start: `12:${pad2(10 + Math.floor(rng() * 15))}`,
      planned: 45,
      ratio: [0.9, 1.35],
      priority: 'low',
      statusWeights: [['done', 1]],
    })

    // —— 下午编程 / 项目：严重低估耗时
    if (!isWeekend && rng() > 0.1) {
      push(date, {
        title: rng() > 0.5 ? '写项目代码' : '项目开发',
        category: 'work',
        start: `14:${pad2(Math.floor(rng() * 20))}`,
        planned: 120,
        ratio: [1.3, 1.62],
        priority: 'high',
        statusWeights: [
          ['done', 84],
          ['delayed', 11],
          ['missed', 5],
        ],
      })
    }

    // —— 通勤：看起来 15 分钟，实际近半小时
    if (!isWeekend) {
      push(date, {
        title: '通勤回家',
        category: 'commute',
        start: `18:${pad2(Math.floor(rng() * 20))}`,
        planned: 15,
        ratio: [1.45, 2.25],
        priority: 'normal',
        statusWeights: [['done', 1]],
      })
    }

    // —— 晚间学习：完成率明显偏低
    push(date, {
      title: rng() > 0.45 ? '晚间复习' : '读书',
      category: 'study',
      start: `20:${pad2(Math.floor(rng() * 25))}`,
      planned: 60,
      ratio: [0.55, 0.95],
      priority: 'normal',
      statusWeights: [
        ['done', 55],
        ['delayed', 25],
        ['missed', 20],
      ],
    })

    // —— 短视频：时间黑洞
    push(date, {
      title: '刷短视频',
      category: 'entertainment',
      start: `21:${pad2(15 + Math.floor(rng() * 20))}`,
      planned: 10,
      ratio: [2.4, 5.2],
      priority: 'low',
      statusWeights: [['done', 1]],
    })

    // —— 运动：隔天
    if (offset % 2 === 0) {
      push(date, {
        title: rng() > 0.5 ? '健身' : '跑步',
        category: 'exercise',
        start: `19:${pad2(Math.floor(rng() * 30))}`,
        planned: 60,
        ratio: [0.7, 1.02],
        priority: 'normal',
        statusWeights: [
          ['done', 68],
          ['missed', 32],
        ],
      })
    }

    // —— 社交：一周 2~3 次
    if ((dow === 5 || dow === 6) && rng() > 0.35) {
      push(date, {
        title: '和朋友吃饭',
        category: 'social',
        start: `18:${pad2(30 + Math.floor(rng() * 25))}`,
        planned: 90,
        ratio: [1.0, 1.65],
        priority: 'normal',
        statusWeights: [['done', 1]],
      })
    }

    // —— 家务
    if (rng() > 0.55) {
      push(date, {
        title: '整理房间',
        category: 'chores',
        start: `17:${pad2(Math.floor(rng() * 30))}`,
        planned: 30,
        ratio: [0.8, 1.7],
        priority: 'low',
        statusWeights: [
          ['done', 60],
          ['delayed', 40],
        ],
      })
    }

    // —— 周五的“完成项目”总是被推迟：延期规律
    if (dow === 5) {
      const tid = `seed-${date}-friday`
      tasks.push({
        id: tid,
        title: '完成项目周报',
        category: 'work',
        date,
        start: '16:30',
        plannedMinutes: 120,
        status: 'delayed',
        priority: 'high',
        source: 'seed',
        note: '已推迟 1 天',
        createdAt: Date.parse(`${date}T00:00:00`),
      })
    }
  }

  // 更早的两笔「完成项目」延期记录，让延期规律更可信
  for (const back of [9, 16]) {
    const date = toISODate(addDays(now, -back))
    tasks.push({
      id: `seed-${date}-carry`,
      title: '完成项目',
      category: 'work',
      date,
      start: '15:00',
      plannedMinutes: 120,
      status: 'delayed',
      priority: 'high',
      source: 'seed',
      note: '连续顺延',
      createdAt: Date.parse(`${date}T00:00:00`),
    })
  }

  const budgets: Budget[] = [
    { category: 'sleep', weeklyMinutes: 56 * 60 },
    { category: 'study', weeklyMinutes: 20 * 60 },
    { category: 'work', weeklyMinutes: 25 * 60 },
    { category: 'exercise', weeklyMinutes: 5 * 60 },
    { category: 'social', weeklyMinutes: 6 * 60 },
    { category: 'entertainment', weeklyMinutes: 8 * 60 },
    { category: 'commute', weeklyMinutes: 5 * 60 },
    { category: 'chores', weeklyMinutes: 4 * 60 },
    { category: 'other', weeklyMinutes: 8 * 60 },
  ]

  return {
    tasks,
    logs,
    budgets,
    startedAt: toISODate(addDays(now, -29)),
  }
}
