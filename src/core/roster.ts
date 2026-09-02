import type { Dance } from './fees'
import { isDance } from './fees'
import type { Tx } from './types'

/**
 * 人员名单:从课程缴费流水推断「本学期谁报了什么课」。
 * 学期只是日期区间的快捷键,推断一律以 [start, end] 区间为准。
 */

export type Term = 'autumn' | 'spring'

/** 学期标识,如 `2026 autumn`(2026 年 8–12 月)/ `2027 spring`(2027 年 2–6 月) */
export type Semester = `${number} ${Term}`

/** autumn = 8/1–12/31,spring = 2/1–6/30;1 月、7 月不属于任何学期(用自定义区间兜) */
export function semesterRange(sem: Semester): [string, string] {
  const [yStr, term] = sem.split(' ') as [string, Term]
  const y = Number(yStr)
  return term === 'autumn' ? [`${y}-08-01`, `${y}-12-31`] : [`${y}-02-01`, `${y}-06-30`]
}

/** 今天所在学期:1 月归上学年 autumn,7 月归当年 spring */
export function currentSemester(today = new Date()): Semester {
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  if (m >= 8) return `${y} autumn`
  if (m === 1) return `${y - 1} autumn`
  return `${y} spring`
}

/** 某日期所属学期;1 月、7 月返回 null */
export function semesterOf(date: string): Semester | null {
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(5, 7))
  if (m >= 8 && m <= 12) return `${y} autumn`
  if (m >= 2 && m <= 6) return `${y} spring`
  return null
}

/** 学期倒序(2026 autumn > 2026 spring > 2025 autumn) */
export function compareSemesterDesc(a: Semester, b: Semester): number {
  return b.localeCompare(a)
}

/** 学期下拉项:数据里出现过的 ∪ 当前学期,倒序 */
export function semesterOptions(txs: Tx[]): Semester[] {
  const set = new Set<Semester>([currentSemester()])
  for (const t of txs) {
    const sem = semesterOf(t.occurredAt)
    if (sem) set.add(sem)
  }
  return [...set].sort(compareSemesterDesc)
}

export interface RosterEntry {
  sid: string
  name: string
  /** 报的课程并集;'all' 表示全舞种,存在时独占 */
  dances: Dance[]
  /** 该学期缴费笔数(不展示,供调试/排序用) */
  payments: number
}

function isDanceDance(v: unknown): v is Dance {
  return typeof v === 'string' && isDance(v)
}

interface FeeMember {
  sid: string
  name: string
  dance: Dance
}

/** 读一条 course-fee tx 的成员;metadata 形制不对整条跳过 */
function feeMembers(tx: Tx): FeeMember[] {
  const meta = tx.metadata as { kind?: unknown; members?: unknown }
  if (meta?.kind !== 'course-fee' || !Array.isArray(meta.members)) return []
  const out: FeeMember[] = []
  for (const m of meta.members) {
    const { sid, name, dance } = (m ?? {}) as Record<string, unknown>
    if (typeof sid === 'string' && sid && typeof name === 'string' && name && isDanceDance(dance))
      out.push({ sid, name, dance })
  }
  return out
}

/**
 * 汇总 [start, end] 内的 course-fee 流水 → 名单。
 * 归并键 = 学号;姓名取 occurredAt 最晚(同日再比 createdAt)那笔的;
 * 课程取并集,含 'all' 时只留 'all'。按学号升序输出。
 */
export function buildRoster(txs: Tx[], start: string, end: string): RosterEntry[] {
  const feeTxs = txs
    .filter(t => t.type === 'income' && t.occurredAt >= start && t.occurredAt <= end)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.createdAt.localeCompare(b.createdAt))

  const bySid = new Map<string, RosterEntry>()
  for (const tx of feeTxs) {
    for (const m of feeMembers(tx)) {
      let e = bySid.get(m.sid)
      if (!e) {
        e = { sid: m.sid, name: m.name, dances: [], payments: 0 }
        bySid.set(m.sid, e)
      }
      e.name = m.name
      e.payments += 1
      if (!e.dances.includes(m.dance)) e.dances.push(m.dance)
    }
  }

  const roster = [...bySid.values()]
  for (const e of roster)
    if (e.dances.length > 1 && e.dances.includes('all')) e.dances = ['all']
  return roster.sort((a, b) => a.sid.localeCompare(b.sid))
}
