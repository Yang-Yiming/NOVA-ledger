import { useState, type FormEvent } from 'react'
import { useLedger } from '../state/ledger'

/** 密码门:解锁后凭据缓存到 localStorage,刷新免输 */
export function LoginPage() {
  const { unlock, error } = useLedger()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    await unlock(password)
    setBusy(false)
    setPassword('')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
            N
          </div>
          <h1 className="text-xl font-semibold text-slate-900">NOVA Ledger</h1>
          <p className="mt-1 text-sm text-slate-500">输入密码解锁账本</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-indigo-500"
        />
        {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!password || busy}
          className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white disabled:opacity-40"
        >
          {busy ? '解锁中…' : '解锁'}
        </button>
      </form>
    </div>
  )
}
