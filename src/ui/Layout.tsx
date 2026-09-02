import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Supernova } from './supernova'

function Icon({ name }: { name: 'plus' | 'list' | 'users' | 'dots' }) {
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
  if (name === 'users')
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  { to: '/people', label: '人员', end: false, icon: 'users' },
  { to: '/more', label: '更多', end: false, icon: 'dots' },
] as const
const SB_KEY = 'nova.sidebar-width'
const SB_MIN = 200
const SB_MAX = 400
const SB_DEFAULT = 240
/** 移动端底部 tab / 桌面端左侧栏 */
export function Layout() {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SB_KEY))
    return Number.isFinite(saved) && saved > 0
      ? Math.min(SB_MAX, Math.max(SB_MIN, Math.round(saved)))
      : SB_DEFAULT
  })

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    let latest = width
    const move = (ev: PointerEvent) => {
      latest = Math.min(SB_MAX, Math.max(SB_MIN, Math.round(ev.clientX)))
      setWidth(latest)
    }
    const up = () => {
      handle.releasePointerCapture(e.pointerId)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      localStorage.setItem(SB_KEY, String(latest))
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
  }

  return (
    <div className="min-h-dvh bg-slate-50" style={{ '--sb-w': `${width}px` } as React.CSSProperties}>
      {/* 桌面侧栏 */}
      <aside className="group fixed inset-y-0 left-0 hidden w-[var(--sb-w)] flex-col gap-1 border-r border-slate-200/70 bg-white p-4 md:flex">
        <div className="mb-8 px-2 pt-2">
          <Supernova width={140} />
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
        <div
          className="group/resize absolute inset-y-0 -right-1.5 z-10 hidden w-3 cursor-col-resize items-stretch justify-center md:flex"
          title="拖动调整侧栏宽度"
          onPointerDown={startDrag}
        >
          <span className="w-0.5 rounded-full bg-transparent transition-colors group-hover/resize:bg-indigo-400/50" />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 md:pl-[var(--sb-w)] md:pr-8 md:pb-10">
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
