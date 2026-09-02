import { useState } from 'react'
import { exportXlsx } from '../core/xlsx'
import { useLedger } from '../state/ledger'
import { Supernova } from './supernova'

const KIND_LABEL: Record<string, string> = {
  supabase: 'Supabase(云端)',
  localstorage: '浏览器本地',
  memory: '内存(演示)',
}

export function MorePage() {
  const { txs, store, lock } = useLedger()
  const [exporting, setExporting] = useState(false)

  async function onExport() {
    if (!txs || txs.length === 0 || exporting) return
    setExporting(true)
    try {
      await exportXlsx(txs)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-enter space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">更多</h1>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <h2 className="border-b border-slate-100 px-4 pb-2 pt-4 text-xs font-medium text-slate-400">
          数据
        </h2>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-slate-600">存储位置</span>
          <span className="text-slate-900">{KIND_LABEL[store.kind]}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-slate-600">记录条数</span>
          <span className="tabular-nums text-slate-900">{txs?.length ?? '—'}</span>
        </div>
        <button
          onClick={onExport}
          disabled={exporting || !txs?.length}
          className="w-full border-t border-slate-100 px-4 py-3.5 text-left text-sm font-medium text-indigo-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          {exporting ? '导出中…' : '导出全部流水为 xlsx'}
        </button>
      </section>

      {store.requiresAuth && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <h2 className="border-b border-slate-100 px-4 pb-2 pt-4 text-xs font-medium text-slate-400">
            安全
          </h2>
          <button
            onClick={lock}
            className="w-full px-4 py-3.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            锁定账本(清除本机凭据)
          </button>
        </section>
      )}

      {/* 品牌彩蛋:悬停 logo 有声音 */}
      <div className="flex flex-col items-center gap-1 pt-8 text-center">
        <Supernova width={132} variant="dark" />
        <p className="mt-3 text-xs text-slate-400">
          NOVA Ledger · {store.kind === 'supabase' ? '已连接云端账本' : '当前为本地数据,仅存于此设备'}
        </p>
      </div>
    </div>
  )
}
