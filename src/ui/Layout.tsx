import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: '记账', end: true, icon: '＋' },
  { to: '/ledger', label: '流水', end: false, icon: '≡' },
  { to: '/more', label: '更多', end: false, icon: '⋯' },
] as const

/** 移动端底部 tab / 桌面端左侧栏 */
export function Layout() {
  return (
    <div className="min-h-dvh bg-slate-50">
      {/* 桌面侧栏 */}
      <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col gap-1 border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            N
          </div>
          <span className="font-semibold text-slate-900">NOVA Ledger</span>
        </div>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2.5 text-sm font-medium ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:pl-60 md:pr-6 md:pb-10">
        <Outlet />
      </main>

      {/* 移动底部导航 */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex max-w-3xl">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`
              }
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
