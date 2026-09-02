import { useMemo, useState } from 'react'
import { DANCE_LABEL } from '../core/fees'
import { buildRoster, currentSemester, semesterOptions, semesterRange } from '../core/roster'
import type { Semester } from '../core/roster'
import { useLedger } from '../state/ledger'

type SemPick = Semester | 'custom'

export function PeoplePage() {
  const { txs } = useLedger()
  const [sem, setSem] = useState<SemPick>(currentSemester())
  const [range, setRange] = useState<[string, string]>(() => semesterRange(currentSemester()))
  const options = useMemo(() => (txs ? semesterOptions(txs) : []), [txs])
  const [start, end] = range
  const roster = useMemo(
    () => (txs ? buildRoster(txs, start, end) : null),
    [txs, start, end],
  )

  function chooseSemester(s: SemPick) {
    setSem(s)
    if (s !== 'custom') setRange(semesterRange(s))
  }

  return (
    <div className="page-enter space-y-5">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">人员</h1>

      {/* 学期快捷键 + 自定义区间 */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {options.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => chooseSemester(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                sem === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => chooseSemester('custom')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              sem === 'custom'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            自定义
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <input
            type="date"
            value={range[0]}
            onChange={(e) => {
              setSem('custom')
              setRange(([, end]) => [e.target.value, end])
            }}
            className="rounded-xl bg-white px-3 py-1.5 text-sm tabular-nums text-slate-700 ring-1 ring-slate-200"
          />
          <span className="text-slate-300">→</span>
          <input
            type="date"
            value={range[1]}
            onChange={(e) => {
              setSem('custom')
              setRange(([start]) => [start, e.target.value])
            }}
            className="rounded-xl bg-white px-3 py-1.5 text-sm tabular-nums text-slate-700 ring-1 ring-slate-200"
          />
        </div>
      </div>

      {roster === null ? (
        <p className="text-center text-sm text-slate-400">加载中…</p>
      ) : roster.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-400">该区间暂无课程缴费记录</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <h2 className="border-b border-slate-100 px-4 pb-2 pt-4 text-xs font-medium text-slate-400">
            {range[0]} ~ {range[1]} · 共 {roster.length} 人
          </h2>
          <ul className="divide-y divide-slate-50">
            {roster.map((p) => (
              <li key={p.sid} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span className="text-sm text-slate-800">
                  {p.name}
                  <span className="ml-2 text-xs tabular-nums text-slate-400">{p.sid}</span>
                </span>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {p.dances.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                    >
                      {DANCE_LABEL[d]}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
