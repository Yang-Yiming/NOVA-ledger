import { centsToYuan } from './format'
import { findInvisibles, hasInvisible, stripInvisible } from './text'
import type { Tx, TxInput } from './types'

/**
 * 数据体检:扫全库、给出可审阅的修正建议。纯函数,不碰 store ——
 * UI 负责把建议拿给用户批准,再用 LedgerStore.updateTx 落库。
 *
 * 三类问题:
 * - invisible-char  字段含不可见格式字符(零宽空格/BOM/…),可自动修
 * - sid-format      清理后仍不像学号(期望 6–12 位数字),仅提示
 * - name-drift      同一学号在不同流水里姓名不一致,仅提示
 *
 * 扫描默认只覆盖已知的承载位置(缴费成员字段 / 备注 / 分类 / 课程费用舞种),
 * 不做 metadata 递归 —— 避免误改合法业务字符串。
 */

/** 学号形态(现有数据为 8/10 位)。仅用于体检提示,不自动改 */
const SID_RE = /^\d{6,12}$/

const MEMBER_FIELDS = ['sid', 'name', 'dance'] as const

export type IssueKind = 'invisible-char' | 'sid-format' | 'name-drift'
export type IssueSeverity = 'fix' | 'warn'
/** 修正落点:整条流水字段 / metadata 顶层字段 / members[i] 字段 */
export type FixScope = 'tx' | 'metadata' | 'member'

export interface DoctorFix {
  scope: FixScope
  /** scope === 'member' 时的成员下标 */
  memberIndex?: number
  /** 'sid' | 'name' | 'dance' | 'note' | 'category' */
  field: string
  /** 展示用路径,如 metadata.members[0].sid */
  path: string
  before: string
  after: string
  /** 被删掉的不可见字符 */
  removed: string[]
}

export interface DoctorIssue {
  /** 稳定 id,供勾选与批准 */
  id: string
  kind: IssueKind
  severity: IssueSeverity
  /** warn 且跨流水聚合(如 name-drift)时可能没有单一 txId */
  txId?: string
  title: string
  detail: string
  /** 规范:空数组 = 仅提示,不提供勾选 */
  fixes: DoctorFix[]
}

export interface DoctorReport {
  scannedAt: string
  txCount: number
  issues: DoctorIssue[]
}

/** 一条待落库的修正:只含被改字段,可直接交给 store.updateTx */
export interface TxPatch {
  id: string
  patch: Partial<TxInput>
}

/** 原始 members:与 feeMembers 不同,不过滤非法项 —— 体检要能看到脏数据本身 */
function rawMembers(tx: Tx): Record<string, unknown>[] {
  const meta = tx.metadata as { kind?: unknown; members?: unknown }
  if (meta?.kind !== 'course-fee' || !Array.isArray(meta.members)) return []
  return meta.members.filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
}

/** 一句话定位这条流水,供报告里显示 */
function txContext(tx: Tx): string {
  const sign = tx.type === 'income' ? '+' : '-'
  const note = typeof tx.note === 'string' && stripInvisible(tx.note) ? ` · ${stripInvisible(tx.note)}` : ''
  return `${tx.occurredAt} · ${stripInvisible(tx.category)} · ${sign}${centsToYuan(tx.amountCents)}${note}`
}

function invisibleFix(
  scope: FixScope,
  field: string,
  path: string,
  before: string,
  memberIndex?: number,
): DoctorFix {
  return {
    scope,
    memberIndex,
    field,
    path,
    before,
    after: stripInvisible(before),
    removed: findInvisibles(before),
  }
}

