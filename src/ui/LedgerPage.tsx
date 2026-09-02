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
    <div className="space-y-4">
      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">流水</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100"
          >
            ‹
          </button>
          <span className="min-w-24 text-center text-sm font-medium text-slate-700">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100"
          >
            ›
          </button>
        </div>
      </div>

      {/* 汇总卡 */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-slate-200 text-center">
        <div className="bg-white p-3">
          <p className="text-xs text-slate-400">本月收入</p>
          <p className="mt-1 font-semibold text-emerald-600">{centsToYuan(s.incomeCents)}</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-xs text-slate-400">本月支出</p>
          <p className="mt-1 font-semibold text-rose-600">{centsToYuan(s.expenseCents)}</p>
        </div>
        <div className="bg-white p-3">
          <p className="text-xs text-slate-400">总结余</p>
          <p className="mt-1 font-semibold text-slate-900">{centsToYuan(all.balanceCents)}</p>
        </div>
      </div>

      {/* 按日分组流水 */}
      {groups.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">本月暂无记录</p>
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <div className="flex items-baseline justify-between px-1 pb-1">
              <h2 className="text-sm font-medium text-slate-500">{formatDate(g.date)}</h2>
              <span className="text-xs text-slate-400">{centsToYuan(g.netCents)}</span>
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white">
              {g.txs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
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
          className="fixed inset-0 z-40 flex items-end bg-black/40 md:items-center md:justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:rounded-3xl"
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
            <p className="mt-1 text-xs text-slate-400">
              记录于 {new Date(selected.createdAt).toLocaleString('zh-CN')}
            </p>
            <button
              onClick={async () => {
                await deleteTx(selected.id)
                setSelected(null)
              }}
              className="mt-6 w-full rounded-xl bg-rose-50 py-3 text-sm font-medium text-rose-600"
            >
              删除这条记录
            </button>
            <button
              onClick={() => setSelected(null)}
              className="mt-2 w-full rounded-xl py-3 text-sm text-slate-500"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
