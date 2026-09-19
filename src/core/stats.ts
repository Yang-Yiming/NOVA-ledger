import { DANCE_LABEL, FEE_GROUP_LABEL, feeMembers, isCourseFeeGroup, isDance } from './fees'
import { formatTime } from './format'
import type { Tx } from './types'

export interface Summary {
  incomeCents: number
  expenseCents: number
  balanceCents: number
}

export function summarize(txs: Tx[]): Summary {
  let incomeCents = 0
  let expenseCents = 0
  for (const t of txs) {
    if (t.type === 'income') incomeCents += t.amountCents
    else expenseCents += t.amountCents
  }
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents }
}

export interface DayGroup {
  date: string
  txs: Tx[]
  netCents: number
}

/** 按日期分组、日期倒序;组内按记录时间倒序 */
export function groupByDate(txs: Tx[]): DayGroup[] {
  const map = new Map<string, Tx[]>()
  for (const t of txs) {
    const list = map.get(t.occurredAt)
    if (list) list.push(t)
    else map.set(t.occurredAt, [t])
  }
  const groups: DayGroup[] = []
  for (const [date, list] of map) {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const netCents = list.reduce(
      (acc, t) => acc + (t.type === 'income' ? t.amountCents : -t.amountCents),
      0,
    )
    groups.push({ date, txs: list, netCents })
  }
  groups.sort((a, b) => b.date.localeCompare(a.date))
  return groups
}

export interface TxDigest {
  /** 副标题:结构化信息(档位/舞种)在前,手写备注优先于自动展开的人名 */
  subtitle: string | null
  /** 人数徽章,仅课程缴费有 */
  badge: string | null
  /** 记录时间 "14:32";createdAt 不可解析时为空串 */
  time: string
}

/** 副标题里最多列几个人名,超出折成 "+N" */
const MAX_NAMES = 2

/**
 * 一行流水的摘要。分类之外还能区分同一天多笔的信息全在 metadata 里,
 * 这里统一取出来:课程缴费给档位与人名,课程费用给舞种,自由记账只有备注。
 * 缴费判定走 feeMembers —— 与人员页同一口径,脏数据两边一致地跳过。
 */
export function txDigest(tx: Tx): TxDigest {
  const { group, dance } = tx.metadata as { group?: unknown; dance?: unknown }
  const members = feeMembers(tx)
  const parts: string[] = []
  if (members.length > 0) {
    if (isCourseFeeGroup(group)) parts.push(FEE_GROUP_LABEL[group])
  } else if (typeof dance === 'string' && isDance(dance)) {
    // 只有课程费用的 metadata 带 dance;其他收入/支出不会命中
    parts.push(DANCE_LABEL[dance])
  }
  const names = members.map(m => m.name)
  const joined =
    names.length > MAX_NAMES
      ? `${names.slice(0, MAX_NAMES).join(' ')} +${names.length - MAX_NAMES}`
      : names.join(' ')
  // 手写备注最值钱,有它就不再展开人名(人数仍由 badge 交代)
  const tail = tx.note?.trim() || joined
  if (tail) parts.push(tail)
  return {
    subtitle: parts.length > 0 ? parts.join(' · ') : null,
    badge: members.length > 0 ? `${members.length} 人` : null,
    time: formatTime(tx.createdAt),
  }
}
