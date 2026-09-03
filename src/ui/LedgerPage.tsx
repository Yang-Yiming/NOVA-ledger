import { useState } from 'react'
import { centsToYuan, formatDate, monthLabel, shiftMonth } from '../core/format'
import { groupByDate, summarize } from '../core/stats'
import { TYPE_LABEL } from '../core/categories'
import type { Tx } from '../core/types'
import { useLedger } from '../state/ledger'

const now = new Date()
const THIS_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export function LedgerPage() {
  const { txs, deleteTx } = useLedger()
  const [month, setMonth] = useState(THIS_MONTH)
  const [selected, setSelected] = useState<Tx | null>(null)

  if (!txs) return <p className="text-center text-sm text-slate-400">加载中…</p>

  const monthTxs = txs.filter((t) => t.occurredAt.startsWith(month))
  const s = summarize(monthTxs)
  const all = summarize(txs)
  const groups = groupByDate(monthTxs)

  return (
    <div className="page-enter space-y-5">
      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">流水</h1>
        <div className="flex items-center gap-0.5 rounded-full bg-white shadow-sm ring-1 ring-slate-200">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-full px-3 py-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            ‹
          </button>
          <span className="min-w-24 text-center text-sm font-medium text-slate-700 tabular-nums">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="rounded-full px-3 py-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            ›
          </button>
        </div>
      </div>

      {/* 总结余 hero */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-indigo-600/40 blur-[80px]"
        />
        <p className="relative text-xs text-white/50">总结余</p>
        <p
          className={`relative mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
            all.balanceCents < 0 ? 'text-rose-400' : 'text-white'
          }`}
        >
          {centsToYuan(all.balanceCents)}
        </p>
        <div className="relative mt-5 flex gap-8 text-sm">
          <div>
            <p className="text-xs text-white/40">本月收入</p>
            <p className="mt-0.5 font-medium text-emerald-400 tabular-nums">
              +{centsToYuan(s.incomeCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">本月支出</p>
            <p className="mt-0.5 font-medium text-rose-400 tabular-nums">
              -{centsToYuan(s.expenseCents)}
            </p>
          </div>
        </div>
      </div>

      {/* 按日分组流水 */}
      {groups.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-400">本月暂无记录</p>
          <p className="mt-1 text-xs text-slate-300">去「记账」添加第一笔吧</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <div className="flex items-baseline justify-between px-1 pb-1.5">
              <h2 className="text-xs font-medium text-slate-400">{formatDate(g.date)}</h2>
              <span className="text-xs text-slate-400 tabular-nums">{centsToYuan(g.netCents)}</span>
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/60">
              {g.txs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm ring-1 ring-slate-200/70">
                    {t.category.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {t.category}
                    </span>
                    {t.note && (
                      <span className="block truncate text-xs text-slate-400">{t.note}</span>
                    )}
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {centsToYuan(t.amountCents)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {/* 详情 sheet */}
      {selected && (
        <div
          className="animate-fade fixed inset-0 z-40 flex items-end bg-slate-950/50 backdrop-blur-sm md:items-center md:justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="animate-sheet w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{selected.category}</p>
                <p className="text-xs text-slate-400">
                  {formatDate(selected.occurredAt)} · {TYPE_LABEL[selected.type]}
                </p>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  selected.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                }`}
              >
                {selected.type === 'income' ? '+' : '-'}
                {centsToYuan(selected.amountCents)}
              </p>
            </div>
            {selected.note && <p className="mt-3 text-sm text-slate-600">{selected.note}</p>}
            {(() => {
              const meta = selected.metadata as {
                kind?: string
                dance?: string
                members?: { name: string; sid: string; dance: string }[]
              }
              if (meta?.kind === 'course-expense' && typeof meta.dance === 'string') {
                return <p className="mt-3 text-sm text-slate-600">舞种:{meta.dance}</p>
              }
              if (meta?.kind !== 'course-fee' || !Array.isArray(meta.members)) return null
              return (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-xs font-medium text-slate-400">缴费人 · {meta.members.length}</p>
                  <ul className="mt-2 space-y-1.5">
                    {meta.members.map((m, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-slate-800">
                          {m.name}
                          <span className="ml-2 text-xs tabular-nums text-slate-400">{m.sid}</span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{m.dance}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}
            <p className="mt-1 text-xs text-slate-400">
              记录于 {new Date(selected.createdAt).toLocaleString('zh-CN')}
            </p>
            <button
              onClick={async () => {
                await deleteTx(selected.id)
                setSelected(null)
              }}
              className="mt-6 w-full rounded-xl bg-rose-50 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100"
            >
              删除这条记录
            </button>
            <button
              onClick={() => setSelected(null)}
              className="mt-2 w-full rounded-xl py-3 text-sm text-slate-500 transition-colors hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
