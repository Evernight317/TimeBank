import { Icon, type IconName } from './icons'

export type TabId = 'today' | 'assets' | 'insights' | 'budget' | 'me'

const TABS: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'today', label: '今日', icon: 'home' },
  { id: 'assets', label: '资产', icon: 'pie' },
  { id: 'insights', label: '洞察', icon: 'insights' },
  { id: 'budget', label: '预算', icon: 'wallet' },
  { id: 'me', label: '我的', icon: 'persona' },
]

export function TabBar({
  active,
  onChange,
}: {
  active: TabId | null
  onChange: (id: TabId) => void
}) {
  return (
    <nav className="tabbar" aria-label="主导航">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <Icon name={t.icon} size={21} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
