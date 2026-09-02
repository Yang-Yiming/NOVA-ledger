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