export function scanLedger(txs: Tx[]): DoctorReport {
  const issues: DoctorIssue[] = []

  // sid 全集:用于提示「修正后会与另一条记录合并」
  const allSids = new Set<string>()
  for (const tx of txs)
    for (const m of rawMembers(tx)) if (typeof m.sid === 'string') allSids.add(m.sid)

  // 姓名漂移:按清理后的 sid 归并姓名
  const namesBySid = new Map<string, Set<string>>()
  const txsBySid = new Map<string, Set<string>>()

  for (const tx of txs) {
    const safe: DoctorFix[] = []
    const unsafe: DoctorFix[] = []
    const emptied = new Set<string>()

    if (typeof tx.note === 'string' && hasInvisible(tx.note))
      safe.push(invisibleFix('tx', 'note', 'note', tx.note))

    if (hasInvisible(tx.category)) {
      const fix = invisibleFix('tx', 'category', 'category', tx.category)
      if (fix.after.trim() === '') {
        unsafe.push(fix)
        emptied.add('分类')
      } else safe.push(fix)
    }

    const meta = tx.metadata as { kind?: unknown; dance?: unknown }
    if (meta?.kind === 'course-expense' && typeof meta.dance === 'string' && hasInvisible(meta.dance)) {
      const fix = invisibleFix('metadata', 'dance', 'metadata.dance', meta.dance)
      if (fix.after.trim() === '') {
        unsafe.push(fix)
        emptied.add('舞种')
      } else safe.push(fix)
    }

    rawMembers(tx).forEach((m, i) => {
      for (const field of MEMBER_FIELDS) {
        const v = m[field]
        if (typeof v !== 'string' || !hasInvisible(v)) continue
        const fix = invisibleFix('member', field, `metadata.members[${i}].${field}`, v, i)
        // 学号/姓名/舞种是必填:清完成空说明整段就是不可见字符,不能自动改
        if (fix.after.trim() === '') {
          unsafe.push(fix)
          emptied.add(field)
        } else safe.push(fix)
      }
    })

    if (safe.length > 0) {
      const merges = safe.some(f => f.field === 'sid' && allSids.has(f.after))
      issues.push({
        id: `invisible-fix:${tx.id}`,
        kind: 'invisible-char',
        severity: 'fix',
        txId: tx.id,
        title: `不可见字符 ${safe.length} 处`,
        detail: txContext(tx) + (merges ? ' · 修正后该学号将与已有记录合并' : ''),
        fixes: safe,
      })
    }
    if (unsafe.length > 0) {
      issues.push({
        id: `invisible-warn:${tx.id}`,
        kind: 'invisible-char',
        severity: 'warn',
        txId: tx.id,
        title: `不可见字符 ${unsafe.length} 处(需手工确认)`,
        detail: `${txContext(tx)} · 清理后${[...emptied].join('/')}会变空,不能自动修`,
        fixes: unsafe,
      })
    }

    rawMembers(tx).forEach((m, i) => {
      const rawSid = typeof m.sid === 'string' ? m.sid : ''
      if (!rawSid) return
      const sid = stripInvisible(rawSid).trim()
      if (!sid) return // 整段不可见的情况已由 invisible-warn 覆盖

      if (!SID_RE.test(sid)) {
        issues.push({
          id: `sid-format:${tx.id}:${i}`,
          kind: 'sid-format',
          severity: 'warn',
          txId: tx.id,
          title: `学号格式可疑:${sid}`,
          detail: `${txContext(tx)} · 期望 6–12 位数字`,
          fixes: [],
        })
      }

      const name = typeof m.name === 'string' ? stripInvisible(m.name).trim() : ''
      if (!name) return
      let names = namesBySid.get(sid)
      if (!names) {
        names = new Set()
        namesBySid.set(sid, names)
        txsBySid.set(sid, new Set())
      }
      names.add(name)
      txsBySid.get(sid)!.add(tx.id)
    })
  }

  for (const [sid, names] of namesBySid) {
    if (names.size < 2) continue
    issues.push({
      id: `name-drift:${sid}`,
      kind: 'name-drift',
      severity: 'warn',
      title: `学号 ${sid} 有 ${names.size} 种姓名`,
      detail: `${[...names].join(' / ')} · 分布在 ${txsBySid.get(sid)!.size} 笔记录`,
      fixes: [],
    })
  }

  return { scannedAt: new Date().toISOString(), txCount: txs.length, issues }
}

/** 可自动修正的条目数(勾选「全选」与汇总用) */
export function fixableIssues(report: DoctorReport): DoctorIssue[] {
  return report.issues.filter(i => i.severity === 'fix' && i.txId !== undefined)
}

function cloneMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...meta }
  if (Array.isArray(meta.members))
    copy.members = meta.members.map(m => (m && typeof m === 'object' ? { ...(m as Record<string, unknown>) } : m))
  return copy
}

/**
 * 把批准的条目折算成「一笔流水一个 patch」。只改命中字段,
 * 深拷贝 metadata/members,绝不整块覆盖未触碰的键。
 */
export function buildPatches(
  txs: Tx[],
  report: DoctorReport,
  accepted: ReadonlySet<string>,
): TxPatch[] {
  const byId = new Map(txs.map(t => [t.id, t]))
  const out = new Map<string, TxPatch>()

  for (const issue of report.issues) {
    if (issue.severity !== 'fix' || !issue.txId || !accepted.has(issue.id)) continue
    const tx = byId.get(issue.txId)
    if (!tx) continue

    let entry = out.get(issue.txId)
    if (!entry) {
      entry = { id: issue.txId, patch: {} }
      out.set(issue.txId, entry)
    }

    for (const fix of issue.fixes) {
      if (fix.scope === 'tx') {
        if (fix.field === 'note') entry.patch.note = fix.after === '' ? null : fix.after
        else if (fix.field === 'category') entry.patch.category = fix.after
        continue
      }
      if (!entry.patch.metadata) entry.patch.metadata = cloneMetadata(tx.metadata)
      const meta = entry.patch.metadata
      if (fix.scope === 'metadata') {
        meta[fix.field] = fix.after
        continue
      }
      const members = meta.members
      if (!Array.isArray(members) || fix.memberIndex === undefined) continue
      const target = members[fix.memberIndex] as Record<string, unknown> | undefined
      if (target) target[fix.field] = fix.after
    }
  }

  return [...out.values()]
}
