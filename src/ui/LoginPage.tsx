import { useState, type FormEvent } from 'react'
import { useLedger } from '../state/ledger'
import { Supernova } from './supernova'

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
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-950 px-6">
      {/* 环境光 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[100px]"
      />

      {/* 品牌时刻:会发声的 NOVA logo */}
      <Supernova width={280} variant="light" className="page-enter relative mb-12" />

      <form
        onSubmit={onSubmit}
        className="page-enter relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
        style={{ animationDelay: '80ms' }}
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-white">NOVA Ledger</h1>
          <p className="mt-1 text-sm text-white/50">输入密码解锁账本</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg tracking-widest text-white outline-none transition-colors placeholder:text-white/25 focus:border-indigo-400/70 focus:bg-white/[0.08]"
        />
        {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!password || busy}
          className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? '解锁中…' : '解锁'}
        </button>
      </form>

      <p className="relative mt-10 text-[11px] text-white/25">把鼠标移到 NOVA 上试试</p>
    </div>
  )
}
