import { useMemo, useState } from 'react'
import { DANCE_LABEL } from '../core/fees'
import { buildRoster, currentSemester, semesterOptions, semesterRange } from '../core/roster'
import type { RosterEntry, Semester } from '../core/roster'
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
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set())
  const [copied, setCopied] = useState(false)


  function togglePick(sid: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(sid)) next.delete(sid)
      else next.add(sid)
      return next
    })
  }

  function exitSelecting() {
    setSelecting(false)
    setPicked(new Set())
  }

  /** 选中学生 → `学号, 舞种` 每行一条(多舞种各占一行,与录入格式一致) */
  function pickedText(entries: RosterEntry[]): string {
    return entries.flatMap((p) => p.dances.map((d) => `${p.sid}, ${d}`)).join('\n')
  }

  async function copyPicked() {
    const entries = roster?.filter((p) => picked.has(p.sid)) ?? []
    if (entries.length === 0) return
    try {
      await navigator.clipboard.writeText(pickedText(entries))
    } catch {
      window.alert('复制失败,请重试')
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    exitSelecting()
  }

  function chooseSemester(s: SemPick) {
    setSem(s)
    setPicked(new Set())
    if (s !== 'custom') setRange(semesterRange(s))
  }

  return (
    <div className="page-enter space-y-5">
      {copied && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs text-white shadow-lg">
          已复制到剪切板
        </div>
      )}
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
              setPicked(new Set())
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
              setPicked(new Set())
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
          <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2 pt-4">
            <h2 className="text-xs font-medium text-slate-400">
              {range[0]} ~ {range[1]} · 共 {roster.length} 人
            </h2>
            {selecting ? (
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setPicked(new Set(roster.map((p) => p.sid)))}
                  className="font-medium text-slate-500 hover:text-slate-900"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={exitSelecting}
                  className="font-medium text-slate-500 hover:text-slate-900"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={copyPicked}
                  disabled={picked.size === 0}
                  className="rounded-full bg-slate-900 px-3 py-1 font-medium text-white transition-opacity disabled:opacity-40"
                >
                  复制 {picked.size}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSelecting(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                选择复制
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-50">
            {roster.map((p) => {
              const isPicked = picked.has(p.sid)
              return (
                <li key={p.sid}>
                  <button
                    type="button"
                    disabled={!selecting}
                    onClick={() => togglePick(p.sid)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                      selecting ? 'transition-colors active:bg-slate-100' : 'cursor-default'
                    }`}
                  >
                    {selecting && (
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isPicked ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                        }`}
                      >
                        {isPicked && <span className="text-[10px] leading-none text-white">✓</span>}
                      </span>
                    )}
                    <span className="flex-1 text-sm text-slate-800">
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
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
