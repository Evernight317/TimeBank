import { useEffect, useState } from 'react'
import { Icon, BrandMark, type IconName } from './components/icons'
import { TodayPage } from './pages/Today'
import { SchedulePage } from './pages/Schedule'
import { RecordsPage } from './pages/Records'
import { AssetsPage } from './pages/Assets'
import { ReplayPage } from './pages/Replay'
import { InsightsPage } from './pages/Insights'
import { BudgetPage } from './pages/Budget'
import { PersonaPage } from './pages/Persona'
import { SettingsPage } from './pages/Settings'

type RouteId =
  | 'today'
  | 'schedule'
  | 'records'
  | 'assets'
  | 'replay'
  | 'insights'
  | 'budget'
  | 'persona'
  | 'settings'

interface NavItem {
  id: RouteId
  label: string
  icon: IconName
}

const NAV: Array<{ title: string; items: NavItem[] }> = [
  {
    title: '现在',
    items: [
      { id: 'today', label: '今日', icon: 'today' },
      { id: 'schedule', label: '智能日程', icon: 'schedule' },
      { id: 'records', label: '时间记录', icon: 'records' },
    ],
  },
  {
    title: '回看',
    items: [
      { id: 'assets', label: '时间资产', icon: 'assets' },
      { id: 'replay', label: '时间回放', icon: 'replay' },
      { id: 'insights', label: '时间洞察', icon: 'insights' },
    ],
  },
  {
    title: '长期',
    items: [
      { id: 'budget', label: '时间预算', icon: 'budget' },
      { id: 'persona', label: '时间画像', icon: 'persona' },
    ],
  },
]

const ROUTES: RouteId[] = [
  'today',
  'schedule',
  'records',
  'assets',
  'replay',
  'insights',
  'budget',
  'persona',
  'settings',
]

function readRoute(): RouteId {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(hash) ? (hash as RouteId) : 'today'
}

function useHashRoute(): [RouteId, (id: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(readRoute)

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (id: RouteId) => {
    if (readRoute() === id) return
    window.location.hash = `#/${id}`
  }

  return [route, navigate]
}

export default function App() {
  const [route, navigate] = useHashRoute()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [route])

  const render = () => {
    switch (route) {
      case 'schedule':
        return <SchedulePage />
      case 'records':
        return <RecordsPage />
      case 'assets':
        return <AssetsPage />
      case 'replay':
        return <ReplayPage />
      case 'insights':
        return <InsightsPage />
      case 'budget':
        return <BudgetPage />
      case 'persona':
        return <PersonaPage />
      case 'settings':
        return <SettingsPage />
      case 'today':
      default:
        return <TodayPage />
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BrandMark size={23} />
          </div>
          <div className="brand-name">
            <strong>时间银行</strong>
            <span>Time Bank</span>
          </div>
        </div>

        <nav className="nav" aria-label="主导航">
          {NAV.map((group) => (
            <div className="nav-group" key={group.title}>
              <span>{group.title}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${route === item.id ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
                  aria-current={route === item.id ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="eyebrow">每日本金</span>
          <strong>24:00</strong>
          <span>你无法增加它，只能决定分配</span>
        </div>

        <button
          className={`nav-item ${route === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
        >
          <Icon name="settings" size={18} />
          设置
        </button>
      </aside>

      <main className="main">
        <div className="main-inner">{render()}</div>
      </main>
    </div>
  )
}
