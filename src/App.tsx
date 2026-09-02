import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useLedger } from './state/ledger'
import { Layout } from './ui/Layout'
import { LoginPage } from './ui/LoginPage'
import { EntryPage } from './ui/EntryPage'
import { LedgerPage } from './ui/LedgerPage'
import { MorePage } from './ui/MorePage'

function Gate() {
  const { status, error } = useLedger()
  if (status === 'loading')
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-400">
        加载中…
      </div>
    )
  if (status === 'locked') return <LoginPage />
  if (error)
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={() => location.reload()} className="text-sm text-indigo-600">
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
            <Route path="more" element={<MorePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
