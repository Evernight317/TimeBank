import type { Category, CategoryId } from '../types'

export const CATEGORIES: Category[] = [
  {
    id: 'sleep',
    label: '睡眠',
    color: '#5B6B8C',
    soft: '#E7EAF2',
    glyph: '☾',
    kind: 'rest',
  },
  {
    id: 'study',
    label: '学习',
    color: '#0E6B4F',
    soft: '#E1EFE8',
    glyph: '✎',
    kind: 'growth',
  },
  {
    id: 'work',
    label: '工作',
    color: '#2F7E9E',
    soft: '#E2EEF3',
    glyph: '▤',
    kind: 'growth',
  },
  {
    id: 'social',
    label: '社交',
    color: '#C08A2E',
    soft: '#F6EEDC',
    glyph: '◍',
    kind: 'life',
  },
  {
    id: 'exercise',
    label: '运动',
    color: '#A8563E',
    soft: '#F5E6E1',
    glyph: '⟳',
    kind: 'life',
  },
  {
    id: 'entertainment',
    label: '娱乐',
    color: '#8E5B9E',
    soft: '#F0E7F3',
    glyph: '♪',
    kind: 'leak',
  },
  {
    id: 'commute',
    label: '通勤',
    color: '#7A8794',
    soft: '#EBEDEF',
    glyph: '⇄',
    kind: 'life',
  },
  {
    id: 'chores',
    label: '家务',
    color: '#6E8B5A',
    soft: '#EAF0E4',
    glyph: '✦',
    kind: 'life',
  },
  {
    id: 'other',
    label: '其他',
    color: '#B9B3A4',
    soft: '#F0EDE5',
    glyph: '·',
    kind: 'life',
  },
]

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c
    return acc
  },
  {} as Record<CategoryId, Category>,
)

export const categoryOf = (id: CategoryId): Category => CATEGORY_MAP[id]

export const CATEGORY_ORDER: CategoryId[] = CATEGORIES.map((c) => c.id)

/** 用于自然语言解析的品类关键词表，顺序即优先级 */
export const CATEGORY_KEYWORDS: Array<{ id: CategoryId; words: string[] }> = [
  { id: 'study', words: ['学习', '复习', '数学', '英语', '背单词', '看书', '阅读', '刷题', '写作业', '上课', '课程', '考试', '论文'] },
  { id: 'work', words: ['工作', '编程', '写代码', '项目', '开发', '开会', '会议', '汇报', '写方案', '加班', '改 bug', '改bug', '需求'] },
  { id: 'exercise', words: ['运动', '跑步', '健身', '游泳', '打球', '瑜伽', '散步', '骑车'] },
  { id: 'social', words: ['吃饭', '聚餐', '朋友', '社交', '约会', '聊天', '咖啡', '见'] },
  { id: 'entertainment', words: ['短视频', '刷手机', '抖音', '游戏', '追剧', '电影', '娱乐', '休息', '放松', 'B站', 'b站'] },
  { id: 'commute', words: ['通勤', '地铁', '公交', '打车', '路上', '回家'] },
  { id: 'chores', words: ['家务', '打扫', '洗衣', '做饭', '收拾', '购物', '买菜'] },
  { id: 'sleep', words: ['睡觉', '睡眠', '午睡', '休息一下'] },
]
