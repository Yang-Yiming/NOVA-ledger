import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildPatches,
  fixableIssues,
  scanLedger,
  type DoctorFix,
  type DoctorIssue,
  type DoctorReport,
  type IssueKind,
} from '../core/doctor'
import { hasInvisible, invisibleName } from '../core/text'
import { exportXlsx } from '../core/xlsx'
import { useLedger } from '../state/ledger'

const KIND_LABEL: Record<IssueKind, string> = {
  'invisible-char': '不可见字符',
  'sid-format': '学号格式',
  'name-drift': '姓名不一致',
}

function KindBadge({ kind }: { kind: IssueKind }) {
  const tone =
    kind === 'invisible-char'
      ? 'bg-amber-100 text-amber-700'
      : kind === 'sid-format'
        ? 'bg-sky-100 text-sky-700'
        : 'bg-violet-100 text-violet-700'
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${tone}`}>{KIND_LABEL[kind]}</span>
  )
}

/** 把不可见字符渲染成可见 chip —— 否则用户根本看不出 before/after 的差别 */
function VisibleText({ value }: { value: string }) {
  const parts: ReactNode[] = []
  let buf = ''
  let key = 0
  for (const ch of value) {
    if (hasInvisible(ch)) {
      if (buf) {
        parts.push(buf)
        buf = ''
      }
      parts.push(
        <span key={key++} className="rounded bg-amber-100 px-1 font-mono text-[10px] text-amber-700">
          {invisibleName(ch)}
        </span>,
      )
    } else buf += ch
  }
  if (buf) parts.push(buf)
  return (
    <span className="break-all font-mono text-xs">
      {parts.length ? parts : <span className="text-slate-300">(空)</span>}
    </span>
  )
}

function FixRow({ fix }: { fix: DoctorFix }) {
  return (
    <li className="rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100">
      <p className="mb-1 text-[11px] text-slate-400">{fix.path}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
        <VisibleText value={fix.before} />
        <span className="text-slate-300">→</span>
        <VisibleText value={fix.after} />
      </div>
    </li>
  )
}

function IssueCard({
  issue,
  picked,
  onToggle,
}: {
  issue: DoctorIssue
  picked: boolean
  onToggle: () => void
}) {
  return (
    <li className="px-4 py-3">
      <label className={`flex items-start gap-3 ${issue.severity === 'fix' ? 'cursor-pointer' : ''}`}>
        {issue.severity === 'fix' && (
          <input
            type="checkbox"
            checked={picked}
            onChange={onToggle}
            className="mt-1 h-4 w-4 shrink-0 accent-slate-900"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm text-slate-800">{issue.title}</span>
            <KindBadge kind={issue.kind} />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{issue.detail}</p>
          {issue.fixes.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {issue.fixes.map((f, i) => (
                <FixRow key={`${f.path}-${i}`} fix={f} />
              ))}
            </ul>
          )}
        </div>
      </label>
    </li>
  )
}

export function DoctorPage() {
  const { txs, store, updateTx } = useLedger()
  const navigate = useNavigate()
  const [report, setReport] = useState<DoctorReport | null>(null)
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fixable = useMemo(() => (report ? fixableIssues(report) : []), [report])
  const warnOnly = useMemo(
    () => (report ? report.issues.filter(i => i.severity === 'warn') : []),
    [report],
  )
  const patches = useMemo(
    () => (txs && report ? buildPatches(txs, report, picked) : []),
    [txs, report, picked],
  )

  function review(r: DoctorReport) {
    setReport(r)
    setPicked(new Set(fixableIssues(r).map(i => i.id)))
    setConfirming(false)
  }

  function rescan(list = txs) {
    if (!list) return
    review(scanLedger(list))
  }

  function toggle(id: string) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setPicked(prev => (prev.size === fixable.length ? new Set() : new Set(fixable.map(i => i.id))))
  }

  async function onExportBackup() {
    if (!txs?.length) return
    await exportXlsx(txs)
  }

  async function apply() {
    if (!txs || !report || patches.length === 0) return
    setBusy(true)
    setMessage(null)
    let ok = 0
    const failures: string[] = []
    // 逐条落库:一条失败不影响其余,失败项留在报告里等复扫
    for (const p of patches) {
      try {
        await updateTx(p.id, p.patch)
        ok += 1
      } catch (e) {
        failures.push(String(e))
      }
    }
    try {
      // 用后端最新数据复扫,确认结果(而不是拿旧的闭包 txs)
      review(scanLedger(await store.listTx()))
    } catch (e) {
      failures.push(String(e))
      setReport(null)
    }
    setBusy(false)
    setMessage(
      `已修正 ${ok} 条流水${failures.length ? `,${failures.length} 条失败` : ''}` +
        (failures.length ? ` · ${failures[0]}` : ''),
    )
  }

  const pickedCount = picked.size

  return (
    <div className="page-enter space-y-5">
      <button
        type="button"
        onClick={() => navigate('/more')}
        className="text-sm text-slate-400 transition-colors hover:text-slate-600"
      >
        ‹ 更多
      </button>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">数据体检</h1>
        <p className="mt-1 text-sm text-slate-500">
          全库扫描不可见字符、学号格式与姓名不一致;逐条审阅后再修正,不做静默改动。
        </p>
      </div>

      {/* 初始态 */}
      {!report && (
        <section className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200/60">
          <p className="text-sm text-slate-500">
            {txs ? `当前 ${txs.length} 条流水待检查` : '正在加载流水…'}
          </p>
          <button
            type="button"
            disabled={busy || !txs}
            onClick={() => rescan()}
            className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-30"
          >
            开始体检
          </button>
        </section>
      )}

      {report && (
        <>
          {/* 汇总 */}
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                扫描 {report.txCount} 条流水 · 发现 {report.issues.length} 处
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => rescan()}
                className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-500 disabled:opacity-40"
              >
                重新扫描
              </button>
            </div>
            {report.issues.length === 0 ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                未发现问题 ✓
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                {fixable.length} 处可自动修正
                {warnOnly.length > 0 && ` · ${warnOnly.length} 处仅提示`}
              </p>
            )}
            {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}
          </section>

          {/* 可自动修正 */}
          {fixable.length > 0 && (
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2 pt-4">
                <h2 className="text-xs font-medium text-slate-400">可自动修正 · {fixable.length}</h2>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  {pickedCount === fixable.length ? '全不选' : '全选'}
                </button>
              </div>
              <ul className="divide-y divide-slate-50">
                {fixable.map(issue => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    picked={picked.has(issue.id)}
                    onToggle={() => toggle(issue.id)}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* 仅提示 */}
          {warnOnly.length > 0 && (
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
              <h2 className="border-b border-slate-100 px-4 pb-2 pt-4 text-xs font-medium text-slate-400">
                仅提示 · {warnOnly.length}
              </h2>
              <ul className="divide-y divide-slate-50">
                {warnOnly.map(issue => (
                  <IssueCard key={issue.id} issue={issue} picked={false} onToggle={() => {}} />
                ))}
              </ul>
            </section>
          )}

          {/* 应用 */}
          {fixable.length > 0 &&
            (confirming ? (
              <section className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-sm text-amber-800">
                  将修正 {patches.length} 条流水 / {pickedCount} 处问题,不可自动撤销。
                </p>
                <p className="mt-1 text-xs text-amber-700">建议先导出一份 xlsx 备份。</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
                  >
                    先导出备份
                  </button>
                  <button
                    type="button"
                    disabled={busy || pickedCount === 0}
                    onClick={apply}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-30"
                  >
                    {busy ? '修正中…' : '确认修正'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming(false)}
                    className="rounded-xl px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-white"
                  >
                    取消
                  </button>
                </div>
              </section>
            ) : (
              <button
                type="button"
                disabled={pickedCount === 0}
                onClick={() => setConfirming(true)}
                className="w-full rounded-2xl bg-slate-900 py-4 text-base font-semibold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-30"
              >
                修正选中的 {pickedCount} 处
              </button>
            ))}
        </>
      )}
    </div>
  )
}
