import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useLedger } from './state/ledger'
import { Layout } from './ui/Layout'
import { LoginPage } from './ui/LoginPage'
import { EntryPage } from './ui/EntryPage'
import { PeoplePage } from './ui/PeoplePage'
import { LedgerPage } from './ui/LedgerPage'
import { MorePage } from './ui/MorePage'

function Gate() {
  const { status, error } = useLedger()
  if (status === 'loading')
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-950">
        <div className="animate-breathe flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-600/30">
          N
        </div>
        <p className="text-sm text-white/40">正在打开账本…</p>
      </div>
    )
  if (status === 'locked') return <LoginPage />
  if (error)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center">
        <p className="max-w-sm rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-red-300">
          {error}
        </p>
        <button
          onClick={() => location.reload()}
          className="rounded-full px-5 py-2 text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
        >
          重试
        </button>
      </div>
    )
  return <Layout />
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Gate />}>
            <Route index element={<EntryPage />} />
            <Route path="ledger" element={<LedgerPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="more" element={<MorePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
