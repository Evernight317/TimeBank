import { useEffect, useState } from 'react'
import { TodayPage } from './pages/Today'
import { CreatePage } from './pages/Create'
import { RecordsPage } from './pages/Records'
import { AssetsPage } from './pages/Assets'
import { ReplayPage } from './pages/Replay'
import { InsightsPage } from './pages/Insights'
import { BudgetPage } from './pages/Budget'
import { MePage } from './pages/Me'
import { SettingsPage } from './pages/Settings'
import { TabBar, type TabId } from './components/tabbar'

type RouteId =
  | 'today'
  | 'create'
  | 'records'
  | 'assets'
  | 'replay'
  | 'insights'
  | 'budget'
  | 'me'
  | 'settings'

const ROUTES: RouteId[] = [
  'today',
  'create',
  'records',
  'assets',
  'replay',
  'insights',
  'budget',
  'me',
  'settings',
]

const TAB_OF: Partial<Record<RouteId, TabId>> = {
  today: 'today',
  assets: 'assets',
  insights: 'insights',
  budget: 'budget',
  me: 'me',
}

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
  const tab = TAB_OF[route] ?? null

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

  const render = () => {
    switch (route) {
      case 'create':
        return <CreatePage />
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
      case 'me':
        return <MePage />
      case 'settings':
        return <SettingsPage />
      case 'today':
      default:
        return <TodayPage />
    }
  }

  return (
    <div className={`app ${tab ? '' : 'no-tab'}`}>
      {render()}
      {tab && <TabBar active={tab} onChange={(id) => navigate(id)} />}
    </div>
  )
}
