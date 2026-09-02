import { centsToYuan } from './format'

/**
 * 课程缴费的价格档、舞种与明细约定。写死在前端;
 * 等收费结构真的常变,再挪进数据库(与 CATEGORIES 同一策略)。
 */

export const DANCES = ['popping', 'hiphop', 'locking', 'waacking', 'house', 'breaking', 'jazz'] as const

export type Dance = (typeof DANCES)[number] | 'all'

export const DANCE_LABEL: Record<Dance, string> = {
  all: '全舞种',
  popping: 'Popping',
  hiphop: 'HipHop',
  locking: 'Locking',
  waacking: 'Waacking',
  house: 'House',
  breaking: 'Breaking',
  jazz: 'Jazz',
}

/** 缴费入口:HyperNova 成员卡 / 单人卡 / 三人抱团卡(严格 3 人,舞社规定) */
export type CourseFeeGroup = 'hypernova' | 'single' | 'trio'

/** 价格档,单位:分。all = 全舞种;hypernova 固定全舞种、不参与抱团 */
export const COURSE_FEE_CENTS = {
  hypernova: 45600,
  'single:all': 54800,
  'single:one': 39800,
  'trio:all': 139900,
  'trio:one': 99900,
} as const
export interface CourseFeeMember {
  name: string
  sid: string
  dance: Dance
}

/** transactions.metadata 的课程缴费约定:一笔支付 = 一条记录,人明细进 members */
export interface CourseFeeMeta {
  kind: 'course-fee'
  group: CourseFeeGroup
  members: CourseFeeMember[]
}

export function isDance(v: string): v is Dance {
  return v === 'all' || (DANCES as readonly string[]).includes(v)
}

/** 45600 → "456";非整元才带小数。金额预填与 chip 标价共用 */
export function feeYuan(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : centsToYuan(cents)
}

/** 成员 → 粘贴文本:一行一人 `学号,姓名[,舞种]` */
export function memberLines(
  members: ReadonlyArray<{ name: string; sid: string; dance: string }>,
  withDance: boolean,
): string {
  return members
    .filter(m => m.name.trim() !== '' || m.sid.trim() !== '')
    .map(m => (withDance ? `${m.sid},${m.name},${m.dance}` : `${m.sid},${m.name}`))
    .join('\n')
}

export interface ParsedMemberLines {
  members: { name: string; sid: string; dance: string }[]
  errors: { line: number; text: string }[]
}

/** 解析粘贴名单:一行一人 `学号,姓名[,舞种]`;兼容全角逗号与空格/Tab 分隔,空行跳过,段数不对整行报错 */
export function parseMemberLines(text: string, withDance: boolean): ParsedMemberLines {
  const members: ParsedMemberLines['members'] = []
  const errors: ParsedMemberLines['errors'] = []
  text.split('\n').forEach((raw, i) => {
    const parts = raw.trim().split(/[,，\t ]+/).filter(Boolean)
    if (parts.length === 0) return
    const [sid = '', name = ''] = parts
    const dance = withDance ? (parts[2] ?? '').toLowerCase() : 'all'
    if (!sid || !name || parts.length > (withDance ? 3 : 2) || (withDance && !isDance(dance))) {
      errors.push({ line: i + 1, text: raw.trim() })
      return
    }
    members.push({ name, sid, dance })
  })
  return { members, errors }
}
