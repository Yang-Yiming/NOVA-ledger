import { useState, type FormEvent } from 'react'
import { CATEGORIES, TYPE_LABEL } from '../core/categories'
import { yuanToCents, todayISO } from '../core/format'
import type { TxType } from '../core/types'
import { useLedger } from '../state/ledger'

const TYPE_STYLE: Record<TxType, { active: string; chip: string }> = {
  expense: {
    active: 'bg-rose-600 text-white shadow-sm',
    chip: 'bg-rose-600 text-white ring-rose-600',
  },
  income: {
    active: 'bg-emerald-600 text-white shadow-sm',
    chip: 'bg-emerald-600 text-white ring-emerald-600',
  },
}

export function EntryPage() {
  const { addTx, error } = useLedger()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saved, setSaved] = useState(false)

  const cents = yuanToCents(amount)
  const customCategory = custom.trim()
  const finalCategory = customCategory || category
  const valid = cents !== null && cents > 0 && finalCategory !== null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || cents === null || !finalCategory) return
    await addTx({
      type,
      amountCents: cents,
      category: finalCategory,
      note: note.trim() || null,
      occurredAt: date,
    })
    setSaved(true)
    // 保留类型与分类,方便连续记账
    setAmount('')
    setNote('')
  }

  return (
    <form onSubmit={onSubmit} className="page-enter space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">记一笔</h1>

      {/* 类型切换 */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/90 p-1">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t)
              setSaved(false)
            }}
            className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
              type === t ? TYPE_STYLE[t].active : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* 金额 */}
      <div className="flex items-baseline justify-center gap-2 py-2">
        <span className="text-2xl font-medium text-slate-300">¥</span>
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setSaved(false)
          }}
          inputMode="decimal"
          placeholder="0.00"
          autoFocus
          className="w-48 border-none bg-transparent text-center text-5xl font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-200"
        />
      </div>
      {amount !== '' && cents === null && (
        <p className="text-center text-sm text-red-600">金额格式:最多两位小数,如 45.5</p>
      )}

      {/* 分类 chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES[type].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCategory(c)
              setCustom('')
              setSaved(false)
            }}
            className={`rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
              !customCategory && category === c
                ? TYPE_STYLE[type].chip
                : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {c}
          </button>
        ))}

      </div>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        placeholder="自定义分类(可选,填写时优先使用)"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
      />

      {/* 备注 + 日期 */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注(可选)"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!valid}
        className={`w-full rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 ${
          saved
            ? 'bg-emerald-600 shadow-emerald-600/25'
            : 'bg-gradient-to-b from-indigo-500 to-indigo-600 shadow-indigo-600/25 hover:from-indigo-500 hover:to-indigo-500'
        }`}
      >
        {saved ? '已记录 ✓' : '保存'}
      </button>
    </form>
  )
}
