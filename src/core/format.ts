/** 本地时区的今天,YYYY-MM-DD。EntryPage 默认值等多处需锁步行为 */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "12.34" → 1234;非法输入返回 null。纯整数运算,不经过浮点 */
export function yuanToCents(input: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim())
  if (!m || (m[1] === '' && m[2] === undefined)) return null
  const yuan = Number(m[1])
  const frac = m[2] ? m[2].padEnd(2, '0') : '00'
  return yuan * 100 + Number(frac)
}

/** 1234 → "12.34"(无符号);-1234 → "-12.34" */
export function centsToYuan(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** 1234 → "+12.34";-1234 → "-12.34";0 → "0.00" */
export function signedYuan(cents: number): string {
  if (cents === 0) return '0.00'
  return cents > 0 ? `+${centsToYuan(cents)}` : centsToYuan(cents)
}

/** "2026-09" → "2026年9月";月份运算属稳定领域概念,流水页与后续仪表盘共用 */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${y}年${m}月`
}

/** "2026-09" + (-1) → "2026-08" */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** "2026-09-02" → "9月2日 周三" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${m}月${d}日 ${wd}`
}
