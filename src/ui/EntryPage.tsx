import { useState, type FormEvent } from 'react'
import { CATEGORIES, TYPE_LABEL } from '../core/categories'
import {
  COURSE_FEE_CENTS,
  DANCES,
  feeYuan,
  isDance,
  memberLines,
  parseMemberLines,
  type CourseFeeGroup,
  type CourseFeeMember,
} from '../core/fees'
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

const CHIP_OFF = 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-slate-300'
const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'

const FEE_GROUP_LABEL: Record<CourseFeeGroup, string> = {
  hypernova: 'HyperNova',
  single: '单人',
  trio: '三人抱团',
}

/** 表单草稿;dance 仅在三人抱团单舞种档由下拉选择,空串表示未选,提交前被 feeReady 拦截 */
interface MemberDraft {
  name: string
  sid: string
  dance: string
}

const emptyDraft = (dance: string): MemberDraft => ({ name: '', sid: '', dance })

export function EntryPage() {
  const { addTx, error } = useLedger()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saved, setSaved] = useState(false)

  // 课程缴费面板(仅收入态显示):预填金额与分类,所有字段仍可手改
  const [feeGroup, setFeeGroup] = useState<CourseFeeGroup | null>(null)
  const [singleDance, setSingleDance] = useState<string | null>(null)
  const [trioScope, setTrioScope] = useState<'one' | 'all' | null>(null)
  const [members, setMembers] = useState<MemberDraft[]>([])
  const [csvMode, setCsvMode] = useState(false)
  const [csvText, setCsvText] = useState('')
  const cents = yuanToCents(amount)
  const customCategory = custom.trim()
  const finalCategory = customCategory || category

  const withDance = feeGroup === 'trio' && trioScope === 'one'
  const csvParsed =
    type === 'income' && feeGroup !== null && csvMode ? parseMemberLines(csvText, withDance) : null
  const effMembers: MemberDraft[] = csvParsed ? csvParsed.members : members

  const feePanelOpen =
    feeGroup === 'hypernova' ||
    (feeGroup === 'single' && singleDance !== null) ||
    (feeGroup === 'trio' && trioScope !== null)
  const feeReady =
    type !== 'income' ||
    !feeGroup ||
    (feePanelOpen &&
      effMembers.length === (feeGroup === 'trio' ? 3 : 1) &&
      effMembers.every(m => m.name.trim() !== '' && m.sid.trim() !== '' && (!withDance || isDance(m.dance))) &&
      (!csvParsed || csvParsed.errors.length === 0))

  const valid = cents !== null && cents > 0 && finalCategory !== null && feeReady

  function chooseFeeGroup(g: CourseFeeGroup | null) {
    setFeeGroup(g)
    setSingleDance(null)
    setTrioScope(null)
    setCsvMode(false)
    setCsvText('')
    setMembers(
      g === null ? [] : g === 'trio' ? [emptyDraft(''), emptyDraft(''), emptyDraft('')] : [emptyDraft('all')],
    )
    if (g === 'hypernova') setAmount(feeYuan(COURSE_FEE_CENTS.hypernova))
    if (g !== null) {
      setCategory('缴费收入')
      setCustom('')
    }
    setSaved(false)
  }

  function chooseSingleDance(d: string) {
    setSingleDance(d)
    setAmount(feeYuan(d === 'all' ? COURSE_FEE_CENTS['single:all'] : COURSE_FEE_CENTS['single:one']))
    setSaved(false)
  }

  function chooseTrioScope(s: 'one' | 'all') {
    setTrioScope(s)
    setAmount(feeYuan(s === 'all' ? COURSE_FEE_CENTS['trio:all'] : COURSE_FEE_CENTS['trio:one']))
    setMembers(ms => ms.map(m => ({ ...m, dance: s === 'all' ? 'all' : '' })))
    setSaved(false)
  }

  function setMember(i: number, patch: Partial<MemberDraft>) {
    setMembers(ms => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  }

  function toggleCsv() {
    if (!csvMode) {
      setCsvText(memberLines(effMembers, withDance))
      setCsvMode(true)
    } else {
      const { members: parsed } = parseMemberLines(csvText, withDance)
      if (parsed.length > 0) setMembers(parsed)
      setCsvMode(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || cents === null || !finalCategory) return
    let metadata: Record<string, unknown> = {}
    if (type === 'income' && feeGroup) {
      const feeMembers: CourseFeeMember[] = effMembers.map(m => ({
        name: m.name.trim(),
        sid: m.sid.trim(),
        dance:
          feeGroup === 'hypernova' || (feeGroup === 'trio' && trioScope === 'all')
            ? 'all'
            : feeGroup === 'single'
              ? (singleDance as CourseFeeMember['dance'])
              : (m.dance as CourseFeeMember['dance']),
      }))
      metadata = { kind: 'course-fee', group: feeGroup, members: feeMembers }
    }
    await addTx({
      type,
      amountCents: cents,
      category: finalCategory,
      note: note.trim() || null,
      occurredAt: date,
      metadata,
    })
    setSaved(true)
    // 保留类型、分类与缴费档,方便连续记账;只清金额与缴费人
    setAmount('')
    setNote('')
    setMembers(ms => ms.map(m => ({ ...m, name: '', sid: '' })))
    setCsvText('')
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

      {/* 课程缴费(仅收入):点选预填金额与分类,其余字段保持可改 */}
      {type === 'income' && (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            {(['hypernova', 'single', 'trio'] as CourseFeeGroup[]).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => chooseFeeGroup(feeGroup === g ? null : g)}
                className={`rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
                  feeGroup === g ? TYPE_STYLE.income.chip : CHIP_OFF
                }`}
              >
                {FEE_GROUP_LABEL[g]}
              </button>
            ))}
          </div>

          {feeGroup === 'single' && (
            <div className="flex flex-wrap justify-center gap-2">
              {(['all', ...DANCES] as string[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => chooseSingleDance(d)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-all active:scale-95 ${
                    singleDance === d
                      ? TYPE_STYLE.income.chip
                      : d === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : CHIP_OFF
                  }`}
                >
                  {d === 'all' ? `all ¥${feeYuan(COURSE_FEE_CENTS['single:all'])}` : d}
                </button>
              ))}
            </div>
          )}

          {feeGroup === 'trio' && (
            <div className="flex flex-wrap justify-center gap-2">
              {([['one', '单舞种'], ['all', '全舞种']] as const).map(([s, label]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => chooseTrioScope(s)}
                  className={`rounded-full px-4 py-2 text-sm transition-all active:scale-95 ${
                    trioScope === s ? TYPE_STYLE.income.chip : CHIP_OFF
                  }`}
                >
                  {label} ¥{feeYuan(s === 'all' ? COURSE_FEE_CENTS['trio:all'] : COURSE_FEE_CENTS['trio:one'])}
                </button>
              ))}
            </div>
          )}

          {feeGroup && feePanelOpen && (
            <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400">
                  缴费人{feeGroup === 'trio' ? ' · 3 人' : ''} · 学号必填
                </p>
                <button
                  type="button"
                  onClick={toggleCsv}
                  className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-500"
                >
                  {csvMode ? '切换为表单' : '切换为粘贴'}
                </button>
              </div>

              {csvMode ? (
                <div className="space-y-1">
                  <textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    rows={feeGroup === 'trio' ? 3 : 2}
                    placeholder={withDance ? '1222222,alice,waacking' : '1222222,alice'}
                    className={`${INPUT_CLS} font-mono`}
                  />
                  <p className="text-xs text-slate-400">
                    一行一人:{withDance ? '学号,姓名,舞种' : '学号,姓名'}
                  </p>
                  {csvParsed && csvParsed.errors.length > 0 && (
                    <p className="text-xs text-red-600">
                      第 {csvParsed.errors.map(e => e.line).join('、')} 行格式不对
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((m, i) => (
                    <div key={i} className={`grid gap-2 ${withDance ? 'grid-cols-[1fr_1fr_5.5rem]' : 'grid-cols-2'}`}>
                      <input
                        value={m.name}
                        onChange={e => setMember(i, { name: e.target.value })}
                        placeholder="姓名"
                        className={INPUT_CLS}
                      />
                      <input
                        value={m.sid}
                        onChange={e => setMember(i, { sid: e.target.value })}
                        placeholder="学号"
                        className={INPUT_CLS}
                      />
                      {withDance && (
                        <select
                          value={m.dance}
                          onChange={e => setMember(i, { dance: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-600 outline-none transition focus:border-indigo-500"
                        >
                          <option value="" disabled>
                            舞种
                          </option>
                          {DANCES.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
              !customCategory && category === c ? TYPE_STYLE[type].chip : CHIP_OFF
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
