import { parseNaturalLanguage } from '../src/lib/nlp'

const now = new Date('2026-11-11T20:00:00+08:00')
const cases = [
  '明天下午学习数学两个小时，晚上七点和朋友吃饭',
  '周五上午9点开会一小时',
  '后天 14:30 写项目代码 90分钟',
  '下周一早上跑步半小时',
  '今晚8点刷短视频10分钟',
  '11月20日晚上7点半看电影',
]

for (const input of cases) {
  const result = parseNaturalLanguage(input, now)
  console.log('\n输入：', input)
  for (const t of result) {
    console.log(
      `  → ${t.date} ${t.start} ${String(t.plannedMinutes).padStart(4)}min [${t.category}] ${t.title}  (${Math.round(t.confidence * 100)}%)`,
    )
  }
}
