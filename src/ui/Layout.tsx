import { NavLink, Outlet } from 'react-router-dom'

function Icon({ name }: { name: 'plus' | 'list' | 'dots' }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'plus')
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  if (name === 'list')
    return (
      <svg {...common}>
        <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={2.4} />
    </svg>
  )
}

const TABS = [
  { to: '/', label: '记账', end: true, icon: 'plus' },
  { to: '/ledger', label: '流水', end: false, icon: 'list' },
  { to: '/more', label: '更多', end: false, icon: 'dots' },
] as const

/** 移动端底部 tab / 桌面端左侧栏 */
export function Layout() {
  return (
    <div className="min-h-dvh bg-slate-50">
      {/* 桌面侧栏 */}
      <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col gap-1 border-r border-slate-200/70 bg-white p-4 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-600/25">
            N
          </div>
          <span className="font-semibold tracking-tight text-slate-900">NOVA Ledger</span>
        </div>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100/80'
              }`
            }
          >
            <Icon name={t.icon} />
            {t.label}
          </NavLink>
        ))}
        <div className="mt-auto px-2 pb-2 text-[11px] text-slate-300">v0.1</div>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 md:pl-60 md:pr-8 md:pb-10">
        <Outlet />
      </main>

      {/* 移动底部导航 */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`
              }
            >
              <Icon name={t.icon} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
